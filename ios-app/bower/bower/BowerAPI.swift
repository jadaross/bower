import Foundation

/// Supplies the bearer token every route requires. Behind a protocol so the
/// app builds and previews without the Supabase package, and so tests can run
/// the client against a fixed token. See ADR-0007 — there are no anonymous
/// requests, so this is never optional at the network layer.
protocol SessionProviding: Sendable {
    /// The current access token, or nil when nobody is signed in.
    func accessToken() async -> String?
    /// Refresh after a 401 carrying `expired_token`. Returns the new token.
    @discardableResult func refresh() async throws -> String
    func signOut() async
}

/// Every call the app can make. A protocol so screens can be built and
/// previewed against a stub before the real one is wired.
protocol BowerAPIClient: Sendable {
    func profile() async throws -> ProfileResponse
    /// Sends the preference alongside, because disabling the preferred platform
    /// has to name its replacement in the same request — the database refuses
    /// to let the two drift apart.
    func setEnabledPlatforms(_ platforms: [Platform], preferred: Platform) async throws -> ProfileResponse
    func setPreferredPlatform(_ platform: Platform) async throws -> ProfileResponse
    /// Photos in, Neutral Listing out. Streams, and assembles before returning —
    /// the wire format is a JSON document delivered in text fragments. Three
    /// things are surfaced mid-flight, each a real event on the wire (see
    /// `AnalyseProgress`), so the analysing screen can show the read as it
    /// happens rather than a spinner and a guess.
    func analyse(images: [Data], tone: Tone, platform: Platform?,
                 onProgress: @escaping @Sendable (AnalyseProgress) -> Void) async throws -> AnalysisResult
    func valuate(item: ValuationItem) async throws -> ValuationResponse
    func format(listing: NeutralListing, platform: Platform, tone: Tone) async throws -> PlatformListing
    func refine(listing: PlatformListing, platform: Platform, instructions: [String]) async throws -> PlatformListing
    /// Deletes the account. Required by App Review for any app with sign-up.
    func deleteAccount() async throws
    /// The caller's past items, newest first. Text only — no photos.
    func history() async throws -> [HistoryItem]
    /// Records a feedback signal against a listing's Langfuse trace. Best-effort.
    func feedback(traceId: String, name: String, value: Int?) async throws
}

/// What an analyse call reports before it returns, in the order it happens.
/// Every case is something that actually occurred on the wire — none is a
/// timer — so the screen that shows them never claims progress it has not seen.
enum AnalyseProgress: Sendable, Equatable {
    /// The server has accepted the photos and opened the stream. The model is
    /// looking at the images; nothing has been written yet.
    case reading
    /// The listing title is complete in the buffer — the first field written,
    /// so this is the moment the read has an opinion about what the item is.
    case title(String)
    /// The listing object has closed and the tag OCR is streaming. Only the
    /// short tail of the document remains.
    case finishing
}

// MARK: - Live

/// Holds the current item's session id so analyse/format/refine/valuate on the
/// same item share one id (sent as `x-bower-session`, used to group the item's
/// journey in Langfuse). A reference box so every copy of the `BowerAPI` struct
/// shares it; lock-guarded to stay `Sendable`.
private final class SessionBox: @unchecked Sendable {
    private let lock = NSLock()
    private var _value: String?
    var value: String? {
        get { lock.lock(); defer { lock.unlock() }; return _value }
        set { lock.lock(); defer { lock.unlock() }; _value = newValue }
    }
}

struct BowerAPI: BowerAPIClient {
    let baseURL: URL
    let session: any SessionProviding
    private let urlSession: URLSession
    private let sessionBox = SessionBox()

    init(baseURL: URL = APIConfig.baseURL, session: any SessionProviding, urlSession: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        self.urlSession = urlSession
    }

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    // MARK: Requests

