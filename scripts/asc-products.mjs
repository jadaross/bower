#!/usr/bin/env node
// bower Plus and the 10-listing pack in App Store Connect (#73, ADR-0010):
// the subscription group, the monthly subscription, the consumable, their
// names and descriptions, review notes and screenshot, where they are sold,
// and a price set explicitly in each of the four storefronts.
//
//   node scripts/asc-products.mjs           show what exists and what would be done
//   node scripts/asc-products.mjs --apply   do it (needs the Paid Apps agreement active)
//
// Idempotent: anything already there is found by product id and left alone,
// except prices, which are set to the table below every run.
//
// The product ids are permanent once created, and must match
// src/lib/products.ts and ios-app/bower/bower/Store.swift.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const APP_ID = process.env.ASC_APP_ID || "6808793078";
const apply = process.argv.includes("--apply");

const TERRITORIES = ["GBR", "USA", "IRL", "AUS"];
// Customer prices as App Store Connect shows them per territory (ADR-0010,
// confirmed 27 September).
const PRICES = {
  plus: { GBR: "4.99", USA: "4.99", IRL: "4.99", AUS: "6.99" },
  pack: { GBR: "0.99", USA: "0.99", IRL: "0.99", AUS: "1.49" },
};

const PLUS = {
  productId: "com.jadaross.bower.plus.monthly",
  reference: "bower Plus monthly",
  group: "bower Plus",
  name: "bower Plus",
  description: "Unlimited listings and market checks.",
  reviewNote:
    "Monthly auto-renewable subscription. Unlocks unlimited listings and unlimited market checks (fair use: 100 listings and 50 market checks a month). Opened from Profile (bower Plus) or when a meter runs out. The purchase is verified on our server from Apple's signed transaction.",
};
const PACK = {
  productId: "com.jadaross.bower.pack.10",
  reference: "10 listings",
  name: "10 listings",
  description: "10 listings, used after your free ones.",
  reviewNote:
    "Consumable. Adds 10 listings to the account, spent only after the month's free listings, and never expiring. The balance lives on our server, so it is not restored by Restore Purchases. On the same paywall as bower Plus.",
};
const SCREENSHOT = `${root}/docs/app-store/screenshots/GB/5-plus.png`;
const LOCALE = "en-GB";

function asc(method, p, body) {
  const out = execFileSync("node", [`${root}/scripts/asc.mjs`, method, p, ...(body ? [JSON.stringify(body)] : [])], { encoding: "utf8", maxBuffer: 1 << 26 });
  const status = Number(out.slice(0, out.indexOf("\n")));
  const text = out.slice(out.indexOf("\n") + 1);
  const json = text.trim() ? JSON.parse(text) : null;
  if (status >= 300) throw new Error(`${method} ${p} → ${status}\n${JSON.stringify(json, null, 1).slice(0, 1200)}`);
  return json;
}

/** Every page of a list, following links.next. */
function all(p) {
  const out = [];
  let next = p;
  while (next) {
    const page = asc("GET", next);
    out.push(...(page.data ?? []));
    next = page.links?.next ? page.links.next.replace("https://api.appstoreconnect.apple.com", "") : null;
  }
  return out;
}

const rel = (type, id) => ({ data: { type, id } });

function step(what, fn) {
  if (!apply) return console.log(`would: ${what}`), null;
  const r = fn();
  console.log(`done: ${what}`);
  return r;
}

/** Reserve, upload the parts, commit: the App Store Connect asset dance. */
async function uploadScreenshot(type, relationship, parentType, parentId) {
  const bytes = fs.readFileSync(SCREENSHOT);
  const reserved = asc("POST", `/v1/${type}`, {
    data: { type, attributes: { fileName: path.basename(SCREENSHOT), fileSize: bytes.length }, relationships: { [relationship]: rel(parentType, parentId) } },
  }).data;
  for (const op of reserved.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`screenshot upload failed: ${res.status}`);
  }
  asc("PATCH", `/v1/${type}/${reserved.id}`, {
    data: { type, id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: crypto.createHash("md5").update(bytes).digest("hex") } },
  });
}

// ── The subscription ──────────────────────────────────────────────────────
let group = all(`/v1/apps/${APP_ID}/subscriptionGroups`).find((g) => g.attributes.referenceName === PLUS.group);
console.log(group ? `found group "${PLUS.group}"` : `no group "${PLUS.group}" yet`);
if (!group) {
  group = step(`create subscription group "${PLUS.group}"`, () =>
    asc("POST", "/v1/subscriptionGroups", {
      data: { type: "subscriptionGroups", attributes: { referenceName: PLUS.group }, relationships: { app: rel("apps", APP_ID) } },
    }).data
  );
  if (group) {
    asc("POST", "/v1/subscriptionGroupLocalizations", {
      data: { type: "subscriptionGroupLocalizations", attributes: { name: PLUS.group, locale: LOCALE }, relationships: { subscriptionGroup: rel("subscriptionGroups", group.id) } },
    });
  }
}

