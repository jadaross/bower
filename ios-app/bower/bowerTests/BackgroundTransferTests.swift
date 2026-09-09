import Foundation
import Testing
@testable import bower

/// The background session is the difference between a valuation that survives
/// the screen locking and one that does not, so it is exercised for real —
/// one round trip to the live API, unauthenticated, which answers 401 with a
/// JSON body. What matters is that the body and the response both come back
/// through the delegate path.
@MainActor
struct BackgroundTransferTests {
    @Test func postsABodyAndCollectsTheResponse() async throws {
        var req = URLRequest(url: APIConfig.baseURL.appending(path: "/api/valuate"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data(#"{"item":{}}"#.utf8)

        let (data, response) = try await BackgroundTransfer.shared.perform(req)

        let http = try #require(response as? HTTPURLResponse)
        #expect(http.statusCode == 401)
        let body = try #require(String(data: data, encoding: .utf8))
        #expect(body.contains("token"))
    }
}
