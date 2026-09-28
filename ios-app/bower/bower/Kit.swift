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

// MARK: - Motion

/// The one motion language. Three kinds of change, three ways to move, so the
/// same kind of change always feels the same wherever it happens. Each turns
/// into a short fade when Reduce Motion is on.
enum Motion {
    static var reduced: Bool { UIAccessibility.isReduceMotionEnabled }

    /// State changes: toggles, chips, banners, fills. 160ms, strong ease-out.
    static var quick: Animation { .timingCurve(0.23, 1, 0.32, 1, duration: 0.16) }
    /// Layout: sliding highlights, things making room, screens. No bounce.
    static var move: Animation { reduced ? .easeOut(duration: 0.2) : .spring(response: 0.3, dampingFraction: 1) }
    /// The few big moments: the title landing, the Ask, the notifications.
    static var arrive: Animation { reduced ? .easeOut(duration: 0.2) : .spring(response: 0.45, dampingFraction: 0.78) }
    /// One whole screen crossfading to another: the splash lifting, the read
    /// turning into its failure page, a step into or out of a full-bleed page.
    static var fade: Animation { .easeOut(duration: 0.2) }

    /// Fades in and rises a few points. For anything that appears in place.
    static var rise: AnyTransition { reduced ? .opacity : .opacity.combined(with: .offset(y: 8)) }
    /// For things added to or taken from a set (photos in the pile).
    static var pop: AnyTransition { reduced ? .opacity : .opacity.combined(with: .scale(scale: 0.94)) }
    /// Sharpens into place: fades up from a short blur. For text that replaces text.
    static var sharpen: AnyTransition {
        reduced ? .opacity : .modifier(active: Blurred(radius: 6, y: 12), identity: Blurred(radius: 0, y: 0))
    }
    /// A crossfade softened by a slight blur, so old and new text never read as two layers.
    static var soften: AnyTransition {
        reduced ? .opacity : .modifier(active: Blurred(radius: 2, y: 0), identity: Blurred(radius: 0, y: 0))
    }
}

private struct Blurred: ViewModifier {
    let radius: CGFloat
    let y: CGFloat
    func body(content: Content) -> some View {
        content.blur(radius: radius).opacity(radius == 0 ? 1 : 0).offset(y: y)
    }
}

/// Rows that arrive together come in one after another, a few hundredths of
/// a second apart, rising a few points. Decorative: nothing waits on it.
struct StaggerIn: ViewModifier {
    let index: Int
    var step: Double = 0.04
    /// Off, the rows are simply there: for lists seen often (a tab), which
    /// cascade only the first time.
    var enabled: Bool = true
    @State private var shown = false

    func body(content: Content) -> some View {
        let visible = shown || !enabled
        content
            .opacity(visible ? 1 : 0)
            .offset(y: visible || Motion.reduced ? 0 : 8)
            .onAppear {
                guard enabled else { return }
                withAnimation(Motion.move.delay(Double(index) * step)) { shown = true }
            }
    }
}

extension View {
    func staggerIn(_ index: Int, step: Double = 0.04, enabled: Bool = true) -> some View {
        modifier(StaggerIn(index: index, step: step, enabled: enabled))
    }
}

/// Every pressable thing shrinks a touch while held, so a tap always feels
/// heard. Big surfaces press less so they don't lurch. With Reduce Motion
/// the press dims instead.
struct BowerPress: ButtonStyle {
    var scale: CGFloat = 0.97
    /// Extra tap area around a small label, without moving the layout, so a
    /// one-word text button still meets 44pt.
    var slop: EdgeInsets = EdgeInsets()

    func makeBody(configuration: Configuration) -> some View {
        let down = configuration.isPressed
        configuration.label
            .padding(slop)
            .contentShape(Rectangle())
            .padding(EdgeInsets(top: -slop.top, leading: -slop.leading, bottom: -slop.bottom, trailing: -slop.trailing))
            .scaleEffect(down && !Motion.reduced ? scale : 1)
            .opacity(down && Motion.reduced ? 0.7 : 1)
            .animation(.timingCurve(0.23, 1, 0.32, 1, duration: 0.12), value: down)
    }
}

extension ButtonStyle where Self == BowerPress {
    static var bowerPress: BowerPress { BowerPress() }
    static var bowerPressLarge: BowerPress { BowerPress(scale: 0.985) }
    /// For one- or two-word text buttons (Done, Tips, Clear, Reset): the same
    /// press, with the tap area grown to 44pt tall.
    static var bowerPressText: BowerPress { BowerPress(slop: EdgeInsets(top: 14, leading: 6, bottom: 14, trailing: 6)) }
}

