import Foundation

/// A stub session, so the app builds, previews and runs before the Supabase
/// package is added. Swapped for the real one in `SupabaseSession`.
struct StubSession: SessionProviding {
    var token: String? = "stub-token"
    func accessToken() async -> String? { token }
    func refresh() async throws -> String { token ?? "stub-token" }
    func signOut() async {}
}

/// Fixture data matching the Claude Design prototype, so screens can be built
/// and looked at before the network exists. Delays are deliberate — a screen
/// that has never seen a slow response is a screen with no loading state.
struct StubAPI: BowerAPIClient {
    var delay: Duration = .milliseconds(600)

    private func wait() async { try? await Task.sleep(for: delay) }

    func profile() async throws -> ProfileResponse {
        await wait()
        return ProfileResponse(
            enabledPlatforms: [.vinted, .depop, .ebay],
            preferredPlatform: .depop,
            allowance: AllowanceState(used: 11, limit: 40, resetsAt: "2026-10-01T00:00:00Z")
        )
    }

    func setEnabledPlatforms(_ platforms: [Platform], preferred: Platform) async throws -> ProfileResponse {
        await wait()
        return ProfileResponse(enabledPlatforms: platforms, preferredPlatform: preferred,
                               allowance: AllowanceState(used: 11, limit: 40, resetsAt: nil))
    }

    func setPreferredPlatform(_ platform: Platform) async throws -> ProfileResponse {
        await wait()
        return ProfileResponse(enabledPlatforms: [.vinted, .depop, .ebay], preferredPlatform: platform,
                               allowance: AllowanceState(used: 11, limit: 40, resetsAt: nil))
    }

    func analyse(images: [Data], tone: Tone, platform: Platform?,
                 onTitle: @escaping @Sendable (String) -> Void) async throws -> AnalysisResult {
        try await Task.sleep(for: .seconds(1))
        onTitle("Carhartt Detroit Jacket — Hamilton Brown, Size M")
        try await Task.sleep(for: .seconds(1))
        return AnalysisResult(
            tagData: TagData(
                brand: "Carhartt", size: "M", sizeSystem: "US",
                fabricComposition: "100% cotton duck", countryOfManufacture: "Mexico",
                careInstructions: "Machine wash cold", rnNumber: nil, styleNumber: "J97",
                barcodeVisible: false
            ),
            listing: NeutralListing(
                brand: "Carhartt", clothingType: "Detroit jacket",
                colourPrimary: "Hamilton brown", colourSecondary: nil,
                condition: .good, size: "M", material: "100% cotton duck",
                title: "Carhartt Detroit Jacket — Hamilton Brown, Size M",
                description: "Carhartt Detroit jacket in Hamilton brown, size M. 100% cotton duck with a corduroy collar and blanket lining. Good nick — light wear at the cuffs, no rips or stains, all poppers work.",
                hashtags: ["carhartt", "workwear", "detroitjacket"],
                priceMin: 18, priceMax: 26,
                priceReasoning: "Judged from the photos alone — no live listings were checked.",
                gender: "men", mainCategory: "Coats & jackets", subcategory: "Workwear",
                fields: platform == nil ? nil : [
                    ListingField(label: "Category", value: "Men > Clothing > Outerwear > Coats & jackets", hint: nil),
                    ListingField(label: "Brand", value: "Carhartt", hint: nil),
                    ListingField(label: "Size", value: "M", hint: nil),
                    ListingField(label: "Condition", value: "Good", hint: nil),
                    ListingField(label: "Colour", value: "Brown", hint: nil),
                    ListingField(label: "Material", value: "Cotton", hint: nil),
                    ListingField(label: "Parcel size", value: "Large", hint: nil),
                ]
            )
        )
    }

    func deleteAccount() async throws { await wait() }

    func feedback(traceId: String, name: String, value: Int?) async throws {}

