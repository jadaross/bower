import type { PlatformMetadata } from "../types";

// Private sellers pay no final value fee on eBay UK (since Oct 2024; buyers
// pay a protection fee instead) or on eBay Australia (since May 2026, under
// A$25k a year). The exceptions are authenticity-checked categories — watches,
// sneakers and designer bags above a threshold — which bower does not price.
// eBay US has no private-seller exemption: most of Clothing, Shoes &
// Accessories pays a 13.6% final value fee plus $0.40 an order over $10
// (ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822,
// checked 24 Sep 2026). $0.30 at $10 or less is close enough to leave out.
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
    US: {
      feeLabel: "13.6% + $0.40",
      feePct: 13.6,
      feeFixed: 0.4,
      webUrl: "https://www.ebay.com/",
      searchDomains: ["ebay.com"],
      itemUrl: /^https?:\/\/(?:www\.)?ebay\.com\/itm\/(?:[^/?#]+\/)?\d+/i,
      itemUrlExample: "https://www.ebay.com/itm/<id>",
    },
  },
};
