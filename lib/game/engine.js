// ── Toilet Tycoon engine — pure, framework-free game logic ──────
// Every function takes a state and returns a NEW state (the input
// is never mutated), so the same code drives the live tick, the
// offline settle and the verify script.

import {
  CABIN_COST_GROWTH,
  BLOCK,
  CLEAN,
  FACILITY_TIERS,
  LOCATIONS,
  OFFLINE_CAP_MS,
  SAVE_VERSION,
  STAFF,
  START_COINS,
  TITLES,
  WATER_LEVELS,
  locationById,
} from "./config.js";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function freshLocation() {
  return {
    unlocked: false,
    cabins: 0,
    tier: 0,          // index into FACILITY_TIERS
    water: 0,         // index into WATER_LEVELS
    cleanliness: 100, // 0–100
    till: 0,          // coins waiting to be collected
    blocked: false,   // pipe blocked — no visitors until fixed
    attendant: false,
    cleaner: false,
    cleanReadyAt: 0,  // timestamp when "Clean Now" is ready again
    totalEarned: 0,   // lifetime earnings at this location
  };
}

export function createGame(now = Date.now()) {
  const locations = {};
  for (const loc of LOCATIONS) locations[loc.id] = freshLocation();
  locations[LOCATIONS[0].id].unlocked = true; // first spot is rented & ready
  return {
    version: SAVE_VERSION,
    wallet: START_COINS,
    lifetime: 0,
    totalVisitors: 0,
    guideSeen: false,
    dialoguesOn: true,
    lang: "en", // "en" | "urduMix" — UI language, set on first run from the device
    locations,
    lastSeen: now,
    createdAt: now,
  };
}

// Load a saved game defensively: unknown or broken data falls back
// to a fresh game; missing fields are filled from a fresh template.
export function sanitizeSave(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object") return null;
  try {
    const base = createGame(now);
    const s = { ...base, ...raw };
    if (typeof s.wallet !== "number" || Number.isNaN(s.wallet)) return null;
    s.locations = {};
    for (const loc of LOCATIONS) {
      s.locations[loc.id] = { ...freshLocation(), ...(raw.locations?.[loc.id] || {}) };
    }
    s.version = SAVE_VERSION;
    return s;
  } catch {
    return null;
  }
}

export const serialize = (state) => JSON.stringify(state);
export function deserialize(text, now = Date.now()) {
  try {
    return sanitizeSave(JSON.parse(text), now);
  } catch {
    return null;
  }
}

// ── Derived numbers ──────────────────────────────────────────────
export function cabinCost(state, locId) {
  const cfg = locationById(locId);
  const built = state.locations[locId].cabins;
  return Math.round(cfg.cabinCost * Math.pow(CABIN_COST_GROWTH, built));
}

export function ratePerUse(state, locId) {
  return FACILITY_TIERS[state.locations[locId].tier].rate;
}

export function tierUpgradeCost(state, locId) {
  const loc = state.locations[locId];
  if (loc.tier >= FACILITY_TIERS.length - 1) return null;
  return Math.round(locationById(locId).cabinCost * FACILITY_TIERS[loc.tier + 1].costFactor);
}

export function waterUpgradeCost(state, locId) {
  const loc = state.locations[locId];
  if (loc.water >= WATER_LEVELS.length - 1) return null;
  return Math.round(locationById(locId).cabinCost * WATER_LEVELS[loc.water + 1].costFactor);
}

export function staffHireCost(locId, kind) {
  return Math.round(locationById(locId).cabinCost * STAFF[kind].hireFactor);
}

export function staffWagePerHour(locId, kind) {
  return locationById(locId).cabinCost * STAFF[kind].wageFactor;
}

export function blockFixCost(locId) {
  return Math.round(locationById(locId).cabinCost * BLOCK.fixFactor);
}

