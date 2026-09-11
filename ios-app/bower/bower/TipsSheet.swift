import SwiftUI

/// What photographs well — six things, none of them required. Behind the
/// Tips pill in the Home nav and the Tips link on the checklist, so the
/// advice is read when wanted rather than printed on the screen every time.
struct TipsSheet: View {
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss

    private static let tips: [(SuggestedShot, String, String)] = [
        (.front, "Daylight, plain wall", "Near a window, no flash."),
        (.front, "Whole piece in frame", "Flat or hung, straight on."),
        (.back, "The back too", "Same framing as the front."),
        (.tag, "Size tag flat and in focus", "Size and material come from here."),
        (.logo, "Brand label close in", "Neck or chest label."),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("What photographs well").font(BowerFont.serif(28)).foregroundStyle(theme.text)
                Spacer()
                Button("Done") { dismiss() }
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(14, weight: .semibold))
                    .foregroundStyle(theme.satin)
            }
            Text("Four angles, none required. The fifth photo is for a flaw, if there is one.")
                .font(BowerFont.ui(13))
                .foregroundStyle(theme.muted)
                .lineSpacing(3)
                .padding(.top, 6)

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Array(Self.tips.enumerated()), id: \.offset) { _, tip in
                        HStack(alignment: .top, spacing: 13) {
                            Image(systemName: tip.0.symbol)
                                .font(.system(size: 14))
                                .foregroundStyle(theme.satin)
                                .frame(width: 34, height: 34)
                                .background(theme.subtle)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            VStack(alignment: .leading, spacing: 3) {
                                Text(tip.1).font(BowerFont.ui(14.5, weight: .semibold)).foregroundStyle(theme.text)
                                Text(tip.2).font(BowerFont.ui(13)).foregroundStyle(theme.muted).lineSpacing(3)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(.vertical, 14)
                        .overlay(alignment: .bottom) { Hairline() }
                    }
                }
                .padding(.top, 8)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
        .padding(.horizontal, 22)
        .padding(.top, 18)
        .padding(.bottom, 20)
        .background(theme.bg)
    }
}
