import SwiftUI

/// The one-time "what bower does" page — three beats, no carousel. Shown once
/// after the first sign-in; the same explanation, in more detail, lives behind
/// the ? on Home for ever after (`HelpSheet`).
struct HowScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    private static let beats: [(String, String)] = [
        ("Photograph your clothes", "Any photos you already have will do."),
        ("Bower prices and writes them", "Brand, size, condition, and what to ask."),
        ("You paste it in", "Vinted, Depop, eBay. Bower never posts for you."),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("What bower does")
                .font(BowerFont.serif(38))
                .foregroundStyle(theme.text)
            Text("The selling is the easy part. This is the admin.")
                .font(BowerFont.ui(14))
                .foregroundStyle(theme.muted)
                .lineSpacing(3)
                .frame(maxWidth: 300, alignment: .leading)
                .padding(.top, 8)

            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(Self.beats.enumerated()), id: \.offset) { i, beat in
                    let last = i == Self.beats.count - 1
                    HStack(alignment: .top, spacing: 16) {
                        VStack(spacing: 0) {
                            Text("\(i + 1)")
                                .font(BowerFont.mono(12))
                                .foregroundStyle(.white)
                                .frame(width: 30, height: 30)
                                .background(theme.satin)
                                .clipShape(Circle())
                            if !last {
                                Rectangle().fill(theme.line).frame(width: 1)
                                    .padding(.vertical, 6)
                            }
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(beat.0)
                                .font(BowerFont.ui(19, weight: .semibold))
                                .foregroundStyle(theme.text)
                                .padding(.top, 4)
                            Text(beat.1)
                                .font(BowerFont.ui(14))
                                .foregroundStyle(theme.muted)
                                .lineSpacing(3)
                        }
                        .padding(.bottom, last ? 0 : 28)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.top, 24)

            Spacer(minLength: 24)

            BowerButton(title: "Got it") { state.screen = .platforms }
        }
        .padding(.horizontal, 24)
        .padding(.top, 10)
        .padding(.bottom, 34)
    }
}