// Visitor flow factor from cleanliness (the heart mechanic):
// 40–100% full flow · 20–40% half · under 20% almost nobody comes.
export function visitorFactor(cleanliness) {
  if (cleanliness >= 40) return 1;
  if (cleanliness >= 20) return CLEAN.factorMid;
  return CLEAN.factorLow;
}

export function titleFor(lifetime) {
  let current = TITLES[0];
  for (const t of TITLES) if (lifetime >= t.at) current = t;
  return current.name;
}

export function nextTitle(lifetime) {
  for (const t of TITLES) if (lifetime < t.at) return t;
  return null;
}

// ── Actions ──────────────────────────────────────────────────────
const clone = (s) => structuredClone(s);
const fail = (state, error) => ({ state, ok: false, error });
const done = (state) => ({ state, ok: true });

export function unlockLocation(state, locId) {
  const cfg = locationById(locId);
  const s = clone(state);
  const loc = s.locations[locId];
  if (loc.unlocked) return fail(state, "Already open");
  if (s.wallet < cfg.unlockCost) return fail(state, "Not enough coins");
  s.wallet -= cfg.unlockCost;
  loc.unlocked = true;
  return done(s);
}

export function buildCabin(state, locId) {
  const cfg = locationById(locId);
  const cost = cabinCost(state, locId);
  const s = clone(state);
  const loc = s.locations[locId];
  if (!loc.unlocked) return fail(state, "Location is locked");
  if (loc.cabins >= cfg.slots) return fail(state, "No free slots here");
  if (s.wallet < cost) return fail(state, "Not enough coins");
  s.wallet -= cost;
  loc.cabins += 1;
  return done(s);
}

export function collect(state, locId) {
  const s = clone(state);
  const loc = s.locations[locId];
  const amount = Math.floor(loc.till);
  if (amount <= 0) return { ...fail(state, "Till is empty"), amount: 0 };
  loc.till -= amount;
  s.wallet += amount;
  return { state: s, ok: true, amount };
}

export function upgradeTier(state, locId) {
  const cost = tierUpgradeCost(state, locId);
  if (cost === null) return fail(state, "Already Luxury");
  const s = clone(state);
  if (s.wallet < cost) return fail(state, "Not enough coins");
  s.wallet -= cost;
  s.locations[locId].tier += 1;
  return done(s);
}

export function upgradeWater(state, locId) {
  const cost = waterUpgradeCost(state, locId);
  if (cost === null) return fail(state, "Water is already perfect");
  const s = clone(state);
  if (s.wallet < cost) return fail(state, "Not enough coins");
  s.wallet -= cost;
  s.locations[locId].water += 1;
  return done(s);
}

export function hireStaff(state, locId, kind) {
  const cost = staffHireCost(locId, kind);
  const s = clone(state);
  const loc = s.locations[locId];
  if (!loc.unlocked) return fail(state, "Location is locked");
  if (loc[kind]) return fail(state, "Already hired");
  if (s.wallet < cost) return fail(state, "Not enough coins");
  s.wallet -= cost;
  loc[kind] = true;
  return done(s);
}

export function fireStaff(state, locId, kind) {
  const s = clone(state);
  s.locations[locId][kind] = false;
  return done(s);
}

export function cleanNow(state, locId, now = Date.now()) {
  const s = clone(state);
  const loc = s.locations[locId];
  if (now < loc.cleanReadyAt) return fail(state, "Cleaning kit is recharging");
  loc.cleanliness = 100;
  loc.cleanReadyAt = now + CLEAN.cleanNowCooldownMs;
  return done(s);
}

export function fixBlock(state, locId) {
  const cost = blockFixCost(locId);
  const s = clone(state);
  const loc = s.locations[locId];
  if (!loc.blocked) return fail(state, "Nothing is blocked");
  if (s.wallet < cost) return fail(state, "Not enough coins");
  s.wallet -= cost;
  loc.blocked = false;
  return done(s);
}

