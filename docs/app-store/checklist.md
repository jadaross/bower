# App Store submission — the runway

State on 11 Sep 2026: App Store Connect has the record (`com.jadaross.bower`,
app 6808793078), version **1.0** in *Prepare for Submission*, build 34
processed. What is on the record was pushed from this folder; what is not is
under *Human steps*. The tracking issue is the one labelled `ready-for-human`
titled "App Store submission — human steps".

## Already on the record (re-runnable)

| What | Where | How |
|---|---|---|
| Name, subtitle, description, keywords, promo text, copyright | `metadata.json` | `node scripts/asc-metadata.mjs` |
| Support URL (`/support`) and privacy URL (`/privacy`) | `metadata.json`, `src/app/support`, `src/app/privacy` | same |
| Categories: Shopping / Lifestyle | `metadata.json` | same |
| Age rating: every answer "none" → 4+ | `scripts/asc-metadata.mjs` | same |
| Content rights: no third-party content | same | same |
| Six placeholder 6.9" screenshots from the stub | `screenshots/` | `node scripts/asc-screenshots.mjs` — **to be replaced by the designed set** |
| Availability: United Kingdom only, new territories off | ASC → Pricing and Availability | `appAvailabilities` v2 takes all 175 territories in one request; see #55 for widening to IE + AU |
| App Privacy label: Email, Photos, User ID, Other User Content, Product Interaction, Performance Data — all linked, none tracking | ASC → App Privacy (browser only, done 11 Sep) | matches `PrivacyInfo.xcprivacy` from build 35 |

## In the build (from build 35)

| What | Where |
|---|---|
| Export compliance (`ITSAppUsesNonExemptEncryption = NO`) | `ios-app/bower/Info.plist` |
| Privacy manifest: email, photos, user id, user content, product interaction | `PrivacyInfo.xcprivacy` |
| iPhone only, portrait only | `project.pbxproj` |
| Account deletion (guideline 5.1.1(v)) | Profile → Delete account |
| Privacy policy names what is stored (text history, no photos) and who processes it | `/privacy` |

## Human steps — no API for these

1. **Support email.** Decide the address (a plain Gmail, or a domain with
   iCloud+ custom email / Cloudflare forwarding to the hotmail). Then put it in
   `src/app/support/page.tsx` (`SUPPORT_EMAIL`) and deploy; the page is
   already the support URL on the record. **Not done yet.**
2. **Screenshots.** Design the real set (Claude Design) from the raw captures
   in `screenshots/`; export at 1320×2868 PNG; drop them in that folder in
   order and run `node scripts/asc-screenshots.mjs`, or upload in ASC by hand.
   The six placeholders currently on the record are the raw captures.
3. **Pricing.** Nothing is chosen yet, and a price (even Free) is required
   before submission; the UK availability row shows `CANNOT_SELL` until it is.
   Free is one API call (`appPriceSchedules` with the GBR £0 price point) when
   the decision is made. **Decision still open** — see *If pricing changes*.
4. **Review contact.** Set `ASC_CONTACT_FIRST`, `ASC_CONTACT_LAST`,
   `ASC_CONTACT_EMAIL`, `ASC_CONTACT_PHONE` in `.asc-key.env` and re-run
   `node scripts/asc-metadata.mjs`; ASC requires a phone number. This also
   writes the review notes from `metadata.json`.
5. **Agreements.** Business → Agreements: the free-app agreement is what
   TestFlight already runs on. Any paid tier needs the Paid Apps agreement,
   bank and tax forms, before submission.
6. **Read the listing once in ASC.** The copy in `metadata.json` is a draft in
   bower's voice. Edit the file and re-run rather than editing in the browser,
   or the two drift.

## The last mile, after the final changes

```bash
scripts/upload.sh                      # archive + upload + TestFlight, as now
node scripts/asc-metadata.mjs          # if the copy changed
node scripts/asc-screenshots.mjs       # if the screenshots folder changed
node scripts/asc.mjs attach <build>    # put the processed build on version 1.0
```

Then in ASC: **Add for Review → Submit**. First reviews take 1–3 days.
Release type is *after approval*; switch to manual on the version page to
pick the day.

## What a reviewer will do

- Sign in with their own Apple ID (no allow-list), getting 10 listings and 3
  checks for the month.
- Photograph something that is not clothing to see it fail. It does: "we only
  do clothing", nothing charged.
- Run a market check and background the app. The finishing notification is
  the one permission the app asks for.
- Delete the account from Profile.
- Load the privacy URL and the support URL.

## If pricing changes before launch

A paid tier is StoreKit and a real review of the purchase flow:

- A **subscription or consumable** in ASC (Monetisation → In-App Purchases)
  with its own metadata, screenshot and review notes.
- **Paid Apps agreement**, bank account and tax forms (W-8BEN for a UK
  individual) before the version can be submitted.
- The meter reads entitlements from the App Store receipt **server-side**
  (App Store Server API, or RevenueCat), never from the client — the same
  rule as Enabled Platforms. `reads_limit` / `searches_limit` already take any
  number and null means unlimited, so the schema needs nothing; the profile
  needs a writer.
- Restore Purchases, the price before purchase, and the subscription terms in
  the app (3.1.2); the privacy label gains **Purchase History**.
- First IAP reviews are stricter and slower; leave a week.

Free with the meter now, and a paid tier in 1.1 once the dashboard says what
people actually use, is the shorter path to being live.
