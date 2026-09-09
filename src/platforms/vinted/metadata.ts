import type { PlatformMetadata } from "../types";

export const metadata: PlatformMetadata = {
  id: "vinted",
  name: "Vinted",
  audience: "Europe · resale-first",
  feeLabel: "0%",
  feePct: 0,
  color: "#09b1ba",
  appUrl: "vinted://",
  webUrl: "https://www.vinted.co.uk/",
  searchDomains: ["vinted.co.uk"],
  itemUrl: /^https?:\/\/(?:www\.)?vinted\.co\.uk\/items\/\d+/i,
  itemUrlExample: "https://www.vinted.co.uk/items/<id>-<slug>",
};
