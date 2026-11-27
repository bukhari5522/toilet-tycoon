"use client";

import { useEffect, useRef, useState } from "react";
import {
  FACILITY_TIERS,
  GAME_NAME,
  LOCATIONS,
  SAVE_KEY,
  STAFF,
  TITLES,
  WATER_LEVELS,
  locationById,
} from "@/lib/game/config";
import {
  blockFixCost,
  buildCabin,
  cabinCost,
  cleanNow,
  collect,
  createGame,
  deserialize,
  fireStaff,
  fixBlock,
  hireStaff,
  nextTitle,
  ratePerUse,
  serialize,
  settle,
  staffHireCost,
  staffWagePerHour,
  tierUpgradeCost,
  titleFor,
  unlockLocation,
  upgradeTier,
  upgradeWater,
  visitorFactor,
  waterUpgradeCost,
} from "@/lib/game/engine";
import { fmt, fmtDuration } from "@/lib/game/format";
import { createDialoguePicker } from "@/lib/game/dialogues";
import { LANGS, detectLang, getString } from "@/lib/game/i18n";

// Engine action errors (English source strings) → i18n keys.
const ERR_KEYS = {
  "Not enough coins": "err.coins",
  "Location is locked": "err.locked",
  "No free slots here": "err.slots",
  "Till is empty": "err.tillEmpty",
  "Already Luxury": "err.maxTier",
  "Water is already perfect": "err.maxWater",
  "Already hired": "err.hired",
  "Cleaning kit is recharging": "err.cooldown",
  "Nothing is blocked": "err.noBlock",
  "Already open": "err.open",
};

const TABS = [
  { id: "locations", emoji: "🚽", key: "nav.locations" },
  { id: "upgrades", emoji: "⬆️", key: "nav.upgrades" },
  { id: "staff", emoji: "👥", key: "nav.staff" },
  { id: "progress", emoji: "📊", key: "nav.progress" },
];

// The 3 guide cards — text lives in i18n (guide.1/2/3).
const GUIDE = [
  { emoji: "🚽", titleKey: "guide.1.title", textKey: "guide.1.text" },
  { emoji: "🪙", titleKey: "guide.2.title", textKey: "guide.2.text" },
  { emoji: "👑", titleKey: "guide.3.title", textKey: "guide.3.text" },
];

function cleanColor(v) {
  if (v >= 40) return "bg-emerald-500";
  if (v >= 20) return "bg-amber-400";
  return "bg-red-500";
}

function cleanLabelKey(v) {
  if (v >= 80) return "clean.sparkling";
  if (v >= 40) return "clean.clean";
  if (v >= 20) return "clean.dirty";
  return "clean.filthy";
}

