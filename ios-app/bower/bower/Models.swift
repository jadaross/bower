import SwiftUI
import UIKit

// MARK: - Platform

/// A resale destination. bower writes for them and values against them; it does
/// not post to them. See CONTEXT.md.
enum Platform: String, CaseIterable, Identifiable, Codable {
    case vinted, depop, ebay

    var id: String { rawValue }

    var name: String {
        switch self {
        case .vinted: "Vinted"
        case .depop:  "Depop"
        case .ebay:   "eBay"
        }
    }

    /// Fees are display-only. Ranking never uses them — see recommend.ts.
    var note: String {
        switch self {
        case .vinted: "No seller fees · EU buyers"
        case .depop:  "10% fee · Gen-Z UK/US"
        case .ebay:   "13.25% fee · global reach"
        }
    }

    var tint: Color {
        switch self {
        case .vinted: Color(hex: 0x09B1BA)
        case .depop:  Color(hex: 0xF00D2D)
        case .ebay:   Color(hex: 0x0064D2)
        }
    }
}

// MARK: - Refinement Chips

/// Kept in step with `src/lib/chip-vocab.ts` — the ids are the wire format and
/// must match exactly. See CLAUDE.md.
enum RefinementChip: String, CaseIterable, Identifiable {
    case shorter, longer, casual, serious
    case measurements, hashtags, condition, vintage

    var id: String { rawValue }

    var label: String {
        switch self {
        case .shorter:      "Shorter"
        case .longer:       "More detail"
        case .casual:       "More casual"
        case .serious:      "Less serious"
        case .measurements: "+ Measurements"
        case .hashtags:     "+ Hashtags"
        case .condition:    "Stress condition"
        case .vintage:      "More vintage feel"
        }
    }

    /// What actually goes over the wire — /api/refine takes natural-language
    /// instructions, and nothing server-side translates ids. Verbatim from
    /// chip-vocab.ts.
    var instruction: String {
        switch self {
        case .shorter:      "Rewrite shorter — cut to the essentials, drop filler."
        case .longer:       "Add more useful detail without padding or repetition."
        case .casual:       "Make it more casual and conversational — natural, friendly, not corporate."
        case .serious:      "Tone down the emojis and fashion-speak; keep it plain and honest."
        case .measurements: "Add a measurements section: chest 23\", length 26\", sleeve 25\" (only if not already present)."
        case .hashtags:     "Expand the hashtags/keywords array with relevant search terms (no duplicates)."
        case .condition:    "Stress the condition: be explicit that there are no rips, stains, smells, or repairs, and that the lining is intact."
        case .vintage:      "Lean into the vintage angle — mention era (90s/2000s) and broken-in character."
        }
    }
}

enum Tone: String, CaseIterable, Codable {
    case casual, professional

    var label: String {
        switch self {
        case .casual:       "Casual"
        case .professional: "More professional"
        }
    }
}

// MARK: - Photos

struct CapturedPhoto: Identifiable, Equatable {
    let id = UUID()
    let image: UIImage
    /// JPEG, already downscaled — what actually goes over the wire.
    let data: Data
    var shot: SuggestedShot?

    static func == (a: CapturedPhoto, b: CapturedPhoto) -> Bool { a.id == b.id }
}

/// Suggestions, never slots. The user may ignore every one of them.
enum SuggestedShot: String, CaseIterable, Identifiable {
    case front, back, tag, logo, detail, flaw

    var id: String { rawValue }

    var label: String {
        switch self {
        case .front:  "Front"
        case .back:   "Back"
        case .tag:    "Garment tag"
        case .logo:   "Brand label"
        case .detail: "Detail"
        case .flaw:   "Any flaw"
        }
    }

    var hint: String {
        switch self {
        case .front:  "Whole thing, flat or hung"
        case .back:   "Same framing as the front"
        case .tag:    "Size and material, flat and lit"
        case .logo:   "Neck or chest label, close in"
        case .detail: "Buttons, stitching, hardware"
        case .flaw:   "Fade, hole, mark — buyers ask"
        }
    }

