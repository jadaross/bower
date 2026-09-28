import SwiftUI
import Testing
import UIKit
@testable import bower

/// Every text colour the app draws, on every ground it sits on, in both
/// themes, meets WCAG AA (4.5:1). A palette change that makes any of them
/// harder to read fails here rather than on someone's phone.
///
/// Fills are not listed: satin, coral and moss as fills carry no text of
/// their own colour. Pollen is a fill only. It is 1.86:1 on a light card,
/// so it must never colour text.
struct PaletteContrastTests {
    static let themes: [(String, BowerTheme)] = [("light", .light), ("dark", .dark)]

    static let texts: [(String, KeyPath<BowerTheme, Color>)] = [
        ("text", \.text),
        ("muted", \.muted),
        ("accentText", \.accentText),
        ("errorText", \.errorText),
        ("confirmText", \.confirmText),
    ]

    static let grounds: [(String, KeyPath<BowerTheme, Color>)] = [
        ("bg", \.bg),
        ("card", \.card),
        ("subtle", \.subtle),
    ]

    @Test func textReadsOnEveryGround() {
        for (appearance, theme) in Self.themes {
            for (textName, text) in Self.texts {
                for (groundName, ground) in Self.grounds {
                    let ratio = contrast(theme[keyPath: text], theme[keyPath: ground])
                    #expect(ratio >= 4.5, "\(appearance) \(textName) on \(groundName) is \(ratio):1")
                }
            }
        }
    }

    /// The primary button: white on a satin fill, the same in both themes.
    @Test func primaryButtonLabelReads() {
        let ratio = contrast(.white, BowerTheme.light.satin)
        #expect(ratio >= 4.5, "white on satin is \(ratio):1")
    }

    /// A disabled primary button is muted on subtle: dimmer than enabled,
    /// but still readable, so it says what it will do.
    @Test func disabledButtonLabelReads() {
        for (appearance, theme) in Self.themes {
            let ratio = contrast(theme.muted, theme.subtle)
            #expect(ratio >= 4.5, "\(appearance) disabled label is \(ratio):1")
        }
    }
}

/// WCAG 2 contrast ratio, from relative luminance.
private func contrast(_ a: Color, _ b: Color) -> Double {
    let la = luminance(a), lb = luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
}

private func luminance(_ color: Color) -> Double {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
    func linear(_ c: CGFloat) -> Double {
        let c = Double(c)
        return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}
