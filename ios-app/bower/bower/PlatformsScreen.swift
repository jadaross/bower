import SwiftUI

/// Captures Enabled Platforms. Shown once, as the second of the two set-up
/// pages; the same content lives in Settings afterwards, where it stays editable.
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
                Text("Only these get priced and written for.")
                    .font(BowerFont.ui(13.5))
                    .foregroundStyle(theme.muted)
                    .padding(.top, 8)
            }

            VStack(spacing: 10) { ForEach(Platform.allCases) { row(for: $0) } }
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
        case 1: "one"
        default: "\(state.enabled.count)"
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
                Text(platform.note).font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
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
