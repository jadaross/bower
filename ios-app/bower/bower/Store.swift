import Foundation
import StoreKit

/// What bower sells (ADR-0010). The server knows the same two ids
/// (`src/lib/products.ts`); they are permanent once in App Store Connect.
enum StoreProduct {
    static let plus = "com.jadaross.bower.plus.monthly"
    static let pack = "com.jadaross.bower.pack.10"
    static let all = [plus, pack]
}

/// StoreKit 2, and nothing else: loads the two products, buys them, and hands
/// every signed transaction to the server, which is the only thing that moves
/// a meter (ADR-0011). A transaction is finished only once the server has it,
/// so one lost to a dead connection comes back through `Transaction.updates`
/// on the next launch instead of being paid for and never counted.
@Observable
final class Store {
    enum Outcome: Equatable {
        case done
        case cancelled
        /// Ask to Buy, or a payment that needs the bank's say-so.
        case pending
        case failed(String)
    }

    private(set) var plus: Product?
    private(set) var pack: Product?
    private(set) var loadFailed = false
    /// The product being bought right now, for the button that shows it.
    private(set) var buying: String?
    private(set) var restoring = false

    /// DEBUG stub only (`-bowerStub`): prices to show where StoreKit has no
    /// products, so the paywall can be looked at and screenshotted.
    var fixturePrices: (plus: String, pack: String)?
    var plusPrice: String? { plus?.displayPrice ?? fixturePrices?.plus }
    var packPrice: String? { pack?.displayPrice ?? fixturePrices?.pack }

    /// Posts a signed transaction to the server.
    private let report: (String) async throws -> ProfileResponse
    /// Given the profile the server answers with, meters already moved.
    var onProfile: ((ProfileResponse) -> Void)?
    private var updates: Task<Void, Never>?

    init(report: @escaping (String) async throws -> ProfileResponse) {
        self.report = report
    }

    /// Started once at launch: renewals, Ask to Buy approvals, purchases made
    /// on another device, and anything a previous launch failed to report.
    func listen() {
        guard updates == nil else { return }
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                _ = await self?.settle(result)
            }
        }
    }

    func load() async {
        guard plus == nil || pack == nil else { return }
        do {
            let products = try await Product.products(for: StoreProduct.all)
            plus = products.first { $0.id == StoreProduct.plus }
            pack = products.first { $0.id == StoreProduct.pack }
            loadFailed = plus == nil && pack == nil
        } catch {
            loadFailed = true
        }
    }

    /// `account` is the signed-in user's id. Apple signs it into the
    /// transaction, so the server can refuse it from any other account.
    func buy(_ product: Product, account: UUID?) async -> Outcome {
        buying = product.id
        defer { buying = nil }
        var options: Set<Product.PurchaseOption> = []
        if let account { options.insert(.appAccountToken(account)) }
        do {
            switch try await product.purchase(options: options) {
            case .success(let result): return await settle(result)
            case .userCancelled: return .cancelled
            case .pending: return .pending
            @unknown default: return .cancelled
            }
        } catch {
            return .failed("The App Store didn't finish that. Try again.")
        }
    }

    /// Re-sends every live entitlement: Plus bought on another device or
    /// before a reinstall. Packs are consumables and are never restored; their
    /// balance lives on the account, not on the Apple ID.
    func restore() async -> Outcome {
        restoring = true
        defer { restoring = false }
        do { try await AppStore.sync() } catch { return .cancelled }
        var outcome = Outcome.failed("Nothing to restore on this Apple ID.")
        for await result in Transaction.currentEntitlements {
            let o = await settle(result)
            if o == .done || outcome != .done { outcome = o }
        }
        return outcome
    }

    /// Hands one signed transaction to the server, then finishes it. One the
    /// server refuses outright is finished too, so it is not re-offered on
    /// every launch; one that only failed to arrive is left for next time.
    private func settle(_ result: VerificationResult<Transaction>) async -> Outcome {
        guard case .verified(let tx) = result else {
            return .failed("The App Store couldn't confirm that purchase.")
        }
        do {
            onProfile?(try await report(result.jwsRepresentation))
            await tx.finish()
            return .done
        } catch APIError.server(let status, let message) where status == 409 || status == 422 {
            await tx.finish()
            return .failed(message ?? "That purchase couldn't be added to this account.")
        } catch {
            return .failed("Bought, but bower couldn't record it yet. It will be added next time you open the app.")
        }
    }
}
