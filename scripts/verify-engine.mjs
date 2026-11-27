// ── Toilet Tycoon — engine verification script ──────────────────
// Run with: npm run verify   (or: node scripts/verify-engine.mjs)
// Uses only the pure engine + config; no UI, no storage, no network.

import assert from "node:assert/strict";

import {
  FACILITY_TIERS,
  LOCATIONS,
  OFFLINE_CAP_MS,
  START_COINS,
} from "../lib/game/config.js";
import {
  blockFixCost,
  buildCabin,
  cabinCost,
  cleanNow,
  collect,
  createGame,
  deserialize,
  fixBlock,
  hireStaff,
  ratePerUse,
  serialize,
  settle,
  staffHireCost,
  tierUpgradeCost,
  upgradeTier,
  visitorFactor,
  waterUpgradeCost,
  titleFor,
} from "../lib/game/engine.js";

// ── Tiny pass/fail harness ───────────────────────────────────────
let passed = 0;
let total = 0;

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.log(`✗ ${name} — ${err.message}`);
  }
}

const T0 = 1_700_000_000_000;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const neverBlock = () => 0.99; // rng roll is never below the block chance
const alwaysBlock = () => 0; // rng roll is always below the block chance

// Fresh game with one Street Corner cabin already built.
function freshWithCabin(now = T0) {
  const built = buildCabin(createGame(now), "street");
  assert.equal(built.ok, true);
  return built.state;
}

// ── a) First-minute loop ─────────────────────────────────────────
{
  const fresh = createGame(T0);
  check("a1 fresh wallet == START_COINS", () => {
    assert.equal(fresh.wallet, START_COINS);
  });

  const built = buildCabin(fresh, "street");
  check("a2 buildCabin on street succeeds", () => {
    assert.equal(built.ok, true);
    assert.equal(built.state.locations.street.cabins, 1);
  });
  check("a3 first street cabin costs 50", () => {
    assert.equal(cabinCost(fresh, "street"), 50);
    assert.equal(built.state.wallet, START_COINS - 50);
  });

  const { state: settled } = settle(built.state, T0 + 60 * 1000, neverBlock);
  check("a4 settle +60s (never blocks) puts coins in the street Till", () => {
    assert.ok(settled.locations.street.till > 0, `till=${settled.locations.street.till}`);
  });

  const collected = collect(settled, "street");
  check("a5 collect moves a positive whole amount into the Wallet", () => {
    assert.equal(collected.ok, true);
    assert.ok(collected.amount > 0, `amount=${collected.amount}`);
    assert.equal(Number.isInteger(collected.amount), true);
    assert.equal(collected.state.wallet, settled.wallet + collected.amount);
    assert.ok(collected.state.locations.street.till < settled.locations.street.till);
  });
}

// ── b) Offline cap (3 hours) ─────────────────────────────────────
{
  const base = freshWithCabin();
  const run10h = settle(base, T0 + 10 * HOUR, neverBlock);
  const run3h = settle(base, T0 + 3 * HOUR, neverBlock);
  const run30m = settle(base, T0 + 30 * MIN, neverBlock);

  check("b1 OFFLINE_CAP_MS is 3 hours", () => {
    assert.equal(OFFLINE_CAP_MS, 3 * HOUR);
  });
  check("b2 10h gap is capped: counted time == 3h and capped flag set", () => {
    assert.equal(run10h.report.countedMs, OFFLINE_CAP_MS);
    assert.equal(run10h.report.capped, true);
    assert.equal(run3h.report.capped, false);
  });
  check("b3 10h Till gain EQUALS the 3h Till gain (cap works) and is > 0", () => {
    assert.ok(run3h.report.tillGained > 0, `3h tillGained=${run3h.report.tillGained}`);
    assert.equal(run10h.report.tillGained, run3h.report.tillGained);
  });
  check("b4 30-minute gap pays a sane positive floor (> 0 and < the 3h amount)", () => {
    assert.ok(run30m.report.tillGained > 0, `30m tillGained=${run30m.report.tillGained}`);
    assert.ok(run30m.report.tillGained < run3h.report.tillGained);
  });
}

