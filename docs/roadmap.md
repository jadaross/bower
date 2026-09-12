# Roadmap

Ordered 12 September 2026, superseding the ladder in #29. Ordered by the same two
things: what makes the next rung cheaper, and what makes bower useful to someone
who is not Jada — plus a third, now there is a price: what makes each user
profitable. Pricing itself is decided in ADR-0010.

## First: market check v2

Everything that makes bower different hangs on the market check. It is the only
thing competitors cannot copy for free, it is the paid thing in ADR-0010, and
Scout Mode is nothing but a market check. Today it is the weakest part of the app:
about 100 seconds a platform, 46p for three, and the client honestly says "Takes a
minute or two". Nobody stands in a shop for two minutes.

`docs/research/valuation-cost-speed.md` measured the fix and stopped short of
shipping it. In order:

1. **The Depop baseline.** Ten Sonnet calls on Depop at the same N as the spike,
   about three dollars. It decides whether Depop stays on Sonnet or Haiku is a
   blanket swap (Haiku found 0.7 comparables a call there against 2.3 on eBay).
2. **Haiku 4.5 for eBay and Vinted**, chosen per platform in
   `src/lib/llm/client.ts`. The comment there saying Sonnet's judgement "is the
   product" is now contradicted by measurement — rewrite it.
3. **Forbid placeholder URLs in the prompt.** About one Haiku call in fifteen
   returned `itm/unknown`; `coerceBand` drops them, but the model's confidence
   label lies when it happens.
4. **Move the comparables cache into Supabase.** `src/lib/valuation/cache.ts` is
   per process, so on Vercel it is nearly always empty and every repeat of
   "Levi's 501, 32, Good" pays full price. Same key, a table, a 7-day TTL.
5. **Do not ship `max_uses: 1`** and leave `effort` at `low` — both measured.
6. **Then re-scope #18 and #19.** At ~12 seconds a check, one-pass search and
   streaming are no longer the biggest wins, and #18 would block per-platform
   model choice. The background notification already covers the long wait.

Target: a three-platform check in the time the listing takes to write, at 19p or
less.

## Then, in order

| # | Rung | Why here |
|---|---|---|
| 1 | **Market check v2** (above) | Makes every row of ADR-0010 positive. Backend only |
| 2 | **App Store 1.0, free, at 5 listings and 2 checks** | The human steps in #54. Put the three lines nobody in the category says in the listing copy: *no login, no bot, no ban risk*; *a price per platform, with the listings it came from*; *your photos are never stored*. Say switching and chips are free |
| 3 | **bower Plus in 1.1** | StoreKit, the Paid Apps agreement, Small Business Program, Vercel Pro, and a server-side entitlement writer for `reads_limit`/`searches_limit`. The paywall sells the price and the two-second read |
| 4 | **Ireland (#56), then decide on France** | Ireland is data entry. France is the category's biggest storefront by an order of magnitude and needs a French listing voice, so it is a real feature and a real decision |
| 5 | **Scout Mode** | The v2 headline since `CONTEXT.md` was written. Only viable once a check takes seconds; the Valuation is already independent of why it was asked (ADR-0004) |
| 6 | **eBay Browse API spike** | App-token only, no seller OAuth (ADR-0003 is untouched). Would make the dearest platform's band near-free and structured. After Haiku proves out, because it changes what "the search step" even is |
| 7 | **Write for the reader** | Buyers distrust AI copy and no competitor optimises for them. `docs/research/seller-voice.md` §5 has the candidate voice lines; the thumbs and copy signals already measure the result |
| 8 | **Annual plan and the top-up pack** | ADR-0010: at 90 days, once the dashboard shows the checks-per-user distribution |
| 9 | **Email sign-in with account linking** | Demoted from rung 1 in #29. Apple-only is fine for an iOS-only app and it earns nothing; still needs the `linkIdentity` answer from #30 |

## Not on the roadmap

Each of these is where the competitor research found the field's worst reviews.

- **Generative garment photos** — ~20% unusable by a paying user's count, and a
  misrepresentation risk against Vinted's catalogue rules. bower storing no
  images is worth more.
- **Posting or pre-filling** — ADR-0003, permanently. The platforms forbid it and
  two developers have had to apologise in public for implying it.
- **Weekly pricing** — the two apps doing it are the lowest rated.
- **Ads on the free tier** — the field's best traction has the field's worst
  reviews, and they are about the ads.
- **Sold-price comparables** — ADR-0005, unavailable at any price.
