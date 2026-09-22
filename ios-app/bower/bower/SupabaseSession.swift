import Foundation
import Auth
import CryptoKit

/// The real session, backed by Supabase Auth. Sessions persist in the keychain
/// and refresh themselves; `accessToken()` returns a token that is valid right
/// now, or nil when nobody is signed in.
final class SupabaseSession: SessionProviding, @unchecked Sendable {
    let client: AuthClient

    init() {
        // AuthClient wants the auth service's own path, not the project root —
        // the umbrella SupabaseClient appends this itself. Without it every
        // request goes to /token at the project root, which the gateway does
        // not route, and the SDK reports it as a connection failure.
        client = AuthClient(
            url: APIConfig.supabaseURL.appending(path: "auth/v1"),
            headers: [
                "apikey": APIConfig.supabaseAnonKey,
                "Authorization": "Bearer \(APIConfig.supabaseAnonKey)",
            ],
            localStorage: AuthClient.Configuration.defaultLocalStorage,
            autoRefreshToken: true
        )
    }

    /// Whether a session exists at all — may be expired. Used to decide which
    /// screen to open on launch without a network round-trip.
    var hasSession: Bool { client.currentSession != nil }

    func accessToken() async -> String? {
        // `session` refreshes if it can. If it cannot, the session is gone and
        // nil is the honest answer — the caller routes to sign-in.
        (try? await client.session)?.accessToken
    }

    @discardableResult
    func refresh() async throws -> String {
        try await client.refreshSession().accessToken
    }

    func signOut() async {
        try? await client.signOut()
    }

    // MARK: Sign in with Apple

    /// Apple embeds the SHA-256 of the nonce in the id token; Supabase checks
    /// it against the raw nonce we send. Generating it here keeps the pairing
    /// in one place.
    struct AppleNonce {
        let raw: String
        let hashed: String

        init() {
            var bytes = [UInt8](repeating: 0, count: 32)
            _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
            raw = bytes.map { String(format: "%02x", $0) }.joined()
            hashed = SHA256.hash(data: Data(raw.utf8)).map { String(format: "%02x", $0) }.joined()
        }
    }

    func signInWithApple(identityToken: Data, nonce: AppleNonce) async throws {
        guard let idToken = String(data: identityToken, encoding: .utf8) else {
            throw APIError.sessionInvalid
        }
        _ = try await client.signInWithIdToken(
            credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce.raw)
        )
    }

    // MARK: Email

    /// `true` when a session came back immediately; `false` means Supabase's
    /// mailer sent a confirmation link first and there is nothing to sign
    /// into yet.
    @discardableResult
    func signUpWithEmail(email: String, password: String) async throws -> Bool {
        let response = try await client.signUp(email: email, password: password)
        return response.session != nil
    }

    func signInWithEmail(email: String, password: String) async throws {
        _ = try await client.signIn(email: email, password: password)
    }
}
