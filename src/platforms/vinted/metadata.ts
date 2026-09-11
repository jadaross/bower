import type { PlatformMetadata } from "../types";

// No seller fees anywhere Vinted operates; buyers pay a protection fee at
// checkout. Australia launched on 1 July 2026 at vinted.com.au, in dollars.
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
    },
    AU: {
      feeLabel: "0%",
      feePct: 0,
      webUrl: "https://www.vinted.com.au/",
      searchDomains: ["vinted.com.au"],
      itemUrl: /^https?:\/\/(?:www\.)?vinted\.com\.au\/items\/\d+/i,
      itemUrlExample: "https://www.vinted.com.au/items/<id>-<slug>",
    },
  },
};
