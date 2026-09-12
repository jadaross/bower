import SwiftUI

/// The one-time "why bower" page — second of the two pages ahead of "what
/// bower does". See `IntroduceScreen` and `Screen` for why these are gated
/// separately from the rest of onboarding.
struct WhyBowerScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if !state.firstName.isEmpty {
                Kicker("Hi \(state.firstName)")
                    .padding(.bottom, 10)
            }

            Text("Why bower?")
                .font(BowerFont.serif(38))
                .foregroundStyle(theme.text)

            Text(BowerOrigin.bowerbird)
                .font(BowerFont.ui(14.5))
                .foregroundStyle(theme.muted)
                .lineSpacing(4)
                .padding(.top, 14)

            BowerbirdDots()
                .padding(.vertical, 26)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text(BowerOrigin.theStage)
                .font(BowerFont.ui(14.5))
                .foregroundStyle(theme.muted)
                .lineSpacing(4)

            Spacer(minLength: 24)

            BowerButton(title: "Let's go") {
                state.hasIntroduced = true
                state.screen = state.onboardingComplete ? .capture : .how
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 10)
        .padding(.bottom, 34)
    }
}