    private func request(_ path: String, method: String = "GET", body: (any Encodable)? = nil, timeout: TimeInterval = 60) async throws -> URLRequest {
        guard let token = await session.accessToken() else { throw APIError.notSignedIn }
        var r = URLRequest(url: baseURL.appending(path: path))
        r.httpMethod = method
        r.timeoutInterval = timeout
        r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let sid = sessionBox.value {
            r.setValue(sid, forHTTPHeaderField: "x-bower-session")
        }
        if let body {
            r.setValue("application/json", forHTTPHeaderField: "Content-Type")
            r.httpBody = try Self.encoder.encode(body)
        }
        return r
    }

    /// Runs a request, and on an expired token refreshes once and runs it again.
    /// Any other auth failure is terminal — a corrupt session should surface as
    /// a sign-out, not as a retry loop.
    private func send<T: Decodable>(_ path: String, method: String = "GET", body: (any Encodable)? = nil, timeout: TimeInterval = 60,
                                    durable: Bool = false, as: T.Type) async throws -> T {
        do {
            return try await perform(try await request(path, method: method, body: body, timeout: timeout), durable: durable, as: T.self)
        } catch let error as APIError where error.isRecoverableBySignInRefresh {
            _ = try await session.refresh()
            return try await perform(try await request(path, method: method, body: body, timeout: timeout), durable: durable, as: T.self)
        }
    }

