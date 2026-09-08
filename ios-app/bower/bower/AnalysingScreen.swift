import SwiftUI

/// One mark, one word, and then the title. The arch fills while the photos
/// are read; the item's title appears the moment the stream has written it,
/// well before the description and price. There is still no percentage: the
/// fragments are opaque, so any number would be invented.
struct AnalysingScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    enum Phase: Equatable { case reading, failed, allowance(AllowanceState) }

    @State private var phase: Phase = .reading
    @State private var fill: CGFloat = 0
    @State private var title: String?
    @State private var task: Task<Void, Never>?

    var body: some View {
        ZStack {
            theme.avenue.ignoresSafeArea()
            switch phase {
            case .reading:   reading
            case .failed:    failed
            case .allowance(let a): allowance(a)
            }
        }
        .onAppear(perform: start)
        .onDisappear { task?.cancel() }
    }

    // MARK: Reading

    private var reading: some View {
        VStack(spacing: 26) {
            ArchFill(progress: fill, stroke: .white, fillColor: theme.sheen, dot: theme.pollen)
                .frame(width: 190, height: 190)
            VStack(spacing: 14) {
                Text("Sussing it out")
                    .font(BowerFont.serif(40))
                    .foregroundStyle(.white)
                if let title {
                    Text(title)
                        .font(BowerFont.ui(15, weight: .medium))
                        .foregroundStyle(.white.opacity(0.75))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 290)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
        }
        .padding(30)
        .animation(.easeOut(duration: 0.3), value: title)
    }

    private func start() {
        phase = .reading
        title = nil
        // Breathe continuously while reading — a rising/falling fill that never
        // stalls at the top — then snap to full when the result lands.
        fill = 0.15
        withAnimation(.easeInOut(duration: 1.3).repeatForever(autoreverses: true)) { fill = 1.0 }

        task = Task {
            do {
                let result = try await state.api.analyse(
                    images: state.photos.map(\.data),
                    tone: .casual,
                    platform: state.preferred,
                    onTitle: { t in Task { @MainActor in title = t } }
                )
                guard !Task.isCancelled else { return }
                state.analysis = result
                state.used += 1
                withAnimation(.easeOut(duration: 0.3)) { fill = 1 }
                try? await Task.sleep(for: .milliseconds(320))
                state.screen = .listing
            } catch APIError.allowanceExhausted(let a) {
                state.used = a.used; state.allowance = a.limit
                phase = .allowance(a)
            } catch APIError.notSignedIn, APIError.sessionInvalid {
                await state.signOut()
            } catch {
                phase = .failed
            }
        }
    }

    // MARK: Failed

    private var failed: some View {
        fullBleed(
            badge: "!", badgeColor: theme.coral,
            title: "The connection dropped",
            body: "Your photos are still here — nothing was lost. Try again when you have signal."
        ) {
            Button { start() } label: { primaryLabel("Try again", fg: theme.avenue, bg: .white) }
            Button { state.screen = .capture } label: { primaryLabel("Back to photos", fg: .white, bg: .white.opacity(0.12)) }
        }
    }

    // MARK: Allowance

    private func allowance(_ a: AllowanceState) -> some View {
        fullBleed(
            badge: "!", badgeColor: theme.pollen,
            title: "That's the lot for today",
            body: "You've used all \(a.limit) reads this month. There's no way to buy more in this version, so it's a hard stop until it resets\(resetText(a))."
        ) {
            Button { state.screen = .settings } label: { primaryLabel("See what's left", fg: .white, bg: .white.opacity(0.12)) }
            Button { state.screen = .capture } label: { primaryLabel("Back to photos", fg: .white.opacity(0.7), bg: .clear) }
        }
    }

    private func resetText(_ a: AllowanceState) -> String {
        guard let iso = a.resetsAt, let date = ISO8601DateFormatter().date(from: iso) else { return "" }
        return " on \(date.formatted(.dateTime.day().month(.wide)))"
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

/// The arch, filling from the bottom. The same geometry as `Arch`, closed
/// along the base so it can clip a rising fill.
struct ArchFill: View {
    var progress: CGFloat
    var stroke: Color
    var fillColor: Color
    var dot: Color

    var body: some View {
        GeometryReader { geo in
            let S = min(geo.size.width, geo.size.height)
            let w = S * 0.5
            let x = S / 2 - w / 2
            let top = S * 0.2
            let bot = S * 0.82
            let shoulder = top + w / 2
            let shape = Path { p in
                p.move(to: CGPoint(x: x, y: bot))
                p.addLine(to: CGPoint(x: x, y: shoulder))
                p.addArc(center: CGPoint(x: S / 2, y: shoulder), radius: w / 2,
                         startAngle: .degrees(180), endAngle: .degrees(360), clockwise: false)
                p.addLine(to: CGPoint(x: x + w, y: bot))
                p.closeSubpath()
            }

            ZStack {
                shape.fill(.white.opacity(0.06))
                Rectangle()
                    .fill(fillColor.opacity(0.9))
                    .frame(height: S * progress)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .clipShape(shape)
                shape.stroke(stroke, style: StrokeStyle(lineWidth: S * 0.035, lineJoin: .round))
                Circle()
                    .fill(dot)
                    .frame(width: S * 0.15, height: S * 0.15)
                    .position(x: S / 2, y: S * 0.58)
            }
            .frame(width: S, height: S)
        }
    }
}
