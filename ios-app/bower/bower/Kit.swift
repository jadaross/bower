import SwiftUI

// MARK: - The mark

/// The mark: the arch, filled solid, with a hole punched through the crown so
/// it reads as a swing tag, and the pollen dot beneath, the one shiny thing
/// inside the bower. Geometry from the design's 100 × 100 box: body 25→75,
/// base at 84, shoulder at 47, crown radius 25, hole at (50, 34) r 7 knocked
/// out even-odd, dot at (50, 62) r 8.5. The hole keeps its size down to 16pt.
struct Arch: View {
    var size: CGFloat = 40
    /// The mark's colour. Named `stroke` from when it was a stroked arch;
    /// every call site still reads naturally.
    var stroke: Color?
    var dot: Color?

    @Environment(\.bower) private var theme

    var body: some View {
        let u = size / 100
        ZStack {
            Path { p in
                p.move(to: CGPoint(x: 25 * u, y: 84 * u))
                p.addLine(to: CGPoint(x: 25 * u, y: 47 * u))
                p.addArc(center: CGPoint(x: 50 * u, y: 47 * u), radius: 25 * u,
                         startAngle: .degrees(180), endAngle: .degrees(360), clockwise: false)
                p.addLine(to: CGPoint(x: 75 * u, y: 84 * u))
                p.closeSubpath()
                p.addEllipse(in: CGRect(x: 43 * u, y: 27 * u, width: 14 * u, height: 14 * u))
            }
            .fill(stroke ?? theme.satin, style: FillStyle(eoFill: true))

            Circle()
                .fill(dot ?? theme.pollen)
                .frame(width: 17 * u, height: 17 * u)
                .position(x: 50 * u, y: 62 * u)
        }
        .frame(width: size, height: size)
    }
}

/// Forced-perspective dots — the loading motif. Six dots growing left to right.
struct CourtDots: View {
    var color: Color?
    var width: CGFloat = 132
    var animate: Bool = true

    @Environment(\.bower) private var theme
    @State private var phase = false

    var body: some View {
        HStack(spacing: width * 0.045) {
            ForEach(0..<6, id: \.self) { i in
                let d = width * (0.045 + CGFloat(i) * 0.038)
                Circle()
                    .fill(color ?? theme.satin)
                    .frame(width: d, height: d)
                    .opacity(phase ? 1 : 0.3 + Double(i) * 0.14)
                    .animation(
                        animate
                        ? .easeInOut(duration: 0.75)
                            .repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.13)
                        : nil,
                        value: phase
                    )
            }
        }
        .frame(height: width * 0.32)
        .onAppear { if animate { phase = true } }
    }
}

// MARK: - Type

/// The small uppercase mono label used above almost every block.
struct Kicker: View {
    let text: String
    var color: Color?

    @Environment(\.bower) private var theme

    init(_ text: String, color: Color? = nil) {
        self.text = text
        self.color = color
    }

    var body: some View {
        Text(text.uppercased())
            .font(BowerFont.mono(10))
            .tracking(1.2)
            .foregroundStyle(color ?? theme.muted)
    }
}

/// A Price Band. Always a range — never a single number. See ADR-0005.
struct PriceRange: View {
    let low: Int
    let high: Int
    var size: CGFloat = 44
    var color: Color?
    var symbol: String = "£"

    @Environment(\.bower) private var theme

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text("\(symbol)\(low)").font(BowerFont.serifUpright(size))
            Text("–")
                .font(BowerFont.serifUpright(size * 0.6))
                .opacity(0.5)
                .padding(.horizontal, 3)
            Text("\(symbol)\(high)").font(BowerFont.serifUpright(size))
        }
        .foregroundStyle(color ?? theme.text)
        .monospacedDigit()
    }
}

// MARK: - Controls

struct BowerButton: View {
    enum Kind { case primary, secondary, quiet, danger }

    let title: String
    var kind: Kind = .primary
    var icon: String?
    var disabled: Bool = false
    var small: Bool = false
    let action: () -> Void

    @Environment(\.bower) private var theme

