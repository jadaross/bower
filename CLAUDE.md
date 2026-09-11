# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

bower values a secondhand item from photographs and tells the user what to write,
where to post it, and what to ask for it.

It is **an iOS app with a headless backend**. There is no web UI — the Next.js app
exists for its API routes and its deployment story on Vercel, plus one legal page
(`/privacy`) that App Store Connect requires. If you open this repo expecting pages,
see `docs/adr/0002-headless-nextjs-api-on-vercel.md`.

Read `CONTEXT.md` for the domain vocabulary, `ARCHITECTURE.md` for the call flow and
what each model call costs, and `docs/adr/` for why things are the way they are before
making architectural changes.

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build + type-check
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

```bash
npm test         # Vitest — 222 tests across the backend
```

The iOS app lives in `ios-app/bower/` and builds with Xcode 26 against iOS 26.5.
Prefer the XcodeBuildMCP tools; call `session_show_defaults` first. Launch with
`-bowerStub` to run every screen on fixtures with no network and no sign-in — DEBUG
only, the flag does not exist in Release. Add `-bowerScreen signin` (or `how`,
`platforms`, …) to open on one of the one-time pages instead of Home; `-bowerUnlimited`
for an account with no limits, `-bowerSpent` for both meters at zero.

## Environment

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` plus the three
Supabase values (or run `vercel env pull .env.local`). See `SETUP.md`.

## Architecture

### API routes

Every route runs on the Node runtime and requires a Supabase bearer token —
there are no anonymous requests, because the meter needs someone to meter
(ADR-0007). Wrap handlers in `withAuth` from `src/lib/auth.ts`.

| Route | Purpose |
|---|---|
| `POST /api/analyse` | Photos → `AnalysisResult` (tag OCR + Neutral Listing, including the search-free price estimate, plus the named platform's form fields). Streams SSE. Up to 5 photos. **Spends one listing.** |
| `POST /api/format`  | Neutral `Listing` + platform + tone → `PlatformListing`. |
| `POST /api/refine`  | Existing `PlatformListing` + chip instruction text → rewritten `PlatformListing`. |
| `POST /api/valuate` | `ValuationItem` → a Price Band per Enabled Platform, plus a Recommendation. **Spends one market check.** |
| `GET`/`PATCH /api/profile` | The caller's Enabled Platforms, Preferred Platform and the two meters: `allowance` (listings, 10 a month, under the old name so older apps decode) and `searches` (market checks, 3 a month). A null limit is unlimited, which the owner's account has on both. PATCH takes any of the writable fields. |
| `DELETE /api/profile` | Deletes the caller's account. Required by App Review (5.1.1). |
| `DELETE /api/history` | Clears the caller's history. |
| `POST /api/feedback/note` | Typed feedback, stored in `feedback_notes` with the screen, session, platform and trace it was written from. Opened from the listing ("Tell us", beside the thumbs) and from Profile. |

`PATCH /api/profile` also takes `seller_notes`: the opt-in facts about the seller a
listing may state (`smoke_free`, `pet_free`, `posts_next_day`, `bundles`). The three
listing prompts read them from the profile, never the body, and write exactly one agreed
line per platform (`src/lib/seller-notes.ts`). With none on, a listing says nothing about
the seller. See `docs/research/what-sells-terminology.md` for why.

`/api/valuate` reads the Enabled Platforms from the caller's profile — never
from the request body. A client that could name its own platforms could ask for
work it had not enabled.

### Key files

| Path | Role |
|---|---|
| `src/lib/types.ts` | All shared TypeScript types |
| `src/lib/llm/*` | One module per Anthropic call — owns its prompt, SDK invocation, and parsing |
| `src/lib/chip-vocab.ts` | Refinement Chip vocabulary, shared with iOS (`ios/Bower/Models.swift`) |
| `src/platforms/*` | Per-platform knowledge: `metadata.ts` (name, fees, colour) and `listing-spec.ts` (prompt fragment, field schema, validation) |
| `src/lib/auth.ts` | Bearer-token verification and the `withAuth` route wrapper |
| `src/lib/supabase.ts` | The three Supabase clients — anon, per-user (RLS applies), service role (RLS bypassed) |
| `src/lib/allowance.ts` | The Allowance meter. Counting itself lives in SQL, not here |
| `src/lib/profile.ts` | Enabled Platforms, Preferred Platform and seller notes, read and written as the caller |
| `src/lib/seller-notes.ts` | The seller-note vocabulary and its one phrasing per platform |
| `supabase/migrations/*` | The schema, and the source of truth for it — never edit in the dashboard |
| `ios-app/bower/` | **The app.** Eight screens, Supabase Auth (Apple only), the API client. Filesystem-synchronised, so a new `.swift` file joins the target on save. |
| `ios-app/bower/bower/BowerAPI.swift` | The client, behind `BowerAPIClient`. `StubAPI` is the fixture implementation |
| `ios-app/bower/bower/Wire.swift` | Codable mirrors of `types.ts` — keep in step. The wire's `Comparable` is `ComparableListing` here |
| `ios-app/bower/Info.plist` | A *partial* plist merged with the generated one. Custom keys cannot travel via `INFOPLIST_KEY_*`; it sits outside the synced folder deliberately; changing `INFOPLIST_FILE` needs a clean build |
| `ios/` | The **old** mock-driven SwiftUI reference. Superseded by `ios-app/`; kept for the design record. See ADR-0001. |

### Where v1 stands

**Built, both sides.** Backend: five routes, auth, metering on reads and searches,
the Valuation, account deletion, 222 tests. Client: eight screens — the dark welcome
(sign in), "what bower does", where-you-sell, home, the read, price-and-listing,
history, profile — plus three sheets on home: Tips (what photographs well), `?`
(how bower works) and About (tap the mark). Five photos, four suggested angles;
with photos in, home shows a checklist of the angles not yet covered and pins
"Write it" to the foot. Local notifications only (`Notifications.swift`): a market
check finishing in the background, the meters resetting, one nudge after a
quiet week. Real camera,
real Supabase session, every screen exercised in the simulator. Fonts, icon, usage strings,
privacy manifest and export compliance are all in.

**Waiting on:** an App Store Connect record and the first archive (#33) — human
steps in Xcode. The ladder above v1 is ordered in #29.

Two decisions that shape the client and are easy to undo by accident: sign-in is
**Apple only** (a second method without account linking creates two accounts —
#30), and `/api/analyse` streams a JSON *document* in text fragments, not events,
so the client assembles then decodes. Three things are surfaced mid-stream, each a
real wire event (`AnalyseProgress`): the stream opening, the title (pattern-matched
out of the buffer the moment its closing quote arrives), and the `tag_data` key,
which means the listing has closed. The read screen's four frames step on those —
never on a timer.

### Prompt design

`analyse` returns a **single JSON object** in stream order with the `listing`
first and its `title` as the very first field, so the client shows the title the
moment it streams (~2s, the image-reading floor). The tag/label OCR (`tag_data`)
follows. The Neutral Listing carries the search-free price guess as
`price_min`/`price_max`.
That guess is never a Price Band; only `/api/valuate` produces those, and only with
Comparables (ADR-0005). There is deliberately no photo-quality section: nothing
displayed it and it delayed the title by a third of the output.

The first field of the document is `subject`: `clothing`, `not_clothing`,
`explicit` or `unsafe`. Anything but `clothing` ends the stream at once with a
`{"rejected": reason}` frame (see `streaming-text.ts`), the unit is refunded, and
the client shows one of two messages: "we only do clothing" or "that was
inappropriate". A model refusal is reported the same way as `refused`. The app
also runs Apple's on-device `SensitiveContentAnalysis` before a photo joins the
pile, but that only works when the user has Sensitive Content Warning on in iOS
Settings, so the server's check is the real one.

The client asks `analyse` for the **Preferred Platform**, so the listing comes back
in that voice with that platform's `fields`, and the first listing shows with no
`format` call. `format` runs only when the user switches platform or tone. `refine`
accepts a `PlatformListing` plus a list of natural-language refinements (one per chip
the user tapped) and returns just the `PlatformListing`.

Format **only the platform being shown** — never fan out across all three. See ADR-0004.

## Theme

Carried over from the Claude Design prototype (`Bower iOS Prototype.html`).

**Light** — bg `#FBF7EF`, card `#FFFDF8`, subtle `#F1EADC`, line `#E5DECE`, text `#1B1A20`, muted `#86807A`.
**Dark** — bg `#131521`, card `#1C1F30`, subtle `#232739`, line `#2E3348`, text `#F2EEE6`, muted `#8D93A8`.

The accent palette is shared by both themes:

| Name | Hex | Carries |
|---|---|---|
| satin | `#2B3AA8` | The primary — buttons, links, selection |
| sheen | `#7BA9E8` | Progress and fills on dark grounds |
| shell | `#DCE3F0` | Pale blue ground |
| coral | `#E1563C` | The wordmark's full stop, errors, the "guess" marker |
| pollen | `#E8B547` | The dot in the mark, warnings, the allowance ceiling |
| moss | `#3F6B4A` | Confirmed, copied, evidence ticks |
| avenue | `#171A2E` | Full-bleed dark screens — analysing, failure |

Fonts: **Instrument Serif**, *italic*, for the wordmark and expressive headlines;
**Geist** for UI; **Geist Mono** for kickers, counters and numerics.

The mark is **the arch** — a bower, filled solid, with a hole punched through the
crown so it reads as a swing tag, and the pollen dot beneath. One `Arch` view draws
it everywhere; the launch image and the app icon are rendered from that view by
`LaunchImageTests` (run with `BOWER_RENDER_LAUNCH=1` after any change to it). The wordmark is `bower` in italic serif with a coral full stop. The accent
moved from `#3b5cff` to the deeper `#2B3AA8`, so the bowerbird-prizes-blue reasoning
behind the name still holds.

One thing the app says in its own voice, and should keep saying: copy confirmations
read **"In the bower"**. The analyse action is plainly **"Write it"** (it spends a *listing*)
and the live price search is **"Check the market"** (a *market check*); the photo-only price is an
*estimate*, never a guess. "Suss it out" was charming once and vague every time after;
the verb carries the meaning and the serif title carries the voice.
