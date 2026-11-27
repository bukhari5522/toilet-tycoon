// ── Toilet Tycoon — ALL balance numbers live in this one file ──
// Change the game's economy here; the engine and UI read only this.

export const GAME_NAME = "Toilet Tycoon";
export const SAVE_KEY = "toilet-tycoon-save-v1";
export const SAVE_VERSION = 1;

export const START_COINS = 100;

// Offline earnings: the game keeps working while you are away,
// but never for longer than this (owner's rule: 3 hours).
export const OFFLINE_CAP_MS = 3 * 60 * 60 * 1000;

// ── Locations ladder ─────────────────────────────────────────────
// visitorsPerMin = happy visitors per minute, PER CABIN, at 100%
// cleanliness and before the cleanliness factor is applied.
// cabinCost = price of the FIRST cabin at that location; each
// extra cabin costs CABIN_COST_GROWTH × the previous one.
export const CABIN_COST_GROWTH = 1.4;

export const LOCATIONS = [
  { id: "street",  name: "Street Corner",   emoji: "🚦", tagline: "Where it all begins — one busy corner.", unlockCost: 0,          slots: 4,  cabinCost: 50,      visitorsPerMin: 3 },
  { id: "bus",     name: "Bus Stand",       emoji: "🚌", tagline: "Passengers in a hurry, all day long.",    unlockCost: 5000,     slots: 5,  cabinCost: 400,     visitorsPerMin: 5 },
  { id: "bazaar",  name: "Bazaar",          emoji: "🛍️", tagline: "Shoppers, sellers and endless chai.",     unlockCost: 40000,    slots: 6,  cabinCost: 2500,    visitorsPerMin: 8 },
  { id: "railway", name: "Railway Station", emoji: "🚉", tagline: "Trains never stop — neither do people.",   unlockCost: 300000,   slots: 7,  cabinCost: 15000,   visitorsPerMin: 12 },
  { id: "mela",    name: "Mela Ground",     emoji: "🎡", tagline: "Fair crowds from morning to midnight.",    unlockCost: 2000000,  slots: 8,  cabinCost: 90000,   visitorsPerMin: 18 },
  { id: "mall",    name: "Shopping Mall",   emoji: "🏬", tagline: "Air-conditioned comfort, premium crowd.",  unlockCost: 15000000, slots: 10, cabinCost: 600000,  visitorsPerMin: 26 },
  { id: "airport", name: "Airport",         emoji: "✈️", tagline: "The top of the ladder. Pure luxury.",      unlockCost: 100000000, slots: 12, cabinCost: 4000000, visitorsPerMin: 40 },
];

// ── Facility tiers (per location) ────────────────────────────────
// The owner's rate ladder: 5 → 10 → 25 → 50 → 100 coins per use.
// Upgrade cost = location cabinCost × costFactor of the NEXT tier.
export const FACILITY_TIERS = [
  { name: "Basic",   emoji: "🪣", rate: 5,   costFactor: 0 },
  { name: "Standard", emoji: "🚿", rate: 10,  costFactor: 6 },
  { name: "Comfort", emoji: "🛁", rate: 25,  costFactor: 30 },
  { name: "Premium", emoji: "💎", rate: 50,  costFactor: 120 },
  { name: "Luxury",  emoji: "👑", rate: 100, costFactor: 400 },
];

// ── Water system (per location, 3 levels) ────────────────────────
// Better water = cleanliness fades slower after every use.
// Upgrade cost = location cabinCost × costFactor of the NEXT level.
export const WATER_LEVELS = [
  { name: "Bucket Supply", emoji: "🪣", decayMultiplier: 1.0, costFactor: 0 },
  { name: "Water Tank",    emoji: "🛢️", decayMultiplier: 0.7, costFactor: 8 },
  { name: "Running Water", emoji: "🚰", decayMultiplier: 0.5, costFactor: 40 },
  { name: "Auto Flush",    emoji: "✨", decayMultiplier: 0.3, costFactor: 160 },
];

// ── Cleanliness (the heart mechanic) ─────────────────────────────
export const CLEAN = {
  decayPerUse: 0.45,        // points lost per visitor use (before water multiplier)
  decayPerHour: 0.6,        // slow fade over time, points per hour
  cleanerRegenPerHour: 30,  // points a hired Cleaner restores per hour
  cleanNowCooldownMs: 45 * 1000,
  // Visitor flow factor by cleanliness:
  //   40–100% → full flow · 20–40% → half · under 20% → almost none
  factorMid: 0.5,
  factorLow: 0.05,
};

// ── Staff (per location) ─────────────────────────────────────────
// Hire cost = cabinCost × hireFactor (one time).
// Wages are paid out of that location's Till takings during settle
// (wagePerHour = cabinCost × wageFactor) — if the Till is empty,
// no wage is due for that time. Simple and always fair.
export const STAFF = {
  attendant: { name: "Attendant", emoji: "🧑‍💼", hireFactor: 10, wageFactor: 2.0, blurb: "Collects the Till into your Wallet for you." },
  cleaner:   { name: "Cleaner",   emoji: "🧹", hireFactor: 8,  wageFactor: 1.5, blurb: "Keeps cleanliness topped up all day." },
};

// ── Problems ─────────────────────────────────────────────────────
// A pipe can block at any open location with cabins. While blocked,
// no visitors come to that location until the player taps Fix.
export const BLOCK = {
  chancePerHour: 0.10,  // per location, rolled in settle chunks
  fixFactor: 2,         // fix cost = cabinCost × fixFactor
};

// ── Titles (by lifetime earnings) ────────────────────────────────
export const TITLES = [
  { at: 0,         name: "Street Starter" },
  { at: 500,       name: "Corner Keeper" },
  { at: 2500,      name: "Cleanliness Champ" },
  { at: 12000,     name: "Bazaar Baron" },
  { at: 60000,     name: "Station Master" },
  { at: 300000,    name: "Mela Mogul" },
  { at: 1500000,   name: "Mall Magnate" },
  { at: 10000000,  name: "Airport Ace" },
  { at: 50000000,  name: "Toilet Tycoon" },
];

export function locationById(id) {
  return LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
}