/// The bars' ground: the theme's chrome tint over a blur, so what scrolls
/// underneath softens instead of reading through the labels.
struct ChromeBackground: View {
    @Environment(\.bower) private var theme
    var body: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial)
            theme.chrome
        }
        .ignoresSafeArea(edges: .bottom)
    }
}

// MARK: - Type

extension View {
    /// The wordmark is two texts, the word and its coral full stop, so it
    /// is read as one: "bower", never "bower" then "period".
    func wordmarkAccessibility(_ name: String = "bower") -> some View {
        accessibilityElement(children: .ignore).accessibilityLabel(name)
    }
}

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
            .font(BowerFont.mono(.label))
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
            Text("\(symbol)\(low)").font(BowerFont.priceFigure(size))
            Text("–")
                .font(BowerFont.priceFigure(size * 0.6))
                .opacity(0.5)
                .padding(.horizontal, 3)
            Text("\(symbol)\(high)").font(BowerFont.priceFigure(size))
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
            .font(BowerFont.ui(small ? .footnote : .callout, weight: .semibold))
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
        .buttonStyle(.bowerPress)
        .disabled(disabled)
        .animation(Motion.quick, value: disabled)
    }

    private var foreground: Color {
        switch kind {
        case .primary:   disabled ? theme.muted : .white
        case .secondary: theme.text
        case .quiet:     theme.accentText
        case .danger:    theme.errorText
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
    /// What VoiceOver calls the switch. The row's own text is read with it.
    var label: String = ""

    @Environment(\.bower) private var theme

    var body: some View {
        let c = tint ?? theme.accentText
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
        .animation(Motion.move, value: isOn)
        .sensoryFeedback(.selection, trigger: isOn)
        // Drawn as a button, heard as a switch: its name, on or off, and a
        // double tap that flips it.
        .accessibilityRepresentation { Toggle(label, isOn: $isOn) }
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
    @Namespace private var pill

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options) { o in
                let active = o.id == selection
                Button { withAnimation(Motion.move) { selection = o.id } } label: {
                    HStack(spacing: 5) {
                        if let dot = o.dot {
                            Circle().fill(dot).frame(width: 6, height: 6)
                        }
                        Text(o.label)
                    }
                    .font(BowerFont.ui(.footnote, weight: active ? .semibold : .medium))
                    .foregroundStyle(active ? theme.text : theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, small ? 7 : 9)
                    .background {
                        // One highlight that slides to the chosen segment.
                        if active {
                            RoundedRectangle(cornerRadius: 9)
                                .fill(theme.card)
                                .overlay(RoundedRectangle(cornerRadius: 9).stroke(theme.line, lineWidth: 0.5))
                                .matchedGeometryEffect(id: "pill", in: pill)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(active ? .isSelected : [])
            }
        }
        .padding(3)
        .background(theme.subtle)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.line, lineWidth: 0.5))
        .sensoryFeedback(.selection, trigger: selection)
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
            .font(BowerFont.ui(.body, weight: .semibold))
            .foregroundStyle(theme.text)
            .padding(.vertical, 9)
            .padding(.horizontal, 16)
            .background(theme.subtle)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(theme.line, lineWidth: 1))
        }
        .buttonStyle(.bowerPress)
    }
}

struct Hairline: View {
    @Environment(\.bower) private var theme
    var body: some View { Rectangle().fill(theme.line).frame(height: 0.5) }
}

// MARK: - Why bower

/// The story behind the name, shared between the one-time "why bower" onboarding
/// page and the About sheet behind a tap on the mark, so it reads the same
/// wherever it turns up.
enum BowerOrigin {
    static let bowerbird =
        "A bower isn't a nest. It's a small stage a bowerbird clears and dresses with whatever it can find, arranged just so, to be chosen. Bowerbirds are fussy about the arrangement, and fussiest of all about blue: bottle caps, berries, feathers, anything rare enough to be worth showing off."
    static let theStage =
        "The clothes are the same either way. Bower just builds the stage: the brand, the size, the price, the words, so what you already own gets a proper look."
}

/// The bower and its display: six blue things a bowerbird would prize (berries,
/// bottle caps, a shard of glass, a feather) laid out in front of the arch,
/// smallest to largest, palest to deepest. The story in `BowerOrigin`, drawn.
struct BowerbirdDisplay: View {
    /// Plays the arranging: each piece is dropped in, in the order he found
    /// them rather than the order they sit, and lands in its place. The
    /// feather lands crooked and is straightened a beat later, because he is
    /// fussy. Off, the display is simply there.
    var arrange = false
    /// The arch beside the display. Off where the mark is already on screen.
    var bower = true

    @Environment(\.bower) private var theme

