# Launch test pass (#75)

Every line is passed on a named build before 1.0 is submitted. What failed
gets a ticket. Tick with the build number.

## Already verified (27 September, before any product exists in ASC)

| Check | How | Result |
|---|---|---|
| The meter spends free listings, then the pack; refunds go back to the bucket they came from; Plus reads as unlimited behind 150 listings and 50 checks; lapsed Plus returns to the free numbers | `src/lib/purchases-sql.test.ts`, against a real Postgres with every migration | Pass |
| A forged, other-app, other-account or Xcode-signed transaction is refused; a replay is a no-op; renewals find their account; refunds take a pack back | `purchases.test.ts`, `purchases-sql.test.ts`, route tests | Pass |
| Paywall in each market's currency, subscribed state, dark mode, pack balance on Home | Simulator, stub (`-bowerPaywall`, `-bowerPlus`, `-bowerPack`, `-bowerMarket`) | Pass |

**Not verifiable in the simulator here:** a real StoreKit purchase. Local
StoreKit testing (`SKTestSession`) loaded no products from a hand-written
`.storekit` file, and the simulator's plain launch ignores a scheme's StoreKit
file. Real purchases are tested in TestFlight's sandbox instead, below.

## Needs the products in App Store Connect (#73) and the Paid Apps agreement

On Jada's phone, from TestFlight (purchases are free there):

- [ ] Paywall shows real prices, not "…"
- [ ] Buy the 10-listing pack on an account with listings left: the pack balance shows in Profile, and Home's cost line still spends the month's first
- [ ] Spend the month's listings: Home says "Uses 1 of your N bought listings"
- [ ] Buy Plus: the paywall says "You're on Plus." and closes; Profile shows unlimited listings and market checks
- [ ] Delete the app, reinstall, sign in, Restore purchases: Plus comes back
- [ ] Cancel Plus in Settings → Subscriptions; after the sandbox expiry (minutes) Profile is back on the free numbers
- [ ] Buy on a second bower account on the same Apple ID: refused with "That purchase belongs to another bower account"
- [ ] Airplane mode mid-purchase: "Bought, but bower couldn't record it yet"; reopen online and it lands

## App Review's path, on an Apple ID that has never used bower

- [ ] Sign in with Apple
- [ ] Photograph something that is not clothing: "we only do clothing", nothing charged
- [ ] Write a listing; run a market check; background the app; the notification arrives
- [ ] Open the paywall from Profile; read the terms; Terms and Privacy links open
- [ ] Delete the account from Profile
- [ ] Load `/privacy` and `/support`

## Spend and limits

- [ ] A monthly spend limit is set on the Anthropic account (console → Limits)
- [ ] The notification URL is set in App Store Connect (App Information → App Store Server Notifications, production and sandbox): `https://<api>/api/apple/notifications`
