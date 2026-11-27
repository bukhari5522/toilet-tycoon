// ── Toilet Tycoon i18n — EVERY user-visible string lives here ───
// Adding a language later = adding ONE new set in this file
// (a STRINGS entry + a DIALOGUE_LINES entry). No other code
// changes are needed: the UI asks getString(lang, key) and the
// dialogue picker asks for lines in the active language.
//
// `en` is the complete master set. Other sets are partial on
// purpose: any missing key falls back to English automatically
// (STRINGS[lang][key] ?? STRINGS.en[key]).
//
// The game's language follows the player's country: on first run
// a device language of Urdu (ur) or Hindi (hi) starts in
// "urduMix" (Roman Urdu + English mix, for Pakistan & India);
// everything else starts in English. The player can switch any
// time in the Progress tab; the choice is saved.

export const LANGS = [
  { id: "en", label: "English" },
  { id: "urduMix", label: "Urdu + English" },
];

export function detectLang(navLanguage) {
  const l = String(navLanguage || "").toLowerCase();
  return l.startsWith("ur") || l.startsWith("hi") ? "urduMix" : "en";
}

export const STRINGS = {
  en: {
    "nav.locations": "Locations",
    "nav.upgrades": "Upgrades",
    "nav.staff": "Staff",
    "nav.progress": "Progress",
    "top.wallet": "Wallet",
    "top.lifetime": "Lifetime",
    "common.perUse": "/use",
    "common.yours": "· yours",
    "common.on": "On ✓",
    "common.off": "Off",
    "sheet.welcome": "Welcome!",
    "sheet.away": "While you were away 🌙",
    "sheet.reset": "Reset save? ⚠️",
    "btn.skip": "Skip",
    "btn.next": "Next",
    "btn.startPlaying": "Start playing!",
    "btn.backToBusiness": "Back to business!",
    "btn.keepPlaying": "Keep playing",
    "btn.yesReset": "Yes, reset",
    "btn.collect": "Collect",
    "btn.buildCabin": "Build cabin",
    "btn.cleanNow": "🧹 Clean Now — free",
    "btn.fixPipe": "Fix the pipe",
    "btn.openLocation": "Open this location",
    "btn.upgradeTo": "Upgrade to {name}",
    "btn.hire": "Hire · 🪙 {cost} one-time",
    "btn.letGo": "Let go",
    "btn.replayGuide": "📖 Replay guide",
    "btn.resetSave": "🗑️ Reset save",
    "guide.1.title": "Build a cabin",
    "guide.1.text": "Pick a spot and build your first toilet cabin. It costs 50 coins — you already have them!",
    "guide.2.title": "Collect the Till",
    "guide.2.text": "Visitors pay per use and coins pile up in the Till. Tap Collect to move them into your Wallet. Keep it sparkling — a dirty toilet scares visitors away!",
    "guide.3.title": "Upgrade & grow",
    "guide.3.text": "Raise your facility from Basic (5 coins) all the way to Luxury (100 coins), hire staff, and open new locations — Bus Stand, Railway Station, even the Airport!",
    "away.awayFor": "You were away for",
    "away.keptWorking": "Your toilets kept working for",
    "away.maxNote": "(the 3-hour maximum)",
    "away.andWelcomed": "and welcomed",
    "away.visitorsWord": "visitors.",
    "away.coinsEarned": "Coins earned",
    "away.cleanDrop": "Cleanliness drop",
    "reset.body": "This deletes your whole empire — every cabin, coin and location — and starts again from one street corner. There is no undo.",
    "loc.visitorsPerCabin": "Visitors per cabin",
    "loc.cabinSpace": "Cabin space",
    "loc.slotsWord": "slots",
    "loc.needMore": "You need 🪙 {x} more",
    "loc.cabin": "Cabin",
    "loc.emptySlot": "Empty slot",
    "clean.title": "🧼 Cleanliness",
    "clean.sparkling": "Sparkling ✨",
    "clean.clean": "Clean",
    "clean.dirty": "Getting dirty — visitors halved!",
    "clean.filthy": "Filthy — visitors stay away!",
    "clean.already": "Already sparkling ✨",
    "clean.cooldown": "Clean Now ({s}s)",
    "block.title": "🔧 Pipe blocked!",
    "block.text": "No visitors can come until you fix it.",
    "till.title": "Till at {name}",
    "till.attendantNote": "🧑‍💼 Your Attendant collects this for you",
    "up.facility": "🏠 Facility — {name}",
    "up.facilitySub": "Better facilities = visitors happily pay more per use.",
    "up.luxuryDone": "👑 Luxury — the best there is!",
    "up.water": "🚰 Water system — {name}",
    "up.waterSub": "Better water = cleanliness fades slower after every use.",
    "up.normalFade": "normal fade",
    "up.slowerFade": "{p}% slower fade",
    "up.waterDone": "✨ Auto Flush — perfect water!",
    "staff.wage": "Wage 🪙 {w}/hour, paid from this Till",
    "staff.onDuty": "On duty ✓",
    "staff.notHired": "Not hired",
    "staff.note": "Wages only come out of the Till of that location — if the Till is empty, no wage is due for that time. Your Wallet is never touched by wages.",
    "locked.text": "{name} is not open yet. Open it from the Locations tab first.",
    "prog.empire": "🏆 Your empire",
    "prog.lifetimeEarned": "Lifetime earned",
    "prog.happyVisitors": "Happy visitors",
    "prog.cabinsBuilt": "Cabins built",
    "prog.titleWord": "Title:",
    "prog.nextTitle": "· next: {name} at 🪙 {x}",
    "prog.perLocation": "📍 Per location",
    "prog.awayNote": "🌙 While you are away, your toilets keep earning for up to 3 hours. Cleanliness keeps fading too — a Cleaner on duty looks after it.",
    "prog.dialogues": "💬 Funny dialogues",
    "prog.language": "🌐 Language",
    "toast.built": "New cabin built! 🚽",
    "toast.collected": "Collected 🪙 {x}!",
    "toast.cleaned": "Sparkling clean! ✨",
    "toast.fixed": "Pipe fixed! 🚰",
    "toast.opened": "{name} is open! 🎉",
    "toast.blocked": "🔧 Pipe blocked at {name}! Fix it from the Locations tab.",
    "toast.resetDone": "Fresh start! Good luck, boss. 🚽",
    "err.coins": "Not enough coins",
    "err.locked": "Location is locked",
    "err.slots": "No free slots here",
    "err.tillEmpty": "Till is empty",
    "err.maxTier": "Already Luxury",
    "err.maxWater": "Water is already perfect",
    "err.hired": "Already hired",
    "err.cooldown": "Cleaning kit is recharging",
    "err.noBlock": "Nothing is blocked",
    "err.open": "Already open",
    "err.generic": "Not possible right now",
  },

  // Roman Urdu + English mix — for Pakistan & India players.
  // Covers all nav/buttons/section titles, the guide, the away
  // summary and all errors/toasts; anything missing falls back
  // to English automatically.
  urduMix: {
    "nav.locations": "Jagahen",
    "nav.upgrades": "Upgrades",
    "nav.staff": "Staff",
    "nav.progress": "Progress",
    "top.wallet": "Wallet",
    "top.lifetime": "Total kamai",
    "common.on": "On ✓",
    "common.off": "Off",
    "sheet.welcome": "Khush aamdeed!",
    "sheet.away": "Jab tum gayab thay 🌙",
    "sheet.reset": "Save reset karein? ⚠️",
    "btn.skip": "Chhoro",
    "btn.next": "Agay",
    "btn.startPlaying": "Khel shuru!",
    "btn.backToBusiness": "Kaam par wapas!",
    "btn.keepPlaying": "Khelte raho",
    "btn.yesReset": "Haan, reset karo",
    "btn.collect": "Jama karo",
    "btn.buildCabin": "Cabin banao",
    "btn.cleanNow": "🧹 Abhi saaf karo — free",
    "btn.fixPipe": "Pipe theek karo",
    "btn.openLocation": "Yeh jagah kholo",
    "btn.upgradeTo": "Upgrade karo: {name}",
    "btn.hire": "Rakh lo · 🪙 {cost} sirf ek dafa",
    "btn.letGo": "Chhor do",
    "btn.replayGuide": "📖 Guide dobara",
    "btn.resetSave": "🗑️ Save reset",
    "guide.1.title": "Cabin banao",
    "guide.1.text": "Ek jagah chuno aur apna pehla toilet cabin banao. Sirf 50 coins — woh tumhare paas pehle se hain!",
    "guide.2.title": "Till jama karo",
    "guide.2.text": "Log aate hain, paisay Till mein jama hote hain. Collect dabao, coins Wallet mein! Aur safai yaad rakhna — ganda toilet logon ko bhaga deta hai!",
    "guide.3.title": "Upgrade aur barho",
    "guide.3.text": "Basic (5 coins) se Luxury (100 coins) tak jao, staff rakho, nayi jaghen kholo — Bus Stand, Railway Station, hatta ke Airport!",
    "away.awayFor": "Tum gayab thay",
    "away.keptWorking": "Tumhare toilets kaam karte rahe",
    "away.maxNote": "(zyada se zyada 3 ghante)",
    "away.andWelcomed": "aur aaye",
    "away.visitorsWord": "log.",
    "away.coinsEarned": "Coins kamaye",
    "away.cleanDrop": "Safai kam hui",
    "reset.body": "Is se tumhari poori saltanat khatam ho jayegi — har cabin, har coin, har jagah — aur shuruaat ek street corner se hogi. Wapas nahi ho sakta.",
    "loc.visitorsPerCabin": "Log per cabin",
    "loc.cabinSpace": "Cabin ki jagah",
    "loc.slotsWord": "slots",
    "loc.needMore": "Tumhe 🪙 {x} aur chahiye",
    "loc.cabin": "Cabin",
    "loc.emptySlot": "Khaali jagah",
    "clean.title": "🧼 Safai",
    "clean.sparkling": "Chamak raha hai ✨",
    "clean.clean": "Saaf hai",
    "clean.dirty": "Ganda ho raha hai — log aadhe!",
    "clean.filthy": "Bohat ganda — log aa hi nahi rahe!",
    "clean.already": "Pehle se chamak raha hai ✨",
    "clean.cooldown": "Saaf karo ({s}s)",
    "block.title": "🔧 Pipe block ho gaya!",
    "block.text": "Jab tak theek na ho, koi nahi aa sakta.",
    "till.title": "Till — {name}",
    "till.attendantNote": "🧑‍💼 Attendant khud jama kar deta hai",
    "up.facility": "🏠 Facility — {name}",
    "up.facilitySub": "Behtar facility = log khushi se zyada paisay dete hain.",
    "up.luxuryDone": "👑 Luxury — sab se top!",
    "up.water": "🚰 Paani ka system — {name}",
    "up.waterSub": "Behtar paani = har use ke baad safai aahista kam hoti hai.",
    "up.normalFade": "aam safai-kami",
    "up.slowerFade": "{p}% aahista kami",
    "up.waterDone": "✨ Auto Flush — perfect paani!",
    "staff.wage": "Tankhwah 🪙 {w}/hour, isi Till se kategi",
    "staff.onDuty": "Duty par ✓",
    "staff.notHired": "Nahi rakha",
    "staff.note": "Tankhwah sirf usi jagah ke Till se kat ti hai — Till khaali ho to us waqt ki tankhwah nahi banti. Tumhare Wallet ko tankhwah kabhi nahi chhooti.",
    "locked.text": "{name} abhi nahi khula. Pehle Locations tab se isay kholo.",
    "prog.empire": "🏆 Tumhari saltanat",
    "prog.lifetimeEarned": "Total kamai",
    "prog.happyVisitors": "Khush log",
    "prog.cabinsBuilt": "Cabins bane",
    "prog.titleWord": "Title:",
    "prog.nextTitle": "· agla: {name} 🪙 {x} par",
    "prog.perLocation": "📍 Har jagah ka hisaab",
    "prog.awayNote": "🌙 Jab tum nahi hote, toilets 3 ghante tak kamate rehte hain. Safai bhi kam hoti rehti hai — duty par Cleaner ho to woh sambhal leta hai.",
    "prog.dialogues": "💬 Funny dialogues",
    "prog.language": "🌐 Zubaan",
    "toast.built": "Naya cabin ban gaya! 🚽",
    "toast.collected": "Jama ho gaye 🪙 {x}!",
    "toast.cleaned": "Full chamak! ✨",
    "toast.fixed": "Pipe theek ho gaya! 🚰",
    "toast.opened": "{name} khul gaya! 🎉",
    "toast.blocked": "🔧 {name} par pipe block! Locations tab se theek karo.",
    "toast.resetDone": "Nayi shuruaat! Best of luck, boss. 🚽",
    "err.coins": "Coins kam hain!",
    "err.locked": "Yeh jagah band hai",
    "err.slots": "Yahan jagah nahi bachi",
    "err.tillEmpty": "Till khaali hai",
    "err.maxTier": "Yeh sab se top hai",
    "err.maxWater": "Paani already perfect hai",
    "err.hired": "Pehle se rakha hua hai",
    "err.cooldown": "Safai kit abhi recharge ho rahi hai",
    "err.noBlock": "Kuch block nahi hai",
    "err.open": "Pehle se khula hai",
    "err.generic": "Abhi mumkin nahi",
  },
};

