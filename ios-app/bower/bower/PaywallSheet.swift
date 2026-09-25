import StoreKit
import SwiftUI

/// Why the paywall opened, which decides its first line.
enum PaywallReason: Identifiable {
    case listings, checks, browse
    var id: Self { self }
}

/// bower Plus above the listing pack (ADR-0010). Sells the price and the
/// two-second read, never "AI descriptions". Everything App Review asks of a
/// subscription (3.1.2) is on the sheet: the price before the button, what
/// renews and when, how to cancel, Restore, and the terms and privacy links.
struct PaywallSheet: View {
    let reason: PaywallReason

    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var message: String?
    @State private var landed: String?
    @State private var manage = false

    private var store: Store { state.store }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Kicker("bower Plus", color: theme.satin)
                    Spacer()
                    Button("Done") { dismiss() }
                        .buttonStyle(.bowerPress)
                        .font(BowerFont.ui(14, weight: .semibold))
                        .foregroundStyle(theme.satin)
                }

                Group {
                    if let landed {
                        Text(landed).id(landed)
                    } else {
                        Text(headline).id(headline)
                    }
                }
                .font(BowerFont.serif(30))
                .foregroundStyle(theme.text)
                .fixedSize(horizontal: false, vertical: true)
                .transition(Motion.sharpen)
                .padding(.top, 10)

                if let sub = subline {
                    Text(sub)
                        .font(BowerFont.ui(13)).foregroundStyle(theme.muted)
                        .padding(.top, 6)
                }

                if state.isPlus {
                    subscribed.padding(.top, 20)
                } else {
                    plusCard.padding(.top, 20)
                    packCard.padding(.top, 12)
                }

                if store.loadFailed && store.fixturePrices == nil {
                    Text("Couldn't reach the App Store. Check your connection.")
                        .font(BowerFont.ui(12.5)).foregroundStyle(theme.coral)
                        .padding(.top, 12)
                }

                if let message {
                    Text(message)
                        .font(BowerFont.ui(12.5)).foregroundStyle(theme.coral)
                        .padding(.top, 12)
                        .transition(Motion.rise)
                }

                Text("Chips and switching platforms are always free.")
                    .font(BowerFont.ui(12)).foregroundStyle(theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 18)

                footer.padding(.top, 14)
            }
            .padding(.horizontal, 22)
            .padding(.top, 18)
            .padding(.bottom, 24)
        }
        .background(theme.bg)
        .animation(Motion.quick, value: message)
        .animation(Motion.arrive, value: landed)
        .sensoryFeedback(.success, trigger: landed) { _, now in now != nil }
        .task { await store.load() }
        .manageSubscriptionsSheet(isPresented: $manage)
    }

    // MARK: - Words

    private var headline: String {
        if state.isPlus { return "You're on Plus." }
        switch reason {
        case .listings: return "This month's listings are used."
        case .checks:   return "This month's market checks are used."
        case .browse:   return "Write everything. Price it properly."
        }
    }

    private var subline: String? {
        if state.isPlus || landed != nil { return nil }
        switch reason {
        case .listings: return [state.reads.resetsText, "Or keep going now."].compactMap { $0 }.joined(separator: " ")
        case .checks:   return [state.searches.resetsText, "Or keep going now."].compactMap { $0 }.joined(separator: " ")
        case .browse:   return nil
        }
    }

    // MARK: - Plus

    private var plusCard: some View {
        BowerCard(padding: 18, borderColor: theme.satin.opacity(0.45)) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Plus").font(BowerFont.serif(26)).foregroundStyle(theme.text)
                    Spacer()
                    price(store.plusPrice, per: "a month")
                }
                VStack(alignment: .leading, spacing: 9) {
                    tick("Unlimited listings")
                    tick("10 market checks a month")
                    tick("A price for every platform, with the listings behind it")
                }
                .padding(.top, 14)

                BowerButton(title: store.buying == StoreProduct.plus ? "Opening the App Store…" : "Get Plus",
                            disabled: store.plusPrice == nil || store.buying != nil) {
                    if let p = store.plus { Task { await buy(p, landed: "You're on Plus.") } } else { message = noStore }
                }
                .padding(.top, 18)

                Text(renewalTerms)
                    .font(BowerFont.ui(11)).foregroundStyle(theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 10)
            }
        }
    }

    private let noStore = "The App Store isn't available here."

    private var renewalTerms: String {
        let price = store.plusPrice ?? "the price above"
        return "Renews every month at \(price) until you cancel. Cancel any time in Settings, at least a day before it renews."
    }

    // MARK: - Pack

    private var packCard: some View {
        BowerCard(padding: 18) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    Text("10 listings").font(BowerFont.serif(22)).foregroundStyle(theme.text)
                    Spacer()
                    price(store.packPrice, per: "once")
                }
                Text("Listings only. They never expire and are used after your free ones. Plus adds market checks.")
                    .font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 6)
                BowerButton(title: store.buying == StoreProduct.pack ? "Opening the App Store…" : "Buy 10 listings",
                            kind: .secondary, disabled: store.packPrice == nil || store.buying != nil) {
                    if let p = store.pack { Task { await buy(p, landed: "10 listings added.") } } else { message = noStore }
                }
                .padding(.top, 14)
                if state.packListings > 0 {
                    Text("\(state.packListings) bought listing\(state.packListings == 1 ? "" : "s") left.")
                        .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 9)
                }
            }
        }
    }

    // MARK: - Subscribed

    private var subscribed: some View {
        BowerCard(padding: 18) {
            VStack(alignment: .leading, spacing: 9) {
                tick("Unlimited listings")
                tick("10 market checks a month")
                BowerButton(title: "Manage subscription", kind: .secondary) { manage = true }
                    .padding(.top, 9)
            }
        }
    }

    // MARK: - Bits

    private func price(_ amount: String?, per: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 5) {
            Text(amount ?? "…")
                .font(BowerFont.serifUpright(24)).foregroundStyle(theme.text).monospacedDigit()
                .contentTransition(.opacity)
            Text(per).font(BowerFont.ui(12)).foregroundStyle(theme.muted)
        }
        .animation(Motion.quick, value: amount)
    }

    private func tick(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 9) {
            Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(theme.moss)
            Text(text).font(BowerFont.ui(14)).foregroundStyle(theme.text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var footer: some View {
        HStack(spacing: 18) {
            Button(store.restoring ? "Restoring…" : "Restore purchases") { Task { await restore() } }
                .disabled(store.restoring)
            Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
            Link("Privacy", destination: APIConfig.baseURL.appending(path: "privacy"))
        }
        .buttonStyle(.bowerPress)
        .font(BowerFont.ui(12, weight: .medium))
        .foregroundStyle(theme.muted)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Buying

    private func buy(_ product: Product, landed text: String) async {
        message = nil
        settle(await store.buy(product, account: state.accountId), landed: text)
    }

    private func restore() async {
        message = nil
        settle(await store.restore(), landed: state.isPlus ? "You're on Plus." : "Restored.")
    }

    private func settle(_ outcome: Store.Outcome, landed text: String) {
        switch outcome {
        case .done:
            landed = text
            Task {
                try? await Task.sleep(for: .seconds(1.4))
                dismiss()
            }
        case .cancelled:
            break
        case .pending:
            message = "Waiting for approval. It's added as soon as it's approved."
        case .failed(let why):
            message = why
        }
    }
}
