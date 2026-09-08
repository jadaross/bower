import SwiftUI

/// The navigation bar. Two shapes: a compact centred title, or the large
/// wordmark that only the capture screen wears.
struct BowerNav<Leading: View, Trailing: View>: View {
    let title: String
    var large: Bool = false
    var wordmark: Bool = false
    @ViewBuilder var leading: () -> Leading
    @ViewBuilder var trailing: () -> Trailing

    @Environment(\.bower) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                leading().frame(minWidth: 60, alignment: .leading)
                Spacer(minLength: 0)
                if !large {
                    Text(title)
                        .font(BowerFont.ui(16, weight: .semibold))
                        .foregroundStyle(theme.text)
                }
                Spacer(minLength: 0)
                trailing().frame(minWidth: 60, alignment: .trailing)
            }
            .frame(height: 44)

            if large {
                HStack(spacing: 9) {
                    if wordmark { Arch(size: 30) }
                    HStack(spacing: 0) {
                        Text(title).foregroundStyle(theme.text)
                        if wordmark { Text(".").foregroundStyle(theme.coral) }
                    }
                    .font(BowerFont.serif(36))
                }
                .padding(.bottom, 8)
            }
        }
        .padding(.horizontal, large ? 20 : 12)
        .padding(.top, 4)
        .background(theme.chrome)
        .overlay(alignment: .bottom) { Hairline() }
    }
}

extension BowerNav where Leading == EmptyView, Trailing == EmptyView {
    init(title: String, large: Bool = false, wordmark: Bool = false) {
        self.init(title: title, large: large, wordmark: wordmark,
                  leading: { EmptyView() }, trailing: { EmptyView() })
    }
}

struct BackButton: View {
    var label: String?
    let action: () -> Void

    @Environment(\.bower) private var theme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: "chevron.left").font(.system(size: 16, weight: .semibold))
                if let label { Text(label) }
            }
            .font(BowerFont.ui(16, weight: .medium))
            .foregroundStyle(theme.satin)
        }
        .buttonStyle(.plain)
    }
}

struct RootView: View {
    @Environment(AppState.self) private var state
    @Environment(\.colorScheme) private var scheme

    private var theme: BowerTheme { .of(scheme) }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()

            if state.screen == .analysing {
                AnalysingScreen()
            } else {
                VStack(spacing: 0) {
                    nav
                    ScrollView { body(for: state.screen) }
                        .scrollBounceBehavior(.basedOnSize)
                }
            }
        }
        .environment(\.bower, theme)
        .animation(.snappy(duration: 0.22), value: state.screen)
        .task { await state.loadProfileIfSignedIn() }
    }

    @ViewBuilder private var nav: some View {
        switch state.screen {
        case .signin, .analysing:
            EmptyView()
        case .platforms:
            BowerNav(title: "Set up") {
                EmptyView()
            } trailing: {
                Text("2 / 2").font(BowerFont.mono(11)).foregroundStyle(theme.muted)
            }
        case .capture:
            BowerNav(title: "bower", large: true, wordmark: true) {
                EmptyView()
            } trailing: {
                Button { state.screen = .settings } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 20))
                        .foregroundStyle(theme.text)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Settings")
            }
        case .listing:
            BowerNav(title: "Price and listing") {
                BackButton(label: "Photos") { state.screen = .capture }
            } trailing: {
                NewItemButton { state.newItem() }
            }
        case .settings:
            BowerNav(title: "Settings", large: true) {
                BackButton { state.screen = .capture }
            } trailing: {
                EmptyView()
            }
        }
    }

    @ViewBuilder private func body(for screen: Screen) -> some View {
        switch screen {
        case .signin:    SignInScreen()
        case .platforms: PlatformsScreen()
        case .capture:   CaptureScreen()
        case .analysing: AnalysingScreen()
        case .listing:   ListingScreen()
        case .settings:  SettingsScreen()
        }
    }
}