// ── c) Cleanliness gating ────────────────────────────────────────
{
  check("c1 visitorFactor(100) == 1", () => assert.equal(visitorFactor(100), 1));
  check("c2 visitorFactor(30) == 0.5", () => assert.equal(visitorFactor(30), 0.5));
  check("c3 visitorFactor(10) == 0.05", () => assert.equal(visitorFactor(10), 0.05));

  const cleanState = freshWithCabin();
  cleanState.locations.street.cleanliness = 100;
  const dirtyState = freshWithCabin();
  dirtyState.locations.street.cleanliness = 10;

  const cleanRun = settle(cleanState, T0 + MIN, neverBlock);
  const dirtyRun = settle(dirtyState, T0 + MIN, neverBlock);
  check("c4 settle at cleanliness 10 earns < 20% of the same settle at 100", () => {
    assert.ok(cleanRun.report.tillGained > 0);
    assert.ok(
      dirtyRun.report.tillGained < cleanRun.report.tillGained * 0.2,
      `dirty=${dirtyRun.report.tillGained} clean=${cleanRun.report.tillGained}`,
    );
  });
}

// ── d) Tier ladder ───────────────────────────────────────────────
{
  let state = freshWithCabin();
  state.wallet = 10_000_000_000;

  check("d0 starting tier rate is 5 and first upgrade costs 300", () => {
    assert.equal(ratePerUse(state, "street"), 5);
    assert.equal(tierUpgradeCost(state, "street"), 300);
    assert.equal(waterUpgradeCost(state, "street"), 400);
  });

  let allOk = true;
  for (let i = 0; i < 4; i += 1) {
    const res = upgradeTier(state, "street");
    if (!res.ok) allOk = false;
    state = res.state;
  }
  check("d1 four tier upgrades all succeed", () => assert.equal(allOk, true));
  check("d2 after 4 upgrades ratePerUse == 100", () => {
    assert.equal(ratePerUse(state, "street"), 100);
  });
  check("d3 after 4 upgrades tier name is Luxury", () => {
    assert.equal(FACILITY_TIERS[state.locations.street.tier].name, "Luxury");
  });
  check("d4 a 5th tier upgrade fails (ok == false)", () => {
    const fifth = upgradeTier(state, "street");
    assert.equal(fifth.ok, false);
    assert.equal(tierUpgradeCost(state, "street"), null);
  });
}

// ── e) Pipe block ────────────────────────────────────────────────
{
  let state = freshWithCabin();

  const blockedRun = settle(state, T0 + MIN, alwaysBlock);
  state = blockedRun.state;
  check("e1 settle with rng = () => 0 blocks the street pipe", () => {
    assert.equal(state.locations.street.blocked, true);
    assert.equal(blockedRun.report.newBlock, "street");
  });

  const stuckRun = settle(state, T0 + 2 * MIN, neverBlock);
  state = stuckRun.state;
  check("e2 a further settle earns 0 new Till while blocked", () => {
    assert.equal(stuckRun.report.tillGained, 0);
    assert.equal(state.locations.street.till, 0);
  });

  state.wallet += 1000; // top up so the fix is affordable
  check("e3 blockFixCost for street is 100", () => assert.equal(blockFixCost("street"), 100));
  const fixed = fixBlock(state, "street");
  state = fixed.state;
  check("e4 fixBlock succeeds and clears the block", () => {
    assert.equal(fixed.ok, true);
    assert.equal(state.locations.street.blocked, false);
  });

  const againRun = settle(state, T0 + 3 * MIN, neverBlock);
  check("e5 a following settle earns again after the fix", () => {
    assert.ok(againRun.report.tillGained > 0, `tillGained=${againRun.report.tillGained}`);
    assert.ok(againRun.state.locations.street.till > 0);
  });
}

