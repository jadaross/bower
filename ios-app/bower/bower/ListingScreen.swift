import SwiftUI

/// Screen 06 — price and listing, one long scroll. Opens with everything the
/// read already produced: what the item is, a rough price from the photos,
/// and text written for the Preferred Platform. A real market search is a
/// deliberate action that costs a unit and takes minutes; it replaces the
/// guess in place and is the only thing that earns a Recommendation.
struct ListingScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var model = ListingModel()

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if let listing = model.listing {
                ItemSummary(listing: listing)
                PriceSection(model: model)
                    .padding(.horizontal, 22)
                Hairline().padding(.horizontal, 22)
                ListingSection(model: model)
                HStack { Spacer(); NewItemButton { state.newItem() }; Spacer() }
                    .padding(.horizontal, 22)
            }
        }
        .padding(.top, 6)
        .padding(.bottom, 34)
        .task { await model.start(state: state) }
        .sheet(item: $model.compsFor) { platform in
            CompsSheet(platform: platform, band: model.bands[platform])
        }
    }
}

// MARK: - Model

@Observable
final class ListingModel {
    enum PriceState: Equatable { case estimated, searching, searched }

    var listing: NeutralListing?
    var priceState: PriceState = .estimated
    var bands: [Platform: PriceBand] = [:]
    var recommendation: Recommendation?
    var searchError: String?
    var elapsed = 0
    var compsFor: Platform?

    var platform: Platform = .vinted
    var tone: Tone = .casual
    var chips: Set<RefinementChip> = []
    var formatted: [Platform: PlatformListing] = [:]
    var edits: [Platform: PlatformListing] = [:]
    /// The Langfuse trace behind the listing shown for each platform (#45).
    var traces: [Platform: String] = [:]
    /// Thumbs the user gave per platform: 1 up, 0 down.
    var thumbed: [Platform: Int] = [:]
    var rewriting = false
    var formatError = false

    private weak var state: AppState?
    private var searchTask: Task<Void, Never>?
    private var formatTask: Task<Void, Never>?

    /// What to ask, and where. The server's Recommendation when there is one
    /// (more than one platform enabled); otherwise the midpoint of the single
    /// band, which is not a recommendation — there was nothing to choose
    /// between — and wears no tag. Just the number and the place: the
    /// reasoning is not shown.
    struct Ask: Equatable {
        let platform: Platform
        let listAt: Int
        let recommended: Bool
    }

    var ask: Ask? {
        if let r = recommendation {
            return Ask(platform: r.platform, listAt: Int(r.listAt.rounded()), recommended: true)
        }
        let usable = bands.filter { !$0.value.comparables.isEmpty }
        guard usable.count == 1, let (p, b) = usable.first else { return nil }
        return Ask(platform: p, listAt: Int(((b.low + b.high) / 2).rounded()), recommended: false)
    }

    var current: PlatformListing? { edits[platform] ?? formatted[platform] }
    var edited: Bool { edits[platform] != nil }

    var enabled: [Platform] { state?.orderedEnabled ?? Platform.allCases }

    func start(state: AppState) async {
        self.state = state
        guard listing == nil, let a = state.analysis else { return }
        listing = a.listing
        platform = state.preferred
        // The read was asked for the Preferred Platform and, when it came back
        // with that platform's form fields, it already wrote the listing in
        // that voice. Show it as it is — a second call would only rewrite it.
        if a.listing.fields != nil {
            formatted[platform] = a.listing.asPlatformListing
            traces[platform] = a.traceId
            return
        }
        await format()
    }

    // MARK: Search