export default function Game() {
  const [game, setGame] = useState(null);
  const [tab, setTab] = useState("locations");
  const [locId, setLocId] = useState(LOCATIONS[0].id);
  const [guideStep, setGuideStep] = useState(null);
  const [away, setAway] = useState(null);
  const [sheet, setSheet] = useState(null); // "reset" | null
  const [toast, setToast] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [nowMs, setNowMs] = useState(0);
  const gameRef = useRef(null);
  const toastTimer = useRef(null);
  const pickerRef = useRef(null);
  const bubbleTimer = useRef(null);
  const lastBubbleAt = useRef(0);
  const locIdRef = useRef(locId);
  const modalOpenRef = useRef(false);
  const langRef = useRef("en");

  useEffect(() => {
    gameRef.current = game;
    if (game?.lang) langRef.current = game.lang;
  }, [game]);

  useEffect(() => {
    locIdRef.current = locId;
  }, [locId]);

  useEffect(() => {
    modalOpenRef.current = guideStep !== null || away !== null || sheet !== null;
  }, [guideStep, away, sheet]);

  useEffect(() => {
    if (!pickerRef.current) pickerRef.current = createDialoguePicker();
  }, []);

  // Show a short dialogue bubble. Throttled: at most one ambient
  // bubble every ~9s; event bubbles (collect/build/unlock) may
  // fire immediately but also reset the throttle. Never while a
  // modal/sheet is open, never before the first cabin exists.
  const showBubble = (trigger, force = false) => {
    const g = gameRef.current;
    if (!g || g.dialoguesOn === false) return;
    if (modalOpenRef.current) return;
    const totalCabins = LOCATIONS.reduce((a, l) => a + g.locations[l.id].cabins, 0);
    if (totalCabins <= 0) return;
    const now = Date.now();
    if (!force && now - lastBubbleAt.current < 9000) return;
    if (!pickerRef.current) pickerRef.current = createDialoguePicker();
    const line = pickerRef.current.next(trigger, langRef.current);
    if (!line) return;
    lastBubbleAt.current = now;
    setBubble(line);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3600);
  };

  const showToast = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // ── Load + first settle (offline earnings, capped at 3h) ──
  // Runs once just after mount (deferred a tick so the splash
  // paints first and state loads in one clean step).
  useEffect(() => {
    const kickoff = setTimeout(() => {
      let initial = null;
      let storedLang = null;
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (raw) {
          initial = deserialize(raw);
          storedLang = JSON.parse(raw)?.lang ?? null;
        }
      } catch {
        initial = null;
      }
      if (!initial) initial = createGame(Date.now());
      // First run (or an older save): the language follows the
      // device — Urdu/Hindi devices start in Urdu + English.
      if (!storedLang) {
        initial = { ...initial, lang: detectLang(window.navigator?.language) };
      }
      const { state, report } = settle(initial, Date.now());
      setNowMs(Date.now());
      setGame(state);
      if (
        report.awayMs > 60 * 1000 &&
        (report.tillGained > 0 || report.earned > 0 || report.cleanlinessDrop > 1)
      ) {
        setAway(report);
      }
      if (!state.guideSeen) setGuideStep(0);
    }, 0);
    return () => clearTimeout(kickoff);
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (!game) return;
    try {
      window.localStorage.setItem(SAVE_KEY, serialize(game));
    } catch {
      /* storage full/blocked — the game keeps running in memory */
    }
  }, [game]);

  // ── Live tick: settle 1s at a time ──
  useEffect(() => {
    const id = setInterval(() => {
      const cur = gameRef.current;
      if (!cur) return;
      const { state, report } = settle(cur, Date.now());
      setNowMs(Date.now());
      if (report.newBlock) {
        const name = locationById(report.newBlock).name;
        showToast(getString(langRef.current, "toast.blocked", { name }));
        showBubble("blocked", true);
      }
      setGame(state);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Ambient chatter: a visitor or staff line every so often,
  // picked from what the selected location looks like right now ──
  useEffect(() => {
    const id = setInterval(() => {
      const g = gameRef.current;
      if (!g) return;
      const st = g.locations[locIdRef.current];
      if (!st || !st.unlocked || st.cabins <= 0) return;
      let trigger = "happy";
      if (st.blocked) trigger = "blocked";
      else if (st.cleanliness < 30) trigger = "dirty";
      else if ((st.attendant || st.cleaner) && Math.random() < 0.3) {
        trigger = st.attendant && st.cleaner ? (Math.random() < 0.5 ? "attendant" : "cleaner") : st.attendant ? "attendant" : "cleaner";
      } else if (st.tier >= 3) trigger = "luxury";
      showBubble(trigger);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  if (!game) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] items-center justify-center">
        <p className="text-4xl">🚽✨</p>
      </main>
    );
  }

  const lang = game.lang || "en";
  const t = (key, params) => getString(lang, key, params);

  const act = (fn, after) => {
    const cur = gameRef.current;
    if (!cur) return;
    const r = fn(cur);
    if (r.ok) {
      setGame(r.state);
      if (after) after(r);
    } else {
      showToast(getString(langRef.current, ERR_KEYS[r.error] || "err.generic"));
    }
  };

  const finishGuide = () => {
    setGuideStep(null);
    setGame((g) => (g ? { ...g, guideSeen: true } : g));
  };

  const resetSave = () => {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    const fresh = {
      ...createGame(Date.now()),
      lang: gameRef.current?.lang || detectLang(window.navigator?.language),
    };
    setGame(fresh);
    setSheet(null);
    setLocId(LOCATIONS[0].id);
    setTab("locations");
    setGuideStep(0);
    showToast(getString(langRef.current, "toast.resetDone"));
  };

  const loc = game.locations[locId];
  const cfg = locationById(locId);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] pb-28">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 border-b border-sky-900/10 bg-[#eef9ff]/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-sky-950">
              🚽 {GAME_NAME}
            </p>
            <p className="truncate text-xs font-medium text-sky-700">
              {titleFor(game.lifetime)} · {t("top.lifetime")} 🪙 {fmt(game.lifetime)}
            </p>
          </div>
          <div className="tt-pop shrink-0 rounded-2xl bg-amber-400 px-3 py-1.5 text-right shadow-sm" key={Math.floor(game.wallet)}>
            <p className="text-base leading-tight font-extrabold text-amber-950">
              🪙 {fmt(game.wallet)}
            </p>
            <p className="text-[11px] leading-tight font-semibold text-amber-800">{t("top.wallet")}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-3">
        {tab === "locations" && (
          <LocationsTab
            game={game}
            locId={locId}
            setLocId={setLocId}
            nowMs={nowMs}
            act={act}
            showToast={showToast}
            bubble={showBubble}
            t={t}
          />
        )}
        {tab === "upgrades" && (
          <UpgradesTab game={game} locId={locId} setLocId={setLocId} act={act} t={t} />
        )}
        {tab === "staff" && (
          <StaffTab game={game} locId={locId} setLocId={setLocId} act={act} t={t} />
        )}
        {tab === "progress" && (
          <ProgressTab
            game={game}
            t={t}
            onReset={() => setSheet("reset")}
            onReplayGuide={() => setGuideStep(0)}
            onToggleDialogues={() =>
              setGame((g) => (g ? { ...g, dialoguesOn: g.dialoguesOn === false } : g))
            }
            onSetLang={(id) => setGame((g) => (g ? { ...g, lang: id } : g))}
          />
        )}
      </div>

      {/* ── Bottom navigation ── */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-sky-900/10 bg-white/97 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(23,48,66,0.08)]">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-bold ${
                tab === t.id ? "text-sky-700" : "text-stone-400"
              }`}
              aria-pressed={tab === t.id}
            >
              <span className={`text-xl leading-none ${tab === t.id ? "tt-bob" : ""}`}>{t.emoji}</span>
              {getString(lang, t.key)}
              <span className={`h-1 w-8 rounded-full ${tab === t.id ? "bg-sky-500" : "bg-transparent"}`} />
            </button>
          ))}
        </div>
      </nav>

      {/* ── Dialogue bubble (slim strip above the bottom nav) ── */}
      {bubble && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[136px] z-40 mx-auto flex w-full max-w-[440px] justify-center px-4">
          <p className="tt-rise rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm font-bold text-sky-950 shadow-lg ring-1 ring-sky-100">
            💬 {bubble}
          </p>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto w-full max-w-[440px] px-4">
          <p className="tt-rise rounded-xl bg-sky-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
            {toast}
          </p>
        </div>
      )}

      {/* ── First-run guide (3 short cards, skippable) ── */}
      {guideStep !== null && (
        <BottomSheet onClose={finishGuide} title={`${t("sheet.welcome")} ${GUIDE[guideStep].emoji}`}>
          <p className="text-5xl">{GUIDE[guideStep].emoji}</p>
          <h3 className="mt-2 text-lg font-extrabold text-sky-950">{t(GUIDE[guideStep].titleKey)}</h3>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">{t(GUIDE[guideStep].textKey)}</p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {GUIDE.map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i === guideStep ? "bg-sky-500" : "bg-stone-300"}`} />
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={finishGuide}
              className="min-h-11 flex-1 rounded-xl border border-stone-300 px-4 font-semibold text-stone-600"
            >
              {t("btn.skip")}
            </button>
            <button
              onClick={() => (guideStep < GUIDE.length - 1 ? setGuideStep(guideStep + 1) : finishGuide())}
              className="min-h-11 flex-1 rounded-xl bg-sky-600 px-4 font-bold text-white"
            >
              {guideStep < GUIDE.length - 1 ? t("btn.next") : t("btn.startPlaying")}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── While you were away ── */}
      {away && (
        <BottomSheet onClose={() => setAway(null)} title={t("sheet.away")}>
          <p className="text-sm leading-relaxed text-stone-600">
            {t("away.awayFor")} <b>{fmtDuration(away.awayMs)}</b>. {t("away.keptWorking")}{" "}
            <b>{fmtDuration(away.countedMs)}</b>
            {away.capped ? ` ${t("away.maxNote")}` : ""} {t("away.andWelcomed")}{" "}
            <b>{fmt(away.visitors)}</b> {t("away.visitorsWord")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-lg font-extrabold text-amber-900">🪙 {fmt(away.tillGained + away.earned)}</p>
              <p className="text-xs font-medium text-amber-700">{t("away.coinsEarned")}</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3 text-center">
              <p className="text-lg font-extrabold text-sky-900">🧼 −{Math.round(away.cleanlinessDrop)}%</p>
              <p className="text-xs font-medium text-sky-700">{t("away.cleanDrop")}</p>
            </div>
          </div>
          <button
            onClick={() => setAway(null)}
            className="mt-4 min-h-11 w-full rounded-xl bg-sky-600 px-4 font-bold text-white"
          >
            {t("btn.backToBusiness")}
          </button>
        </BottomSheet>
      )}

      {/* ── Reset confirm ── */}
      {sheet === "reset" && (
        <BottomSheet onClose={() => setSheet(null)} title={t("sheet.reset")}>
          <p className="text-sm leading-relaxed text-stone-600">{t("reset.body")}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setSheet(null)}
              className="min-h-11 flex-1 rounded-xl border border-stone-300 px-4 font-semibold text-stone-600"
            >
              {t("btn.keepPlaying")}
            </button>
            <button
              onClick={resetSave}
              className="min-h-11 flex-1 rounded-xl bg-red-500 px-4 font-bold text-white"
            >
              {t("btn.yesReset")}
            </button>
          </div>
        </BottomSheet>
      )}
    </main>
  );
}

