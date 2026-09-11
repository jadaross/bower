import Foundation
import SwiftUI
import Testing
@testable import bower

/// Regenerates the native launch image from `LaunchMark`, so the picture iOS
/// shows before the app runs is the same view the app then draws. Writes into
/// the asset catalogue, so it only runs when asked:
///
///   test_sim with testRunnerEnv BOWER_RENDER_LAUNCH=1
///   (or xcodebuild test ... TEST_RUNNER_BOWER_RENDER_LAUNCH=1)
///
/// Run it after any change to the splash, then commit the PNGs.
@MainActor
struct LaunchImageTests {
    @Test func rendersTheLaunchImage() throws {
        guard ProcessInfo.processInfo.environment["BOWER_RENDER_LAUNCH"] == "1" else { return }

        let dir = URL(filePath: #filePath)
            .deletingLastPathComponent()   // bowerTests/
            .deletingLastPathComponent()   // bower/
            .appending(path: "bower/Assets.xcassets/LaunchLogo.imageset")

        for scale in [1, 2, 3] {
            // A little room so the italic's overhang and the arch's round caps
            // are never clipped; symmetric, so the centre does not move.
            let renderer = ImageRenderer(content: LaunchMark().padding(12))
            renderer.scale = CGFloat(scale)
            let image = try #require(renderer.uiImage)
            let png = try #require(image.pngData())
            let name = scale == 1 ? "LaunchLogo.png" : "LaunchLogo@\(scale)x.png"
            try png.write(to: dir.appending(path: name))
        }
    }

    /// The app icon, from the same `Arch` the app draws, so the icon and the
    /// mark on screen are never two drawings. Three appearances, 1024 pt:
    /// light is paper on satin (the design's "blue one"), dark is sheen on
    /// avenue, tinted is the mono mark with the dot knocked out, on black
    /// (iOS applies the tint itself).
    @Test func rendersTheAppIcon() throws {
        guard ProcessInfo.processInfo.environment["BOWER_RENDER_LAUNCH"] == "1" else { return }

        let dir = URL(filePath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appending(path: "bower/Assets.xcassets/AppIcon.appiconset")

        let satin = Color(hex: 0x2B3AA8), paper = Color(hex: 0xF5EFE3), pollen = Color(hex: 0xE8B547)
        let avenue = Color(hex: 0x171A2E), sheen = Color(hex: 0x7BA9E8)
        // The mark at 70% of the tile, as the design's 84-in-120 icon has it.
        let icons: [(String, AnyView)] = [
            ("icon-light.png", AnyView(ZStack { satin; Arch(size: 717, stroke: paper, dot: pollen) })),
            ("icon-dark.png", AnyView(ZStack { avenue; Arch(size: 717, stroke: sheen, dot: pollen) })),
            ("icon-tinted.png", AnyView(ZStack { Color.black; Arch(size: 717, stroke: .white, dot: .black) })),
        ]
        for (name, view) in icons {
            let renderer = ImageRenderer(content: view.frame(width: 1024, height: 1024))
            renderer.scale = 1
            let image = try #require(renderer.uiImage)
            let png = try #require(image.pngData())
            try png.write(to: dir.appending(path: name))
        }
    }
}
