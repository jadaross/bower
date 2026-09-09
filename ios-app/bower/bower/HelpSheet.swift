import SwiftUI

/// How bower works, in four steps. Reachable for ever from the ? on Home —
/// there is no forced tour, and the reasoning that used to sit in grey lines
/// on every screen is read here, once.
struct HelpSheet: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var step = 0

    /// A tip is the yellow box, and it appears only when the step costs
    /// something. Everything else is just the body.
    private struct Step { let title: String; let body: String; var tip: String? = nil }

    private var steps: [Step] {
        [
            Step(title: "Photograph the piece",
                 body: "Take them now or pick what you already have. Upload up to 20 photos."),
            Step(title: "Tap Price it",
                 body: "Bower reads the photos and tells you the brand, size, condition, material and a first estimate of what it's worth.",
                 tip: "A read costs 1 of your \(state.allowance) this month."),
            Step(title: "Get a real price",
                 body: "The estimate is a guess from the photos. Tap Get a real price and bower searches what similar things are listed at right now.",
                 tip: "A search costs 1 as well."),
            Step(title: "Copy it across",
                 body: "Switch between Vinted, Depop and eBay. Title, description and every platform field has its own copy button. Bower never posts for you."),
        ]
    }

    var body: some View {
        let s = steps[step]
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("How bower works").font(BowerFont.serif(28)).foregroundStyle(theme.text)
                Spacer()
                Button("Done") { dismiss() }
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(14, weight: .semibold))
                    .foregroundStyle(theme.satin)
            }

            HStack(spacing: 5) {
                ForEach(0..<steps.count, id: \.self) { n in
                    Capsule()
                        .fill(n <= step ? theme.satin : theme.line)
                        .frame(height: 3)
                        .contentShape(Rectangle().inset(by: -8))
                        .onTapGesture { step = n }
                }
            }
            .padding(.top, 16)
            .animation(.easeOut(duration: 0.2), value: step)

            VStack(alignment: .leading, spacing: 0) {
                Kicker("Step \(step + 1) of \(steps.count)")
                Text(s.title)
                    .font(BowerFont.ui(22, weight: .semibold))
                    .foregroundStyle(theme.text)
                    .padding(.top, 6)
                Text(s.body)
                    .font(BowerFont.ui(14.5))
                    .foregroundStyle(theme.text)
                    .lineSpacing(4)
                    .padding(.top, 8)

                if let tip = s.tip {
                    HStack(alignment: .top, spacing: 9) {
                        Text("i")
                            .font(BowerFont.ui(11, weight: .bold))
                            .foregroundStyle(theme.ink)
                            .frame(width: 16, height: 16)
                            .background(theme.pollen)
                            .clipShape(Circle())
                            .padding(.top, 1)
                        Text(tip)
                            .font(BowerFont.ui(12.5))
                            .foregroundStyle(theme.text)
                            .lineSpacing(3)
                    }
                    .padding(.vertical, 11)
                    .padding(.horizontal, 13)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(theme.pollen.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.pollen.opacity(0.45), lineWidth: 0.5))
                    .padding(.top, 14)
                }
            }
            .padding(.top, 20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .id(step)
            .transition(.opacity)

            Spacer(minLength: 20)

            HStack(spacing: 9) {
                if step > 0 {
                    BowerButton(title: "Back", kind: .secondary) { step -= 1 }
                        .frame(width: 118)
                }
                if step < steps.count - 1 {
                    BowerButton(title: "Next") { step += 1 }
                } else {
                    BowerButton(title: "Start selling") { dismiss() }
                }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 18)
        .padding(.bottom, 30)
        .animation(.easeOut(duration: 0.18), value: step)
        .background(theme.bg)
    }
}
