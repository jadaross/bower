# Launch test pass (#75)

The last run-through before 1.0 is submitted, on the build that goes to review.
Run it top to bottom on your phone from TestFlight, and tick each line with the
build number. Anything that fails gets a ticket, and the build is not submitted
until it's fixed. Purchases in TestFlight are free (sandbox), so buy freely.

About an hour. You need: your phone with the review build, a second Apple ID that
has never used bower (for part 4), and a laptop for part 6.

## Already verified (27 September, before any product exists in ASC)

| Check | How | Result |
|---|---|---|
| The meter spends free listings, then the pack; refunds go back to the bucket they came from; Plus reads as unlimited behind 150 listings and 50 checks; lapsed Plus returns to the free numbers | `src/lib/purchases-sql.test.ts`, against a real Postgres with every migration | Pass |
| A forged, other-app, other-account or Xcode-signed transaction is refused; a replay is a no-op; renewals find their account; refunds take a pack back | `purchases.test.ts`, `purchases-sql.test.ts`, route tests | Pass |
| Paywall in each market's currency, subscribed state, dark mode, pack balance on Home | Simulator, stub (`-bowerPaywall`, `-bowerPlus`, `-bowerPack`, `-bowerMarket`) | Pass |

Not verifiable in the simulator: a real StoreKit purchase. That is part 2.

## Before you start

- [ ] Submission-day step 1 is done: the free tier is at **5 listings and 1 market check** (#76), and this build is the one attached to the version in App Store Connect.
- [ ] TestFlight shows the build number you are about to tick with.
- [ ] Your own account is the owner's, with no limits. For parts 2 and 3, use the second bower account (or a fresh one) so the meters are real.

## 1. The free product, start to finish

1. [ ] Open the app from cold. The splash lifts on its own, without a flash.
2. [ ] Home: tap the mark (About), **Tips** and **?**. Each opens a sheet that closes with Done or a drag.
3. [ ] Take a photo with the camera, add two from the library, then remove one with its ✕. The pile animates, and "Write it · 2 photos" updates.
4. [ ] Tap **Write it**. The four frames step through, the title lands in about 2 seconds, and the listing opens with a success tap.
5. [ ] On the listing: switch platform, switch tone, tap two chips, then Reset. Each rewrite lands without the page jumping.
6. [ ] Copy the title, the description and one field. Each says **Copied**. Paste into Notes to check.
7. [ ] Tap **Open Depop** (or the Preferred Platform). The platform's app or site opens, and "◀ bower" in the status bar brings you back.
8. [ ] Thumbs up, then **Tell us**, and send a line. It says sent.
9. [ ] Tap **Check the market**, then lock the phone straight away. The "Your price is in" notification arrives. Open it: price bands per platform, and the Ask.
10. [ ] Tap a platform row. The comparable listings open, and tapping one opens that listing.
11. [ ] **History** tab: the item is there with its prices. Open it, and Done closes it.
12. [ ] Paste a product link on Home with no photos, and fill in Size. **Write it · link** works, and the listing reads from the page.
13. [ ] Paste something that isn't a link. Home says "That doesn't look like a link. It should start with https://"
14. [ ] Photograph something that is not clothing (a mug). The screen says **Only clothes, shoes and bags**, and Back to photos clears the pile.
15. [ ] Profile: turn a seller note on. The preview line updates, and the next listing ends with it.
16. [ ] Profile: change the Preferred Platform. The next listing is written for it.

## 2. Running out, and buying

On a free account (5 listings, 1 market check):

1. [ ] Profile shows **5 of 5 left** and **1 of 1 left**, and the numbers go down as you spend.
2. [ ] Spend the one market check. The button now says **Get more market checks** and opens the paywall headed "This month's market checks are used."
3. [ ] Paywall shows **real prices** (£4.99 a month, £0.99 once), never "…". The renewal terms, Restore purchases, Terms and Privacy are all there, and Terms and Privacy open.
4. [ ] Spend all five listings. Home's button says **Get more listings**, and the line under it says "This month's listings are used. Resets 1 October."
5. [ ] Buy the **10-listing pack**. "10 listings added." lands, the sheet closes, and Profile shows "Plus 10 bought listings, used after these."
6. [ ] Write a listing. Home said "Uses 1 of your 10 bought listings" before, and the count goes to 9 after.
7. [ ] Buy **Plus**. "You're on Plus." lands, the cards change to "Manage subscription", and the sheet closes. Profile shows **No limit** for listings and **50 of 50 left** for market checks.
8. [ ] Delete the app, reinstall, sign in, open the paywall from Profile, and tap **Restore purchases**. Plus comes back.
9. [ ] Settings → your name → Subscriptions → bower Plus → Cancel. Once the sandbox subscription lapses (it runs on a sped-up clock, so it can take a while), Profile is back on the free numbers, and the unused bought listings are still there.
10. [ ] Turn on airplane mode, buy the pack, and let it fail. The message says "Bought, but bower couldn't record it yet" or the App Store error. Back online and reopened, the pack lands once, not twice.
11. [ ] Sign in to a **second bower account** on the same phone and Apple ID while Plus is active. Restore or buy is refused with "That purchase belongs to another bower account."

## 3. When things go wrong

1. [ ] Airplane mode, then **Write it**. "The connection dropped", "this one didn't count", and **Try again** works once you're back online. Profile's count didn't drop.
2. [ ] Airplane mode, then **Check the market**. "The market check didn't come back, and it didn't count." Your estimate is still on screen.
3. [ ] Paste a link to a page that doesn't exist. **Couldn't read that link**, and the link is still in the field to fix.
4. [ ] History with airplane mode on: "Couldn't load your history. Check your connection and try again."

## 4. App Review's path, on an Apple ID that has never used bower

Do this on a phone signed into the second Apple ID (or sign out of the App Store and TestFlight on yours).

1. [ ] Install from TestFlight. The welcome screen, "what bower does" and where-you-sell pages show once, and the notifications ask comes up.
2. [ ] **Sign in with Apple**, including with "Hide my email".
3. [ ] Photograph something that is not clothing: **Only clothes, shoes and bags**.
4. [ ] Write a listing, run a market check, and background the app. The notification arrives.
5. [ ] Open the paywall from Profile (bower Plus). Read the terms, and open Terms and Privacy.
6. [ ] Profile → **Delete account** → confirm. You land back on sign-in, and signing in again starts a fresh account (5 and 1, empty history).
7. [ ] In Safari: `/privacy` and `/support` load and show the support email.

## 5. Every market

1. [ ] Profile → Selling in: switch to **Ireland**, **US** and **Australia** in turn. The platforms on offer change, and a listing's prices come out in €, $ and A$.
2. [ ] Optional: Settings → App Store → Sandbox Account → change the region to the US, then open the paywall. It shows $4.99 / $0.99.

## 6. Spend and the back end (laptop)

- [ ] A monthly spend limit is set on the Anthropic account (console → Limits)
- [x] The notification URL is set in App Store Connect, production and sandbox, V2: `https://bower-jadas-projects-b3cbda3d.vercel.app/api/apple/notifications` (27 Sep, through the API)
- [ ] `/admin` → Health: no errors from your test run. The purchases from part 2 show on People.
- [ ] Vercel → the project → Logs: no 500s from `/api/purchases` or `/api/apple/notifications` during part 2.
- [ ] Supabase → `purchases` table: one row per thing you bought, none twice.

## Result

Build ____ passed on ____ (date). Submit.