    func search() {
        guard let state, let listing, priceState == .estimated else { return }
        priceState = .searching
        elapsed = 0
        searchError = nil
        searchTask = Task {
            let ticker = Task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    elapsed += 1
                }
            }
            defer { ticker.cancel() }
            do {
                let v = try await state.api.valuate(item: ValuationItem(from: listing))
                var out: [Platform: PriceBand] = [:]
                for (k, b) in v.perPlatform { if let p = Platform(rawValue: k) { out[p] = b } }
                bands = out
                recommendation = v.recommendation
                if let a = v.allowance { state.used = a.used; state.allowance = a.limit }
                priceState = .searched
            } catch APIError.allowanceExhausted(let a) {
                state.used = a.used; state.allowance = a.limit
                searchError = "That's the lot for this month — no searches left."
                priceState = .estimated
            } catch {
                searchError = "The search didn't come back. Your guess is still here — try again when you have signal."
                priceState = .estimated
            }
        }
    }

    // MARK: Format / refine

    func format() async {
        guard let state, let listing, formatted[platform] == nil else { return }
        rewriting = true
        defer { rewriting = false }
        do {
            let out = try await state.api.format(listing: listing, platform: platform, tone: tone)
            formatted[platform] = out
            traces[platform] = out.traceId
            formatError = false
        } catch {
            formatError = true
        }
    }

    func switchPlatform(_ p: Platform) {
        guard p != platform else { return }
        platform = p
        formatTask?.cancel()
        formatTask = Task { await format() }
    }

    func setTone(_ t: Tone) {
        guard t != tone else { return }
        tone = t
        formatted = [:]; edits = [:]; chips = []; traces = [:]; thumbed = [:]
        formatTask?.cancel()
        formatTask = Task { await format() }
    }

    func toggle(_ chip: RefinementChip) {
        if chips.contains(chip) { chips.remove(chip) } else { chips.insert(chip) }
        refine()
    }

    func resetChips() {
        chips = []
        formatted[platform] = nil
        edits[platform] = nil
        formatTask?.cancel()
        formatTask = Task { await format() }
    }

    private func refine() {
        guard let state, let base = formatted[platform], !chips.isEmpty else { return }
        formatTask?.cancel()
        formatTask = Task {
            rewriting = true
            defer { rewriting = false }
            let instructions = RefinementChip.allCases.filter { chips.contains($0) }.map(\.instruction)
            if let out = try? await state.api.refine(listing: base, platform: platform, instructions: instructions) {
                edits[platform] = out
                traces[platform] = out.traceId
            }
        }
    }

    func setTitle(_ t: String) { var l = current ?? PlatformListing(title: "", description: "", hashtags: [], fields: nil); l.title = t; edits[platform] = l; recordFeedback("manual-edit") }
    func setBody(_ b: String) { var l = current ?? PlatformListing(title: "", description: "", hashtags: [], fields: nil); l.description = b; edits[platform] = l; recordFeedback("manual-edit") }

    /// Best-effort feedback score against the shown listing's trace. Never blocks.
    func recordFeedback(_ name: String, value: Int? = nil) {
        guard let state, let traceId = traces[platform] else { return }
        Task { try? await state.api.feedback(traceId: traceId, name: name, value: value) }
    }

    func thumb(up: Bool) {
        let v = up ? 1 : 0
        thumbed[platform] = v
        recordFeedback("thumbs", value: v)
    }

    var fullText: String {
        guard let c = current else { return "" }
        var s = c.title + "\n\n" + c.description
        if !c.hashtags.isEmpty { s += "\n\n" + c.displayHashtags.joined(separator: " ") }
        return s
    }
}

// MARK: - Item summary

private struct ItemSummary: View {
    let listing: NeutralListing
    @Environment(\.bower) private var theme

    var body: some View {
        Text("\(listing.brand) \(listing.clothingType)")
            .font(BowerFont.serif(32))
            .foregroundStyle(theme.text)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
    }
}

// MARK: - Price

