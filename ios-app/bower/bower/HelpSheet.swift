import SwiftUI

/// How bower works, in five pages. Reachable for ever from the ? on Home;
/// there is no forced tour. Each page carries one thing to look at, not a
/// paragraph to read: the two numbers, the four angles, the meter a step
/// spends, the three platforms.
struct HelpSheet: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var step = 0

    private enum Figure { case meters, angles, listing, ask, platforms, none }

    private struct Step {
        let title: String
        /// Short lines, each its own paragraph.
        let lines: [String]
        /// Which meter this step spends, shown as a small tag.
        var spends: String? = nil
        var figure: Figure = .none
    }

    private var steps: [Step] {
        let unlimited = state.reads.limit == nil && state.searches.limit == nil
        return [
            Step(title: "What you get",
                 lines: unlimited
                    ? ["This account has no limit on either."]
                    : ["Free, every month. Both reset on the 1st.", "A way to get more is coming."],
                 figure: .meters),
            Step(title: "Photograph the piece",
                 lines: ["Take them now or pick what you already have.", "Up to 5 photos. Four angles matter."],
                 figure: .angles),
            Step(title: "Tap Write it",
                 lines: ["Bower reads the photos and writes the listing.", "Title, description, the form fields, and an estimate of what it's worth."],
                 spends: "Uses a listing", figure: .listing),
            Step(title: "Check the market",
                 lines: ["The estimate is from the photos alone.", "A market check looks up what the same thing is listed at right now, on the platforms you sell on."],
                 spends: "Uses a market check", figure: .ask),
            Step(title: "Copy it across",
                 lines: ["Title, description and every form field has its own copy button.", "Bower never posts for you."],
                 figure: .platforms),
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
                HStack(alignment: .firstTextBaseline) {
                    Kicker("Step \(step + 1) of \(steps.count)")
                    Spacer()
                    if let spends = s.spends { tag(spends) }
                }
                Text(s.title)
                    .font(BowerFont.ui(22, weight: .semibold))
                    .foregroundStyle(theme.text)
                    .padding(.top, 6)

                figure(s.figure)

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(s.lines.enumerated()), id: \.offset) { i, line in
                        Text(line)
                            .font(BowerFont.ui(14.5))
                            .foregroundStyle(i == 0 ? theme.text : theme.muted)
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.top, 12)
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

    // MARK: Pieces

    private func tag(_ text: String) -> some View {
        Text(text.uppercased())
            .font(BowerFont.mono(9.5, weight: .bold)).tracking(0.8)
            .foregroundStyle(theme.satin)
            .padding(.vertical, 4).padding(.horizontal, 8)
            .background(theme.satin.opacity(0.1))
            .clipShape(Capsule())
    }

    @ViewBuilder private func figure(_ f: Figure) -> some View {
        switch f {
        case .meters:
            HStack(spacing: 10) {
                meterTile(state.reads.limit, "listings", "Written from your photos")
                meterTile(state.searches.limit, "market checks", "See what it's really going for")
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, 14)
        case .angles:
            HStack(spacing: 8) {
                ForEach(SuggestedShot.allCases) { shot in
                    VStack(spacing: 6) {
                        Image(systemName: shot.symbol)
                            .font(.system(size: 15))
                            .foregroundStyle(theme.satin)
                            .frame(width: 44, height: 44)
                            .background(theme.subtle)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        Text(shot.label)
                            .font(BowerFont.ui(11, weight: .medium))
                            .foregroundStyle(theme.text)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(.top, 14)
        case .listing:
            // A listing, as the listing screen shows it: the parts, each with
            // its own copy button.
            VStack(alignment: .leading, spacing: 10) {
                mockLine("Title", "Carhartt Detroit jacket, Hamilton brown, M", bold: true)
                Hairline()
                mockLine("Description", "Size M. 100% cotton duck, corduroy collar. Light wear at the cuffs, no rips.", bold: false)
                Hairline()
                HStack(spacing: 6) {
                    ForEach(["Brand · Carhartt", "Size · M", "Condition · Good"], id: \.self) { f in
                        Text(f).font(BowerFont.mono(10)).foregroundStyle(theme.text)
                            .padding(.vertical, 4).padding(.horizontal, 7)
                            .background(theme.subtle).clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.line, lineWidth: 0.5))
            .padding(.top, 14)
        case .ask:
            // The answer a market check gives.
            VStack(alignment: .leading, spacing: 4) {
                Kicker("Ask")
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("£50").font(BowerFont.serifUpright(36)).foregroundStyle(theme.text)
                    HStack(spacing: 6) {
                        Text("on")
                        Circle().fill(Platform.depop.tint).frame(width: 7, height: 7)
                        Text("Depop")
                    }
                    .font(BowerFont.ui(14)).foregroundStyle(theme.text)
                }
                Text("From 11 listings live right now")
                    .font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.line, lineWidth: 0.5))
            .padding(.top, 14)
        case .platforms:
            HStack(spacing: 8) {
                ForEach(Platform.allCases) { p in
                    HStack(spacing: 7) {
                        Circle().fill(p.tint).frame(width: 8, height: 8)
                        Text(p.name).font(BowerFont.ui(13, weight: .semibold)).foregroundStyle(theme.text)
                    }
                    .padding(.vertical, 9).padding(.horizontal, 12)
                    .background(theme.card)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(theme.line, lineWidth: 0.5))
                }
            }
            .padding(.top, 14)
        case .none:
            EmptyView()
        }
    }

    private func mockLine(_ label: String, _ text: String, bold: Bool) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Kicker(label)
                Spacer()
                HStack(spacing: 3) {
                    Image(systemName: "doc.on.doc").font(.system(size: 9))
                    Text("Copy")
                }
                .font(BowerFont.ui(10.5, weight: .medium)).foregroundStyle(theme.muted)
            }
            Text(text)
                .font(bold ? BowerFont.ui(13.5, weight: .semibold) : BowerFont.ui(12.5))
                .foregroundStyle(theme.text)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func meterTile(_ limit: Int?, _ name: String, _ what: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(limit.map(String.init) ?? "∞")
                .font(BowerFont.serifUpright(40)).foregroundStyle(theme.text)
            Text(name).font(BowerFont.ui(13, weight: .semibold)).foregroundStyle(theme.text)
            Text(what).font(BowerFont.ui(11.5)).foregroundStyle(theme.muted).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.line, lineWidth: 0.5))
    }
}
