import type { PlatformMetadata } from "../types";

// Vinted operates in the UK and much of Europe, and not in Australia.
export const metadata: PlatformMetadata = {
  id: "vinted",
  name: "Vinted",
  audience: "Europe · resale-first",
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
  },
};
