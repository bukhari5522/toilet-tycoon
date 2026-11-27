// ── Toilet Tycoon dialogue picker ───────────────────────────────
// The LINES themselves live in lib/game/i18n.js (DIALOGUE_LINES),
// one full set per language, grouped by trigger — edit lines
// there. This module only picks them: a random line from the
// ACTIVE language's set, never repeating the previous line of
// the same trigger back-to-back.

import { DIALOGUE_LINES } from "./i18n.js";

// Back-compat: the English master set.
export const DIALOGUES = DIALOGUE_LINES.en;
export const DIALOGUE_TRIGGERS = Object.keys(DIALOGUE_LINES.en);

function linesFor(trigger, lang) {
  return DIALOGUE_LINES[lang]?.[trigger] ?? DIALOGUE_LINES.en[trigger] ?? null;
}

// Pick a random line for a trigger in `lang` (default English).
// `avoid` (usually the previous line shown) is never returned
// when the group has more than one line. Null for unknown.
export function pickDialogue(trigger, avoid = null, rng = Math.random, lang = "en") {
  const group = linesFor(trigger, lang);
  if (!group || group.length === 0) return null;
  const pool = group.length > 1 && avoid ? group.filter((l) => l !== avoid) : group;
  return pool[Math.floor(rng() * pool.length)];
}

// Stateful picker: remembers the last line per (language,
// trigger), so the game never shows the same line twice in a
// row — in either language. Call next(trigger, activeLang).
export function createDialoguePicker(rng = Math.random) {
  const last = {};
  return {
    next(trigger, lang = "en") {
      const key = `${lang}:${trigger}`;
      const line = pickDialogue(trigger, last[key] ?? null, rng, lang);
      if (line) last[key] = line;
      return line;
    },
  };
}