    var hue: Double {
        switch self {
        case .front: 28; case .back: 32; case .tag: 36
        case .logo: 20; case .detail: 24; case .flaw: 40
        }
    }
}

// MARK: - Navigation

/// Six screens. Confirm was folded into `listing` — correction happens there
/// under "Not right?" rather than as a stop of its own.
enum Screen: String, Hashable {
    case signin, platforms, capture, analysing, listing, settings
}

// MARK: - App state

@Observable
final class AppState {
    let session: SupabaseSession
    let api: any BowerAPIClient

    var screen: Screen = .signin

    /// Whether the first-run platforms screen has been completed on this
    /// device. Local, not server-side: the profile row exists from sign-up
    /// with all three platforms enabled, so the server cannot tell "never
    /// asked" from "chose all three". Good enough for v1.
    var onboardingComplete: Bool {
        get { UserDefaults.standard.bool(forKey: "onboardingComplete") }
        set { UserDefaults.standard.set(newValue, forKey: "onboardingComplete") }
    }

    init(session: SupabaseSession, api: any BowerAPIClient) {
        self.session = session
        self.api = api
        screen = session.hasSession ? (onboardingComplete ? .capture : .platforms) : .signin
    }

    /// After sign-in: pull the profile so Enabled Platforms and the allowance
    /// are the server's truth, then route past onboarding if it is done.
    func didSignIn() async {
        await loadProfile()
        screen = onboardingComplete ? .capture : .platforms
    }

    /// Called once at launch. A returning user's Enabled Platforms, Preferred
    /// Platform and allowance live on the server; without this the app shows
    /// the hardcoded defaults until Settings is opened — which read as "it
    /// forgot what I chose".
    func loadProfileIfSignedIn() async {
        guard session.hasSession else { return }
        await loadProfile()
    }

    func loadProfile() async {
        guard let p = try? await api.profile() else { return }
        apply(p)
    }

    /// The server's word on the profile wins over whatever the device thought.
    func apply(_ p: ProfileResponse) {
        enabled = Set(p.enabledPlatforms)
        preferred = p.preferredPlatform
        used = p.allowance.used
        allowance = p.allowance.limit
    }

    func savePlatforms() async {
        if let p = try? await api.setEnabledPlatforms(orderedEnabled, preferred: preferred) { apply(p) }
    }

    func savePreferred(_ platform: Platform) async {
        preferred = platform
        if let p = try? await api.setPreferredPlatform(platform) { apply(p) }
    }

    func deleteAccount() async throws {
        try await api.deleteAccount()
        await session.signOut()
        onboardingComplete = false
        photos = []; analysis = nil
        screen = .signin
    }

    func signOut() async {
        await session.signOut()
        photos = []
        screen = .signin
    }

    /// Enabled Platforms. Read from the profile server-side — never sent by the
    /// client on a valuation request. See ARCHITECTURE.md.
    var enabled: Set<Platform> = Set(Platform.allCases)

    /// The one bower writes for first. Always one of `enabled`.
    var preferred: Platform = .depop

    var photos: [CapturedPhoto] = []

    /// What the last read produced. Cleared with the photos on a new item.
    var analysis: AnalysisResult?

    /// The Allowance meter. A read costs one; a search costs one.
    var used: Int = 0
    var allowance: Int = 40

    var remaining: Int { max(0, allowance - used) }

    func enable(_ platform: Platform, _ on: Bool) -> Bool {
        if !on && enabled.count == 1 { return false }
        if on { enabled.insert(platform) } else { enabled.remove(platform) }
        if !enabled.contains(preferred), let next = orderedEnabled.first {
            preferred = next
        }
        return true
    }

    var orderedEnabled: [Platform] {
        Platform.allCases.filter { enabled.contains($0) }
    }

    func newItem() {
        photos = []
        analysis = nil
        screen = .capture
    }
}
