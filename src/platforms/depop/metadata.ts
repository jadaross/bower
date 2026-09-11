import type { PlatformMetadata } from "../types";

// One site worldwide; the search is confined by country, not by domain.
// Depop dropped its seller fee in the UK (Mar 2024) and in Australia
// (22 Jul 2026), moving the charge to the buyer at checkout.
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
  markets: { GB: depopDotCom, AU: depopDotCom },
};
