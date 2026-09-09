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

    @State private var showSplash = true

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
                .safeAreaInset(edge: .bottom) {
                    if showsTabBar {
                        BowerTabBar(active: activeTab) { selectTab($0) }
                    }
                }
            }
        }
        .overlay {
            if showSplash {
                LaunchSplash().transition(.opacity).zIndex(10)
            }
        }
        .environment(\.bower, theme)
        .animation(.snappy(duration: 0.22), value: state.screen)
        .task {
            await state.loadProfileIfSignedIn()
            hideSplashSoon()
        }
    }

    private func hideSplashSoon() {
        Task {
            try? await Task.sleep(for: .seconds(0.9))
            withAnimation(.easeOut(duration: 0.35)) { showSplash = false }
        }
    }

    private var showsTabBar: Bool {
        switch state.screen {
        case .capture, .listing, .history, .settings: return true
        default: return false
        }
    }

    private var activeTab: BowerTab? {
        switch state.screen {
        case .capture, .listing: return .home
        case .history: return .history
        case .settings: return .profile
        default: return nil
        }
    }

    private func selectTab(_ tab: BowerTab) {
        switch tab {
        case .home: state.screen = .capture
        case .history: state.screen = .history
        case .profile: state.screen = .settings
        }
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
                EmptyView()
            }
        case .listing:
            BowerNav(title: "Price and listing") {
                BackButton(label: "Photos") { state.screen = .capture }
            } trailing: {
                NewItemButton { state.newItem() }
            }
        case .history:
            BowerNav(title: "History", large: true)
        case .settings:
            BowerNav(title: "Profile", large: true)
        }
    }

    @ViewBuilder private func body(for screen: Screen) -> some View {
        switch screen {
        case .signin:    SignInScreen()
        case .platforms: PlatformsScreen()
        case .capture:   CaptureScreen()
        case .analysing: AnalysingScreen()
        case .listing:   ListingScreen()
        case .history:   HistoryScreen()
        case .settings:  SettingsScreen()
        }
    }
}

// MARK: - Bottom tab bar

enum BowerTab { case home, history, profile }

/// Persistent bottom navigation. Home is the capture → listing flow, History
/// the saved items, Profile the platforms/allowance/account settings.
struct BowerTabBar: View {
    let active: BowerTab?
    let onSelect: (BowerTab) -> Void
    @Environment(\.bower) private var theme

    var body: some View {
        HStack(spacing: 0) {
            tab(.home, "house", "Home")
            tab(.history, "clock.arrow.circlepath", "History")
            tab(.profile, "person.crop.circle", "Profile")
        }
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(theme.chrome)
        .overlay(alignment: .top) { Hairline() }
    }

    private func tab(_ t: BowerTab, _ icon: String, _ label: String, soon: Bool = false) -> some View {
        let on = active == t
        return Button { if !soon { onSelect(t) } } label: {
            VStack(spacing: 3) {
                Image(systemName: icon).font(.system(size: 19))
                Text(soon ? "Soon" : label).font(BowerFont.ui(10, weight: .medium))
            }
            .foregroundStyle(soon ? theme.muted.opacity(0.4) : (on ? theme.satin : theme.muted))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 2)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(soon)
        .accessibilityLabel(soon ? "Scout, coming soon" : label)
    }
}

// MARK: - Launch splash

/// The branded page shown for a beat on every open, then faded away. Mirrors
/// the native launch screen (avenue ground, the arch, the italic wordmark) so
/// the hand-off is seamless.
struct LaunchSplash: View {
    var body: some View {
        ZStack {
            Color(hex: 0x171A2E).ignoresSafeArea() // avenue
            VStack(spacing: 20) {
                Arch(size: 66, stroke: Color(hex: 0x7BA9E8), dot: Color(hex: 0xE8B547))
                HStack(spacing: 0) {
                    Text("bower").foregroundStyle(Color(hex: 0xF2EEE6))
                    Text(".").foregroundStyle(Color(hex: 0xE1563C))
                }
                .font(BowerFont.serif(46))
            }
        }
    }
}
