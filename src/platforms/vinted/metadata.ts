import type { PlatformMetadata } from "../types";

// No seller fees anywhere Vinted operates; buyers pay a protection fee at
// checkout. Australia launched on 1 July 2026 at vinted.com.au, in dollars,
// with a shipping corridor to and from the UK: an Australian buyer can buy
// from a UK seller and the reverse, so each market's check also searches the
// other's edition, in parallel, and folds it in when the home site is thin —
// which, with the Australian site weeks old, it usually is.
export const metadata: PlatformMetadata = {
  id: "vinted",
  name: "Vinted",
  audience: "Resale-first · UK, Europe, Australia",
  color: "#09b1ba",
  appUrl: "vinted://",
  markets: {
    GB: {
      feeLabel: "0%",
      feePct: 0,
      webUrl: "https://www.vinted.co.uk/",
      searchDomains: ["vinted.co.uk"],
      itemUrl: /^https?:\/\/(?:www\.)?vinted\.co\.uk\/items\/\d+/i,
      itemUrlExample: "https://www.vinted.co.uk/items/<id>-<slug>",
      corridor: {
        market: "AU",
        note: "This seller is in the United Kingdom, and Vinted ships between Australia and the UK, so these Australian listings are comparables for them: give every price and the band in GBP, converted from AUD, and say so in the reasoning.",
        reasoningPrefix: "Vinted Australia (ships to the UK):",
      },
    },
    AU: {
      feeLabel: "0%",
      feePct: 0,
      webUrl: "https://www.vinted.com.au/",
      searchDomains: ["vinted.com.au"],
      itemUrl: /^https?:\/\/(?:www\.)?vinted\.com\.au\/items\/\d+/i,
      itemUrlExample: "https://www.vinted.com.au/items/<id>-<slug>",
      corridor: {
        market: "GB",
        note: "This seller is in Australia, and Vinted ships between the UK and Australia, so these UK listings are comparables for them: give every price and the band in AUD, converted from GBP, and say so in the reasoning.",
        reasoningPrefix: "Vinted UK (ships to Australia):",
      },
    },
  },
};
