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
