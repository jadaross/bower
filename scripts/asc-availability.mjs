#!/usr/bin/env node
// Where bower is on sale: exactly the Markets it is built for (ADR-0009), and
// no territory added automatically later. App Store Connect's v2 availability
// takes every territory in one request, so this builds the whole list.
//
//   node scripts/asc-availability.mjs           show what would be set
//   node scripts/asc-availability.mjs --apply   set it (on submission day)
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const APP_ID = process.env.ASC_APP_ID || "6808793078";
// The Markets in src/lib/markets.ts, as App Store territory codes.
const ON_SALE = ["GBR", "IRL", "USA", "AUS"];
const apply = process.argv.includes("--apply");

function asc(method, p, body) {
  const out = execFileSync("node", [`${root}/scripts/asc.mjs`, method, p, ...(body ? [JSON.stringify(body)] : [])], { encoding: "utf8" });
  const status = Number(out.slice(0, out.indexOf("\n")));
  const json = JSON.parse(out.slice(out.indexOf("\n") + 1) || "null");
  if (status >= 300) throw new Error(`${method} ${p} → ${status}\n${JSON.stringify(json, null, 1).slice(0, 1200)}`);
  return json;
}

const territories = asc("GET", "/v1/territories?limit=200").data.map((t) => t.id);
for (const code of ON_SALE) {
  if (!territories.includes(code)) throw new Error(`${code} is not an App Store territory`);
}
console.log(`${territories.length} territories; on sale in ${ON_SALE.join(", ")}, off everywhere else, new territories off`);
if (!apply) {
  console.log("dry run: pass --apply to set it");
  process.exit(0);
}

const local = (code) => `\${${code}}`;
asc("POST", "/v2/appAvailabilities", {
  data: {
    type: "appAvailabilities",
    attributes: { availableInNewTerritories: false },
    relationships: {
      app: { data: { type: "apps", id: APP_ID } },
      territoryAvailabilities: { data: territories.map((code) => ({ type: "territoryAvailabilities", id: local(code) })) },
    },
  },
  included: territories.map((code) => ({
    type: "territoryAvailabilities",
    id: local(code),
    attributes: { available: ON_SALE.includes(code) },
    relationships: { territory: { data: { type: "territories", id: code } } },
  })),
});
console.log("availability set");
