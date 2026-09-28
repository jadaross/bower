# Every release

What to check each time a build goes to the App Store after 1.0. The first
submission has its own, longer pass (`docs/app-store/launch-test.md`). This is the
short version that catches what breaks between releases. About 30 minutes, most of
it on your phone.

Backend-only changes (a push to `main`, no new build) need only parts 1 and 5.

## 1. Before building (Claude runs these)

- [ ] `npm test`, `npm run lint` and `npm run build` pass.
- [ ] If `src/lib/types.ts` changed, `Wire.swift` changed with it, and an older app still decodes the new response (new fields optional, nothing renamed).
- [ ] Any new migration is applied to production, and `/admin` → Health is clean afterwards.
- [ ] The iOS app builds with no warnings, and the stub (`-bowerStub`) opens every screen touched by the release.
- [ ] New user-facing copy follows `docs/copy.md` and CLAUDE.md: no em dashes, and no "unlimited" on anything with a hard stop.
- [ ] If `Arch` changed, the launch image and icon were re-rendered (`BOWER_RENDER_LAUNCH=1`).
- [ ] The iOS tests pass, including `PaletteContrastTests` (every text colour at 4.5:1 in both themes).
- [ ] `./scripts/screens.sh` shoots every page in light and dark, and each one is looked at: nothing cut off, overlapping or wrapping badly, nothing hard to read. If the release touched layout, the listing and Home again at the largest text size (`xcrun simctl ui booted content_size extra-extra-extra-large`). A new screen or sheet gets a line in the script, and a `-bower…` launch argument if nothing reaches it.
- [ ] New text uses a `BowerFont` step and a theme text token (`accentText`, `errorText`, `confirmText`), never a number or a fill colour.

## 2. The build

- [ ] `./scripts/upload.sh --internal-only` (your phone only). Friends get it later with `node scripts/asc.mjs distribute N`, once part 3 passes.
- [ ] The build number in TestFlight matches the "chore: build N" commit.

## 3. On your phone, from TestFlight (the smoke test)

Use a normal account, not the owner's, so the meters are real.

1. [ ] Cold open: sign-in is remembered, and Home appears.
2. [ ] Photograph a piece of clothing and **Write it**. The title lands in about 2 seconds and the listing opens.
3. [ ] Switch platform once and tap one chip. Both rewrite.
4. [ ] Copy the description and paste it somewhere.
5. [ ] **Check the market**, then lock the phone. The notification arrives, and the bands and Ask are there.
6. [ ] History shows the item.
7. [ ] Profile: the meters went down by one listing and one market check.
8. [ ] The paywall opens from Profile with real prices, and **Restore purchases** brings back anything bought before.
9. [ ] A photo that isn't clothing: **Only clothes, shoes and bags**.
10. [ ] Everything the release changed, tried the way a new user would.
11. [ ] If the release changed anything you can see, the page review (`docs/review-checklist.md`) in light and dark.

If the release touched purchases (`Store.swift`, `PaywallSheet.swift`, `/api/purchases`, `/api/apple/notifications`, the allowance SQL), also run part 2 of `docs/app-store/launch-test.md` in full.

## 4. Submit

- [ ] App Store Connect → the new version → What's New: one or two plain lines (no em dashes).
- [ ] Attach the build (`node scripts/asc.mjs attach N`) and submit.
- [ ] If anything a reviewer sees changed (sign-in, deletion, the paywall), note it in App Review Information.

## 5. After it's live (that day, then a week later)

- [ ] `/admin` → Health and Speed: no new errors, and title times are where they were.
- [ ] `/admin` → Cost: the cost per listing and per market check hasn't jumped.
- [ ] Vercel → Logs: no new 500s.
- [ ] App Store Connect → Ratings and Reviews: anything new answered.
- [ ] Anything that went wrong has a ticket.
