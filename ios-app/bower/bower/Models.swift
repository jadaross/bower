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
        case .depop:  "No seller fees · Gen-Z UK/US"
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

// MARK: - Seller notes

/// The things a listing may say about the seller rather than the garment. The
/// model cannot see any of them in a photo, so each is off until the user
/// switches it on in Profile; the server then writes the one agreed line per
/// platform (`src/lib/seller-notes.ts`). Raw values are the wire format.
enum SellerNote: String, CaseIterable, Identifiable, Codable {
    case smokeFree = "smoke_free"
    case petFree = "pet_free"
    case postsNextDay = "posts_next_day"
    case bundles

    var id: String { rawValue }

    var label: String {
        switch self {
        case .smokeFree:    "Smoke-free home"
        case .petFree:      "Pet-free home"
        case .postsNextDay: "Posts within a day"
        case .bundles:      "Happy to bundle"
        }
    }

    /// The line the listing ends with, in Vinted's register, for the preview.
    /// Mirrors `sellerNotesLine` on the server; the server's wording wins.
    static func previewLine(_ on: Set<SellerNote>) -> String {
        var parts: [String] = []
        if on.contains(.smokeFree) && on.contains(.petFree) {
            parts.append("From a smoke-free, pet-free home.")
        } else {
            if on.contains(.smokeFree) { parts.append("From a smoke-free home.") }
            if on.contains(.petFree) { parts.append("Pet-free home.") }
        }
        if on.contains(.postsNextDay) { parts.append("Posted within a day.") }
        if on.contains(.bundles) { parts.append("Happy to bundle.") }
        return parts.joined(separator: " ")
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
        case .serious:      "More professional"
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
        case .measurements: "Add a measurements line for the seller to complete, laid flat, in cm, suited to the garment (e.g. \"Pit to pit __ cm, length __ cm, sleeve __ cm\"; waist and inseam for trousers). Only if not already present. Never invent a number."
        case .hashtags:     "Expand the hashtags/keywords array with relevant search terms (no duplicates). Respect the platform cap (Depop 5, at most 2 brands; eBay none)."
        case .condition:    "Move the condition to the first or second line and make it concrete using only what the listing already says: name the flaws it mentions in plain words (mark, stain, hole, pilling, fading) or, if it mentions none, say \"no marks or damage that I can see\". Do not add new claims such as \"no smells\" or \"lining intact\"."
        case .vintage:      "Lean into the vintage angle only if the brand, tag or style already supports it; name the decade, never write \"rare\" or \"deadstock\"."
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

/// The four angles that matter. Suggestions, never slots; the user may ignore
/// every one of them. The fifth photo, if there is one, is for anything else,
/// a flaw most usefully.
enum SuggestedShot: String, CaseIterable, Identifiable {
    case front, back, tag, logo

    var id: String { rawValue }

    /// Photos per item. Four angles and one spare.
    static let maxPhotos = 5

    var label: String {
        switch self {
        case .front: "Front"
        case .back:  "Back"
        case .tag:   "Size tag"
        case .logo:  "Brand label"
        }
    }

    var hint: String {
        switch self {
        case .front: "Whole thing, flat or hung"
        case .back:  "Same framing as the front"
        case .tag:   "Size and material, flat and lit"
        case .logo:  "Neck or chest label, close in"
        }
    }

    var hue: Double {
        switch self {
        case .front: 28; case .back: 32; case .tag: 36; case .logo: 20
        }
    }
}

// MARK: - Navigation

/// Confirm was folded into `listing` — correction happens there under
/// "Not right?" rather than as a stop of its own. `how` is the one-time
/// "what bower does" page between sign-in and the platforms question.
enum Screen: String, Hashable {
    case signin, how, platforms, capture, analysing, listing, settings, history
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
        screen = session.hasSession ? (onboardingComplete ? .capture : .how) : .signin
    }

    /// After sign-in: pull the profile so Enabled Platforms and the allowance
    /// are the server's truth, then route past onboarding if it is done.
    func didSignIn() async {
        await loadProfile()
        screen = onboardingComplete ? .capture : .how
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
        Notifications.scheduleReset(reads: reads.limit, searches: searches.limit)
    }

    /// The server's word on the profile wins over whatever the device thought.
    func apply(_ p: ProfileResponse) {
        enabled = Set(p.enabledPlatforms)
        preferred = p.preferredPlatform
        sellerNotes = Set(p.sellerNotes.compactMap(SellerNote.init(rawValue:)))
        reads = p.allowance
        if let s = p.searches { searches = s }
    }

    func savePlatforms() async {
        if let p = try? await api.setEnabledPlatforms(orderedEnabled, preferred: preferred) { apply(p) }
    }

    func savePreferred(_ platform: Platform) async {
        preferred = platform
        if let p = try? await api.setPreferredPlatform(platform) { apply(p) }
    }

    /// Flips one note and saves the set. Optimistic: the toggle moves at once.
    /// Only the most recent save is allowed to settle the switches, otherwise
    /// two quick taps had the first response flick the second one back off
    /// until its own response arrived.
    private var sellerNotesSave = 0
    func toggleSellerNote(_ note: SellerNote) async {
        if sellerNotes.contains(note) { sellerNotes.remove(note) } else { sellerNotes.insert(note) }
        let ordered = SellerNote.allCases.filter { sellerNotes.contains($0) }
        sellerNotesSave += 1
        let mine = sellerNotesSave
        guard let p = try? await api.setSellerNotes(ordered), mine == sellerNotesSave else { return }
        apply(p)
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
        Notifications.clearScheduled()
        photos = []
        screen = .signin
    }

    /// Enabled Platforms. Read from the profile server-side — never sent by the
    /// client on a valuation request. See ARCHITECTURE.md.
    var enabled: Set<Platform> = Set(Platform.allCases)

    /// The one bower writes for first. Always one of `enabled`.
    var preferred: Platform = .depop

    /// What every listing may say about the seller. Off by default.
    var sellerNotes: Set<SellerNote> = []

    var photos: [CapturedPhoto] = []

    /// What the last read produced. Cleared with the photos on a new item.
    var analysis: AnalysisResult?

    /// The two meters. A generation (Price it) spends from `reads`; a deep
    /// research spends from `searches`. A nil limit is no limit.
    var reads = AllowanceState(used: 0, limit: 10)
    var searches = AllowanceState(used: 0, limit: 3)

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
