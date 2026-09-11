import type { PlatformMetadata } from "../types";

// No seller fees anywhere Vinted operates; buyers pay a protection fee at
// checkout. Australia launched on 1 July 2026 at vinted.com.au, in dollars,
// with a shipping corridor to and from the UK: an Australian buyer can buy
// from a UK seller and the reverse, so each market's search takes in the
// other's listings as well as its own.
const items = /^https?:\/\/(?:www\.)?vinted\.(?:co\.uk|com\.au)\/items\/\d+/i;

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
      searchDomains: ["vinted.co.uk", "vinted.com.au"],
      itemUrl: items,
      itemUrlExample: "https://www.vinted.co.uk/items/<id>-<slug>",
      searchNote:
        "Vinted ships between the UK and Australia, so a listing on vinted.com.au is a comparable for a UK seller too; convert its price to GBP and say so. Run at least one search on each site. Prefer vinted.co.uk listings when there are enough.",
    },
    AU: {
      feeLabel: "0%",
      feePct: 0,
      webUrl: "https://www.vinted.com.au/",
      searchDomains: ["vinted.com.au", "vinted.co.uk"],
      itemUrl: items,
      itemUrlExample: "https://www.vinted.com.au/items/<id>-<slug>",
      searchNote:
        "Vinted ships between Australia and the UK, so a listing on vinted.co.uk is a comparable for an Australian seller too; convert its price to AUD and say so. Run at least one search on each site: the Australian site is new and may have few listings, and vinted.co.uk usually has plenty. Prefer vinted.com.au listings when there are enough.",
    },
  },
};
