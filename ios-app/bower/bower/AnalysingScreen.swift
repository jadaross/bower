import SwiftUI

/// The read, shown as it happens. Four frames, one per stage of the read,
/// each swept once and ticked; the stage label under them names what the
/// server is actually doing, and the item's title lands the moment the stream
/// has written it. Nothing here is a timer — every step is a real event on
/// the wire (`AnalyseProgress`) — so there is still no percentage: the
/// fragments are opaque, and any number would be invented.
struct AnalysingScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    enum Phase: Equatable { case reading, failed, allowance(AllowanceState), rejected(AnalyseRejection) }

    /// Left to right. `sent` is true the moment the request is built; the rest
    /// arrive from the stream.
    private static let stages = ["Photos sent", "Reading tag and label", "Writing the listing", "Finishing touches"]

    @State private var phase: Phase = .reading
    @State private var stage = 0
    @State private var title: String?
    @State private var task: Task<Void, Never>?

    var body: some View {
        ZStack {
            theme.avenue.ignoresSafeArea()
            switch phase {
            case .reading:   reading
            case .failed:    failed
            case .allowance(let a): allowance(a)
            case .rejected(let r): rejected(r)
            }
        }
        .onAppear(perform: start)
        .onDisappear { task?.cancel() }
    }

    // MARK: Reading

    private var reading: some View {
        VStack(alignment: .leading, spacing: 38) {
            HStack(spacing: 10) {
                ForEach(0..<Self.stages.count, id: \.self) { n in
                    ReadFrame(state: n < stage ? .read : (n == stage ? .active : .waiting), pollen: theme.pollen)
                }
            }

            VStack(alignment: .leading, spacing: 0) {
                Kicker(Self.stages[min(stage, Self.stages.count - 1)], color: theme.pollen)
                    .contentTransition(.opacity)
                    .animation(.easeOut(duration: 0.25), value: stage)

                Group {
                    if let title {
                        Text(title)
                            .font(BowerFont.serif(44))
                            .lineSpacing(2)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                    } else {
                        Text("Reading your photos")
                            .font(BowerFont.serif(36))
                            .opacity(0.9)
                    }
                }
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
                .frame(minHeight: 130, alignment: .top)
                .padding(.top, 12)
            }
        }
        .padding(.horizontal, 30)
        .animation(.easeOut(duration: 0.45), value: title)
    }

    private func start() {
        phase = .reading
        title = nil
        stage = 0

        task = Task {
            do {
                let result = try await state.api.analyse(
                    images: state.photos.map(\.data),
                    tone: .casual,
                    platform: state.preferred,
                    onProgress: { p in Task { @MainActor in advance(p) } }
                )
                guard !Task.isCancelled else { return }
                state.analysis = result
                state.reads.used += 1
                Notifications.scheduleNudge()
                stage = Self.stages.count
                try? await Task.sleep(for: .milliseconds(420))
                state.screen = .listing
            } catch APIError.allowanceExhausted(let a) {
                state.reads = a
                phase = .allowance(a)
            } catch APIError.notSignedIn, APIError.sessionInvalid {
                await state.signOut()
            } catch APIError.rejected(let reason) {
                phase = .rejected(reason)
            } catch {
                phase = .failed
            }
        }
    }

    /// Stages only ever move forward; a late or repeated event cannot wind the
    /// frames back.
    private func advance(_ p: AnalyseProgress) {
        switch p {
        case .reading:        stage = max(stage, 1)
        case .title(let t):   title = t; stage = max(stage, 2)
        case .finishing:      stage = max(stage, 3)
        }
    }

    // MARK: Failed

    private var failed: some View {
        fullBleed(
            badge: "!", badgeColor: theme.coral,
            title: "The connection dropped",
            body: "Your photos are still here. Try again when you have signal."
        ) {
            Button { start() } label: { primaryLabel("Try again", fg: theme.avenue, bg: .white) }
            Button { state.screen = .capture } label: { primaryLabel("Back to photos", fg: .white, bg: .white.opacity(0.12)) }
        }
    }

    // MARK: Rejected

    /// The server looked and said no: not clothes, or not something it will
    /// describe. Nothing was charged. The photos are cleared on the way back,
    /// because there is nothing to price in them.
    private func rejected(_ r: AnalyseRejection) -> some View {
        fullBleed(badge: "!", badgeColor: theme.coral, title: r.title, body: r.body) {
            Button { state.photos = []; state.screen = .capture } label: {
                primaryLabel("Back to photos", fg: theme.avenue, bg: .white)
            }
        }
    }

    // MARK: Allowance

    private func allowance(_ a: AllowanceState) -> some View {
        fullBleed(
            badge: "!", badgeColor: theme.pollen,
            title: "That's the lot for this month",
            body: ["All \(a.limit ?? a.used) listings are used.", a.resetsText].compactMap { $0 }.joined(separator: " ")
        ) {
            Button { state.screen = .settings } label: { primaryLabel("See what's left", fg: .white, bg: .white.opacity(0.12)) }
            Button { state.screen = .capture } label: { primaryLabel("Back to photos", fg: .white.opacity(0.7), bg: .clear) }
        }
    }

    // MARK: Shared

    private func fullBleed<Actions: View>(badge: String, badgeColor: Color, title: String, body: String,
                                          @ViewBuilder actions: () -> Actions) -> some View {
        VStack(spacing: 18) {
            Text(badge)
                .font(BowerFont.ui(24, weight: .bold))
                .foregroundStyle(badgeColor)
                .frame(width: 56, height: 56)
                .background(.white.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            VStack(spacing: 10) {
                Text(title).font(BowerFont.serif(30)).foregroundStyle(.white).multilineTextAlignment(.center)
                Text(body)
                    .font(BowerFont.ui(13.5))
                    .foregroundStyle(.white.opacity(0.68))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 270)
            }
            VStack(spacing: 9) { actions() }
                .padding(.top, 6)
        }
        .padding(.horizontal, 30)
        .padding(.vertical, 40)
    }

    private func primaryLabel(_ text: String, fg: Color, bg: Color) -> some View {
        Text(text)
            .font(BowerFont.ui(15, weight: .semibold))
            .foregroundStyle(fg)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(bg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

/// One frame of the read. Waiting is an outline; active is a pollen sweep
/// running top to bottom; read is a tick that stays.
private struct ReadFrame: View {
    enum State { case waiting, active, read }
    let state: State
    let pollen: Color

    @SwiftUI.State private var sweep = false

    var body: some View {
        Color.clear
            .aspectRatio(3 / 4, contentMode: .fit)
            .background(.white.opacity(0.05))
            .overlay {
                if state == .active {
                    GeometryReader { geo in
                        LinearGradient(colors: [.clear, pollen, .clear], startPoint: .top, endPoint: .bottom)
                            .opacity(0.8)
                            .frame(height: geo.size.height * 0.38)
                            .offset(y: sweep ? geo.size.height * 1.1 : -geo.size.height * 0.42)
                            .animation(.linear(duration: 0.75).repeatForever(autoreverses: false), value: sweep)
                            .onAppear { sweep = true }
                    }
                }
                if state == .read {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(pollen)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(state == .active ? pollen : .white.opacity(0.14), lineWidth: 1)
            )
            .animation(.easeOut(duration: 0.3), value: state)
    }
}