    /// Left to right as they finally sit. `order` is when each one arrives.
    private var pieces: [Treasure.Piece] {
        [
            .init(kind: .berry, color: theme.shell, size: 13, order: 1, from: CGSize(width: 30, height: -56), spin: -30),
            .init(kind: .shard, color: theme.shell, size: 16, order: 4, from: CGSize(width: 40, height: -50), spin: 70),
            .init(kind: .berry, color: theme.sheen, size: 19, order: 2, from: CGSize(width: 24, height: -60), spin: 20),
            .init(kind: .feather, color: theme.sheen, size: 38, order: 5, from: CGSize(width: 46, height: -58), spin: -50,
                  rest: -8, landsAt: 22),
            .init(kind: .cap, color: theme.satin, size: 25, order: 0, from: CGSize(width: 34, height: -52), spin: 40),
            .init(kind: .berry, color: theme.satin, size: 31, order: 3, from: CGSize(width: 28, height: -64), spin: -25),
        ]
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 18) {
            if bower {
                // The arch's base sits at 84% of its box: stand it on the ground.
                Arch(size: 84)
                    .padding(.bottom, -84 * 0.16)
            }
            HStack(alignment: .bottom, spacing: 13) {
                ForEach(Array(pieces.enumerated()), id: \.offset) { _, piece in
                    Treasure(piece: piece, arrange: arrange)
                }
            }
            .padding(.bottom, 1)
        }
        // The ground they are laid out on, a little wider than the display.
        .background(alignment: .bottom) {
            Capsule().fill(theme.line).frame(height: 1).padding(.horizontal, -8)
        }
        .accessibilityHidden(true)
    }
}

/// One blue thing, dropped in from above and to the right, landing with a
/// little give (`Motion.arrive`).
private struct Treasure: View {
    struct Piece {
        enum Kind { case berry, cap, shard, feather }
        let kind: Kind
        let color: Color
        let size: CGFloat
        /// When it arrives, 0 first.
        let order: Int
        /// Where it is dropped from, relative to where it sits.
        let from: CGSize
        /// How far it is turned as it falls.
        let spin: Double
        /// How it sits in the end.
        var rest: Double = 0
        /// How it first lands, if not already straight: the fussy correction.
        var landsAt: Double?
    }

    let piece: Piece
    let arrange: Bool

    @State private var landed = false
    @State private var straightened = false

    var body: some View {
        let still = !arrange
        let down = landed || still
        let angle = still || straightened ? piece.rest : (landed ? (piece.landsAt ?? piece.rest) : piece.spin)
        shape
            .rotationEffect(.degrees(Motion.reduced ? piece.rest : angle))
            .offset(down || Motion.reduced ? .zero : piece.from)
            .scaleEffect(down || Motion.reduced ? 1 : 0.9)
            .opacity(down ? 1 : 0)
            .task {
                guard arrange, !landed else { return }
                if Motion.reduced {
                    // No travel: they are simply there, together.
                    try? await Task.sleep(for: .milliseconds(250))
                    withAnimation(Motion.fade) { landed = true; straightened = true }
                    return
                }
                try? await Task.sleep(for: .milliseconds(300 + piece.order * 140))
                withAnimation(Motion.arrive) { landed = true }
                guard piece.landsAt != nil else { straightened = true; return }
                try? await Task.sleep(for: .milliseconds(520))
                withAnimation(Motion.move) { straightened = true }
            }
    }

    @Environment(\.bower) private var theme

    /// A faint satin edge, so the palest blue still reads on the light ground.
    private var edge: Color { theme.satin.opacity(0.18) }

    @ViewBuilder private var shape: some View {
        let s = piece.size
        switch piece.kind {
        case .berry:
            Circle().fill(piece.color)
                .overlay(Circle().strokeBorder(edge, lineWidth: 0.75))
                .overlay(alignment: .topLeading) {
                    // A glint, so it reads as something shiny, not a dot.
                    Circle().fill(.white.opacity(0.45))
                        .frame(width: s * 0.26, height: s * 0.26)
                        .offset(x: s * 0.2, y: s * 0.18)
                }
                .frame(width: s, height: s)
        case .cap:
            Circle().fill(piece.color)
                .overlay(Circle().strokeBorder(.white.opacity(0.35), lineWidth: 1.5).padding(s * 0.18))
                .frame(width: s, height: s)
        case .shard:
            RoundedRectangle(cornerRadius: 3).fill(piece.color)
                .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(edge, lineWidth: 0.75))
                .frame(width: s * 0.72, height: s * 0.72)
                .rotationEffect(.degrees(45))
                .frame(width: s, height: s)
        case .feather:
            Ellipse().fill(piece.color)
                .overlay(Ellipse().strokeBorder(edge, lineWidth: 0.75))
                .overlay(Capsule().fill(.white.opacity(0.4)).frame(height: 1).padding(.horizontal, 3))
                .frame(width: s, height: s * 0.28)
        }
    }
}

