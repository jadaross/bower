import SwiftUI
import AuthenticationServices

/// Apple, or email and password — plain, independent Supabase identities.
/// No linking: someone who uses both on the same address gets two accounts,
/// same as any app without SSO account merging (see issue #30, and #58 for
/// why linking isn't attempted — Supabase's own automatic linking 500s on an
/// Apple Hide My Email address, supabase/supabase#43895).
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
    @State private var notice: String?

    @State private var showEmail = false
    @State private var signingUp = true
    @State private var email = ""
    @State private var password = ""

    private var canSubmitEmail: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !password.isEmpty
    }

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

                    if showEmail {
                        emailForm
                    } else {
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

                        Button { showEmail = true; notice = nil; failure = nil } label: {
                            Text("Continue with email")
                                .font(BowerFont.ui(15, weight: .semibold))
                                .foregroundStyle(Self.paper)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Self.paper.opacity(0.35), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
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

    private func noticeBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("✓")
                .font(BowerFont.ui(11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 16, height: 16)
                .background(theme.moss)
                .clipShape(Circle())
            Text(message)
                .font(BowerFont.ui(12.5))
                .foregroundStyle(Self.paper)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(theme.moss.opacity(0.18))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var emailForm: some View {
        VStack(spacing: 10) {
            Button { showEmail = false; notice = nil; failure = nil } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left").font(.system(size: 11, weight: .semibold))
                    Text("Back")
                }
                .font(BowerFont.ui(13, weight: .medium))
                .foregroundStyle(Self.paper.opacity(0.6))
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 2)

            if let notice { noticeBanner(notice) }

            HStack(spacing: 3) {
                emailModeTab("Sign up", active: signingUp) { signingUp = true }
                emailModeTab("Log in", active: !signingUp) { signingUp = false }
            }
            .padding(3)
            .background(.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // One grouped field, split by a hairline, the way a real form
            // reads — not two boxes floating apart with nothing tying them
            // together.
            VStack(spacing: 0) {
                emailField(icon: "envelope", "Email", text: $email, secure: false, keyboard: .emailAddress, contentType: .emailAddress)
                Rectangle().fill(.white.opacity(0.09)).frame(height: 0.5).padding(.leading, 42)
                emailField(icon: "lock", "Password", text: $password, secure: true, contentType: signingUp ? .newPassword : .password)
            }
            .background(.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.12), lineWidth: 1))

            Button { Task { await submitEmail() } } label: {
                Text(signingUp ? "Create account" : "Log in")
                    .font(BowerFont.ui(15, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundStyle(canSubmitEmail ? theme.avenue : Self.paper.opacity(0.4))
                    .background(canSubmitEmail ? Self.paper : .clear)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay {
                        if !canSubmitEmail {
                            RoundedRectangle(cornerRadius: 12).stroke(Self.paper.opacity(0.2), lineWidth: 1)
                        }
                    }
            }
            .buttonStyle(.plain)
            .disabled(!canSubmitEmail || working)
        }
        .padding(.top, 4)
    }

    private func emailModeTab(_ label: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(BowerFont.ui(13, weight: active ? .semibold : .medium))
                .foregroundStyle(active ? theme.avenue : Self.paper.opacity(0.6))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(active ? Self.paper : .clear)
                .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
    }

    private func emailField(
        icon: String, _ placeholder: String, text: Binding<String>, secure: Bool,
        keyboard: UIKeyboardType = .default, contentType: UITextContentType? = nil
    ) -> some View {
        HStack(spacing: 11) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Self.paper.opacity(0.4))
                .frame(width: 16)
            Group {
                if secure { SecureField("", text: text, prompt: Text(placeholder).foregroundColor(Self.paper.opacity(0.4))) }
                else { TextField("", text: text, prompt: Text(placeholder).foregroundColor(Self.paper.opacity(0.4))) }
            }
            .font(BowerFont.ui(14.5))
            .foregroundStyle(Self.paper)
            .tint(theme.sheen)
            .keyboardType(keyboard)
            .textContentType(contentType)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
        }
        .padding(.vertical, 13)
        .padding(.horizontal, 14)
    }

    private func submitEmail() async {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard canSubmitEmail else { return }
        working = true
        failure = nil
        notice = nil
        defer { working = false }
        do {
            if signingUp {
                let confirmed = try await state.session.signUpWithEmail(email: trimmedEmail, password: password)
                if confirmed {
                    await state.didSignIn()
                } else {
                    notice = "Check your email to confirm your account, then log in."
                    signingUp = false
                    password = ""
                }
            } else {
                try await state.session.signInWithEmail(email: trimmedEmail, password: password)
                await state.didSignIn()
            }
        } catch {
            failure = "Couldn't finish signing in: \(error.localizedDescription)"
        }
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