    func history() async throws -> [HistoryItem] {
        await wait()
        func band(_ lo: Double, _ hi: Double, _ p: Platform) -> PriceBand {
            PriceBand(low: lo, high: hi, currency: "GBP", confidence: .medium,
                      sellLikelihood: .medium, comparables: [], reasoning: "Listed at £\(Int(lo))–£\(Int(hi)) on \(p.name).")
        }
        return [
            HistoryItem(
                id: "h1", createdAt: "2026-09-09T08:30:00Z", sessionId: "s1",
                brand: "Carhartt", clothingType: "Detroit jacket", title: "Carhartt Detroit Jacket — Hamilton Brown, M",
                colourPrimary: "Hamilton brown", size: "M", condition: "Good",
                priceMin: 18, priceMax: 26, preferredPlatform: .depop,
                listing: NeutralListing(
                    brand: "Carhartt", clothingType: "Detroit jacket",
                    colourPrimary: "Hamilton brown", colourSecondary: nil,
                    condition: .good, size: "M", material: "100% cotton duck",
                    title: "Carhartt Detroit Jacket — Hamilton Brown, Size M",
                    description: "Carhartt Detroit jacket in Hamilton brown, size M. 100% cotton duck with a corduroy collar and blanket lining. Good nick — light wear at the cuffs, no rips or stains, all poppers work.",
                    hashtags: ["carhartt", "workwear", "detroitjacket"],
                    priceMin: 18, priceMax: 26,
                    priceReasoning: "Judged from the photos alone.",
                    gender: "men", mainCategory: "Coats & jackets", subcategory: "Workwear",
                    fields: [
                        ListingField(label: "Category", value: "Men > Clothing > Outerwear > Coats & jackets", hint: nil),
                        ListingField(label: "Brand", value: "Carhartt", hint: nil),
                        ListingField(label: "Size", value: "M", hint: nil),
                        ListingField(label: "Condition", value: "Good", hint: nil),
                    ]
                ),
                valuation: StoredValuation(
                    perPlatform: [Platform.depop.rawValue: band(42, 58, .depop), Platform.vinted.rawValue: band(34, 46, .vinted)],
                    query: "Carhartt Detroit jacket M brown",
                    recommendation: Recommendation(platform: .depop, listAt: 50, net: 45, currency: "GBP",
                                                   reasoning: "Vintage Carhartt moves on Depop.", runnersUp: []))
            ),
            HistoryItem(
                id: "h2", createdAt: "2026-09-07T19:05:00Z", sessionId: "s2",
                brand: "Levi's", clothingType: "501 jeans", title: "Levi's 501 Original, W32 L34",
                colourPrimary: "Mid wash", size: "W32 L34", condition: "Excellent",
                priceMin: 22, priceMax: 34, preferredPlatform: .vinted,
                listing: NeutralListing(
                    brand: "Levi's", clothingType: "501 jeans",
                    colourPrimary: "Mid wash", colourSecondary: nil,
                    condition: .excellent, size: "W32 L34", material: "100% cotton denim",
                    title: "Levi's 501 Original, W32 L34",
                    description: "Levi's 501 Original in a mid wash, W32 L34. Straight leg, button fly. Excellent condition, barely worn.",
                    hashtags: ["levis", "501", "denim"],
                    priceMin: 22, priceMax: 34,
                    priceReasoning: "Judged from the photos alone.",
                    gender: "men", mainCategory: "Jeans", subcategory: "Straight",
                    fields: nil
                ),
                valuation: nil
            ),
        ]
    }

