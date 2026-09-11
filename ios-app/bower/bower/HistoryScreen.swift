import SwiftUI

/// The user's past items and their prices. Text only — no photos are stored
/// (ADR-0008). Reached from the capture header. Each row opens a detail sheet.
struct HistoryScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var items: [HistoryItem]?
    @State private var failed = false
    @State private var selected: HistoryItem?
    @State private var confirmClear = false
    @State private var clearing = false

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

    /// One card per item, full width, so a title is never cut off and the
    /// platform it was written for is on the card, not hidden in a dot.
    private func list(_ items: [HistoryItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Kicker("\(items.count) item\(items.count == 1 ? "" : "s") · text only, no photos")
            ForEach(items) { item in
                Button { selected = item } label: { card(item) }
                    .buttonStyle(.plain)
            }
            BowerButton(title: clearing ? "Clearing…" : "Clear history", kind: .danger, disabled: clearing) {
                confirmClear = true
            }
            .padding(.top, 8)
        }
        .confirmationDialog("Clear your history?", isPresented: $confirmClear, titleVisibility: .visible) {
            Button("Clear history", role: .destructive) { Task { await clear() } }
            Button("Keep it", role: .cancel) {}
        } message: {
            Text("Every item and its prices. There is nothing else to remove; bower keeps no photos.")
        }
    }

    private func card(_ item: HistoryItem) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                if let p = item.preferredPlatform {
                    HStack(spacing: 6) {
                        Circle().fill(p.tint).frame(width: 7, height: 7)
                        Kicker("Written for \(p.name)")
                    }
                } else {
                    Kicker("Listing")
                }
                Spacer()
                Text(HistoryFormat.relative(item.createdAt))
                    .font(BowerFont.mono(10.5)).foregroundStyle(theme.muted)
            }

            Text(item.title)
                .font(BowerFont.serif(22))
                .foregroundStyle(theme.text)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)

            Text([item.brand, item.size, item.condition].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                .font(BowerFont.ui(13)).foregroundStyle(theme.muted)
                .padding(.top, 3)

            HStack(alignment: .lastTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(HistoryFormat.price(item))
                        .font(BowerFont.serifUpright(26)).foregroundStyle(theme.text).monospacedDigit()
                    Text(HistoryFormat.priceLabel(item))
                        .font(BowerFont.mono(9.5)).tracking(0.8).foregroundStyle(theme.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(theme.muted)
            }
            .padding(.top, 12)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(theme.line, lineWidth: 0.5))
        .contentShape(RoundedRectangle(cornerRadius: 16))
    }

    private func clear() async {
        clearing = true
        defer { clearing = false }
        do {
            try await state.api.clearHistory()
            withAnimation(.snappy(duration: 0.22)) { items = [] }
        } catch {
            failed = true
        }
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
                VStack(alignment: .leading, spacing: 8) {
                    Text(item.title).font(BowerFont.serif(23)).foregroundStyle(theme.text)
                    if let p = item.preferredPlatform {
                        HStack(spacing: 6) {
                            Circle().fill(p.tint).frame(width: 7, height: 7)
                            Text("Written for \(p.name)").font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                        }
                    }
                }

                prices

                if let listing = item.listing {
                    listingCard(listing.asPlatformListing)
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
                    }
                }
            }
            .padding(22)
        }
        .background(theme.bg.ignoresSafeArea())
        .environment(\.bower, theme)
    }

    /// What the photos suggested, and, if a search ran, what to ask. The two
    /// are different things (ADR-0005) and are labelled as such.
    private var prices: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let rec = item.valuation?.recommendation {
                VStack(alignment: .leading, spacing: 4) {
                    Kicker("Ask")
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("£\(trim(rec.listAt))").font(BowerFont.serifUpright(40)).foregroundStyle(theme.text).monospacedDigit()
                        HStack(spacing: 6) {
                            Text("on")
                            Circle().fill(rec.platform.tint).frame(width: 7, height: 7)
                            Text(rec.platform.name)
                        }
                        .font(BowerFont.ui(15)).foregroundStyle(theme.text)
                    }
                }
                if let lo = item.priceMin, let hi = item.priceMax {
                    Text("Estimate was £\(trim(lo)) to £\(trim(hi)).")
                        .font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                }
            } else if let lo = item.priceMin, let hi = item.priceMax {
                VStack(alignment: .leading, spacing: 6) {
                    Text("ESTIMATE")
                        .font(BowerFont.mono(9.5, weight: .bold)).tracking(0.8)
                        .foregroundStyle(theme.text)
                        .padding(.vertical, 3).padding(.horizontal, 7)
                        .background(theme.pollen.opacity(0.28))
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                    PriceRange(low: Int(lo.rounded()), high: Int(hi.rounded()), size: 32)
                    Text("The market wasn't checked.")
                        .font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                }
            }
        }
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
    /// What the card's price is: the ask and where, the searched range, or the estimate.
    static func priceLabel(_ item: HistoryItem) -> String {
        if let rec = item.valuation?.recommendation { return "ASK ON \(rec.platform.name.uppercased())" }
        if item.valuation?.perPlatform.values.first != nil { return "LISTED AT" }
        return "ESTIMATE"
    }

    static func price(_ item: HistoryItem) -> String {
        if let rec = item.valuation?.recommendation { return "£\(Int(rec.listAt.rounded()))" }
        if let band = item.valuation?.perPlatform.values.first {
            return "£\(Int(band.low.rounded()))–£\(Int(band.high.rounded()))"
        }
        if let lo = item.priceMin, let hi = item.priceMax {
            return "£\(Int(lo.rounded()))–£\(Int(hi.rounded()))"
        }
        return ""
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
