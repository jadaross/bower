#!/usr/bin/env node
// The year-one model behind ADR-0010's tables. GBP, month by month.
//
//   node scripts/pricing-model.mjs
//
// Assumptions are the ADR's: 2% of installs subscribe and churn 14% a month;
// 30% of installs use the free tier in month one and 10% linger at the same
// churn; Apple pays about five weeks after month end. Rebuilt 23 September 2026
// when the original spreadsheet turned out not to be in the repo; it reproduces
// the 12 September Quiet and Works rows to within about £40.

const LISTING = 0.02;

function net(price, sbp) {
  return (price / 1.2) * 0.98 * (sbp ? 0.85 : 0.7); // VAT, UK DST, Apple
}

export function run({
  check = 0.09, // one three-platform market check
  price = 4.99,
  conv = 0.02,
  churn = 0.14,
  base = 200, // installs in month one
  growth = 0.2, // month on month
  months = 12,
  usage = "heavy",
  freeChecks = 1, // the free tier's monthly cap
  supabasePro = true,
  domain = true,
  packRate = 0, // share of installs that buy the listing pack in their first month
  packsEach = 1.5,
  packPrice = 0.99,
  cannibal = 0, // share of would-be subscribers who buy a pack a month instead
  sbp = true,
} = {}) {
  const subNet = net(price, sbp);
  const packNet = net(packPrice, sbp);
  const heavy = usage === "heavy";
  // Average use sits under one check a month in both profiles, so the cap
  // bounds the ceiling but hardly moves the averages.
  const subUse = heavy ? 20 * LISTING + 6 * check : 2 * LISTING + 2 * check;
  const freeFirst = (heavy ? 3 : 1) * LISTING + Math.min(1, freeChecks) * check;
  const freeLinger = (heavy ? 2 : 1) * LISTING + Math.min(heavy ? 0.58 : 0.5, freeChecks) * check;

  let subs = 0, linger = 0, packers = 0, earned = 0, cash = 0, installs = 0, last = 0;
  const revenue = [];
  for (let m = 1; m <= months; m++) {
    const i = base * (1 + growth) ** (m - 1);
    installs += i;
    subs = subs * (1 - churn) + i * conv * (1 - cannibal);
    packers = packers * (1 - churn) + i * conv * cannibal;
    const packs = i * packRate * packsEach + packers;
    const fixed = 6.6 + 14.8 + (supabasePro && m >= 2 ? 18.5 : 0) + (domain && m === 1 ? 12 : 0);
    const cost = fixed + 0.3 * i * freeFirst + linger * freeLinger + subs * subUse + packs * 10 * LISTING;
    linger = linger * (1 - churn) + 0.1 * i;
    const r = subs * subNet + packs * packNet;
    revenue.push(r);
    earned += r - cost;
    cash += -cost + (m >= 3 ? revenue[m - 3] : 0);
    last = r - cost;
  }
  return { installs, subs, earned, cash, owed: revenue.at(-1) + revenue.at(-2), m12: last };
}

const SCENARIOS = {
  Quiet: { base: 100, growth: 0 },
  Works: { base: 200, growth: 0.2 },
  Wishful: { base: 300, growth: 0.35 },
};
const PACK = { packRate: 0.03, packsEach: 1.5 };

const gbp = (n) => `${n < 0 ? "−" : "+"}£${Math.abs(Math.round(n / 10) * 10).toLocaleString("en-GB")}`;
const row = (name, r) =>
  `${name.padEnd(46)} installs ${Math.round(r.installs).toString().padStart(6)}  subs ${Math.round(r.subs).toString().padStart(4)}  earned ${gbp(r.earned).padStart(7)}  cash ${gbp(r.cash).padStart(7)}  owed ${gbp(r.owed).padStart(7)}  m12 ${gbp(r.m12).padStart(6)}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Scenarios: all-Haiku (9p), 5L + 1C a month, heavy usage");
  for (const [name, s] of Object.entries(SCENARIOS)) {
    console.log(row(`${name}, no pack`, run(s)));
    console.log(row(`${name}, pack (3% of installs, 1.5 each)`, run({ ...s, ...PACK })));
  }
  console.log("\nLevers, Works");
  const w = SCENARIOS.Works;
  const levers = {
    "was A: 19p check, 2 free checks": { check: 0.19, freeChecks: 2 },
    "A: all-Haiku, 1 free check, no pack": {},
    "pack, 1% of installs": { packRate: 0.01 },
    "pack, 3% of installs": PACK,
    "pack, 5% of installs, 2 each": { packRate: 0.05, packsEach: 2 },
    "pack 3%, a quarter of subs buy packs instead": { ...PACK, cannibal: 0.25 },
    "pack 3%, half of subs buy packs instead": { ...PACK, cannibal: 0.5 },
    "pack 3%, light usage": { ...PACK, usage: "light" },
    "pack 3%, £5.99": { ...PACK, price: 5.99 },
    "pack 3%, 3% conversion": { ...PACK, conv: 0.03 },
    "pack 3%, Supabase Free, no domain": { ...PACK, supabasePro: false, domain: false },
  };
  for (const [name, l] of Object.entries(levers)) console.log(row(name, run({ ...w, ...l })));
  console.log("\nStanding mode, month 36: light usage, Vercel Pro and Apple only");
  for (const i of [30, 40, 55]) {
    for (const p of [{}, PACK]) {
      const r = run({ base: i, growth: 0, months: 36, usage: "light", supabasePro: false, domain: false, ...p });
      console.log(row(`${i} installs a month${p.packRate ? ", pack" : ""}`, r));
    }
  }
}
