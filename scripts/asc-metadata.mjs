#!/usr/bin/env node
// Push docs/app-store/metadata.json into App Store Connect: the version's
// listing copy, the app-level name/subtitle/privacy URL, categories, the
// content-rights answer, the age rating (everything "none" → 4+) and the App
// Review details. Idempotent — run it again after editing the file.
//
//   node scripts/asc-metadata.mjs            push everything
//   node scripts/asc-metadata.mjs --dry-run  show what would change
//
// Review contact: name/email/phone come from ASC_CONTACT_FIRST, ASC_CONTACT_LAST,
// ASC_CONTACT_EMAIL, ASC_CONTACT_PHONE (in .asc-key.env or the environment).
// Without a phone the review details are skipped, since ASC requires one.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const meta = JSON.parse(fs.readFileSync(`${root}/docs/app-store/metadata.json`, "utf8"));
const dry = process.argv.includes("--dry-run");
const APP_ID = process.env.ASC_APP_ID || "6808793078";

function asc(method, p, body) {
  const out = execFileSync("node", [`${root}/scripts/asc.mjs`, method, p, ...(body ? [JSON.stringify(body)] : [])], { encoding: "utf8" });
  const status = Number(out.slice(0, out.indexOf("\n")));
  const json = JSON.parse(out.slice(out.indexOf("\n") + 1) || "null");
  if (status >= 300) throw new Error(`${method} ${p} → ${status}\n${JSON.stringify(json, null, 1).slice(0, 800)}`);
  return json;
}

function patch(type, id, attributes, relationships) {
  const body = { data: { type, id, attributes, ...(relationships ? { relationships } : {}) } };
  if (dry) return console.log("PATCH", type, id, JSON.stringify({ attributes, relationships }, null, 1));
  asc("PATCH", `/v1/${type}/${id}`, body);
  console.log("updated", type, Object.keys(attributes).join(", ") || Object.keys(relationships ?? {}).join(", "));
}

const limit = (name, value, max) => {
  if (value && value.length > max) throw new Error(`${name} is ${value.length} chars; limit ${max}`);
};
limit("subtitle", meta.subtitle, 30);
limit("keywords", meta.keywords, 100);
limit("promotionalText", meta.promotionalText, 170);
limit("description", meta.description, 4000);

// The version in preparation and its localization.
const versions = asc("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED,WAITING_FOR_REVIEW`).data;
const version = versions[0];
if (!version) throw new Error("no App Store version in preparation");
console.log(`version ${version.attributes.versionString} (${version.attributes.appStoreState})`);

const loc = asc("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`).data.find((l) => l.attributes.locale === meta.locale);
if (!loc) throw new Error(`no ${meta.locale} localization on the version`);
// "What's New" only exists once there is a live version to be new against.
const hasLive = asc("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=READY_FOR_SALE`).data.length > 0;
patch("appStoreVersionLocalizations", loc.id, {
  description: meta.description,
  keywords: meta.keywords,
  promotionalText: meta.promotionalText,
  supportUrl: meta.supportUrl,
  marketingUrl: meta.marketingUrl,
  ...(hasLive ? { whatsNew: meta.whatsNew } : {}),
});
patch("appStoreVersions", version.id, { copyright: meta.copyright });

// App-level info: name, subtitle, privacy URL, categories, age rating.
const info = asc("GET", `/v1/apps/${APP_ID}/appInfos`).data.find((i) => i.attributes.appStoreState !== "READY_FOR_SALE") ?? asc("GET", `/v1/apps/${APP_ID}/appInfos`).data[0];
const infoLoc = asc("GET", `/v1/appInfos/${info.id}/appInfoLocalizations`).data.find((l) => l.attributes.locale === meta.locale);
patch("appInfoLocalizations", infoLoc.id, { name: meta.name, subtitle: meta.subtitle, privacyPolicyUrl: meta.privacyPolicyUrl });
patch("appInfos", info.id, {}, {
  primaryCategory: { data: { type: "appCategories", id: meta.primaryCategory } },
  ...(meta.secondaryCategory ? { secondaryCategory: { data: { type: "appCategories", id: meta.secondaryCategory } } } : {}),
});

const age = asc("GET", `/v1/appInfos/${info.id}/ageRatingDeclaration`).data;
patch("ageRatingDeclarations", age.id, {
  advertising: false,
  ageAssurance: false,
  socialMedia: false,
  socialMediaAgeRestricted: false,
  alcoholTobaccoOrDrugUseOrReferences: "NONE",
  contests: "NONE",
  gambling: false,
  gamblingSimulated: "NONE",
  gunsOrOtherWeapons: "NONE",
  healthOrWellnessTopics: false,
  horrorOrFearThemes: "NONE",
  kidsAgeBand: null,
  lootBox: false,
  matureOrSuggestiveThemes: "NONE",
  medicalOrTreatmentInformation: "NONE",
  messagingAndChat: false,
  parentalControls: false,
  profanityOrCrudeHumor: "NONE",
  sexualContentGraphicAndNudity: "NONE",
  sexualContentOrNudity: "NONE",
  unrestrictedWebAccess: false,
  userGeneratedContent: false,
  violenceCartoonOrFantasy: "NONE",
  violenceRealistic: "NONE",
  violenceRealisticProlongedGraphicOrSadistic: "NONE",
});

patch("apps", APP_ID, { contentRightsDeclaration: "DOES_NOT_USE_THIRD_PARTY_CONTENT" });

// App Review contact and notes.
const { ASC_CONTACT_FIRST: first, ASC_CONTACT_LAST: last, ASC_CONTACT_EMAIL: email, ASC_CONTACT_PHONE: phone } = process.env;
if (first && last && email && phone) {
  const attrs = { contactFirstName: first, contactLastName: last, contactEmail: email, contactPhone: phone, demoAccountRequired: meta.review.demoAccountRequired, notes: meta.review.notes };
  const existing = asc("GET", `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`).data;
  if (existing) patch("appStoreReviewDetails", existing.id, attrs);
  else if (dry) console.log("POST appStoreReviewDetails", JSON.stringify(attrs, null, 1));
  else {
    asc("POST", "/v1/appStoreReviewDetails", { data: { type: "appStoreReviewDetails", attributes: attrs, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } } });
    console.log("created review details");
  }
} else {
  console.log("review details skipped: set ASC_CONTACT_FIRST/LAST/EMAIL/PHONE to write the App Review contact and notes");
}