private struct PriceSection: View {
    @Bindable var model: ListingModel
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            switch model.priceState {
            case .estimated: estimated
            case .searching: searching
            case .searched:  searched
            }
        }
    }

    // The guess. Openly a guess — dashed border, a badge that says where it
    // came from, and the one action that would replace it.
    private var estimated: some View {
        VStack(alignment: .leading, spacing: 10) {
            BowerCard(padding: 16, dashed: true, fill: theme.subtle) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("GUESS FROM THE PHOTOS")
                        .font(BowerFont.mono(9.5, weight: .bold)).tracking(0.8)
                        .foregroundStyle(theme.text)
                        .padding(.vertical, 3).padding(.horizontal, 7)
                        .background(theme.pollen.opacity(0.28))
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                    if let l = model.listing {
                        PriceRange(low: Int(l.priceMin), high: Int(l.priceMax), size: 40)
                            .padding(.top, 8)
                    }
                    BowerButton(title: state.remaining > 0 ? "Get a real price" : "No searches left",
                                disabled: state.remaining == 0) { model.search() }
                        .padding(.top, 14)
                    Text(state.remaining > 0 ? "Searches live listings. Costs 1 of \(state.remaining)." : "Searches live listings.")
                        .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 9)
                }
            }

            if let e = model.searchError {
                Text(e).font(BowerFont.ui(12.5)).foregroundStyle(theme.coral)
            }
        }
    }

    // One row per platform being read. The valuation comes back all at once,
    // so every row pulses until the whole answer lands — no row claims to be
    // done before it is.
    private var searching: some View {
        BowerCard(padding: 18) {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Kicker("Reading live listings", color: theme.satin)
                    Spacer()
                    Text(String(format: "%02d:%02d", model.elapsed / 60, model.elapsed % 60))
                        .font(BowerFont.mono(11)).foregroundStyle(theme.muted).monospacedDigit()
                }
                VStack(spacing: 0) {
                    ForEach(Array(model.enabled.enumerated()), id: \.element) { i, p in
                        HStack(spacing: 10) {
                            PulsingDot(color: p.tint, delay: Double(i) * 0.2)
                                .frame(width: 16)
                            Text(p.name).font(BowerFont.ui(13.5, weight: .semibold)).foregroundStyle(theme.text)
                            Spacer()
                            Text("searching").font(BowerFont.ui(12)).foregroundStyle(theme.muted)
                        }
                        .padding(.vertical, 9)
                        .overlay(alignment: .bottom) { if i < model.enabled.count - 1 { Hairline() } }
                    }
                }
                .padding(.top, 14)
                Text("Up to a few minutes. Keep the app open.")
                    .font(BowerFont.ui(12)).foregroundStyle(theme.muted)
                    .padding(.top, 12)
            }
        }
    }

    // One answer, then the evidence. The listing is already written for the
    // Preferred Platform, so the only action worth offering is rewriting it
    // for a different one — shown only when the best platform isn't the one
    // being shown, and the switch below moves with it.
    private var searched: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let ask = model.ask { askCard(ask) }

            VStack(alignment: .leading, spacing: 11) {
                Kicker("Listed at right now")
                VStack(spacing: 10) {
                    ForEach(model.enabled) { p in
                        if let band = model.bands[p] { bandRow(p, band) }
                    }
                }
                Text("Asking prices today. Nothing here has necessarily sold.")
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                    .padding(.top, 4)
            }
        }
    }

    private func askCard(_ ask: ListingModel.Ask) -> some View {
        BowerCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Kicker("Ask")
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("£\(ask.listAt)").font(BowerFont.serifUpright(56)).foregroundStyle(theme.text).monospacedDigit()
                    HStack(spacing: 6) {
                        Text("on")
                        Circle().fill(ask.platform.tint).frame(width: 7, height: 7)
                        Text(ask.platform.name)
                    }
                    .font(BowerFont.ui(16)).foregroundStyle(theme.text)
                }
                .padding(.top, 4)
                if model.platform != ask.platform {
                    Button { model.switchPlatform(ask.platform) } label: {
                        HStack(spacing: 6) {
                            Circle().fill(ask.platform.tint).frame(width: 6, height: 6)
                            Text("Rewrite it for \(ask.platform.name)")
                        }
                        .font(BowerFont.ui(12.5, weight: .semibold))
                        .foregroundStyle(ask.platform.tint)
                        .padding(.vertical, 7).padding(.horizontal, 12)
                        .overlay(RoundedRectangle(cornerRadius: 9).stroke(ask.platform.tint, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 12)
                }
            }
            .padding(.vertical, 16).padding(.horizontal, 18)
        }
        .animation(.easeOut(duration: 0.2), value: model.platform)
    }

    private func bandRow(_ p: Platform, _ band: PriceBand) -> some View {
        let winner = model.ask?.platform == p && model.ask?.recommended == true
        let empty = band.comparables.isEmpty
        return Button { if !empty { model.compsFor = p } } label: {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 3).fill(empty ? theme.line : p.tint).frame(width: 6, height: 34)
                VStack(alignment: .leading, spacing: 1) {
                    Text(p.name).font(BowerFont.ui(13.5, weight: .semibold)).foregroundStyle(theme.text)
                    if empty {
                        Text("Nothing comparable today").font(BowerFont.serifUpright(22)).foregroundStyle(theme.muted)
                    } else {
                        PriceRange(low: Int(band.low), high: Int(band.high), size: 22)
                    }
                }
                Spacer(minLength: 0)
                if !empty {
                    HStack(spacing: 4) {
                        Text("\(band.comparables.count) listing\(band.comparables.count == 1 ? "" : "s")")
                        Image(systemName: "chevron.right").font(.system(size: 9, weight: .semibold))
                    }
                    .font(BowerFont.ui(11.5, weight: .semibold)).foregroundStyle(theme.muted)
                }
            }
            .padding(.vertical, 13).padding(.horizontal, 14)
            .background(theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(winner ? p.tint.opacity(0.4) : theme.line, lineWidth: 0.5))
            .contentShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .disabled(empty)
        .overlay(alignment: .topLeading) {
            if winner {
                Text("POST HERE FIRST")
                    .font(BowerFont.mono(9.5, weight: .bold)).tracking(0.7).foregroundStyle(.white)
                    .padding(.vertical, 3).padding(.horizontal, 8)
                    .background(p.tint).clipShape(RoundedRectangle(cornerRadius: 5))
                    .offset(x: 14, y: -8)
            }
        }
    }
}