let plus = group && all(`/v1/subscriptionGroups/${group.id}/subscriptions`).find((s) => s.attributes.productId === PLUS.productId);
if (group) console.log(plus ? `found ${PLUS.productId}` : `no ${PLUS.productId} yet`);
if (!plus) {
  plus = step(`create subscription ${PLUS.productId}, monthly`, () =>
    asc("POST", "/v1/subscriptions", {
      data: {
        type: "subscriptions",
        attributes: { name: PLUS.reference, productId: PLUS.productId, subscriptionPeriod: "ONE_MONTH", familySharable: false, reviewNote: PLUS.reviewNote, groupLevel: 1 },
        relationships: { group: rel("subscriptionGroups", group.id) },
      },
    }).data
  );
  if (plus) {
    asc("POST", "/v1/subscriptionLocalizations", {
      data: { type: "subscriptionLocalizations", attributes: { name: PLUS.name, description: PLUS.description, locale: LOCALE }, relationships: { subscription: rel("subscriptions", plus.id) } },
    });
    asc("POST", "/v1/subscriptionAvailabilities", {
      data: {
        type: "subscriptionAvailabilities",
        attributes: { availableInNewTerritories: false },
        relationships: { subscription: rel("subscriptions", plus.id), availableTerritories: { data: TERRITORIES.map((id) => ({ type: "territories", id })) } },
      },
    });
    await uploadScreenshot("subscriptionAppStoreReviewScreenshots", "subscription", "subscriptions", plus.id);
    console.log("done: Plus name, description, availability and review screenshot");
  }
}

if (plus) {
  for (const territory of TERRITORIES) {
    const want = PRICES.plus[territory];
    const point = all(`/v1/subscriptions/${plus.id}/pricePoints?filter[territory]=${territory}&limit=200`).find((p) => p.attributes.customerPrice === want);
    if (!point) throw new Error(`no ${territory} price point at ${want} for Plus`);
    step(`price Plus at ${want} in ${territory}`, () =>
      asc("POST", "/v1/subscriptionPrices", {
        data: {
          type: "subscriptionPrices",
          attributes: { preserveCurrentPrice: false },
          relationships: { subscription: rel("subscriptions", plus.id), subscriptionPricePoint: rel("subscriptionPricePoints", point.id) },
        },
      })
    );
  }
}

// ── The pack ──────────────────────────────────────────────────────────────
let pack = all(`/v1/apps/${APP_ID}/inAppPurchasesV2`).find((i) => i.attributes.productId === PACK.productId);
console.log(pack ? `found ${PACK.productId}` : `no ${PACK.productId} yet`);
if (!pack) {
  pack = step(`create consumable ${PACK.productId}`, () =>
    asc("POST", "/v2/inAppPurchases", {
      data: {
        type: "inAppPurchases",
        attributes: { name: PACK.reference, productId: PACK.productId, inAppPurchaseType: "CONSUMABLE", reviewNote: PACK.reviewNote, familySharable: false },
        relationships: { app: rel("apps", APP_ID) },
      },
    }).data
  );
  if (pack) {
    asc("POST", "/v1/inAppPurchaseLocalizations", {
      data: { type: "inAppPurchaseLocalizations", attributes: { name: PACK.name, description: PACK.description, locale: LOCALE }, relationships: { inAppPurchaseV2: rel("inAppPurchases", pack.id) } },
    });
    asc("POST", "/v1/inAppPurchaseAvailabilities", {
      data: {
        type: "inAppPurchaseAvailabilities",
        attributes: { availableInNewTerritories: false },
        relationships: { inAppPurchase: rel("inAppPurchases", pack.id), availableTerritories: { data: TERRITORIES.map((id) => ({ type: "territories", id })) } },
      },
    });
    await uploadScreenshot("inAppPurchaseAppStoreReviewScreenshots", "inAppPurchaseV2", "inAppPurchases", pack.id);
    console.log("done: pack name, description, availability and review screenshot");
  }
}

if (pack) {
  // One schedule: the UK as the base, the other three set by hand.
  const points = Object.fromEntries(
    TERRITORIES.map((territory) => {
      const want = PRICES.pack[territory];
      const point = all(`/v2/inAppPurchases/${pack.id}/pricePoints?filter[territory]=${territory}&limit=200`).find((p) => p.attributes.customerPrice === want);
      if (!point) throw new Error(`no ${territory} price point at ${want} for the pack`);
      return [territory, point.id];
    })
  );
  step(`price the pack at ${TERRITORIES.map((t) => `${PRICES.pack[t]} ${t}`).join(", ")}`, () =>
    asc("POST", "/v1/inAppPurchasePriceSchedules", {
      data: {
        type: "inAppPurchasePriceSchedules",
        relationships: {
          inAppPurchase: rel("inAppPurchases", pack.id),
          baseTerritory: rel("territories", "GBR"),
          manualPrices: { data: TERRITORIES.map((t) => ({ type: "inAppPurchasePrices", id: `\${${t}}` })) },
        },
      },
      included: TERRITORIES.map((t) => ({
        type: "inAppPurchasePrices",
        id: `\${${t}}`,
        attributes: { startDate: null },
        relationships: { inAppPurchasePricePoint: rel("inAppPurchasePricePoints", points[t]), inAppPurchaseV2: rel("inAppPurchases", pack.id) },
      })),
    })
  );
}

if (!apply) console.log("\ndry run: pass --apply to do it");
