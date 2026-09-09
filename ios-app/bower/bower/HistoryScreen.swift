import SwiftUI

/// The user's past items and their prices. Text only — no photos are stored
/// (ADR-0008). Reached from the capture header. Each row opens a detail sheet.
struct HistoryScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var items: [HistoryItem]?
    @State private var failed = false
    @State private var selected: HistoryItem?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let items {
                if items.isEmpty { empty } else { list(items) }
            } else if failed {
                message("Couldn't load your history. Check your connection and try again.")
            } else {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 70)
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 4)
        .padding(.bottom, 34)
        .task { await load() }
        .sheet(item: $selected) { HistoryDetail(item: $0) }
    }

    private func load() async {
        failed = false
        do { items = try await state.api.history() } catch { failed = true }
    }

    private var empty: some View {
        VStack(spacing: 10) {
            Text("Nothing yet").font(BowerFont.serif(24)).foregroundStyle(theme.text)
            Text("Items you run show up here, with the prices you got.")
                .font(BowerFont.ui(13)).foregroundStyle(theme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.top, 80)
    }

    private func list(_ items: [HistoryItem]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Kicker("\(items.count) item\(items.count == 1 ? "" : "s")")
            BowerGroup {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    if i > 0 { Hairline() }
                    Button { selected = item } label: { row(item) }
                        .buttonStyle(.plain)
                }
            }
            Text("A text-only record. Bower keeps no photos.")
                .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted).padding(.leading, 4)
        }
    }

    private func row(_ item: HistoryItem) -> some View {
        HStack(spacing: 12) {
            Circle().fill(item.preferredPlatform?.tint ?? theme.muted)
                .frame(width: 9, height: 9)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(BowerFont.ui(14.5, weight: .medium))
                    .foregroundStyle(theme.text).lineLimit(1)
                Text(HistoryFormat.relative(item.createdAt))
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
            }
            Spacer(minLength: 8)
            Text(HistoryFormat.price(item)).font(BowerFont.mono(13)).foregroundStyle(theme.text)
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold)).foregroundStyle(theme.muted)
        }
        .padding(.vertical, 12).padding(.horizontal, 16).contentShape(Rectangle())
    }

    private func message(_ text: String) -> some View {
        Text(text).font(BowerFont.ui(13)).foregroundStyle(theme.coral)
            .multilineTextAlignment(.center).frame(maxWidth: .infinity).padding(.top, 60)
    }
}

// MARK: - Detail

private struct HistoryDetail: View {
    let item: HistoryItem
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text(HistoryFormat.relative(item.createdAt))
                        .font(BowerFont.mono(11)).foregroundStyle(theme.muted)
                    Spacer()
                    Button("Done") { dismiss() }
                        .font(BowerFont.ui(14, weight: .medium)).foregroundStyle(theme.satin)
                }
                Text(item.title).font(BowerFont.serif(23)).foregroundStyle(theme.text)

                if let listing = item.listing {
                    listingCard(listing.asPlatformListing)
                }

                Kicker("Details")
                BowerCard {
                    VStack(alignment: .leading, spacing: 0) {
                        detail("Brand", item.brand)
                        detail("Type", item.clothingType)
                        if let c = item.colourPrimary { detail("Colour", c) }
                        if let s = item.size { detail("Size", s) }
                        detail("Condition", item.condition)
                        if let lo = item.priceMin, let hi = item.priceMax {
                            detail("Guess", "£\(trim(lo))–£\(trim(hi))")
                        }
                    }
                }

                if let v = item.valuation, !v.perPlatform.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Kicker("Searched prices")
                        BowerGroup {
                            ForEach(Array(orderedBands(v).enumerated()), id: \.offset) { i, pair in
                                if i > 0 { Hairline() }
                                HStack {
                                    Circle().fill(pair.0.tint).frame(width: 9, height: 9)
                                    Text(pair.0.name).font(BowerFont.ui(14)).foregroundStyle(theme.text)
                                    Spacer()
                                    Text("£\(trim(pair.1.low))–£\(trim(pair.1.high))")
                                        .font(BowerFont.mono(13)).foregroundStyle(theme.text)
                                }
                                .padding(.vertical, 12).padding(.horizontal, 16)
                            }
                        }
                        if let rec = v.recommendation {
                            Text("Recommended: \(rec.platform.name) at £\(trim(rec.listAt)) — \(rec.reasoning)")
                                .font(BowerFont.ui(12)).foregroundStyle(theme.muted).padding(.leading, 4)
                        }
                    }
                }
            }
            .padding(22)
        }
        .background(theme.bg.ignoresSafeArea())
        .environment(\.bower, theme)
    }

    private func detail(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(BowerFont.ui(13)).foregroundStyle(theme.muted)
            Spacer()
            Text(value).font(BowerFont.ui(14)).foregroundStyle(theme.text)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 9)
    }

    /// The listing as it was first seen — every field, each copyable.
    private func listingCard(_ pl: PlatformListing) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Kicker("The listing")
            BowerCard(padding: 16) {
                VStack(alignment: .leading, spacing: 13) {
                    savedBlock("Title", pl.title, bold: true)
                    Hairline()
                    savedBlock("Description", pl.description, bold: false)
                    if !pl.hashtags.isEmpty {
                        Hairline()
                        HStack {
                            Kicker("Hashtags")
                            Spacer()
                            CopyButton(text: pl.displayHashtags.joined(separator: " "))
                        }
                        Text(pl.displayHashtags.joined(separator: "  "))
                            .font(BowerFont.mono(11.5)).foregroundStyle(theme.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let fields = pl.fields, !fields.isEmpty {
                        Hairline()
                        Kicker("Form fields")
                        ForEach(fields) { f in
                            HStack(alignment: .top, spacing: 8) {
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(f.label).font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                                    Text(f.value).font(BowerFont.ui(13.5)).foregroundStyle(theme.text)
                                }
                                Spacer()
                                CopyButton(text: f.value)
                            }
                        }
                    }
                }
            }
        }
    }

    private func savedBlock(_ label: String, _ text: String, bold: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack { Kicker(label); Spacer(); CopyButton(text: text) }
            Text(text)
                .font(bold ? BowerFont.ui(15.5, weight: .semibold) : BowerFont.ui(14))
                .foregroundStyle(theme.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// Bands in the app's canonical platform order, skipping any not present.
    private func orderedBands(_ v: StoredValuation) -> [(Platform, PriceBand)] {
        Platform.allCases.compactMap { p in v.perPlatform[p.rawValue].map { (p, $0) } }
    }

    private func trim(_ n: Double) -> String { String(Int(n.rounded())) }
}

// MARK: - Formatting

enum HistoryFormat {
    /// The price shown on a row: the recommendation if a search ran, else the
    /// first searched band, else the photo-only guess.
    static func price(_ item: HistoryItem) -> String {
        if let rec = item.valuation?.recommendation { return "£\(Int(rec.listAt.rounded()))" }
        if let band = item.valuation?.perPlatform.values.first {
            return "£\(Int(band.low.rounded()))–£\(Int(band.high.rounded()))"
        }
        if let lo = item.priceMin, let hi = item.priceMax {
            return "£\(Int(lo.rounded()))–£\(Int(hi.rounded()))"
        }
        return "—"
    }

    private static let parsers: [ISO8601DateFormatter] = {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return [withFraction, ISO8601DateFormatter()]
    }()

    static func relative(_ iso: String) -> String {
        guard let date = parsers.lazy.compactMap({ $0.date(from: iso) }).first else { return "" }
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f.localizedString(for: date, relativeTo: Date())
    }
}
