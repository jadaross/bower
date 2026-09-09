import SwiftUI
import AuthenticationServices

/// Apple only for v1. Email/password was designed and is the first ladder
/// rung, but shipping both without account linking lets one person become
/// two accounts with two allowances — see issue #30. One method, no collision.
struct SignInScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    // A reference holder, not @State: mutating a nonce inside the request
    // closure must be visible to the completion closure immediately, and a
    // @State value does not reliably propagate across the two. A mismatch
    // here is exactly the "Nonces mismatch" GoTrue rejects.
    @State private var nonces = NonceBox()
    @State private var working = false
    @State private var failure: String?

    var body: some View {
        // Avenue ground: the launch splash carries straight through into this
        // page instead of fading into a paler second version of itself.
        ZStack {
            theme.avenue.ignoresSafeArea()
            VStack(spacing: 0) {
                Spacer(minLength: 24)

                VStack(spacing: 18) {
                    Arch(size: 104, stroke: theme.sheen, dot: theme.pollen)
                    VStack(spacing: 10) {
                        HStack(spacing: 0) {
                            Text("bower").foregroundStyle(Self.paper)
                            Text(".").foregroundStyle(theme.coral)
                        }
                        .font(BowerFont.serif(64))

                        Text("Love selling your clothes.\nHate writing the listings.")
                            .font(BowerFont.ui(16))
                            .foregroundStyle(Self.paper.opacity(0.74))
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                            .frame(maxWidth: 250)
                            .padding(.top, 2)
                    }
                }
                .padding(.bottom, 30)

                Spacer(minLength: 28)

                VStack(spacing: 12) {
                    if let failure { rejection(failure) }

                    SignInWithAppleButton(.signIn) { request in
                        let fresh = SupabaseSession.AppleNonce()
                        nonces.current = fresh
                        request.requestedScopes = [.email]
                        request.nonce = fresh.hashed
                    } onCompletion: { result in
                        Task { await complete(result) }
                    }
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(working)
                    .overlay {
                        if working {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.black.opacity(0.35))
                                .overlay { ProgressView().tint(.white) }
                        }
                    }

                    Text("Photos are read and thrown away. Bower keeps no images.")
                        .font(BowerFont.ui(11.5))
                        .foregroundStyle(Self.paper.opacity(0.45))
                        .multilineTextAlignment(.center)
                        .padding(.top, 2)
                }
            }
            .padding(.horizontal, 26)
            .padding(.bottom, 30)
        }
    }

    /// The dark theme's text colour, used here in both appearances because
    /// the page is always on avenue.
    private static let paper = Color(hex: 0xF2EEE6)

    private func rejection(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("!")
                .font(BowerFont.ui(11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 16, height: 16)
                .background(theme.coral)
                .clipShape(Circle())
            Text(message)
                .font(BowerFont.ui(12.5))
                .foregroundStyle(Self.paper)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(theme.coral.opacity(0.18))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private static func describe(_ error: APIError) -> String {
        switch error {
        case .transport(let e): "Couldn't reach the server: \(e.localizedDescription)"
        case .sessionInvalid:   "Apple returned a credential Supabase rejected. Try again."
        default:                "Couldn't finish signing in. Try again."
        }
    }

    private func complete(_ result: Result<ASAuthorization, any Error>) async {
        switch result {
        case .failure(let error):
            // The user dismissing Apple's sheet is not a failure worth a message.
            if let e = error as? ASAuthorizationError, e.code == .canceled { return }
            failure = "Apple didn't complete the sign-in. Try again."
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let token = credential.identityToken else {
                failure = "Apple returned an unexpected credential. Try again."
                return
            }
            working = true
            defer { working = false }
            do {
                try await state.session.signInWithApple(identityToken: token, nonce: nonces.current)
                failure = nil
                await state.didSignIn()
            } catch let error as APIError {
                failure = Self.describe(error)
            } catch {
                // Surface the SDK's own words. A masked error is how the first
                // TestFlight build's routing bug hid behind "check your connection".
                failure = "Couldn't finish signing in: \(error.localizedDescription)"
            }
        }
    }
}

/// Holds the nonce for the in-flight Apple request. A class so a write in the
/// request closure is seen by the completion closure without depending on
/// SwiftUI state propagation.
private final class NonceBox {
    var current = SupabaseSession.AppleNonce()
}
