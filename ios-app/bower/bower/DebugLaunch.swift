import SwiftUI

/// Launch arguments for putting the stub in a state to look at, since the
/// simulator cannot be tapped from outside (Xcode 27). DEBUG only: in
/// Release every value is nil and every modifier does nothing.
///
///   -bowerSheet tips | help | about | feedback | comps | detail | email
///       Opens that sheet on the screen that owns it: Home's three, the
///       listing's "Tell us" and comparables, Profile's feedback, History's
///       first item, sign-in's email form.
///   -bowerHelpStep 0…3     The Help sheet, on that step.
///   -bowerScroll 0…1       Every page starts scrolled that far down.
///   -bowerPhotos 1…5       Home with that many photos in the pile.
enum DebugLaunch {
    static func value(_ flag: String) -> String? {
        #if DEBUG
        let args = CommandLine.arguments
        guard args.contains("-bowerStub"), let i = args.firstIndex(of: flag), i + 1 < args.count else { return nil }
        return args[i + 1]
        #else
        return nil
        #endif
    }

    static func sheet(_ name: String) -> Bool { value("-bowerSheet") == name }

    static var helpStep: Int? { value("-bowerHelpStep").flatMap(Int.init) }

    static var scroll: UnitPoint? {
        guard let v = value("-bowerScroll").flatMap(Double.init) else { return nil }
        return UnitPoint(x: 0.5, y: min(max(v, 0), 1))
    }

    /// Stand-ins for photos: a coloured card with the angle's symbol on it.
    static var photos: [CapturedPhoto] {
        guard let n = value("-bowerPhotos").flatMap(Int.init) else { return [] }
        let tints: [UIColor] = [.systemTeal, .systemIndigo, .systemOrange, .systemPink, .systemGreen]
        return (0..<min(max(n, 0), SuggestedShot.maxPhotos)).map { i in
            let shot = i < SuggestedShot.allCases.count ? SuggestedShot.allCases[i] : nil
            let image = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 800)).image { ctx in
                tints[i].setFill()
                ctx.fill(CGRect(x: 0, y: 0, width: 600, height: 800))
                let symbol = UIImage(systemName: shot?.symbol ?? "sparkles",
                                     withConfiguration: UIImage.SymbolConfiguration(pointSize: 160))?
                    .withTintColor(.white, renderingMode: .alwaysOriginal)
                symbol?.draw(in: CGRect(x: 200, y: 300, width: 200, height: 200))
            }
            return CapturedPhoto(image: image, data: image.jpegData(compressionQuality: 0.7) ?? Data(), shot: shot)
        }
    }
}

extension View {
    /// Starts a scroll view where `-bowerScroll` says; untouched otherwise.
    @ViewBuilder func debugScrollAnchor() -> some View {
        if let anchor = DebugLaunch.scroll {
            defaultScrollAnchor(anchor)
        } else {
            self
        }
    }
}
