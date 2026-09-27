# Bower — setup

## Environment

Copy `.env.example` to `.env.local` and fill in four things:

| Variable | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, the `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` — **server only** |

The service role key bypasses row-level security entirely. It exists so the
Allowance meter can move a counter the user is deliberately forbidden from
writing. It must never reach the iOS client.

`vercel env pull .env.local` fetches all four from the linked Vercel project.

## Supabase

The project is `bower` (`vnpjoujblpjygpyvwltg`, eu-north-1). It is on the free
plan, which allows **two active projects per organisation** — if a resume is
ever refused, that cap is why, and pausing another project frees a slot.

> A project with no traffic for 7 days is paused automatically. A paused project's
> hostname stops resolving, so the symptom is connection failures rather than a
> tidy error. Resume it from the dashboard; restores take a few minutes.

### Schema

The schema lives in `supabase/migrations/` and is the source of truth. Applied
in order:

| Migration | What it does |
|---|---|
| `0001_identity_and_metering.sql` | `profiles` — Enabled Platforms + the Allowance meter, RLS, column grants, and the trigger that gives every new auth identity a profile |
| `0002_drop_ebay_platform_connections.sql` | Drops the dead eBay token store (ADR-0003) |
| `0003_allowance_spend_and_refund.sql` | `spend_allowance` / `refund_allowance` — moving the meter atomically |
| … | See the files; each opens with what it does and why |
| `0019_plus_and_pack.sql` | bower Plus (`plus_expires_at`), the listing pack (`pack_listings`), the `purchases` ledger and `apply_transaction` (ADR-0011) |
| `0020_valuation_cache.sql` | `valuation_cache`: Price Bands by item key for seven days, shared by every instance (#80) |

Apply them with the CLI (installed as a dev dependency):

```bash
npx supabase link --project-ref vnpjoujblpjygpyvwltg
npx supabase db push
```

Never edit the schema in the dashboard. A change that only exists there is
invisible to the next person and to every other environment.

### What the schema guarantees

These are enforced by the database, not by the API — the API cannot be the only
thing standing between a user and their own meter:

- A user can read **only their own** profile row (RLS).
- A user can write **only** `enabled_platforms` (column grants). Attempting to
  write `allowance_used` or `allowance_limit` fails with `permission denied`.
- The Allowance functions are executable by `service_role` alone; a signed-in
  user calling `/rpc/spend_allowance` gets `permission denied`.
- At least one platform must stay enabled (`enabled_platforms_not_empty`).
- Deleting an auth identity cascades to its profile.

### Auth providers

Sign in with Apple and email are configured under **Authentication → Providers**.
Apple additionally needs a Service ID and key from the Apple Developer portal —
that is issue #15, and it is a human step.

## Running it

```bash
npm run dev     # dev server on :3000
npm run build   # production build + type-check
npm run lint
npm test
```

Every route requires a bearer token. To exercise one by hand, sign a test user
in against Supabase Auth and pass the `access_token`:

```bash
TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"..."}' | jq -r .access_token)

curl http://localhost:3000/api/profile -H "Authorization: Bearer $TOKEN"
```