    func valuate(item: ValuationItem) async throws -> ValuationResponse {
        try await Task.sleep(for: .seconds(3))
        func band(_ lo: Double, _ hi: Double, _ n: Int, _ p: Platform) -> PriceBand {
            PriceBand(
                low: lo, high: hi, currency: "GBP", confidence: .medium, sellLikelihood: .medium,
                comparables: (0..<n).map {
                    ComparableListing(
                        title: "Carhartt Detroit Jacket Brown M",
                        price: lo + Double($0) * 2, currency: "GBP",
                        platform: p.rawValue, url: "https://example.com/\($0)"
                    )
                },
                reasoning: "Similar jackets are listed at £\(Int(lo))–£\(Int(hi)) on \(p.name) today."
            )
        }
        return ValuationResponse(
            perPlatform: [
                Platform.vinted.rawValue: band(34, 46, 18, .vinted),
                Platform.depop.rawValue:  band(42, 58, 11, .depop),
                Platform.ebay.rawValue:   band(38, 52, 26, .ebay),
            ],
            query: "Carhartt Detroit jacket M brown",
            recommendation: Recommendation(
                platform: .depop, listAt: 50, net: 45, currency: "GBP",
                reasoning: "Highest asking prices of the three, and vintage Carhartt moves there.",
                runnersUp: [
                    RunnerUp(platform: .ebay, listAt: 45, net: 39),
                    RunnerUp(platform: .vinted, listAt: 40, net: 40),
                ]
            ),
            allowance: AllowanceState(used: 12, limit: 40, resetsAt: "2026-10-01T00:00:00Z")
        )
    }

    func format(listing: NeutralListing, platform: Platform, tone: Tone) async throws -> PlatformListing {
        await wait()
        switch platform {
        case .depop:
            return PlatformListing(
                title: "Vintage Carhartt Detroit Jacket 🤎 Brown M",
                description: "Proper Carhartt Detroit jacket in Hamilton brown. Cotton duck, corduroy collar, blanket lining — the real one, not a repro.\n\nWorn in nicely, light cuff fade, no damage. Fits M, boxy on an S.\n\nDM for measurements or a bundle.",
                hashtags: ["carhartt", "vintage", "workwear", "detroitjacket", "y2k"],
                fields: [
                    ListingField(label: "Category", value: "Menswear · Coats & Jackets", hint: nil),
                    ListingField(label: "Style", value: "Workwear", hint: nil),
                    ListingField(label: "Size", value: "M", hint: nil),
                    ListingField(label: "Condition", value: "Used — excellent", hint: nil),
                ]
            )
        case .vinted:
            return PlatformListing(
                title: "Carhartt Detroit Jacket Hamilton Brown M",
                description: "Carhartt Detroit jacket, Hamilton brown, size M. Cotton duck outer, corduroy collar, blanket lining.\n\nGood condition — cuffs have a little wear, everything else is sound.\n\nBundle for a discount. Posted within two days.",
                hashtags: ["carhartt", "workwear", "detroitjacket"],
                fields: [
                    ListingField(label: "Category", value: "Men · Jackets · Denim", hint: nil),
                    ListingField(label: "Size", value: "M", hint: nil),
                    ListingField(label: "Brand", value: "Carhartt", hint: nil),
                    ListingField(label: "Condition", value: "Good", hint: nil),
                ]
            )
        case .ebay:
            return PlatformListing(
                title: "Carhartt Detroit Jacket J97 Hamilton Brown Mens Size M Cotton Duck",
                description: "Genuine Carhartt Detroit jacket, model J97, Hamilton brown, men's size M.\n\n100% cotton duck outer shell, corduroy collar, blanket-lined body. Good pre-owned condition with light wear to the cuffs. No rips, tears or staining.\n\nDispatched with tracked delivery within two working days.",
                hashtags: ["carhartt", "detroit", "workwear", "j97"],
                fields: [
                    ListingField(label: "Category", value: "Men's Coats & Jackets", hint: nil),
                    ListingField(label: "Brand", value: "Carhartt", hint: nil),
                    ListingField(label: "Size", value: "M", hint: nil),
                    ListingField(label: "Condition", value: "Used", hint: nil),
                ]
            )
        }
    }

    func refine(listing: PlatformListing, platform: Platform, instructions: [String]) async throws -> PlatformListing {
        await wait()
        var out = listing
        out.description += "\n\n(adjusted: \(instructions.joined(separator: ", ")))"
        return out
    }
}
