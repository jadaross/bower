#!/usr/bin/env node
// A minimal App Store Connect API client. Authenticates with the API key in
// .asc-key.env (or the ASC_* environment), the same key upload.sh uses.
//
//   node scripts/asc.mjs <METHOD> <path> [json-body]      one request, JSON out
//   node scripts/asc.mjs distribute <build-number>        see below
//
// `distribute` is what upload.sh runs after every upload: wait for the build
// to finish processing, add it to every external TestFlight group, and submit
// it for beta review. The first build in a group needs a human review; every
// one after is approved in seconds. Internal groups get builds automatically
// and need nothing here.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
for (const line of fs.existsSync(`${root}/.asc-key.env`) ? fs.readFileSync(`${root}/.asc-key.env`, "utf8").split("\n") : []) {
  const m = line.match(/^(?:export\s+)?([A-Z_]+)=["']?([^"']*)["']?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { ASC_KEY_ID: kid, ASC_ISSUER_ID: iss } = process.env;
if (!kid || !iss) { console.error("ASC_KEY_ID and ASC_ISSUER_ID are required (see .asc-key.env)"); process.exit(1); }
const keyPath = process.env.ASC_KEY_PATH || `${process.env.HOME}/.appstoreconnect/private_keys/AuthKey_${kid}.p8`;
const APP_ID = process.env.ASC_APP_ID || "6808793078";

function token() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: "ES256", kid, typ: "JWT" }) + "." + b64({ iss, iat: now, exp: now + 600, aud: "appstoreconnect-v1" });
  const sig = crypto.sign("sha256", Buffer.from(unsigned), { key: fs.readFileSync(keyPath), dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${unsigned}.${sig}`;
}

async function api(method, p, body) {
  const r = await fetch("https://api.appstoreconnect.apple.com" + p, {
    method,
    headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
    body,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function distribute(version) {
  // 1. Wait for processing. Uploads take 5-15 minutes to become VALID.
  let build;
  for (let i = 0; i < 60; i++) {
    const { json } = await api("GET", `/v1/builds?filter[app]=${APP_ID}&filter[version]=${version}&fields[builds]=version,processingState`);
    build = json.data?.[0];
    if (build?.attributes.processingState === "VALID") break;
    if (build?.attributes.processingState === "FAILED" || build?.attributes.processingState === "INVALID") {
      console.error(`build ${version} ${build.attributes.processingState} on App Store Connect`);
      process.exit(1);
    }
    if (i === 0) console.log(`waiting for build ${version} to process`);
    await sleep(30_000);
  }
  if (!build || build.attributes.processingState !== "VALID") { console.error(`build ${version} did not finish processing in 30 minutes`); process.exit(1); }

  // 2. Every external group gets it.
  const { json: groups } = await api("GET", `/v1/betaGroups?filter[app]=${APP_ID}&fields[betaGroups]=name,isInternalGroup`);
  const external = (groups.data ?? []).filter((g) => !g.attributes.isInternalGroup);
  for (const g of external) {
    const { status } = await api("POST", `/v1/betaGroups/${g.id}/relationships/builds`, JSON.stringify({ data: [{ type: "builds", id: build.id }] }));
    console.log(`${status === 204 ? "added to" : `could not add to (${status})`} group "${g.attributes.name}"`);
  }
  if (external.length === 0) { console.log("no external groups; internal testers get it automatically"); return; }

  // 3. Submit for beta review. Instant after the group's first approval. A
  // build already approved or in review (e.g. a re-run) is left alone.
  const { json: before } = await api("GET", `/v1/builds/${build.id}/buildBetaDetail?fields[buildBetaDetails]=externalBuildState`);
  const state = before.data?.attributes.externalBuildState;
  if (state === "BETA_APPROVED" || state === "WAITING_FOR_BETA_REVIEW" || state === "IN_BETA_REVIEW" || state === "IN_BETA_TESTING") {
    console.log(`build ${version}: ${state}`);
    return;
  }
  const { status, json } = await api("POST", "/v1/betaAppReviewSubmissions", JSON.stringify({
    data: { type: "betaAppReviewSubmissions", relationships: { build: { data: { type: "builds", id: build.id } } } },
  }));
  if (status !== 201) { console.error(`beta review submission failed (${status}): ${JSON.stringify(json).slice(0, 300)}`); process.exit(1); }
  await sleep(15_000);
  const { json: detail } = await api("GET", `/v1/builds/${build.id}/buildBetaDetail?fields[buildBetaDetails]=externalBuildState`);
  console.log(`build ${version}: ${detail.data?.attributes.externalBuildState ?? "submitted"}`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "distribute") {
  await distribute(rest[0]);
} else if (cmd && rest[0]) {
  const { status, json } = await api(cmd.toUpperCase(), rest[0], rest[1]);
  console.log(status);
  console.log(typeof json === "string" ? json.slice(0, 2000) : JSON.stringify(json, null, 1));
} else {
  console.error("usage: asc.mjs <METHOD> <path> [body] | asc.mjs distribute <build>");
  process.exit(1);
}
