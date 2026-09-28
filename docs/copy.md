# Copy

How bower words the things that go wrong, run out or get refused. One phrasing
per situation, so the app sounds like one voice. Settled 28 September 2026 after
the error-copy review. New messages reuse these lines; a new situation gets a
line added here first.

## The voice

- **No "sorry", no "we".** bower states what happened and what to do next. It
  refers to itself as "bower" (capitalised only at the start of a sentence:
  "Bower keeps no photos.").
- **No blame, no system words.** Never name a vendor or an internal
  (Supabase, credential, server, token) and never show a raw iOS error on its
  own. Sign-in's catch-all may append the SDK's description after
  "Couldn't sign in:", because a masked error once hid a real bug.
- **Say the way on.** Every failure ends in the action that fixes it, and its
  button says the same thing.
- **No em dashes, fewest words.** See CLAUDE.md.

## Stock lines

| Situation | Wording |
|---|---|
| No connection, anything | "Check your connection and try again." Never "when you have signal". |
| Something failed to load or send | "Couldn't *verb* *thing*." + the connection line, e.g. "Couldn't load your history. Check your connection and try again." |
| A unit (listing or market check) was given back | "This one didn't count." or "...and it didn't count." The verb is *count*, never *charged*: listings are not money. |
| When a refund is not guaranteed | Say nothing about it. Content rejections are refunded only ten times a day (#79), so "That was inappropriate" and "Only clothes, shoes and bags" never promise one. |
| Listings used up | Headline "This month's listings are used" (with a full stop where the surface uses them, as the paywall does), then `resetsText`, then "Or keep going now." The action is **"Get more listings"**, which opens the paywall, from Home and from the read alike. |
| Market checks used up | "This month's market checks are used." Action: **"Get more market checks"**, which opens the paywall. |
| Not clothing | Title "Only clothes, shoes and bags". Body "Photograph the piece and try again." (the title already says what bower does) |
| Explicit, unsafe or refused | Title "That was inappropriate". Body "Bower can't read that photo. It has been thrown away." On Home: "That was inappropriate. It wasn't added." |
| Link unreadable | "Couldn't read that link" / "The shop's page didn't open. Check the link, or add photos instead. This one didn't count." |
| Plus hourly pace (429) | "That's a lot in an hour" / "Try again in a few minutes. This one didn't count." Never the paywall. |
| Sign-in failed | "Couldn't sign in. Try again." With Apple specifically: "Couldn't sign in with Apple. Try again." No connection: "Couldn't sign in. Check your connection and try again." |
| Store waiting on Ask to Buy | "Waiting for approval. It's added as soon as it's approved." |

## Titles and full stops

Full-bleed titles (the read's failure pages) and card titles have no full
stop. The paywall's serif headline is a sentence and keeps one.