// ── Bottom sheet with a STICKY, always-visible ✕ (hard rule) ────
function BottomSheet({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" onClick={onClose}>
      <div
        className="tt-rise max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-white px-5 pt-3 pb-1">
          <p className="text-sm font-extrabold tracking-wide text-sky-950 uppercase">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-stone-200 text-base font-bold text-stone-700"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-1 pb-6 text-center">{children}</div>
      </div>
    </div>
  );
}

// ── Location picker (shared by Locations / Upgrades / Staff) ────
function LocationPicker({ game, locId, setLocId }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LOCATIONS.map((l) => {
        const st = game.locations[l.id];
        const active = l.id === locId;
        return (
          <button
            key={l.id}
            onClick={() => setLocId(l.id)}
            className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-bold ${
              active
                ? "bg-sky-600 text-white shadow"
                : st.unlocked
                  ? "bg-white text-sky-900 ring-1 ring-sky-200"
                  : "bg-stone-100 text-stone-400 ring-1 ring-stone-200"
            }`}
          >
            {l.emoji} {l.name}
            {st.blocked ? " 🔧" : ""}
          </button>
        );
      })}
    </div>
  );
}

// ── Locations tab ────────────────────────────────────────────────
function LocationsTab({ game, locId, setLocId, nowMs, act, showToast, bubble, t }) {
  const cfg = locationById(locId);
  const loc = game.locations[locId];

  if (!loc.unlocked) {
    return (
      <section>
        <LocationPicker game={game} locId={locId} setLocId={setLocId} />
        <div className="mt-3 rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-sky-100">
          <p className="text-5xl">{cfg.emoji}</p>
          <h2 className="mt-2 text-lg font-extrabold text-sky-950">{cfg.name}</h2>
          <p className="mt-1 text-sm text-stone-500">{cfg.tagline}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-sky-50 p-2.5">
              <p className="font-extrabold text-sky-900">{cfg.visitorsPerMin}/min</p>
              <p className="text-xs text-sky-700">{t("loc.visitorsPerCabin")}</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-2.5">
              <p className="font-extrabold text-sky-900">{cfg.slots} {t("loc.slotsWord")}</p>
              <p className="text-xs text-sky-700">{t("loc.cabinSpace")}</p>
            </div>
          </div>
          <button
            onClick={() =>
              act((s) => unlockLocation(s, locId), () => {
                showToast(t("toast.opened", { name: cfg.name }));
                bubble("unlock", true);
              })
            }
            disabled={game.wallet < cfg.unlockCost}
            className="mt-4 min-h-12 w-full rounded-xl bg-sky-600 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {t("btn.openLocation")} · 🪙 {fmt(cfg.unlockCost)}
          </button>
          {game.wallet < cfg.unlockCost && (
            <p className="mt-2 text-xs font-medium text-stone-400">
              {t("loc.needMore", { x: fmt(cfg.unlockCost - game.wallet) })}
            </p>
          )}
        </div>
      </section>
    );
  }

  const rate = ratePerUse(game, locId);
  const factor = visitorFactor(loc.cleanliness);
  const visitorsPerMin = cfg.visitorsPerMin * loc.cabins * factor;
  const cleanWait = Math.max(0, Math.ceil((loc.cleanReadyAt - nowMs) / 1000));
  const nextCabinCost = cabinCost(game, locId);

  return (
    <section>
      <LocationPicker game={game} locId={locId} setLocId={setLocId} />

      {/* Location header */}
      <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg leading-tight font-extrabold text-sky-950">
              {cfg.emoji} {cfg.name}
            </h2>
            <p className="text-xs font-medium text-stone-500">{cfg.tagline}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">
              {FACILITY_TIERS[loc.tier].emoji} {FACILITY_TIERS[loc.tier].name} · 🪙{rate}{t("common.perUse")}
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
              {WATER_LEVELS[loc.water].emoji} {WATER_LEVELS[loc.water].name}
            </span>
          </div>
        </div>

        {/* Cleanliness meter */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-sky-950">{t("clean.title")}</span>
            <span className={loc.cleanliness >= 40 ? "text-emerald-600" : loc.cleanliness >= 20 ? "text-amber-600" : "text-red-500"}>
              {Math.round(loc.cleanliness)}% · {t(cleanLabelKey(loc.cleanliness))}
            </span>
          </div>
          <div className="relative mt-1 h-3.5 overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cleanColor(loc.cleanliness)}`}
              style={{ width: `${loc.cleanliness}%` }}
            />
            {loc.cleanliness >= 80 && <div className="tt-shine absolute inset-0 bg-white" />}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => act((s) => cleanNow(s, locId, Date.now()), () => showToast(t("toast.cleaned")))}
              disabled={cleanWait > 0 || loc.cleanliness >= 100}
              className="min-h-11 flex-1 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {loc.cleanliness >= 100 ? t("clean.already") : cleanWait > 0 ? t("clean.cooldown", { s: cleanWait }) : t("btn.cleanNow")}
            </button>
            <p className="w-28 text-right text-xs font-semibold text-stone-500">
              👥 {visitorsPerMin.toFixed(1)}/min
              <br />≈ 🪙 {fmt(visitorsPerMin * rate)}/min
            </p>
          </div>
        </div>

        {/* Pipe blocked banner */}
        {loc.blocked && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 ring-1 ring-red-200">
            <p className="text-sm font-extrabold text-red-700">{t("block.title")}</p>
            <p className="text-xs font-medium text-red-500">{t("block.text")}</p>
            <button
              onClick={() => act((s) => fixBlock(s, locId), () => showToast(t("toast.fixed")))}
              disabled={game.wallet < blockFixCost(locId)}
              className="mt-2 min-h-11 w-full rounded-xl bg-red-500 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {t("btn.fixPipe")} · 🪙 {fmt(blockFixCost(locId))}
            </button>
          </div>
        )}
      </div>

      {/* Cabin grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {Array.from({ length: cfg.slots }).map((_, i) =>
          i < loc.cabins ? (
            <div
              key={i}
              className="tt-bob flex min-h-24 flex-col items-center justify-center rounded-2xl bg-white p-2 text-center shadow-sm ring-1 ring-sky-100"
              style={{ animationDelay: `${(i % 4) * 0.35}s` }}
            >
              <span className="text-3xl">🚽</span>
              <span className="mt-1 text-xs font-bold text-sky-900">{t("loc.cabin")} {i + 1}</span>
              <span className="text-[11px] font-medium text-stone-400">
                {FACILITY_TIERS[loc.tier].emoji} 🪙{rate}{t("common.perUse")}
              </span>
            </div>
          ) : i === loc.cabins ? (
            <button
              key={i}
              onClick={() =>
                act((s) => buildCabin(s, locId), (r) => {
                  showToast(t("toast.built"));
                  const total = LOCATIONS.reduce((a, l) => a + r.state.locations[l.id].cabins, 0);
                  if (total === 1) bubble("build", true);
                })
              }
              disabled={game.wallet < nextCabinCost}
              className="flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 p-2 text-center disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50"
            >
              <span className="text-2xl">🔨</span>
              <span className="mt-1 text-xs font-extrabold text-sky-800">{t("btn.buildCabin")}</span>
              <span className="text-[11px] font-bold text-sky-600">🪙 {fmt(nextCabinCost)}</span>
            </button>
          ) : (
            <div
              key={i}
              className="flex min-h-24 flex-col items-center justify-center rounded-2xl bg-stone-100/70 p-2 text-center"
            >
              <span className="text-2xl opacity-30">🚽</span>
              <span className="mt-1 text-[11px] font-semibold text-stone-400">{t("loc.emptySlot")}</span>
            </div>
          ),
        )}
      </div>

      {/* Till */}
      <div className="mt-3 rounded-3xl bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">{t("till.title", { name: cfg.name })}</p>
            <p className="text-2xl font-extrabold text-amber-950">🪙 {fmt(loc.till)}</p>
            {loc.attendant && <p className="text-xs font-semibold text-amber-700">{t("till.attendantNote")}</p>}
          </div>
          <button
            onClick={() =>
              act((s) => collect(s, locId), (r) => {
                showToast(t("toast.collected", { x: fmt(r.amount) }));
                bubble(loc.attendant ? "attendant" : "collect", true);
              })
            }
            disabled={loc.till < 1}
            className="min-h-12 shrink-0 rounded-xl bg-amber-400 px-5 font-extrabold text-amber-950 shadow-sm disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          >
            {t("btn.collect")}
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Upgrades tab ─────────────────────────────────────────────────
function UpgradesTab({ game, locId, setLocId, act, t: tr }) {
  const cfg = locationById(locId);
  const loc = game.locations[locId];
  const tCost = tierUpgradeCost(game, locId);
  const wCost = waterUpgradeCost(game, locId);

  return (
    <section>
      <LocationPicker game={game} locId={locId} setLocId={setLocId} />
      {!loc.unlocked ? (
        <LockedNote name={cfg.name} t={tr} />
      ) : (
        <>
          {/* Facility tier */}
          <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
            <h3 className="font-extrabold text-sky-950">{tr("up.facility", { name: cfg.name })}</h3>
            <p className="text-xs font-medium text-stone-500">{tr("up.facilitySub")}</p>
            <div className="mt-3 space-y-1.5">
              {FACILITY_TIERS.map((t, i) => (
                <div
                  key={t.name}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
                    i === loc.tier
                      ? "bg-violet-100 text-violet-900 ring-1 ring-violet-300"
                      : i < loc.tier
                        ? "bg-stone-50 text-stone-400"
                        : "bg-stone-50 text-stone-500"
                  }`}
                >
                  <span>{t.emoji} {t.name}</span>
                  <span>🪙 {t.rate}{tr("common.perUse")} {i === loc.tier ? tr("common.yours") : ""}</span>
                </div>
              ))}
            </div>
            {tCost !== null ? (
              <button
                onClick={() => act((s) => upgradeTier(s, locId))}
                disabled={game.wallet < tCost}
                className="mt-3 min-h-12 w-full rounded-xl bg-violet-600 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {tr("btn.upgradeTo", { name: FACILITY_TIERS[loc.tier + 1].name })} · 🪙 {fmt(tCost)}
              </button>
            ) : (
              <p className="mt-3 text-center text-sm font-extrabold text-violet-700">{tr("up.luxuryDone")}</p>
            )}
          </div>

          {/* Water track */}
          <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
            <h3 className="font-extrabold text-sky-950">{tr("up.water", { name: cfg.name })}</h3>
            <p className="text-xs font-medium text-stone-500">{tr("up.waterSub")}</p>
            <div className="mt-3 space-y-1.5">
              {WATER_LEVELS.map((w, i) => (
                <div
                  key={w.name}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
                    i === loc.water
                      ? "bg-sky-100 text-sky-900 ring-1 ring-sky-300"
                      : "bg-stone-50 text-stone-500"
                  }`}
                >
                  <span>{w.emoji} {w.name}</span>
                  <span className="text-xs">
                    {w.decayMultiplier === 1 ? tr("up.normalFade") : tr("up.slowerFade", { p: Math.round((1 - w.decayMultiplier) * 100) })}
                    {i === loc.water ? ` ${tr("common.yours")}` : ""}
                  </span>
                </div>
              ))}
            </div>
            {wCost !== null ? (
              <button
                onClick={() => act((s) => upgradeWater(s, locId))}
                disabled={game.wallet < wCost}
                className="mt-3 min-h-12 w-full rounded-xl bg-sky-600 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {tr("btn.upgradeTo", { name: WATER_LEVELS[loc.water + 1].name })} · 🪙 {fmt(wCost)}
              </button>
            ) : (
              <p className="mt-3 text-center text-sm font-extrabold text-sky-700">{tr("up.waterDone")}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ── Staff tab ────────────────────────────────────────────────────
function StaffTab({ game, locId, setLocId, act, t }) {
  const cfg = locationById(locId);
  const loc = game.locations[locId];

  return (
    <section>
      <LocationPicker game={game} locId={locId} setLocId={setLocId} />
      {!loc.unlocked ? (
        <LockedNote name={cfg.name} t={t} />
      ) : (
        <div className="mt-3 space-y-3">
          {Object.entries(STAFF).map(([kind, s]) => {
            const hired = loc[kind];
            const hire = staffHireCost(locId, kind);
            const wage = staffWagePerHour(locId, kind);
            return (
              <div key={kind} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sky-950">{s.emoji} {s.name} — {cfg.name}</h3>
                    <p className="mt-0.5 text-xs font-medium text-stone-500">{s.blurb}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {t("staff.wage", { w: fmt(wage) })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${hired ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                    {hired ? t("staff.onDuty") : t("staff.notHired")}
                  </span>
                </div>
                {hired ? (
                  <button
                    onClick={() => act((st) => fireStaff(st, locId, kind))}
                    className="mt-3 min-h-11 w-full rounded-xl border border-stone-300 px-4 font-semibold text-stone-600"
                  >
                    {t("btn.letGo")}
                  </button>
                ) : (
                  <button
                    onClick={() => act((st) => hireStaff(st, locId, kind))}
                    disabled={game.wallet < hire}
                    className="mt-3 min-h-11 w-full rounded-xl bg-emerald-500 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {t("btn.hire", { cost: fmt(hire) })}
                  </button>
                )}
              </div>
            );
          })}
          <p className="px-1 text-xs leading-relaxed font-medium text-stone-400">
            {t("staff.note")}
          </p>
        </div>
      )}
    </section>
  );
}

function LockedNote({ name, t }) {
  return (
    <div className="mt-3 rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-sky-100">
      <p className="text-4xl">🔒</p>
      <p className="mt-2 text-sm font-semibold text-stone-500">{t("locked.text", { name })}</p>
    </div>
  );
}

// ── Progress tab ─────────────────────────────────────────────────
function ProgressTab({ game, onReset, onReplayGuide, onToggleDialogues, onSetLang, t: tr }) {
  const next = nextTitle(game.lifetime);
  const current = titleFor(game.lifetime);

  return (
    <section className="space-y-3">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h3 className="font-extrabold text-sky-950">{tr("prog.empire")}</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <p className="font-extrabold text-amber-900">🪙 {fmt(game.lifetime)}</p>
            <p className="text-[11px] font-medium text-amber-700">{tr("prog.lifetimeEarned")}</p>
          </div>
          <div className="rounded-xl bg-sky-50 p-2.5">
            <p className="font-extrabold text-sky-900">{fmt(game.totalVisitors)}</p>
            <p className="text-[11px] font-medium text-sky-700">{tr("prog.happyVisitors")}</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-2.5">
            <p className="font-extrabold text-violet-900">
              {LOCATIONS.reduce((a, l) => a + game.locations[l.id].cabins, 0)}
            </p>
            <p className="text-[11px] font-medium text-violet-700">{tr("prog.cabinsBuilt")}</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-sky-950">
          {tr("prog.titleWord")} {current}
          {next && <span className="font-medium text-stone-500"> {tr("prog.nextTitle", { name: next.name, x: fmt(next.at) })}</span>}
        </p>
        <div className="mt-2 space-y-1">
          {TITLES.map((t) => (
            <div
              key={t.name}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                t.name === current ? "bg-amber-100 text-amber-900" : game.lifetime >= t.at ? "text-stone-500" : "text-stone-300"
              }`}
            >
              <span>{game.lifetime >= t.at ? "✓" : "🔒"} {t.name}</span>
              <span>🪙 {fmt(t.at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h3 className="font-extrabold text-sky-950">{tr("prog.perLocation")}</h3>
        <div className="mt-2 space-y-1.5">
          {LOCATIONS.filter((l) => game.locations[l.id].unlocked).map((l) => {
            const st = game.locations[l.id];
            return (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-600">
                <span>{l.emoji} {l.name} · 🚽 ×{st.cabins}</span>
                <span>🪙 {fmt(st.totalEarned)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed font-medium text-stone-400">
          {tr("prog.awayNote")}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <h3 className="font-extrabold text-sky-950">{tr("prog.language")}</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => onSetLang(l.id)}
              aria-pressed={(game.lang || "en") === l.id}
              className={`min-h-11 rounded-xl px-3 font-bold ${
                (game.lang || "en") === l.id
                  ? "bg-sky-600 text-white"
                  : "bg-stone-50 text-stone-500 ring-1 ring-stone-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onToggleDialogues}
        className="flex min-h-11 w-full items-center justify-between rounded-xl bg-white px-4 font-bold text-sky-800 ring-1 ring-sky-200"
        aria-pressed={game.dialoguesOn !== false}
      >
        <span>{tr("prog.dialogues")}</span>
        <span className={game.dialoguesOn !== false ? "text-emerald-600" : "text-stone-400"}>
          {game.dialoguesOn !== false ? tr("common.on") : tr("common.off")}
        </span>
      </button>

      <div className="flex gap-2">
        <button
          onClick={onReplayGuide}
          className="min-h-11 flex-1 rounded-xl bg-white px-4 font-bold text-sky-800 ring-1 ring-sky-200"
        >
          {tr("btn.replayGuide")}
        </button>
        <button
          onClick={onReset}
          className="min-h-11 flex-1 rounded-xl bg-white px-4 font-bold text-red-500 ring-1 ring-red-200"
        >
          {tr("btn.resetSave")}
        </button>
      </div>
    </section>
  );
}
