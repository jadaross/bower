import SwiftUI

@main
struct bowerApp: App {
    @UIApplicationDelegateAdaptor(BowerAppDelegate.self) private var delegate
    @State private var state: AppState

    init() {
        #if DEBUG
        // `-bowerStub` as a launch argument runs the whole app against fixture
        // data with no network and no sign-in. For driving screens in the
        // simulator and for demos; the flag does not exist in Release builds.
        if CommandLine.arguments.contains("-bowerStub") {
            let s = AppState(session: SupabaseSession(), api: StubAPI())
            // `-bowerScreen signin` (or any `Screen` raw value) opens there
            // instead of Home, so the one-time pages can be looked at too.
            let args = CommandLine.arguments
            if let i = args.firstIndex(of: "-bowerScreen"), i + 1 < args.count,
               let start = Screen(rawValue: args[i + 1]) {
                s.screen = start
            } else {
                s.screen = .capture
            }
            // `-bowerLink <url>` starts with a product page pasted on Home,
            // for looking at the link row and the link-only read.
            if let i = args.firstIndex(of: "-bowerLink"), i + 1 < args.count {
                s.link = args[i + 1]
            }
            // `-bowerPhotos 3` starts with stand-in photos in the pile.
            s.photos = DebugLaunch.photos
            // `-bowerMarket US` (or AU) selling there, in its currency.
            if let m = StubAPI.market { s.market = m }
            // The paywall's prices, per market, since the stub has no App Store.
            s.store.fixturePrices = switch s.market {
            case .US: ("$4.99", "$0.99")
            case .AU: ("A$6.99", "A$1.49")
            case .IE: ("€4.99", "€0.99")
            default:  ("£4.99", "£0.99")
            }
            // `-bowerPaywall` opens with the paywall up (`listings`, `checks`
            // or `browse`, default browse). Add `-bowerPlus` for the subscribed state.
            if let i = args.firstIndex(of: "-bowerPaywall") {
                let next = i + 1 < args.count ? args[i + 1] : ""
                s.paywall = next == "listings" ? .listings : next == "checks" ? .checks : .browse
            }
            _state = State(initialValue: s)
            return
        }
        #endif
        let session = SupabaseSession()
        _state = State(initialValue: AppState(session: session, api: BowerAPI(session: session)))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(state)
        }
    }
}
