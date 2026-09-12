import SwiftUI

/// The one-time "introduce yourself" page — first of the two pages ahead of
/// "what bower does", gated by `hasIntroduced` rather than `onboardingComplete`
/// (see `Screen`), so it also reaches an account that finished onboarding
/// long before this shipped. Takes first and last name, but the app only ever
/// greets with the first — the last is for the owner's dashboard.
struct IntroduceScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    private enum Field { case first, last }

    @State private var first = ""
    @State private var last = ""
    @FocusState private var focused: Field?
    @State private var saving = false

    private var trimmedFirst: String { first.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var trimmedLast: String { last.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var ready: Bool { !trimmedFirst.isEmpty && !trimmedLast.isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 20)

            VStack(spacing: 20) {
                Arch(size: 56)

                VStack(spacing: 8) {
                    Text("Introduce yourself")
                        .font(BowerFont.serif(36))
                        .foregroundStyle(theme.text)
                    Text("So bower knows who it's writing for.")
                        .font(BowerFont.ui(14))
                        .foregroundStyle(theme.muted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 260)
                }
            }

            VStack(spacing: 22) {
                field("First name", text: $first, field: .first, submitLabel: .next) {
                    focused = .last
                }
                field("Last name", text: $last, field: .last, submitLabel: .done) {
                    Task { await proceed() }
                }
            }
            .padding(.top, 40)

            Spacer(minLength: 24)

            BowerButton(title: saving ? "Saving…" : "Continue", disabled: !ready || saving) {
                Task { await proceed() }
            }
        }
        .padding(.horizontal, 28)
        .padding(.top, 10)
        .padding(.bottom, 34)
        .onAppear { focused = .first }
    }

    private func field(_ placeholder: String, text: Binding<String>, field: Field, submitLabel: SubmitLabel, onSubmit: @escaping () -> Void) -> some View {
        VStack(spacing: 6) {
            TextField(placeholder, text: text)
                .font(BowerFont.serif(30))
                .foregroundStyle(theme.text)
                .multilineTextAlignment(.center)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .submitLabel(submitLabel)
                .focused($focused, equals: field)
                .onSubmit(onSubmit)
                .frame(maxWidth: 280)

            Rectangle()
                .fill(focused == field ? theme.satin : theme.line)
                .frame(width: 200, height: focused == field ? 1.5 : 0.5)
                .animation(.easeOut(duration: 0.16), value: focused)
        }
    }

    private func proceed() async {
        guard ready, !saving else { return }
        saving = true
        state.firstName = trimmedFirst
        state.lastName = trimmedLast
        await state.saveName()
        saving = false
        state.screen = .whyBower
    }
}
