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
}