// ── f) Save round-trip ───────────────────────────────────────────
{
  let state = freshWithCabin();
  state = settle(state, T0 + 10 * MIN, neverBlock).state;
  state.locations.street.cleanliness = 73; // a distinctive mid-game value

  const restored = deserialize(serialize(state), T0 + 10 * MIN);
  check("f1 serialize → deserialize restores a state", () => {
    assert.ok(restored !== null);
  });
  check("f2 round-trip deep-equals wallet and lifetime", () => {
    assert.equal(restored.wallet, state.wallet);
    assert.equal(restored.lifetime, state.lifetime);
  });
  check("f3 round-trip deep-equals per-location cabins/tier/cleanliness", () => {
    for (const loc of LOCATIONS) {
      const a = state.locations[loc.id];
      const b = restored.locations[loc.id];
      assert.deepEqual(
        { cabins: b.cabins, tier: b.tier, cleanliness: b.cleanliness },
        { cabins: a.cabins, tier: a.tier, cleanliness: a.cleanliness },
        `location ${loc.id}`,
      );
    }
  });
  check('f4 deserialize("garbage") returns null', () => {
    assert.equal(deserialize("garbage"), null);
  });
}

// ── g) Clean Now ─────────────────────────────────────────────────
{
  let state = freshWithCabin();
  state.locations.street.cleanliness = 50;

  const cleaned = cleanNow(state, "street", T0);
  state = cleaned.state;
  check("g1 cleanNow at cleanliness 50 succeeds and sets it to 100", () => {
    assert.equal(cleaned.ok, true);
    assert.equal(state.locations.street.cleanliness, 100);
  });
  check("g2 immediate second cleanNow fails (cooldown)", () => {
    const second = cleanNow(state, "street", T0);
    assert.equal(second.ok, false);
  });
}

// ── h) Attendant (auto-collect, wages from the Till) ─────────────
{
  let state = freshWithCabin();
  state.wallet += 10000; // top up so hiring is affordable

  check("h0 staffHireCost for a street attendant is 500", () => {
    assert.equal(staffHireCost("street", "attendant"), 500);
  });
  const hired = hireStaff(state, "street", "attendant");
  state = hired.state;
  check("h1 hiring an attendant at street succeeds", () => {
    assert.equal(hired.ok, true);
    assert.equal(state.locations.street.attendant, true);
  });

  const walletBefore = state.wallet;
  const run = settle(state, T0 + 10 * MIN, neverBlock);
  check("h2 settle 10 min with an attendant: report.earned > 0", () => {
    assert.ok(run.report.earned > 0, `earned=${run.report.earned}`);
  });
  check("h3 attendant auto-collect increased the Wallet", () => {
    assert.ok(run.state.wallet > walletBefore, `wallet ${walletBefore} -> ${run.state.wallet}`);
  });
}

// ── Extra API sanity (derived helpers used above) ────────────────
check("x1 titleFor(0) is the first title and a huge lifetime is Toilet Tycoon", () => {
  assert.equal(titleFor(0), "Street Starter");
  assert.equal(titleFor(50_000_000), "Toilet Tycoon");
});

// ── Dialogues ────────────────────────────────────────────────────
{
  const { DIALOGUES, DIALOGUE_TRIGGERS, pickDialogue, createDialoguePicker } = await import("../lib/game/dialogues.js");
  check("dlg1 every trigger group exists and is non-empty", () => {
    const expected = ["happy", "dirty", "luxury", "blocked", "collect", "attendant", "cleaner", "build", "unlock"];
    for (const t of expected) {
      assert.ok(DIALOGUE_TRIGGERS.includes(t), `missing trigger ${t}`);
      assert.ok(Array.isArray(DIALOGUES[t]) && DIALOGUES[t].length >= 3, `group ${t} too small`);
      for (const line of DIALOGUES[t]) assert.ok(typeof line === "string" && line.length > 0 && line.length <= 60, `bad line in ${t}`);
    }
  });
  check("dlg2 total line count is in the 40–70 range", () => {
    const totalLines = DIALOGUE_TRIGGERS.reduce((a, t) => a + DIALOGUES[t].length, 0);
    assert.ok(totalLines >= 40 && totalLines <= 70, `total=${totalLines}`);
  });
  check("dlg3 pickDialogue returns a member of the group, null for unknown", () => {
    for (let i = 0; i < 50; i++) assert.ok(DIALOGUES.happy.includes(pickDialogue("happy")));
    assert.equal(pickDialogue("nope"), null);
  });
  check("dlg4 picker never repeats the previous line back-to-back", () => {
    const picker = createDialoguePicker();
    for (const t of DIALOGUE_TRIGGERS) {
      let prev = null;
      for (let i = 0; i < 60; i++) {
        const line = picker.next(t);
        assert.ok(line && line !== prev, `repeat in ${t}: "${line}"`);
        prev = line;
      }
    }
  });
  check("dlg5 fresh games have dialogues ON by default", () => {
    assert.equal(createGame(1_000).dialoguesOn, true);
  });
}

