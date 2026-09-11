import SwiftUI

/// Captures the Market and the Enabled Platforms. Shown once, as the second
/// of the two set-up pages; the same content lives in Settings afterwards,
/// where it stays editable.
struct PlatformsScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var blocked: Platform?
    @State private var saving = false

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Where do you sell?")
                    .font(BowerFont.serif(38))
                    .foregroundStyle(theme.text)
                Text("Prices come in your currency, from your country's listings. Only the platforms you switch on get priced and written for.")
                    .font(BowerFont.ui(13.5))
                    .foregroundStyle(theme.muted)
                    .padding(.top, 8)
            }

            MarketPicker()

            VStack(spacing: 10) { ForEach(state.market.platforms) { row(for: $0) } }
                .padding(.top, 2)

            if blocked != nil { keepOne }

            Spacer(minLength: 20)

            BowerButton(title: saving ? "Saving…" : "Continue with \(countLabel)", disabled: saving) {
                Task { await save() }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 10)
        .padding(.bottom, 34)
        .onAppear {
            // A first guess from the device's Region setting — the page exists
            // so it can be corrected before anything is priced.
            if !state.onboardingComplete { state.market = Market.device }
            state.enabled = state.enabled.filter { $0.operates(in: state.market) }
            if state.enabled.isEmpty { state.enabled = Set(state.market.platforms) }
            if !state.enabled.contains(state.preferred), let next = state.orderedEnabled.first { state.preferred = next }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        // Best effort: if the network is down the local choice still stands and
        // Settings can re-save it. Enabled Platforms are also re-read on launch.
        await state.savePlatforms()
        state.onboardingComplete = true
        state.screen = .capture
    }

    private var countLabel: String {
        switch state.enabled.count {
        case 3: "all three"
        case 2: "two"
        default: "one"
        }
    }

    private func row(for platform: Platform) -> some View {
        let on = state.enabled.contains(platform)
        return HStack(spacing: 13) {
            Text(String(platform.name.prefix(1)))
                .font(BowerFont.ui(16, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(platform.tint)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .opacity(on ? 1 : 0.35)

            VStack(alignment: .leading, spacing: 1) {
                Text(platform.name).font(BowerFont.ui(15, weight: .semibold)).foregroundStyle(theme.text)
                Text(platform.note(in: state.market)).font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
            }

            Spacer(minLength: 0)

            BowerToggle(
                isOn: Binding(
                    get: { on },
                    set: { newValue in
                        if !state.enable(platform, newValue) { flash(platform) }
                    }
                ),
                tint: platform.tint
            )
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(
                    blocked == platform ? theme.coral : (on ? platform.tint.opacity(0.35) : theme.line),
                    lineWidth: 1
                )
        )
        .animation(.easeOut(duration: 0.2), value: blocked)
    }

    private var keepOne: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("!")
                .font(BowerFont.ui(11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 16, height: 16)
                .background(theme.coral)
                .clipShape(Circle())
            Text(keepOneText).font(BowerFont.ui(12.5))
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(theme.coral.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var keepOneText: AttributedString {
        var lead = AttributedString("Keep at least one. ")
        lead.foregroundColor = theme.text
        var tail = AttributedString("Nothing to price against otherwise.")
        tail.foregroundColor = theme.muted
        return lead + tail
    }

    private func flash(_ platform: Platform) {
        blocked = platform
        Task {
            try? await Task.sleep(for: .seconds(2.6))
            if blocked == platform { blocked = nil }
        }
    }
}

/// United Kingdom or Australia. Switching drops any platform that does not
/// operate in the new market — none today, but the rows below follow the
/// market so nothing can be switched on that cannot be priced.
struct MarketPicker: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    /// Saves to the profile on change; off during set-up, where Continue saves the lot.
    var savesOnChange = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Kicker("Selling in")
            Segmented(
                options: Market.allCases.map { SegmentedOption(id: $0.rawValue, label: $0.name) },
                selection: Binding(
                    get: { state.market.rawValue },
                    set: { raw in
                        guard let m = Market(rawValue: raw), m != state.market else { return }
                        if savesOnChange {
                            Task { await state.saveMarket(m) }
                        } else {
                            state.market = m
                            state.enabled = state.enabled.filter { $0.operates(in: m) }
                            if state.enabled.isEmpty { state.enabled = Set(m.platforms) }
                            if !state.enabled.contains(state.preferred), let next = state.orderedEnabled.first { state.preferred = next }
                        }
                    }
                )
            )
        }
    }
}
