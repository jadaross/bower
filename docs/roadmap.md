# Roadmap

Ordered 12 September 2026, superseding the ladder in #29. Ordered by the same two
things: what makes the next rung cheaper, and what makes bower useful to someone
who is not Jada — plus a third, now there is a price: what makes each user
profitable. Pricing itself is decided in ADR-0010.

## First: market check v2

Everything that makes bower different hangs on the market check. It is the only
thing competitors cannot copy for free, it is the paid thing in ADR-0010, and
Scout Mode is nothing but a market check. On Sonnet it was the weakest part of the
app: about 100 seconds a platform, 46p for three, and the client honestly says
"Takes a minute or two". Nobody stands in a shop for two minutes.

`docs/research/valuation-cost-speed.md` measured the fix. Where it stands:

1. ~~**The Depop baseline.**~~ Skipped by decision (23 September): Depop goes to
   Haiku with the rest, accepting wide, "low"-confidence Depop bands for a 9p
   check (ADR-0010).
2. ✅ **Haiku 4.5 for every platform** (`MODELS.valuation`), on the older
   `web_search_20250305` tool and without `effort`, which Haiku does not take.
   Live-checked on all three platforms (research §13). Still to do: a read of
   Haiku's reasoning sentences for tone.
3. ✅ **Forbid placeholder URLs in the prompt.** About one Haiku call in fifteen
   returned `itm/unknown`; `coerceBand` drops them, but the model's confidence
   label lies when it happens.
4. **Move the comparables cache into Supabase.** `src/lib/valuation/cache.ts` is
   per process, so on Vercel it is nearly always empty and every repeat of
   "Levi's 501, 32, Good" pays full price. Same key, a table, a 7-day TTL.
5. **Keep `max_uses: 2`.** 1 loses comparables (§6); 3 and 5 on Haiku buy little
   and do not help Depop at all (§13).
6. **Then re-scope #18 and #19.** At ~12 seconds a check, one-pass search and
   streaming are no longer the biggest wins. The background notification
   already covers the long wait.

Target: a three-platform check in the time the listing takes to write, at 9p.

## Then, in order

| # | Rung | Why here |
|---|---|---|
| 1 | **Market check v2** (above) | Makes every row of ADR-0010 positive. Backend only |
| 2 | **bower Plus and the listing pack** | StoreKit, the Paid Apps agreement, Small Business Program, and a server-side entitlement writer for `reads_limit`/`searches_limit`. The pack (10 listings, £0.99, consumable) needs a bought-listings balance and a transaction ledger. The paywall sells the price and the two-second read, and shows the pack beneath Plus. Free drops to 5 listings and 1 check in the same build. Not optional before launch: bower does not go to the App Store without it (ADR-0010) |
| 3 | **App Store 1.0, with Plus in it** | The human steps in #54, plus Vercel Pro on the day. Put the three lines nobody in the category says in the listing copy: *no login, no bot, no ban risk*; *a price per platform, with the listings it came from*; *your photos are never stored*. Say switching and chips are free |
| 4 | **Ireland (#56), then decide on France** | Ireland is data entry. France is the category's biggest storefront by an order of magnitude and needs a French listing voice, so it is a real feature and a real decision |
| 5 | **Scout Mode** | The v2 headline since `CONTEXT.md` was written. Only viable once a check takes seconds; the Valuation is already independent of why it was asked (ADR-0004) |
| 6 | **eBay Browse API spike** | App-token only, no seller OAuth (ADR-0003 is untouched). Would make the dearest platform's band near-free and structured. After Haiku proves out, because it changes what "the search step" even is |
| 7 | **Write for the reader** | Buyers distrust AI copy and no competitor optimises for them. `docs/research/seller-voice.md` §5 has the candidate voice lines; the thumbs and copy signals already measure the result |
| 8 | **Annual plan and the market-check pack** | ADR-0010: at 90 days, once the dashboard shows the checks-per-user distribution |
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