// ── i18n / localization foundation ───────────────────────────────
{
  const i18n = await import("../lib/game/i18n.js");
  const { STRINGS, DIALOGUE_LINES, UI_KEYS, MIN_LOCALE_KEYS, getString, detectLang } = i18n;
  const { pickDialogue, createDialoguePicker } = await import("../lib/game/dialogues.js");
  check("i18n1 en set is complete for every UI key the game uses", () => {
    assert.ok(UI_KEYS.length >= 60, `UI_KEYS=${UI_KEYS.length}`);
    for (const k of UI_KEYS) {
      assert.ok(typeof STRINGS.en[k] === "string" && STRINGS.en[k].length > 0, `en missing ${k}`);
    }
  });
  check("i18n2 urduMix covers the required minimum keys itself", () => {
    for (const k of MIN_LOCALE_KEYS) {
      assert.ok(typeof STRINGS.urduMix[k] === "string" && STRINGS.urduMix[k].length > 0, `urduMix missing ${k}`);
    }
  });
  check("i18n3 urduMix dialogues: every trigger, same line count as en", () => {
    for (const trig of Object.keys(DIALOGUE_LINES.en)) {
      assert.ok(Array.isArray(DIALOGUE_LINES.urduMix[trig]), `urduMix dialogues missing ${trig}`);
      assert.equal(DIALOGUE_LINES.urduMix[trig].length, DIALOGUE_LINES.en[trig].length, `count mismatch ${trig}`);
      for (const line of DIALOGUE_LINES.urduMix[trig]) assert.ok(line && line.length > 0, `empty line in ${trig}`);
    }
  });
  check("i18n4 fallback: missing urduMix key falls back to English", () => {
    const missing = UI_KEYS.find((k) => !(k in STRINGS.urduMix));
    assert.ok(missing, "expected at least one fallback key in v1");
    assert.equal(getString("urduMix", missing), STRINGS.en[missing]);
    assert.equal(getString("urduMix", "nav.locations"), STRINGS.urduMix["nav.locations"]);
    assert.equal(getString("en", "btn.collect"), "Collect");
    assert.equal(getString("urduMix", "btn.upgradeTo", { name: "Luxury" }), "Upgrade karo: Luxury");
  });
  check("i18n5 picker serves the ACTIVE language", () => {
    for (let i = 0; i < 40; i++) {
      assert.ok(DIALOGUE_LINES.urduMix.happy.includes(pickDialogue("happy", null, Math.random, "urduMix")), "urduMix line expected");
      assert.ok(DIALOGUE_LINES.en.happy.includes(pickDialogue("happy", null, Math.random, "en")), "en line expected");
    }
    const picker = createDialoguePicker();
    for (let i = 0; i < 20; i++) {
      assert.ok(DIALOGUE_LINES.urduMix.dirty.includes(picker.next("dirty", "urduMix")), "picker urduMix line expected");
    }
  });
  check("i18n7 language choice survives a save round-trip", () => {
    const s = { ...createGame(5_000), lang: "urduMix" };
    assert.equal(deserialize(serialize(s))?.lang, "urduMix");
    assert.equal(createGame(5_000).lang, "en");
  });
  check("i18n6 device-language default: ur/hi → urduMix, else en", () => {
    assert.equal(detectLang("ur-PK"), "urduMix");
    assert.equal(detectLang("hi-IN"), "urduMix");
    assert.equal(detectLang("en-US"), "en");
    assert.equal(detectLang(""), "en");
    assert.equal(detectLang(undefined), "en");
  });
}

// ── Summary ──────────────────────────────────────────────────────
console.log(`VERIFY: ${passed}/${total} checks passed`);
if (passed !== total) {
  process.exit(1);
}
