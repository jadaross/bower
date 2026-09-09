# bower

bower values a secondhand item from photographs and tells you what to write,
where to post it, and what to ask for it.

It is **an iOS app with a headless backend**. There is no web UI — the Next.js
app exists purely for its API routes and its deployment story on Vercel (and one
legal `/privacy` page App Store Connect requires). See
[ADR-0002](./docs/adr/0002-headless-nextjs-api-on-vercel.md).

`CONTEXT.md` holds the domain vocabulary, `ARCHITECTURE.md` the call flow,
and `docs/adr/` the decisions.

## What it does

1. You photograph an item.
2. Any visible tag is read — brand, size, fabric, care — and a **Neutral
   Listing** is written: the platform-agnostic description everything else is
   generated from, carrying a search-free price *guess* from the photos alone.
3. That first listing shows straight away in your Preferred Platform's voice,
   with no extra model call.
4. Optionally you tap for a **real price**: each **Enabled Platform** is valued
   against currently-listed comparables, producing a **Price Band** with a
   confidence, and the platform most likely to sell it for the most is
   **recommended**.
5. One-tap nudge chips and manual edits refine the copy; you copy it and paste
   it into the platform.

Every item you run is kept in a **text-only history** (no photos —
[ADR-0008](./docs/adr/0008-text-only-item-history.md)). bower writes for Vinted,
Depop and eBay but does not post to them
([ADR-0003](./docs/adr/0003-ebay-oauth-and-publishing-removed.md)), and asking
prices come from live comparables rather than sold data
([ADR-0005](./docs/adr/0005-asking-price-valuation.md)).

## The app

The iOS app lives in **`ios-app/bower/`** — SwiftUI (iOS 26), Sign in with Apple,
and the API client. Six screens reached through a bottom tab bar (**Home**, the
capture → listing flow; **History**; **Profile**), with a branded launch screen.
Build it in Xcode 26, or launch with `-bowerStub` to run every screen on
fixtures with no network and no sign-in (DEBUG only).

The older mock-driven SwiftUI under `ios/` is a **visual reference only**,
superseded by `ios-app/` ([ADR-0001](./docs/adr/0001-ios-only-web-ui-removed.md)).

## Running the backend locally

```bash
npm install
cp .env.example .env.local   # or: vercel env pull .env.local
npm run dev
```

There is nothing to open in a browser. See [`SETUP.md`](./SETUP.md) for the
environment, the Supabase schema, and how to call a route by hand.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Every model call — analysis, valuation, formatting |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Identity: verifying the caller's bearer token |
| `SUPABASE_SERVICE_ROLE_KEY` | The Allowance meter. Server-side only — never ship it to the app |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | *Optional.* LLM observability. Tracing is a no-op until all three are set |

## API

Every route requires a Supabase bearer token. There are no anonymous requests:
usage is metered from the first release, and the meter needs someone to meter
([ADR-0007](./docs/adr/0007-metered-from-day-one.md)).

| Route | Purpose |
|---|---|
| `POST /api/analyse` | Photos → tag data and a Neutral Listing (with the search-free guess), plus the named platform's form fields. Streams, title first. **Spends one Allowance unit.** |
| `POST /api/valuate` | An item → a Price Band per Enabled Platform, plus a Recommendation. **Spends one Allowance unit.** |
| `POST /api/format` | Neutral Listing + platform + tone → a Platform-formatted Listing |
| `POST /api/refine` | A Platform-formatted Listing + Refinement Chips → a rewritten one |
| `GET /api/history` | The caller's item history, newest first (text only) |
| `POST /api/feedback` | Records a feedback signal (copy / edit / thumbs) as a Langfuse score |
| `GET` / `PATCH /api/profile` | The caller's Enabled Platforms, Preferred Platform and Allowance |
| `DELETE /api/profile` | Deletes the caller's account (required by App Review 5.1.1) |

Every model call is constrained with **structured outputs** (`output_config.format`),
so responses are schema-valid JSON — no free-text parsing.

## Tech stack

- **Next.js 16** (App Router, Turbopack) — API routes only, Node runtime
- **Anthropic Claude API** — Sonnet 5 for analysis and valuation, Haiku 4.5 for
  formatting and refinement; structured outputs throughout
- **Supabase** — identity, Enabled Platforms, the Allowance meter, and the
  text-only item history (all under row-level security)
- **Langfuse** — LLM observability: a trace per call with model, token cost,
  latency and feedback scores (optional; a no-op without keys)
- **Vercel** — deployment
- **SwiftUI** (iOS 26) — the app, in `ios-app/bower/`
- **Vitest** — `npm test` (241 tests)

## Where it stands

v1 is built on both sides and on TestFlight. Beyond the core flow it now keeps a
text-only item history, captures copy / edit / thumbs feedback, and traces every
model call to Langfuse.

Remaining before a public release: the App Store Connect **privacy labels** for
the stored history (a form step), and the release itself. Scout Mode —
*"I'm in a shop, is this worth buying?"* — is deliberately v2.