    private func perform<T: Decodable>(_ req: URLRequest, durable: Bool = false, as: T.Type) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            // A durable request rides a background session and outlives the
            // app being suspended — see `BackgroundTransfer`.
            (data, response) = durable
                ? try await BackgroundTransfer.shared.perform(req)
                : try await urlSession.data(for: req)
        } catch {
            throw APIError.transport(error)
        }
        try Self.check(response, data)
        do {
            return try Self.decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    /// Maps a non-2xx response onto the failure the client should react to.
    private static func check(_ response: URLResponse, _ data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard !(200..<300).contains(http.statusCode) else { return }

        let body = try? decoder.decode(APIErrorBody.self, from: data)

        switch http.statusCode {
        case 401:
            switch body?.code {
            case "expired_token":  throw APIError.sessionExpired
            case "missing_token":  throw APIError.notSignedIn
            default:               throw APIError.sessionInvalid
            }
        case 402:
            throw APIError.allowanceExhausted(
                body?.allowance ?? AllowanceState(used: 0, limit: 0, resetsAt: nil)
            )
        case 400:
            throw APIError.badRequest(body?.error ?? "The request was rejected")
        default:
            throw APIError.server(status: http.statusCode, message: body?.error)
        }
    }

    // MARK: Calls

    func profile() async throws -> ProfileResponse {
        try await send("/api/profile", as: ProfileResponse.self)
    }

    func setEnabledPlatforms(_ platforms: [Platform], preferred: Platform) async throws -> ProfileResponse {
        struct Body: Encodable { let enabledPlatforms: [Platform]; let preferredPlatform: Platform }
        return try await send("/api/profile", method: "PATCH",
                              body: Body(enabledPlatforms: platforms, preferredPlatform: preferred),
                              as: ProfileResponse.self)
    }

    func setPreferredPlatform(_ platform: Platform) async throws -> ProfileResponse {
        struct Body: Encodable { let preferredPlatform: Platform }
        return try await send("/api/profile", method: "PATCH",
                              body: Body(preferredPlatform: platform), as: ProfileResponse.self)
    }

    func history() async throws -> [HistoryItem] {
        try await send("/api/history", as: HistoryResponse.self).items
    }

    func feedback(traceId: String, name: String, value: Int?) async throws {
        struct Body: Encodable { let traceId: String; let name: String; let value: Int? }
        struct Ack: Decodable {}
        _ = try await send("/api/feedback", method: "POST",
                           body: Body(traceId: traceId, name: name, value: value), as: Ack.self)
    }

    func deleteAccount() async throws {
        let req = try await request("/api/profile", method: "DELETE")
        let (data, response): (Data, URLResponse)
        do { (data, response) = try await urlSession.data(for: req) } catch { throw APIError.transport(error) }
        try Self.check(response, data)
    }

    func valuate(item: ValuationItem) async throws -> ValuationResponse {
        struct Body: Encodable { let item: ValuationItem }
        // The web-search valuation can take minutes. It goes through the
        // background session so locking the phone or switching apps mid-search
        // no longer kills it; the timeout is the session's, not this one.
        return try await send("/api/valuate", method: "POST", body: Body(item: item), timeout: 600, durable: true, as: ValuationResponse.self)
    }

    func format(listing: NeutralListing, platform: Platform, tone: Tone) async throws -> PlatformListing {
        struct Body: Encodable { let listing: NeutralListing; let platform: Platform; let tone: Tone }
        return try await send("/api/format", method: "POST",
                              body: Body(listing: listing, platform: platform, tone: tone), as: PlatformListing.self)
    }

    func refine(listing: PlatformListing, platform: Platform, instructions: [String]) async throws -> PlatformListing {
        struct Body: Encodable { let platform: Platform; let listing: PlatformListing; let instructions: [String] }
        return try await send("/api/refine", method: "POST",
                              body: Body(platform: platform, listing: listing, instructions: instructions),
                              as: PlatformListing.self)
    }

    // MARK: analyse — the streaming one

    func analyse(images: [Data], tone: Tone, platform: Platform?,
                 onProgress: @escaping @Sendable (AnalyseProgress) -> Void) async throws -> AnalysisResult {
        struct Body: Encodable { let images: [String]; let tone: Tone; let platform: Platform? }
        let body = Body(images: images.map { $0.base64EncodedString() }, tone: tone, platform: platform)
        // A new analyse starts a new item; format/refine/valuate reuse this id.
        sessionBox.value = UUID().uuidString

        var req = try await request("/api/analyse", method: "POST", body: body)
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        // The model call runs long; the default 60s is not enough.
        req.timeoutInterval = 120

        let assembled = try await readStringStream(req, onProgress: onProgress)
        guard let data = assembled.data(using: .utf8) else {
            throw APIError.decoding(URLError(.cannotDecodeContentData))
        }
        do {
            return try Self.decoder.decode(AnalysisResult.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    /// The wire format is defined once, in `src/lib/streaming-text.ts`: each
    /// frame is `data: ` followed by a JSON-encoded *string* fragment, and a
    /// `[DONE]` sentinel closes the stream. Fragments are concatenated into one
    /// document — there are no structured events. Two things are read early by
    /// pattern in the growing buffer: the listing title, as soon as its closing
    /// quote has arrived, and the `tag_data` key, which means the listing has
    /// closed. Malformed frames are skipped, matching the reference consumer.
    private func readStringStream(_ req: URLRequest,
                                  onProgress: (@Sendable (AnalyseProgress) -> Void)? = nil) async throws -> String {
        let (bytes, response): (URLSession.AsyncBytes, URLResponse)
        do {
            (bytes, response) = try await urlSession.bytes(for: req)
        } catch {
            throw APIError.transport(error)
        }

        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            var collected = Data()
            for try await byte in bytes { collected.append(byte) }
            try Self.check(response, collected)
        }

        onProgress?(.reading)

        var assembled = ""
        var titleSeen = false
        var tailSeen = false
        do {
            for try await line in bytes.lines {
                guard line.hasPrefix("data: ") else { continue }
                let payload = String(line.dropFirst(6))
                if payload == "[DONE]" { return assembled }
                guard let fragment = try? Self.decoder.decode(String.self, from: Data(payload.utf8)) else { continue }
                assembled += fragment
                if !titleSeen, let title = Self.earlyTitle(in: assembled) {
                    titleSeen = true
                    onProgress?(.title(title))
                }
                if !tailSeen, assembled.contains("\"tag_data\"") {
                    tailSeen = true
                    onProgress?(.finishing)
                }
            }
        } catch {
            throw APIError.transport(error)
        }
        return assembled
    }

    /// The first complete `"title": "…"` in a partial JSON document, unescaped.
    /// Nil until the closing quote has streamed in.
    static func earlyTitle(in buffer: String) -> String? {
        guard let match = buffer.firstMatch(of: /"title"\s*:\s*("(?:[^"\\]|\\.)*")/) else { return nil }
        let quoted = String(match.1)
        guard let title = try? decoder.decode(String.self, from: Data(quoted.utf8)) else { return nil }
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
