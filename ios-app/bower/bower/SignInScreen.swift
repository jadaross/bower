import SwiftUI
import AuthenticationServices

/// Apple only for v1. Email/password was designed and is the first ladder
/// rung, but shipping both without account linking lets one person become
/// two accounts with two allowances — see issue #30. One method, no collision.
struct SignInScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @Environment(\.colorScheme) private var scheme

    // A reference holder, not @State: mutating a nonce inside the request
    // closure must be visible to the completion closure immediately, and a
    // @State value does not reliably propagate across the two. A mismatch
    // here is exactly the "Nonces mismatch" GoTrue rejects.
    @State private var nonces = NonceBox()
    @State private var working = false
    @State private var failure: String?

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 24)

            VStack(spacing: 16) {
                Arch(size: 92)
                VStack(spacing: 7) {
                    HStack(spacing: 0) {
                        Text("bower").foregroundStyle(theme.text)
                        Text(".").foregroundStyle(theme.coral)
                    }
                    .font(BowerFont.serif(58))

                    Text("Shiny things, arranged nicely.")
                        .font(BowerFont.ui(13.5))
                        .foregroundStyle(theme.muted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 210)
                }
            }

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
                .signInWithAppleButtonStyle(scheme == .dark ? .white : .black)
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

                Text("Photos are read and thrown away — bower keeps no images.")
                    .font(BowerFont.ui(11.5))
                    .foregroundStyle(theme.muted)
                    .multilineTextAlignment(.center)
                    .padding(.top, 2)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 34)
    }

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
                .foregroundStyle(theme.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(theme.coral.opacity(0.08))
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
