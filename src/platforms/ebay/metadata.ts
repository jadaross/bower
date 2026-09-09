import type { PlatformMetadata } from "../types";

export const metadata: PlatformMetadata = {
  id: "ebay",
  name: "eBay",
  audience: "Global · all categories",
  feeLabel: "13.25%",
  feePct: 13.25,
  color: "#0064d2",
  appUrl: "ebay://",
  webUrl: "https://www.ebay.co.uk/",
  searchDomains: ["ebay.co.uk"],
  itemUrl: /^https?:\/\/(?:www\.)?ebay\.co\.uk\/itm\/(?:[^/?#]+\/)?\d+/i,
  itemUrlExample: "https://www.ebay.co.uk/itm/<id>",
};
