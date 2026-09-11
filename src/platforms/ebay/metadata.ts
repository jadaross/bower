import type { PlatformMetadata } from "../types";

// Private sellers pay no final value fee on eBay UK (since Oct 2024; buyers
// pay a protection fee instead) or on eBay Australia (since May 2026, under
// A$25k a year). The exceptions are authenticity-checked categories — watches,
// sneakers and designer bags above a threshold — which bower does not price.
export const metadata: PlatformMetadata = {
  id: "ebay",
  name: "eBay",
  audience: "Global · all categories",
  color: "#0064d2",
  appUrl: "ebay://",
  markets: {
    GB: {
      feeLabel: "No seller fees",
      feePct: 0,
      webUrl: "https://www.ebay.co.uk/",
      searchDomains: ["ebay.co.uk"],
      itemUrl: /^https?:\/\/(?:www\.)?ebay\.co\.uk\/itm\/(?:[^/?#]+\/)?\d+/i,
      itemUrlExample: "https://www.ebay.co.uk/itm/<id>",
    },
    AU: {
      feeLabel: "No seller fees",
      feePct: 0,
      webUrl: "https://www.ebay.com.au/",
      searchDomains: ["ebay.com.au"],
      itemUrl: /^https?:\/\/(?:www\.)?ebay\.com\.au\/itm\/(?:[^/?#]+\/)?\d+/i,
      itemUrlExample: "https://www.ebay.com.au/itm/<id>",
    },
  },
};
