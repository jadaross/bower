# ADR-0011: Purchases are verified on the server, and Apple's notifications are the one unauthenticated route

**Status:** Accepted · 25 September 2026

## Context

ADR-0010 sells bower Plus (a monthly subscription) and a pack of 10 listings.
Both change the meters, and the meters are the only thing standing between a
user and the Anthropic bill. The rule since ADR-0006 is that the client never
decides what it is allowed: Enabled Platforms are read from the profile, not
the request body. A purchase has to follow the same rule.

## Decision

**The app never tells the server it bought something; it hands over Apple's
proof.** StoreKit 2 gives the app a signed transaction (`jwsRepresentation`).
The app posts it to `POST /api/purchases` before finishing the transaction,
and the server verifies the signature against Apple Root CA G3 with Apple's
own library (`@apple/app-store-server-library`) before anything is recorded.

- **Only Production and Sandbox.** Xcode's local StoreKit testing signs with
  its own certificate and the library skips verification for it, so both
  Xcode environments are refused. The simulator uses `StubAPI` instead.
  Sandbox is accepted in production because TestFlight and App Review both
  buy in the sandbox.
- **A purchase belongs to the account that made it.** The app sets
  `appAccountToken` to the Supabase user id; a transaction carrying another
  account's token is refused, and a transaction stays with the account it was
  first recorded against.
- **Plus is a date, not a set of limits.** `profiles.plus_expires_at` is the
  latest expiry of any unrefunded Plus transaction. `spend_allowance` reads
  it; when it passes, nothing has to be written back.
- **The pack is a balance.** `profiles.pack_listings`, spent only after the
  month's free listings, refunded to itself, taken back if Apple refunds it.
- **Every transaction is kept** in `purchases`, unique on Apple's
  transaction id, so a replay or a repeated notification is a no-op. It is
  deleted with the account.

**`POST /api/apple/notifications` is the one route without `withAuth`.**
Apple calls it for renewals, expiries, refunds and revocations, and has no
bower session to send. The signed payload is the authentication: nothing in it
is read until it verifies, and the transaction inside is then verified again
on its own. A renewal is matched to its account through the original
transaction id, or the `appAccountToken` for a first purchase that arrives
before the app reports it.

## Consequences

- The notification URL has to be set in App Store Connect (production and
  sandbox) for renewals and refunds to reach the meter. Without it, Plus
  still works for the month the app reported, then lapses until the app
  reports the renewal (it does, on launch, from `Transaction.updates`).
- No App Store Server API key is needed: verification uses Apple's public
  root certificate. The key becomes necessary only if bower ever looks up a
  transaction history itself.