/// A small dot breathing on a delay — one per platform while the search runs.
private struct PulsingDot: View {
    let color: Color
    var delay: Double = 0
    @State private var on = false

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 7, height: 7)
            .opacity(on ? 1 : 0.35)
            .animation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true).delay(delay), value: on)
            .onAppear { on = true }
    }
}

// MARK: - Listing

private struct ListingSection: View {
    @Bindable var model: ListingModel
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @State private var editing: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text("The listing")
                    .font(BowerFont.serif(27)).foregroundStyle(theme.text)
            }

            if model.enabled.count > 1 {
                Segmented(
                    options: model.enabled.map { SegmentedOption(id: $0.rawValue, label: $0.name, dot: $0.tint) },
                    selection: Binding(get: { model.platform.rawValue }, set: { if let p = Platform(rawValue: $0) { model.switchPlatform(p) } }),
                    small: true
                )
            }

            card

            // Nudge it — a few one-tap rewrites sitting right under the listing.
            // Tone folded in here; a separate control was doing the same job.
            HStack(spacing: 7) {
                if !model.chips.isEmpty {
                    Button("Reset") { model.resetChips() }
                        .buttonStyle(.plain).font(BowerFont.ui(12, weight: .medium)).foregroundStyle(theme.muted)
                }
                Spacer(minLength: 0)
            }
            FlowLayout(spacing: 7) {
                ForEach([RefinementChip.shorter, .longer, .serious, .casual]) { chip in
                    let on = model.chips.contains(chip)
                    Button { model.toggle(chip) } label: {
                        HStack(spacing: 5) {
                            if on { Image(systemName: "checkmark").font(.system(size: 9, weight: .bold)) }
                            Text(chip.label)
                        }
                        .font(BowerFont.ui(12.5, weight: .medium))
                        .foregroundStyle(on ? .white : theme.text)
                        .padding(.vertical, 8).padding(.horizontal, 13)
                        .background(on ? theme.satin : theme.card)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(on ? .clear : theme.line, lineWidth: 0.5))
                    }
                    .buttonStyle(.plain)
                }
            }

            if model.current != nil {
                HStack(spacing: 12) {
                    Text("Was this right?").font(BowerFont.ui(12)).foregroundStyle(theme.muted)
                    Spacer(minLength: 0)
                    Button { model.thumb(up: true) } label: {
                        Image(systemName: model.thumbed[model.platform] == 1 ? "hand.thumbsup.fill" : "hand.thumbsup")
                            .font(.system(size: 15))
                            .foregroundStyle(model.thumbed[model.platform] == 1 ? theme.moss : theme.muted)
                    }
                    .buttonStyle(.plain).accessibilityLabel("Good listing")
                    Button { model.thumb(up: false) } label: {
                        Image(systemName: model.thumbed[model.platform] == 0 ? "hand.thumbsdown.fill" : "hand.thumbsdown")
                            .font(.system(size: 15))
                            .foregroundStyle(model.thumbed[model.platform] == 0 ? theme.coral : theme.muted)
                    }
                    .buttonStyle(.plain).accessibilityLabel("Bad listing")
                }
                .padding(.top, 2)
            }
        }
        .padding(.horizontal, 22)
    }

    private var card: some View {
        BowerCard(padding: 17) {
            VStack(alignment: .leading, spacing: 13) {
                if let c = model.current {
                    block("Title", text: c.title, key: "title", bold: true) { model.setTitle($0) }
                    Hairline()
                    block("Description", text: c.description, key: "body", bold: false) { model.setBody($0) }
                    if !c.hashtags.isEmpty {
                        Hairline()
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Kicker(model.platform == .depop ? "Hashtags" : "Keywords")
                                Spacer()
                                CopyButton(text: c.displayHashtags.joined(separator: " "), onCopy: { model.recordFeedback("copied") })
                            }
                            FlowLayout(spacing: 6) {
                                ForEach(c.displayHashtags, id: \.self) { t in
                                    Text(t).font(BowerFont.mono(11.5)).foregroundStyle(theme.text)
                                        .padding(.vertical, 4).padding(.horizontal, 8)
                                        .background(theme.subtle).clipShape(RoundedRectangle(cornerRadius: 6))
                                }
                            }
                        }
                    }
                    if let fields = c.fields, !fields.isEmpty {
                        Hairline()
                        VStack(alignment: .leading, spacing: 6) {
                            Kicker("Their form fields")
                            // Each value copies on its own: the platform's
                            // form takes them one dropdown at a time.
                            ForEach(fields) { f in
                                HStack(alignment: .top, spacing: 10) {
                                    Text(f.label).font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                                    Spacer()
                                    Text(f.value).font(BowerFont.ui(12.5, weight: .medium)).foregroundStyle(theme.text).multilineTextAlignment(.trailing)
                                    CopyButton(text: f.value, onCopy: { model.recordFeedback("copied") })
                                }
                                .padding(.vertical, 6)
                                Hairline()
                            }
                        }
                    }

                } else if model.formatError {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Couldn't write the listing.").font(BowerFont.ui(14, weight: .semibold)).foregroundStyle(theme.text)
                        Text("Check your connection and try again.").font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                        BowerButton(title: "Try again", kind: .secondary, small: true) { model.resetChips() }
                    }
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach([100, 72, 92, 60, 84], id: \.self) { w in
                            RoundedRectangle(cornerRadius: 5).fill(theme.line).frame(width: CGFloat(w) * 2.4, height: 10)
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .opacity(model.rewriting ? 0.45 : 1)
        .overlay {
            if model.rewriting {
                HStack(spacing: 8) {
                    ProgressView().tint(theme.satin)
                    Text("Rewriting…").font(BowerFont.ui(12.5)).foregroundStyle(theme.text)
                }
                .padding(.vertical, 8).padding(.horizontal, 14)
                .background(theme.card).clipShape(Capsule())
                .overlay(Capsule().stroke(theme.line, lineWidth: 0.5))
                .shadow(color: .black.opacity(0.07), radius: 7, y: 4)
            }
        }
        .animation(.easeOut(duration: 0.2), value: model.rewriting)
    }

    private func block(_ label: String, text: String, key: String, bold: Bool, save: @escaping (String) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Kicker(label)
                Spacer()
                if editing != key {
                    Button { editing = key } label: {
                        HStack(spacing: 4) { Image(systemName: "pencil").font(.system(size: 9)); Text("Edit") }
                            .font(BowerFont.ui(11, weight: .semibold)).foregroundStyle(theme.muted)
                    }
                    .buttonStyle(.plain)
                }
                CopyButton(text: text, onCopy: { model.recordFeedback("copied") })
            }
            if editing == key {
                EditBox(value: text, multiline: !bold, bold: bold) { save($0); editing = nil } onCancel: { editing = nil }
            } else {
                Text(text)
                    .font(bold ? BowerFont.ui(15.5, weight: .semibold) : BowerFont.ui(14))
                    .foregroundStyle(theme.text)
                    .lineSpacing(bold ? 2 : 4)
                    .onTapGesture { editing = key }
            }
        }
    }
}