// The keys the UI uses — the verify script checks every one of
// these exists in the master `en` set.
export const UI_KEYS = Object.keys(STRINGS.en);

// The minimum every partial language set must cover itself
// (the rest may fall back to English in v1).
export const MIN_LOCALE_KEYS = [
  "nav.locations", "nav.upgrades", "nav.staff", "nav.progress",
  "btn.buildCabin", "btn.collect", "btn.cleanNow", "btn.fixPipe",
  "btn.hire", "btn.upgradeTo", "btn.openLocation",
  "btn.skip", "btn.next", "btn.startPlaying",
  "clean.title", "up.facility", "up.water", "till.title",
  "prog.empire", "prog.perLocation",
  "guide.1.title", "guide.1.text", "guide.2.title", "guide.2.text",
  "guide.3.title", "guide.3.text",
  "away.awayFor", "away.keptWorking", "away.coinsEarned", "away.cleanDrop",
  "sheet.welcome", "sheet.away",
];

// Look up a string in the active language, falling back to
// English, then to the key itself. {name}-style placeholders
// are filled from `params`.
export function getString(lang, key, params) {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

// ── Dialogue lines, per language, grouped by trigger ────────────
// Same writing rules in every language: short, kind, and the
// joke is always the SHINE — never anything gross.
export const DIALOGUE_LINES = {
  en: {
    happy: [
      "Full shining! Mirror jaisa saaf!",
      "5 rupay mein 5-star feeling!",
      "Itna saaf? Photo kheench loon?",
      "Mummy ko bataunga — ghar se saaf hai!",
      "Sparkle dekh ke dil khush ho gaya!",
      "Yahan toh khana kha sakte hain… almost!",
    ],
    dirty: [
      "Oye hoye… saans rok ke gaya!",
      "Bhai, safai wale ko bulao!",
      "Jaldi niklo, train pakadni hai!",
      "Next time mask pehen ke aaunga!",
      "Paani bhi thanda, himmat bhi thandi…",
      "Yeh wala visit yaad rahega!",
    ],
    luxury: [
      "5-star hotel jaisa! Wah!",
      "AC, khushboo, shine — full luxury!",
      "Itna royal? Shaadi yahin kar lein?",
      "100 rupay? Bilkul worth it, boss!",
      "Lagta hai airport aa gaya!",
      "Sheeshe mein khud ko dekh liya!",
    ],
    blocked: [
      "Arre, band hai? Emergency hai bhai!",
      "Pipe ne dhokha de diya!",
      "Line yahan, raasta wahan!",
      "Jaldi theek karo, warna…",
      "Aaj toh had ho gayi!",
    ],
    collect: [
      "Sir, aaj ki kamai full tight hai!",
      "Till full, dil full!",
      "Paiso ki baarish ho rahi hai!",
      "Ginti gin ke thak gaya, sir!",
      "Aaj toh party pakki!",
    ],
    attendant: [
      "Sab line mein, sab discipline mein!",
      "Token ready hai, tension nahi!",
      "Aaj rush full power hai, sir!",
      "Safai bhi top, kamai bhi top!",
    ],
    cleaner: [
      "Jhaadu ready, shine ready!",
      "Ek boond bhi nahi bachegi!",
      "Safai mera style hai!",
      "Chamka diya na, dekho!",
    ],
    build: [
      "Pehla cabin, pehla kadam!",
      "Shuruaat ho gayi, boss!",
      "Ab toh line lagegi!",
      "Sapna sach hone laga!",
    ],
    unlock: [
      "Nayi jagah, nayi kamai!",
      "Sheher hamara hone wala hai!",
      "Agla adda — hum aa gaye!",
      "Business badh raha hai, wah!",
    ],
  },

  // Roman Urdu + English mix — every line has its mixed version.
  urduMix: {
    happy: [
      "Full shining! Aaina jaisa saaf!",
      "5 rupay mein 5-star feeling!",
      "Itna saaf? Ek photo toh banti hai!",
      "Ammi ko bataunga — ghar se zyada saaf!",
      "Chamak dekh ke dil khush ho gaya!",
      "Yahan toh khana kha sakte hain… almost!",
    ],
    dirty: [
      "Oye hoye… saans rok ke gaya!",
      "Bhai, safai wale ko jaldi bulao!",
      "Jaldi niklo, train pakadni hai!",
      "Agli dafa mask pehen ke aaunga!",
      "Paani bhi thanda, himmat bhi thandi…",
      "Yeh visit toh yaad rahega!",
    ],
    luxury: [
      "5-star hotel jaisa! Wah bhai wah!",
      "AC, khushboo, shine — full luxury!",
      "Itna royal? Shaadi yahin kar lein?",
      "100 rupay? Bilkul worth hai, boss!",
      "Lagta hai airport aa gaya!",
      "Sheeshe mein khud ko dekh liya!",
    ],
    blocked: [
      "Arre, band hai? Emergency hai bhai!",
      "Pipe ne dhokha de diya!",
      "Line yahan lagi hai, raasta wahan!",
      "Jaldi theek karo, warna…",
      "Aaj toh had hi ho gayi!",
    ],
    collect: [
      "Sir, aaj ki kamai full tight hai!",
      "Till full, dil full!",
      "Paiso ki baarish ho rahi hai!",
      "Ginti gin gin ke thak gaya, sir!",
      "Aaj toh party pakki!",
    ],
    attendant: [
      "Sab line mein, sab discipline mein!",
      "Token ready hai, tension nahi lene ka!",
      "Aaj rush full power hai, sir!",
      "Safai bhi top, kamai bhi top!",
    ],
    cleaner: [
      "Jhaadu ready, shine ready!",
      "Ek boond bhi nahi bachegi!",
      "Safai mera style hai!",
      "Chamka diya na, dekho!",
    ],
    build: [
      "Pehla cabin, pehla kadam!",
      "Shuruaat ho gayi, boss!",
      "Ab toh line lagegi!",
      "Sapna sach hone laga!",
    ],
    unlock: [
      "Nayi jagah, nayi kamai!",
      "Sheher hamara hone wala hai!",
      "Agla adda — hum aa gaye!",
      "Business badh raha hai, wah!",
    ],
  },
};
