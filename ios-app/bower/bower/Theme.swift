import SwiftUI

extension Color {
    /// `Color(hex: 0x2B3AA8)` — the palette is written in hex everywhere else,
    /// so it is written in hex here too rather than translated into components.
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >>  8) & 0xFF) / 255,
            blue:  Double( hex        & 0xFF) / 255,
            opacity: opacity
        )
    }
}

/// The palette. Surfaces change between light and dark; the accents do not.
struct BowerTheme {
    // Surfaces — these differ per appearance.
    let bg: Color
    let card: Color
    let subtle: Color
    let line: Color
    let text: Color
    let muted: Color
    let chrome: Color

    // Text tokens — the accents as text and icons. A fill and a text colour
    // are different tokens: satin fills pass in both themes, but satin text
    // on a dark ground does not, so text and icons use these instead.
    let accentText: Color    // links, icon buttons, selection: satin, sheen in dark
    let errorText: Color     // error lines: coral, deepened or lifted to read
    let confirmText: Color   // "Copied", ticks, thumbs: moss, lifted in dark

    // Accents — shared by both appearances. See CLAUDE.md.
    let satin  = Color(hex: 0x2B3AA8)   // primary: buttons, links, selection
    let sheen  = Color(hex: 0x7BA9E8)   // progress and fills on dark
    let shell  = Color(hex: 0xDCE3F0)   // pale blue ground
    let coral  = Color(hex: 0xE1563C)   // the wordmark's stop, errors, "guess"
    let pollen = Color(hex: 0xE8B547)   // the mark's dot, warnings: a fill, never text
    let moss   = Color(hex: 0x3F6B4A)   // confirmed, copied, evidence
    let ink    = Color(hex: 0x1B1A20)
    let avenue = Color(hex: 0x171A2E)   // full-bleed dark screens

    static let light = BowerTheme(
        bg:     Color(hex: 0xFBF7EF),
        card:   Color(hex: 0xFFFDF8),
        subtle: Color(hex: 0xF1EADC),
        line:   Color(hex: 0xE5DECE),
        text:   Color(hex: 0x1B1A20),
        muted:  Color(hex: 0x6E6862),
        chrome: Color(hex: 0xFBF7EF, opacity: 0.86),
        accentText:  Color(hex: 0x2B3AA8),
        errorText:   Color(hex: 0xB83C26),
        confirmText: Color(hex: 0x3F6B4A)
    )

    static let dark = BowerTheme(
        bg:     Color(hex: 0x131521),
        card:   Color(hex: 0x1C1F30),
        subtle: Color(hex: 0x232739),
        line:   Color(hex: 0x2E3348),
        text:   Color(hex: 0xF2EEE6),
        muted:  Color(hex: 0x8D93A8),
        chrome: Color(hex: 0x131521, opacity: 0.86),
        accentText:  Color(hex: 0x7BA9E8),
        errorText:   Color(hex: 0xEB6F56),
        confirmText: Color(hex: 0x7FB08A)
    )

    static func of(_ scheme: ColorScheme) -> BowerTheme {
        scheme == .dark ? .dark : .light
    }
}

/// Bundled under Fonts/ and registered in Info.plist. Instrument Serif ships
/// as two static faces; Geist and Geist Mono are variable fonts, addressed by
/// family name so the weight axis responds to `.weight()`.
enum BowerFont {
    static func serif(_ size: CGFloat) -> Font {
        .custom("InstrumentSerif-Italic", size: size)
    }

    static func serifUpright(_ size: CGFloat) -> Font {
        .custom("InstrumentSerif-Regular", size: size)
    }

    static func ui(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Geist", size: size).weight(weight)
    }

    static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Geist Mono", size: size).weight(weight)
    }
    // MARK: The scale
    //
    // Every size the app sets comes from these steps, so the same kind of
    // text is the same size on every screen and nothing is under 11pt. The
    // free sizes above go once every screen has moved over (#89). Each step
    // still scales with Dynamic Type, relative to body.

    /// Geist, the UI face.
    enum Step: CGFloat {
        case caption = 11      // fine print under a block, tab labels
        case footnote = 12.5   // helper lines, row details, metadata
        case body = 14.5       // rows, paragraphs, field values
        case callout = 16      // buttons, emphasised rows
        case title = 19        // card and sheet headings
        case largeTitle = 24   // the biggest Geist on a screen
    }

    /// Geist Mono: section labels (`Kicker`) and counters.
    enum MonoStep: CGFloat {
        case label = 11
    }

    /// Instrument Serif, italic or upright: headlines and the wordmark.
    /// Price figures inside `PriceRange` keep their own sizes.
    enum Display: CGFloat {
        case small = 22        // a sheet's headline
        case medium = 30       // a screen's headline
        case large = 38        // onboarding headlines
        case hero = 60         // the sign-in wordmark and splash
    }

    static func ui(_ step: Step, weight: Font.Weight = .regular) -> Font {
        ui(step.rawValue, weight: weight)
    }

    static func mono(_ step: MonoStep, weight: Font.Weight = .regular) -> Font {
        mono(step.rawValue, weight: weight)
    }

    static func serif(_ step: Display) -> Font {
        serif(step.rawValue)
    }

    static func serifUpright(_ step: Display) -> Font {
        serifUpright(step.rawValue)
    }
}

private struct BowerThemeKey: EnvironmentKey {
    static let defaultValue = BowerTheme.light
}

extension EnvironmentValues {
    var bower: BowerTheme {
        get { self[BowerThemeKey.self] }
        set { self[BowerThemeKey.self] = newValue }
    }
}
