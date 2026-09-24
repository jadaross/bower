import type { PlatformMetadata } from "../types";

// One site worldwide; the search is confined by country, not by domain.
// Depop dropped its seller fee in the UK (Mar 2024) and in Australia
// (22 Jul 2026), moving the charge to the buyer at checkout. In the United
// States there is no selling fee either, but the seller still pays payment
// processing: 3.3% + $0.45 an order (Depop Help, "Seller fees and charges").
// Everywhere else, Ireland included, Depop still takes 10%, and the seller
// pays processing on top: 2.9% + €0.30 in the EU (secondary sources; Depop's
// help centre blocks fetching, so check it by hand).
const depopDotCom = {
  feeLabel: "No seller fees",
  feePct: 0,
  webUrl: "https://www.depop.com/",
  searchDomains: ["depop.com"],
  itemUrl: /^https?:\/\/(?:www\.)?depop\.com\/products\/[^/?#]+/i,
  itemUrlExample: "https://www.depop.com/products/<seller>-<slug>/",
};

export const metadata: PlatformMetadata = {
  id: "depop",
  name: "Depop",
  audience: "Gen-Z · style-led",
  color: "#f00d2d",
  appUrl: "depop://",
  markets: {
    GB: depopDotCom,
    IE: { ...depopDotCom, feeLabel: "10% + processing", feePct: 12.9, feeFixed: 0.3 },
    AU: depopDotCom,
    US: { ...depopDotCom, feeLabel: "3.3% + $0.45 processing", feePct: 3.3, feeFixed: 0.45 },
  },
};
