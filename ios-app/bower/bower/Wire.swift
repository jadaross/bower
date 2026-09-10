import Foundation

// Codable mirrors of `src/lib/types.ts`. The backend mixes conventions —
// `tag_data` is snake_case, `perPlatform` is camelCase — but snake_case
// conversion handles both, because a key with no underscores passes through
// unchanged. Keep this file in step with types.ts.

enum WireCondition: String, Codable, Sendable {
    case newWithTags = "New with tags"
    case excellent   = "Excellent"
    case good        = "Good"
    case fair        = "Fair"

    /// Defence in depth. The backend now constrains `condition` to these four
    /// with a structured-output enum, but an older or misbehaving build should
    /// show a slightly-wrong condition rather than fail the whole decode and
    /// blank the screen. Unknown → the neutral middle.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = WireCondition(rawValue: raw) ?? .good
    }
}

enum Confidence: String, Codable, Sendable {
    case low, medium, high

    /// Same reasoning as WireCondition: an unexpected value degrades to the
    /// most conservative reading (`low`) instead of dropping the Price Band.
    /// Covers both `confidence` and `sellLikelihood`.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = Confidence(rawValue: raw) ?? .low
    }
}

// MARK: - analyse

struct TagData: Codable, Sendable {
    let brand: String?
    let size: String?
    let sizeSystem: String?
    let fabricComposition: String?
    let countryOfManufacture: String?
    let careInstructions: String?
    let rnNumber: String?
    let styleNumber: String?
    let barcodeVisible: Bool
}

/// The Neutral Listing — the platform-agnostic description every platform's
/// wording is generated from. See CONTEXT.md.
struct NeutralListing: Codable, Sendable {
    var brand: String
    var clothingType: String
    var colourPrimary: String
    var colourSecondary: String?
    var condition: WireCondition
    var size: String
    var material: String
    var title: String
    var description: String
    var hashtags: [String]
    /// The search-free guess, from the photos alone. One range, no platform
    /// breakdown, no comparables. Never present it as researched — ADR-0005.
    var priceMin: Double
    var priceMax: Double
    var priceReasoning: String
    var gender: String?
    var mainCategory: String?
    var subcategory: String?
    /// Present when the read was asked for a platform: that platform's form
    /// fields, so the first listing shows without a format call.
    var fields: [ListingField]?

    /// The listing as the read already wrote it for one platform. Title,
    /// description and hashtags are in that platform's voice when a platform
    /// was named, so nothing needs rewriting before it is shown.
    var asPlatformListing: PlatformListing {
        PlatformListing(title: title, description: description, hashtags: hashtags, fields: fields)
    }
}

/// The read: the tag OCR pass, then the listing. No photo scores — nothing
/// showed them, and asking for them delayed the title.
struct AnalysisResult: Codable, Sendable {
    let tagData: TagData
    let listing: NeutralListing
    /// The Langfuse trace of the read, so feedback on the first listing attaches to it (#45).
    var traceId: String? = nil
}

// MARK: - format / refine

struct ListingField: Codable, Sendable, Identifiable {
    var id: String { label }
    let label: String
    let value: String
    let hint: String?
}

/// A Neutral Listing rewritten in one platform's voice.
struct PlatformListing: Codable, Sendable {
    var title: String
    var description: String
    var hashtags: [String]
    var fields: [ListingField]?
    /// The Langfuse trace this listing came from, so feedback can attach to it (#45).
    var traceId: String? = nil

    /// Hashtags with exactly one leading `#`. Depop's come from the model
    /// already prefixed; the neutral ones do not. Display and copy from here.
    var displayHashtags: [String] {
        hashtags.map { "#" + $0.drop(while: { $0 == "#" }) }
    }
}

// MARK: - valuate

/// Named `ComparableListing` rather than `Comparable`: the wire name collides
/// with Swift's own `Comparable` protocol, and shadowing that would be a trap
/// for anyone who later tries to sort these.
struct ComparableListing: Codable, Sendable, Identifiable {
    var id: String { title + String(price) }
    let title: String
    /// What the seller is asking today — never what anything sold for.
    let price: Double
    let currency: String
    let platform: String
    let url: String?
}

/// A low-to-high range for one platform. Never collapse this to one number.
struct PriceBand: Codable, Sendable {
    let low: Double
    let high: Double
    let currency: String
    let confidence: Confidence
    let sellLikelihood: Confidence
    let comparables: [ComparableListing]
    /// Shown verbatim. Says "listed at", never "sells for".
    let reasoning: String
}

struct RunnerUp: Codable, Sendable {
    let platform: Platform
    let listAt: Double
    let net: Double
}

/// Only present with more than one Enabled Platform, and only once a real
/// search has produced comparables. Never earned by the guess.
struct Recommendation: Codable, Sendable {
    let platform: Platform
    let listAt: Double
    let net: Double
    let currency: String
    let reasoning: String
    let runnersUp: [RunnerUp]
}

struct AllowanceState: Codable, Sendable, Equatable {
    let used: Int
    let limit: Int
    let resetsAt: String?

    var remaining: Int { max(0, limit - used) }
}

struct ValuationResponse: Codable, Sendable {
    let perPlatform: [String: PriceBand]
    let query: String
    let recommendation: Recommendation?
    let allowance: AllowanceState?
}

/// Deliberately narrower than the Neutral Listing — a valuation needs less
/// than a listing does.
struct ValuationItem: Codable, Sendable {
    let brand: String
    let clothingType: String
    let size: String
    let condition: WireCondition
    let colourPrimary: String?
    let material: String?

    init(from listing: NeutralListing) {
        brand = listing.brand
        clothingType = listing.clothingType
        size = listing.size
        condition = listing.condition
        colourPrimary = listing.colourPrimary
        material = listing.material
    }
}

// MARK: - history

/// A Valuation as stored on a history row. Mirrors the server's StoredValuation.
struct StoredValuation: Codable, Sendable {
    let perPlatform: [String: PriceBand]
    let query: String?
    let recommendation: Recommendation?
}

/// One past item. Text only — no photos are stored (ADR-0008).
struct HistoryItem: Codable, Sendable, Identifiable {
    let id: String
    let createdAt: String
    let sessionId: String?
    let brand: String
    let clothingType: String
    let title: String
    let colourPrimary: String?
    let size: String?
    let condition: String
    let priceMin: Double?
    let priceMax: Double?
    let preferredPlatform: Platform?
    /// The full Neutral Listing as first seen — for the detail view. Nil on older rows.
    let listing: NeutralListing?
    /// Present once a real price search ran for this item.
    let valuation: StoredValuation?
}

struct HistoryResponse: Codable, Sendable {
    let items: [HistoryItem]
}

// MARK: - profile

struct ProfileResponse: Codable, Sendable {
    let enabledPlatforms: [Platform]
    let preferredPlatform: Platform
    /// Raw wire values; `SellerNote(rawValue:)` drops any the app does not know.
    var sellerNotes: [String] = []
    let allowance: AllowanceState
}
