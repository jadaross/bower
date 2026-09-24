import type { PlatformMetadata } from "../types";

// Private sellers pay no final value fee on eBay UK (since Oct 2024; buyers
// pay a protection fee instead) or on eBay Australia (since May 2026, under
// A$25k a year). The exceptions are authenticity-checked categories — watches,
// sneakers and designer bags above a threshold — which bower does not price.
// eBay US has no private-seller exemption: most of Clothing, Shoes &
// Accessories pays a 13.6% final value fee plus $0.40 an order over $10
// (ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822,
// checked 24 Sep 2026). $0.30 at $10 or less is close enough to leave out.
// eBay Ireland has no private-seller exemption either: 11% + €0.35 an order
// over €10, plus a 0.43% regulatory operating fee, VAT included
// (ebay.ie/help/selling/fees-credits-invoices/selling-fees?id=4822, checked
// 24 Sep 2026).
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
    IE: {
      feeLabel: "11.4% + €0.35",
      feePct: 11.43,
      feeFixed: 0.35,
      webUrl: "https://www.ebay.ie/",
      searchDomains: ["ebay.ie"],
      itemUrl: /^https?:\/\/(?:www\.)?ebay\.ie\/itm\/(?:[^/?#]+\/)?\d+/i,
      itemUrlExample: "https://www.ebay.ie/itm/<id>",
      // ebay.ie shows UK sellers' listings, and Irish buyers buy them, so
      // eBay UK is where most of an Irish seller's competition sits. The
      // Irish site alone found almost nothing (valuation-cost-speed.md §15).
      corridor: {
        market: "GB",
        note: "This seller is in Ireland, and ebay.ie shows UK sellers' listings to Irish buyers, so these eBay UK listings are comparables for them: give every price and the band in EUR, converted from GBP, and say so in the reasoning.",
        reasoningPrefix: "eBay UK (sold to Ireland):",
      },
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
