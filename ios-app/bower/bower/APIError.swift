import Foundation

/// The failures the backend actually distinguishes, kept distinct here because
/// the client has to react differently to each. `src/lib/auth.ts` explains why:
/// a missing token means "never signed in", an expired one means "refresh and
/// retry, invisibly", and a rejected one means the stored session is corrupt
/// and the honest move is to sign out.
enum APIError: Error, Sendable {
    case notSignedIn
    case sessionExpired
    case sessionInvalid
    /// A real, designed state with its own screen — not an error to apologise for.
    case allowanceExhausted(AllowanceState)
    case badRequest(String)
    case server(status: Int, message: String?)
    case transport(any Error)
    case decoding(any Error)
    /// The server stopped a read on purpose and said why. Nothing was charged.
    case rejected(AnalyseRejection)

    /// Whether retrying after refreshing the session is worth attempting.
    var isRecoverableBySignInRefresh: Bool {
        if case .sessionExpired = self { return true }
        return false
    }
}

/// The error envelope every route shares.
struct APIErrorBody: Decodable, Sendable {
    let error: String?
    let code: String?
    let allowance: AllowanceState?
}

/// Why a read was stopped. Mirrors `AnalysisSubject` minus "clothing", plus
/// "refused" for when the model declined to write anything at all. Unknown
/// reasons decode as `.other`, so a new one server-side never breaks the app.
enum AnalyseRejection: String, Sendable {
    case notClothing = "not_clothing"
    case explicit
    case unsafe
    case refused
    case other

    init(wire: String) { self = AnalyseRejection(rawValue: wire) ?? .other }

    /// The words on the screen. Two messages: it wasn't clothes, or it wasn't
    /// something bower will look at.
    var title: String {
        switch self {
        case .notClothing: "Sorry, we can't sell that"
        default:           "Sorry, that was inappropriate"
        }
    }

    var body: String {
        switch self {
        case .notClothing: "Bower reads clothes, shoes and bags. Take a photo of the piece and try again."
        default:           "Bower can't read that photo. It has been thrown away, and nothing was charged."
        }
    }
}
