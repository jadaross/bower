import SwiftUI

/// Asks before iOS does. Shown once, when set-up finishes, and only while the
/// system prompt has not been answered: the two notifications bower actually
/// sends arrive on a stand-in lock screen, so the ask is shown, not explained.
/// "Turn on" is what raises the system prompt; "Not now" and a swipe away
/// leave it unasked, so it can still be asked when a market check starts.
struct NotificationsSheet: View {
    /// Called once the choice is made, after the system prompt if there was one.
    var onDone: () -> Void

    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var shown = 0
    @State private var asking = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            lockScreen

            Text("Know when it's in.")
                .font(BowerFont.serif(30))
                .foregroundStyle(theme.text)
                .padding(.top, 22)
            Text("Only when there's something to see.")
                .font(BowerFont.ui(13.5))
                .foregroundStyle(theme.muted)
                .padding(.top, 6)

            Spacer(minLength: 20)

            VStack(spacing: 8) {
                BowerButton(title: asking ? "Asking…" : "Turn on notifications", disabled: asking) {
                    Task {
                        asking = true
                        await Notifications.requestIfNeeded()
                        onDone()
                    }
                }
                BowerButton(title: "Not now", kind: .quiet) { onDone() }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 26)
        .padding(.bottom, 20)
        .task { await arrive() }
    }

    // MARK: - The stand-in lock screen

    private var lockScreen: some View {
        VStack(spacing: 8) {
            // The lock screen's own clock, in bower's voice.
            VStack(spacing: 0) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                    .font(BowerFont.ui(12.5, weight: .medium))
                    .foregroundStyle(.white.opacity(0.75))
                Text("9:41")
                    .font(BowerFont.serif(58))
                    .foregroundStyle(.white)
            }
            .padding(.top, 8)
            .padding(.bottom, 4)

            if shown >= 1 {
                banner(title: "Your price is in", body: "Ask \(Money.format(50, state.market.currency)) on Depop.", when: "now")
                    .transition(arrival)
            }
            if shown >= 2 {
                banner(title: "Your listings are back", body: resetBody, when: "9:00")
                    .transition(arrival)
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .frame(height: 276)
        .background(
            LinearGradient(colors: [theme.avenue, theme.satin.opacity(0.85)], startPoint: .top, endPoint: .bottom)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Example notifications: your price is in, and your listings are back.")
    }

    /// An iOS banner: the app's mark, its name, the time, then the title and
    /// the body, on the translucent material the system uses.
    private func banner(title: String, body: String, when: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            // The app icon: the sheen arch and pollen dot on avenue.
            Arch(size: 18, stroke: theme.sheen, dot: theme.pollen)
                .frame(width: 34, height: 34)
                .background(theme.avenue)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(title).font(BowerFont.ui(13.5, weight: .semibold)).lineLimit(1)
                    Spacer(minLength: 6)
                    Text(when).font(BowerFont.ui(11.5)).opacity(0.6)
                }
                Text(body).font(BowerFont.ui(13)).lineLimit(2).opacity(0.9)
            }
            .foregroundStyle(.white)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(.ultraThinMaterial.opacity(0.9))
        .environment(\.colorScheme, .dark)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    /// What the reset reminder says for this account's own limits.
    private var resetBody: String {
        [state.reads.limit.map { "\($0) listings" }, state.searches.limit.map { "\($0) market checks" }]
            .compactMap { $0 }.joined(separator: " and ") + "."
    }

    /// Notifications come down from the top of the screen and settle, with a
    /// little give because they arrive with momentum. Reduce Motion: a fade.
    private var arrival: AnyTransition {
        reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity)
    }

    private func arrive() async {
        try? await Task.sleep(for: .milliseconds(350))
        withAnimation(Motion.arrive) { shown = 1 }
        try? await Task.sleep(for: .milliseconds(900))
        withAnimation(Motion.arrive) { shown = 2 }
    }
}
