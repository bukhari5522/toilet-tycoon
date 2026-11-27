# Toilet Tycoon

A cheerful idle tycoon game about building a sparkling public-toilet empire across India — start with a single cabin on a busy street corner, keep it clean, and climb all the way to a luxury airport facility. The humour is clean, cartoonish and good-natured throughout: happy visitors, shiny tiles, dramatic pipe blockages, and absolutely no gross-out jokes — the comedy is in running a very serious business empire out of very humble beginnings.

## How to run

```bash
npm install
npm run dev     # development server
npm run build   # production build
npm run verify  # engine verification script (scripts/verify-engine.mjs)
```

## Design summary

- **Core loop:** Build cabins at a location → visitors use them and coins land in that location's **Till** → tap **Collect** to move the Till into your **Wallet** → spend the Wallet on more cabins, better facilities, water upgrades, new locations and staff. Earnings keep ticking while you play and while you are away (see the offline cap below).
- **Locations ladder:** Street Corner → Bus Stand → Bazaar → Railway Station → Mela Ground → Shopping Mall → Airport. Each new location costs more to unlock, has more cabin slots, pricier cabins, and a faster flow of visitors per cabin.
- **Facility rate ladder:** Every location's facility tier can be upgraded through Basic → Standard → Comfort → Premium → Luxury, raising the price per use along the ladder **5 → 10 → 25 → 50 → 100** coins.
- **Cleanliness — the heart mechanic:** Cleanliness (0–100) fades with every visitor use and slowly over time. Visitor flow depends on it: 40–100% means full flow, 20–40% means half flow, and under 20% almost nobody comes. Tap **Clean Now** to restore a location to 100 (on a short cooldown), or hire a Cleaner to keep it topped up.
- **Water track:** Each location also has a water upgrade track (Bucket Supply → Water Tank → Running Water → Auto Flush). Better water slows the cleanliness lost per use, so busy locations stay welcoming for longer.
- **Staff — wages-from-till model:** An **Attendant** automatically collects the Till into your Wallet; a **Cleaner** steadily restores cleanliness. Staff are hired for a one-time fee, and their wages are paid out of that location's own Till takings during settling — never from the Wallet, and never below zero: if the Till is empty, no wage is due for that time.
- **Pipe-block problem:** At any open location with cabins, a pipe can randomly block. While blocked, no visitors come to that location at all until you pay the fix cost to clear it.
- **Funny dialogues:** Visitors and staff drop short, clean one-liners in a speech bubble above the bottom nav — praise when it sparkles, complaints when it is dirty, awe at Luxury, grumbles when a pipe blocks. The lines live in `lib/game/i18n.js` (`DIALOGUE_LINES`, grouped by trigger, one full set per language; the picker in `lib/game/dialogues.js` never repeats a line back-to-back, is throttled, and can be switched off in the Progress tab).
- **Language (i18n foundation):** Every user-visible string goes through `lib/game/i18n.js`. The `en` set is complete; the `urduMix` set (Roman Urdu + English, for Pakistan & India) covers all nav/tab labels, all main action buttons, section titles, the 3 guide cards, the away summary, toasts, errors — and a mixed version of **every** dialogue line. Anything not yet translated falls back to English automatically. On first run the language follows the device (Urdu/Hindi device language → Urdu + English; anything else → English), and the player can switch any time in the Progress tab (🌐 Language); the choice is saved. Location names, facility/water tier names, staff names and title-ladder names stay English in v1 (they are proper names). Adding a language later = adding one `STRINGS` set + one `DIALOGUE_LINES` set in `i18n.js` — no other code changes. No new countries/locations are added in v1; the 7 Indian locations stay.
- **Offline cap:** The game keeps earning while you are away, but counted offline time is capped at **3 hours** — longer absences earn the same as 3 hours.
- **Saving:** Progress is saved locally in the browser's localStorage under the save key `toilet-tycoon-save-v1`.

## Balance numbers

**All** balance numbers — prices, rates, visitor flow, cleanliness decay, staff costs and wages, block chances, unlock costs and the offline cap — live in one file only: [`lib/game/config.js`](lib/game/config.js). The engine (`lib/game/engine.js`) and the UI read from there; tune the whole economy by editing that file.
