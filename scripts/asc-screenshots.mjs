#!/usr/bin/env node
// Replace the App Store screenshots for one display size with the PNGs in a
// directory, in filename order. Reserves each file, uploads its parts, commits
// the checksum, and waits for Apple to finish processing.
//
//   node scripts/asc-screenshots.mjs docs/app-store/screenshots [APP_IPHONE_67]
//
// 6.9" iPhones (1320×2868) go under APP_IPHONE_67 — Apple files the 6.9" and
// 6.7" sizes under one display type.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [dir = "docs/app-store/screenshots", displayType = "APP_IPHONE_67"] = process.argv.slice(2);
const APP_ID = process.env.ASC_APP_ID || "6808793078";
const LOCALE = "en-GB";

function asc(method, p, body) {
  const out = execFileSync("node", [`${root}/scripts/asc.mjs`, method, p, ...(body ? [JSON.stringify(body)] : [])], { encoding: "utf8", maxBuffer: 1 << 24 });
  const status = Number(out.slice(0, out.indexOf("\n")));
  const text = out.slice(out.indexOf("\n") + 1);
  const json = text.trim() ? JSON.parse(text) : null;
  if (status >= 300) throw new Error(`${method} ${p} → ${status}\n${JSON.stringify(json, null, 1).slice(0, 600)}`);
  return json;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const version = asc("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED`).data[0];
if (!version) throw new Error("no App Store version in preparation");
const loc = asc("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`).data.find((l) => l.attributes.locale === LOCALE);

let set = asc("GET", `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`).data.find((s) => s.attributes.screenshotDisplayType === displayType);
if (!set) {
  set = asc("POST", "/v1/appScreenshotSets", {
    data: { type: "appScreenshotSets", attributes: { screenshotDisplayType: displayType }, relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: loc.id } } } },
  }).data;
  console.log("created", displayType, "set");
}

// Out with the old.
for (const s of asc("GET", `/v1/appScreenshotSets/${set.id}/appScreenshots`).data) {
  asc("DELETE", `/v1/appScreenshots/${s.id}`);
  console.log("deleted", s.attributes.fileName);
}

const files = fs.readdirSync(`${root}/${dir}`).filter((f) => f.endsWith(".png")).sort();
for (const file of files) {
  const bytes = fs.readFileSync(`${root}/${dir}/${file}`);
  const reserved = asc("POST", "/v1/appScreenshots", {
    data: { type: "appScreenshots", attributes: { fileName: file, fileSize: bytes.length }, relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: set.id } } } },
  }).data;
  for (const op of reserved.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`upload part of ${file} failed: ${res.status}`);
  }
  asc("PATCH", `/v1/appScreenshots/${reserved.id}`, {
    data: { type: "appScreenshots", id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: crypto.createHash("md5").update(bytes).digest("hex") } },
  });
  console.log("uploaded", file);
}

// Wait for processing so a bad size shows up here, not in the ASC UI later.
for (let i = 0; i < 30; i++) {
  await sleep(5000);
  const states = asc("GET", `/v1/appScreenshotSets/${set.id}/appScreenshots`).data.map((s) => `${s.attributes.fileName}: ${s.attributes.assetDeliveryState?.state}`);
  if (states.every((s) => /COMPLETE|FAILED/.test(s))) { console.log(states.join("\n")); break; }
}
