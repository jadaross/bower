import type { PlatformMetadata } from "../types";

export const metadata: PlatformMetadata = {
  id: "depop",
  name: "Depop",
  audience: "Gen-Z · style-led",
  feeLabel: "No seller fees",
  feePct: 0,
  color: "#f00d2d",
  appUrl: "depop://",
  webUrl: "https://www.depop.com/",
  searchDomains: ["depop.com"],
  itemUrl: /^https?:\/\/(?:www\.)?depop\.com\/products\/[^/?#]+/i,
  itemUrlExample: "https://www.depop.com/products/<seller>-<slug>/",
};
