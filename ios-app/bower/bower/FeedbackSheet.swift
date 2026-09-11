import SwiftUI

/// Typed feedback. One box, one button. Opened from the listing (about the
/// listing on screen) or from Profile (about anything). The note is stored
/// with where it was written from, so a sentence like "price way too low"
/// can be lined up with the exact output it is about.
struct FeedbackSheet: View {
    /// Where it was opened from, for the record and the subtitle.
    let screen: String
    var about: String? = nil
    var platform: Platform? = nil
    var traceId: String? = nil

    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool

    @State private var message = ""
    @State private var sending = false
    @State private var sent = false
    @State private var failed = false

    private var trimmed: String { message.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Tell bower").font(BowerFont.serif(28)).foregroundStyle(theme.text)
                Spacer()
                Button("Done") { dismiss() }
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(14, weight: .semibold))
                    .foregroundStyle(theme.satin)
            }
            Text(about.map { "About \($0)." } ?? "Anything at all. Wrong price, odd wording, something that broke.")
                .font(BowerFont.ui(13))
                .foregroundStyle(theme.muted)
                .lineSpacing(3)
                .padding(.top, 6)

            if sent {
                HStack(spacing: 9) {
                    Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(theme.moss)
                    Text("Sent. Thank you.").font(BowerFont.ui(14.5, weight: .semibold)).foregroundStyle(theme.text)
                }
                .padding(.top, 24)
            } else {
                ZStack(alignment: .topLeading) {
                    if message.isEmpty {
                        Text("What happened?")
                            .font(BowerFont.ui(14.5)).foregroundStyle(theme.muted)
                            .padding(.top, 8).padding(.leading, 5)
                    }
                    TextEditor(text: $message)
                        .font(BowerFont.ui(14.5))
                        .foregroundStyle(theme.text)
                        .scrollContentBackground(.hidden)
                        .focused($focused)
                        .frame(minHeight: 120)
                }
                .padding(10)
                .background(theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(focused ? theme.satin.opacity(0.5) : theme.line, lineWidth: 0.5))
                .padding(.top, 14)

                if failed {
                    Text("Couldn't send that. Check your connection and try again.")
                        .font(BowerFont.ui(12.5)).foregroundStyle(theme.coral).padding(.top, 8)
                }

                BowerButton(title: sending ? "Sending…" : "Send", disabled: trimmed.isEmpty || sending) {
                    Task { await send() }
                }
                .padding(.top, 14)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 22)
        .padding(.top, 18)
        .padding(.bottom, 20)
        .background(theme.bg)
        .onAppear { focused = true }
    }

    private func send() async {
        sending = true
        defer { sending = false }
        do {
            try await state.api.feedbackNote(FeedbackNote(message: trimmed, screen: screen, platform: platform, traceId: traceId))
            failed = false
            withAnimation(.easeOut(duration: 0.2)) { sent = true }
            try? await Task.sleep(for: .seconds(1.1))
            dismiss()
        } catch {
            failed = true
        }
    }
}