// ── Settle: advance the whole game to `now` ──────────────────────
// Earnings time is capped at OFFLINE_CAP_MS (3h). Processing runs
// in ≤60-second chunks so long gaps stay safe and cheap. `rng` is
// injectable so tests can force or forbid pipe blocks.
export function settle(state, now = Date.now(), rng = Math.random) {
  const s = clone(state);
  const gapMs = Math.max(0, now - (s.lastSeen || now));
  const countedMs = Math.min(gapMs, OFFLINE_CAP_MS);
  const report = {
    awayMs: gapMs,
    countedMs,
    capped: gapMs > OFFLINE_CAP_MS,
    earned: 0,       // coins an Attendant moved into the Wallet
    tillGained: 0,   // gross coins that landed in Tills
    visitors: 0,
    newBlock: null,  // location id whose pipe blocked in this settle
    cleanlinessDrop: 0,
  };
  if (countedMs <= 0) {
    s.lastSeen = now;
    return { state: s, report };
  }

  const startClean = LOCATIONS.reduce((a, l) => a + (s.locations[l.id].cleanliness || 0), 0);
  const CHUNK_MS = 60 * 1000;
  let remaining = countedMs;

  while (remaining > 0) {
    const dtMs = Math.min(CHUNK_MS, remaining);
    remaining -= dtMs;
    const hours = dtMs / 3600000;

    for (const cfg of LOCATIONS) {
      const loc = s.locations[cfg.id];
      if (!loc.unlocked || loc.cabins <= 0) continue;

      // Pipe block roll (only while clear).
      if (!loc.blocked && rng() < BLOCK.chancePerHour * hours) {
        loc.blocked = true;
        if (!report.newBlock) report.newBlock = cfg.id;
      }

      // Cleaner quietly restores cleanliness, blocked or not.
      if (loc.cleaner) {
        loc.cleanliness = clamp(loc.cleanliness + CLEAN.cleanerRegenPerHour * hours, 0, 100);
      }
      // Slow time fade.
      loc.cleanliness = clamp(loc.cleanliness - CLEAN.decayPerHour * hours, 0, 100);

      if (loc.blocked) continue; // no visitors while the pipe is blocked

      const factor = visitorFactor(loc.cleanliness);
      const visitors = cfg.visitorsPerMin * loc.cabins * factor * (dtMs / 60000);
      if (visitors <= 0) continue;

      const earnedHere = visitors * ratePerUse(s, cfg.id);
      loc.till += earnedHere;
      report.tillGained += earnedHere;
      loc.totalEarned += earnedHere;
      s.lifetime += earnedHere;
      s.totalVisitors += visitors;
      report.visitors += visitors;

      const decay = visitors * CLEAN.decayPerUse * WATER_LEVELS[loc.water].decayMultiplier;
      loc.cleanliness = clamp(loc.cleanliness - decay, 0, 100);
    }

    // Wages + attendant collection, per location, once per chunk.
    for (const cfg of LOCATIONS) {
      const loc = s.locations[cfg.id];
      if (!loc.unlocked) continue;
      let wages = 0;
      if (loc.attendant) wages += staffWagePerHour(cfg.id, "attendant") * hours;
      if (loc.cleaner) wages += staffWagePerHour(cfg.id, "cleaner") * hours;
      if (wages > 0 && loc.till > 0) {
        // Wages are paid out of the Till takings only — never from
        // the Wallet, never below zero. Lifetime counts gross
        // earnings (before wages), like a real business turnover.
        loc.till -= Math.min(loc.till, wages);
      }
      if (loc.attendant && loc.till > 0) {
        const moved = Math.floor(loc.till);
        if (moved > 0) {
          loc.till -= moved;
          s.wallet += moved;
          report.earned += moved;
        }
      }
    }
  }

  const endClean = LOCATIONS.reduce((a, l) => a + (s.locations[l.id].cleanliness || 0), 0);
  report.cleanlinessDrop = Math.max(0, startClean - endClean);
  s.lastSeen = now;
  return { state: s, report };
}