// MARK: - Bits

private struct EditBox: View {
    let value: String
    let multiline: Bool
    let bold: Bool
    let onSave: (String) -> Void
    let onCancel: () -> Void
    @Environment(\.bower) private var theme
    @State private var draft: String

    init(value: String, multiline: Bool, bold: Bool, onSave: @escaping (String) -> Void, onCancel: @escaping () -> Void) {
        self.value = value; self.multiline = multiline; self.bold = bold
        self.onSave = onSave; self.onCancel = onCancel
        _draft = State(initialValue: value)
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            Group {
                if multiline { TextEditor(text: $draft).frame(minHeight: 140) }
                else { TextField("", text: $draft) }
            }
            .font(bold ? BowerFont.ui(15.5, weight: .semibold) : BowerFont.ui(14))
            .foregroundStyle(theme.text)
            .scrollContentBackground(.hidden)
            .padding(.vertical, 8).padding(.horizontal, 10)
            .background(theme.bg)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(theme.satin, lineWidth: 1.5))

            HStack(spacing: 8) {
                Button("Cancel", action: onCancel).buttonStyle(.plain)
                    .font(BowerFont.ui(13, weight: .medium)).foregroundStyle(theme.text)
                    .padding(.vertical, 7).padding(.horizontal, 14).background(theme.subtle).clipShape(RoundedRectangle(cornerRadius: 8))
                Button("Save") { onSave(draft) }.buttonStyle(.plain)
                    .font(BowerFont.ui(13, weight: .semibold)).foregroundStyle(.white)
                    .padding(.vertical, 7).padding(.horizontal, 14).background(theme.satin).clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(.top, 6)
    }
}

