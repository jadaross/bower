import SensitiveContentAnalysis
import UIKit

/// The on-device nudity check, run before a photo goes anywhere. Apple's own
/// framework: nothing leaves the phone, and a flagged photo is never added,
/// let alone uploaded.
///
/// It only works when the user has turned on Sensitive Content Warning in
/// Settings → Privacy & Security. With it off the policy is `.disabled`, every
/// photo passes, and the server's own subject check stands alone. That is
/// also why this is a courtesy layer and the server's check is the real one.
enum SensitiveContent {
    static var isAvailable: Bool {
        SCSensitivityAnalyzer().analysisPolicy != .disabled
    }

    static func isSensitive(_ image: UIImage) async -> Bool {
        let analyzer = SCSensitivityAnalyzer()
        guard analyzer.analysisPolicy != .disabled, let cg = image.cgImage else { return false }
        return (try? await analyzer.analyzeImage(cg))?.isSensitive ?? false
    }
}