    var body: some View {
        Button(action: { if !disabled { action() } }) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon) }
                Text(title)
            }
            .font(BowerFont.ui(small ? 13 : 15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, small ? 9 : 15)
            .padding(.horizontal, small ? 14 : 16)
            .foregroundStyle(foreground)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: small ? 10 : 14))
            .overlay(
                RoundedRectangle(cornerRadius: small ? 10 : 14)
                    .stroke(border, lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    private var foreground: Color {
        switch kind {
        case .primary:   disabled ? theme.muted : .white
        case .secondary: theme.text
        case .quiet:     theme.satin
        case .danger:    theme.coral
        }
    }

    private var background: Color {
        switch kind {
        case .primary:   disabled ? theme.subtle : theme.satin
        case .secondary: theme.card
        case .quiet:     .clear
        case .danger:    theme.card
        }
    }

    private var border: Color {
        switch kind {
        case .secondary, .danger: theme.line
        default: .clear
        }
    }
}

struct BowerToggle: View {
    @Binding var isOn: Bool
    var tint: Color?

    @Environment(\.bower) private var theme

    var body: some View {
        let c = tint ?? theme.satin
        Button { isOn.toggle() } label: {
            ZStack(alignment: isOn ? .trailing : .leading) {
                Capsule().fill(isOn ? c : theme.subtle)
                    .overlay(Capsule().stroke(isOn ? c : theme.line, lineWidth: 0.5))
                Circle()
                    .fill(.white)
                    .shadow(color: .black.opacity(0.2), radius: 1.5, y: 1)
                    .padding(2)
            }
            .frame(width: 44, height: 26)
        }
        .buttonStyle(.plain)
        .animation(.easeOut(duration: 0.18), value: isOn)
    }
}

struct SegmentedOption: Identifiable, Equatable {
    let id: String
    let label: String
    var dot: Color?
}

struct Segmented: View {
    let options: [SegmentedOption]
    @Binding var selection: String
    var small: Bool = false

    @Environment(\.bower) private var theme

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options) { o in
                let active = o.id == selection
                Button { selection = o.id } label: {
                    HStack(spacing: 5) {
                        if let dot = o.dot {
                            Circle().fill(dot).frame(width: 6, height: 6)
                        }
                        Text(o.label)
                    }
                    .font(BowerFont.ui(small ? 12 : 13, weight: active ? .semibold : .medium))
                    .foregroundStyle(active ? theme.text : theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, small ? 7 : 9)
                    .background(active ? theme.card : .clear)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                    .overlay(
                        RoundedRectangle(cornerRadius: 9)
                            .stroke(active ? theme.line : .clear, lineWidth: 0.5)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(theme.subtle)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.line, lineWidth: 0.5))
        .animation(.easeOut(duration: 0.16), value: selection)
    }
}

// MARK: - Containers

struct BowerCard<Content: View>: View {
    var padding: CGFloat = 16
    var dashed: Bool = false
    var fill: Color?
    var borderColor: Color?
    @ViewBuilder let content: () -> Content

    @Environment(\.bower) private var theme

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fill ?? theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(
                        borderColor ?? theme.line,
                        style: StrokeStyle(lineWidth: dashed ? 1 : 0.5, dash: dashed ? [4, 3] : [])
                    )
            )
    }
}

/// A grouped list — hairline separators between rows, rounded outer edge.
struct BowerGroup<Content: View>: View {
    @ViewBuilder let content: () -> Content

    @Environment(\.bower) private var theme

    var body: some View {
        VStack(spacing: 0) { content() }
            .background(theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.line, lineWidth: 0.5))
    }
}

/// The one way to move on to the next item — same look and label wherever it
/// appears (the listing screen's header and its foot), so "what do I tap to go
/// next" is never a question. Its own colour marks it as the forward action.
struct NewItemButton: View {
    let action: () -> Void
    @Environment(\.bower) private var theme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: "plus").font(.system(size: 12, weight: .bold))
                Text("New item")
            }
            .font(BowerFont.ui(14, weight: .semibold))
            .foregroundStyle(theme.text)
            .padding(.vertical, 9)
            .padding(.horizontal, 16)
            .background(theme.subtle)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct Hairline: View {
    @Environment(\.bower) private var theme
    var body: some View { Rectangle().fill(theme.line).frame(height: 0.5) }
}