/// "In the bower" is what the app says when something has been copied.
struct CopyButton: View {
    let text: String
    var label: String = "Copy"
    var big: Bool = false
    var onCopy: (() -> Void)? = nil
    @Environment(\.bower) private var theme
    @State private var done = false

    var body: some View {
        Button {
            UIPasteboard.general.string = text
            onCopy?()
            done = true
            Task { try? await Task.sleep(for: .seconds(1.5)); done = false }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: done ? "checkmark" : "doc.on.doc").font(.system(size: 10, weight: .semibold))
                Text(label)
            }
            .font(BowerFont.ui(big ? 12 : 11, weight: .semibold))
            .foregroundStyle(theme.muted)
            .padding(.vertical, big ? 7 : 4).padding(.horizontal, big ? 12 : 6)
            .background(big ? theme.subtle : .clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .animation(.easeOut(duration: 0.18), value: done)
    }
}

// MARK: - Comps sheet

private struct CompsSheet: View {
    let platform: Platform
    let band: PriceBand?
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let comps = band?.comparables ?? []
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("What \(platform.name) is asking").font(BowerFont.serif(24)).foregroundStyle(theme.text)
                    Text("\(comps.count) live listing\(comps.count == 1 ? "" : "s")").font(BowerFont.ui(12)).foregroundStyle(theme.muted)
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundStyle(theme.muted)
                        .frame(width: 28, height: 28).background(theme.subtle).clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20).padding(.top, 22).padding(.bottom, 12)
            Hairline()
            ScrollView {
                VStack(spacing: 9) {
                    ForEach(comps) { c in
                        // The server only keeps comparables that link to one
                        // listing on this platform, so "Open" goes to that
                        // listing. A row without a link is shown as evidence
                        // only — never sent to the platform's front page.
                        if let url = c.url.flatMap(URL.init(string:)) {
                            Link(destination: url) { compRow(c, openable: true) }
                        } else {
                            compRow(c, openable: false)
                        }
                    }
                    Text("Asking prices from listings live today. None of these have necessarily sold.")
                        .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted).padding(.top, 6)
                }
                .padding(20)
            }
        }
        .background(theme.bg)
        .environment(\.bower, .of(scheme))
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func compRow(_ c: ComparableListing, openable: Bool) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(c.title).font(BowerFont.ui(13, weight: .medium)).foregroundStyle(theme.text).multilineTextAlignment(.leading)
                Text(c.platform.capitalized).font(BowerFont.ui(11)).foregroundStyle(theme.muted)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("£\(Int(c.price))").font(BowerFont.ui(16, weight: .semibold)).foregroundStyle(theme.text)
                if openable {
                    HStack(spacing: 3) { Text("Open"); Image(systemName: "arrow.up.right").font(.system(size: 8, weight: .bold)) }
                        .font(BowerFont.ui(10.5)).foregroundStyle(theme.satin)
                }
            }
        }
        .padding(12)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.line, lineWidth: 0.5))
    }
}
