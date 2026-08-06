import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG, GOLD, XGREEN } from "@/lib/theme-context";
import { getGameConfig } from "@/lib/api";
import { GAME_NAMES } from "@/lib/game-i18n";
import { useU } from "@/lib/ui-i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import SoundToggle from "@/components/SoundToggle";
import Odometer from "@/components/casino/Odometer";
import { Wallet, Banknote, Gift, Ticket, Home as HomeIcon, History, MessageCircle, BookOpen, Trophy, Swords } from "lucide-react";

const BASE = "/api";

async function claimDailyBonus(telegramId: string) {
  const res = await fetch(`${BASE}/players/${telegramId}/daily-bonus`, { method: "POST" });
  return res.json();
}
async function redeemPromo(telegramId: string, code: string) {
  const res = await fetch(`${BASE}/promo/redeem`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, code }),
  });
  return res.json();
}


import { NEW_GAMES, NEW_GAME_MAP, coverOf } from "@/lib/new-games";
import GameArt from "@/components/casino/GameArt";
import SmartImage from "@/components/SmartImage";

const GAMES = [
  { key: "apple",       path: "/apple",       img: "/games/apple.jpg",       tag: "HOT",   tagColor: "#ef4444", bg: "linear-gradient(145deg,#064e3b,#1a7d43)", glow: "#1a7d4355" },
  { key: "dice",        path: "/dice",        img: "/games/dice.jpg",        tag: "x5.8",  tagColor: "#f59e0b", bg: "linear-gradient(145deg,#78350f,#d97706)", glow: "#d9770655" },
  { key: "aviator",     path: "/aviator",     img: "/games/aviator.jpg",     tag: "∞x",    tagColor: "#5aa2f0", bg: "linear-gradient(145deg,#0b1a2b,#0d4fb0)", glow: "#0d4fb055" },
  { key: "spin",        path: "/spin",        img: "/games/spin.jpg",        tag: "FREE",  tagColor: "#34d399", bg: "linear-gradient(145deg,#0d4fb0,#1668e3)", glow: "#1668e355" },
  { key: "blackjack",   path: "/blackjack",   img: "/games/blackjack.jpg",   tag: "x2.5",  tagColor: "#2dd4bf", bg: "linear-gradient(145deg,#134e4a,#0d9488)", glow: "#0d948855" },
  { key: "slots",       path: "/slots",       img: "/games/slots.jpg",       tag: "x10",   tagColor: "#f0abfc", bg: "linear-gradient(145deg,#0b3f8f,#1668e3)", glow: "#1668e355" },
  { key: "parity",      path: "/parity",      img: "/games/parity.jpg",      tag: "50/50", tagColor: "#7dd3fc", bg: "linear-gradient(145deg,#0c4a6e,#0284c7)", glow: "#0284c755" },
  { key: "mines",       path: "/mines",       img: "/games/mines.jpg",       tag: "x24",   tagColor: "#f87171", bg: "linear-gradient(145deg,#7f1d1d,#dc2626)", glow: "#dc262655" },
  { key: "roulette",    path: "/roulette",    img: "/games/roulette.jpg",    tag: "x36",   tagColor: "#fcd34d", bg: "linear-gradient(145deg,#78350f,#b45309)", glow: "#b4530955" },
  { key: "plinko",      path: "/plinko",      img: "/games/plinko.jpg",      tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#312e81,#1668e3)", glow: "#1668e355" },
  { key: "towers",      path: "/towers",      img: "/games/towers.jpg",      tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#164e63,#0891b2)", glow: "#0891b255" },
  { key: "limbo",       path: "/limbo",       img: "/games/limbo.jpg",       tag: "x100",  tagColor: "#78b6ff", bg: "linear-gradient(145deg,#0b3f8f,#2f8fff)", glow: "#2f8fff55" },
  { key: "keno",        path: "/keno",        img: "/games/keno.jpg",        tag: "x60",   tagColor: "#fbbf24", bg: "linear-gradient(145deg,#7c2d12,#ea580c)", glow: "#ea580c55" },
  { key: "hilo",        path: "/hilo",        img: "/games/hilo.jpg",        tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#14532d,#25a55a)", glow: "#25a55a55" },
  { key: "coinflip",    path: "/coinflip",    img: "/games/coinflip.jpg",    tag: "x1.9",  tagColor: "#fcd34d", bg: "linear-gradient(145deg,#713f12,#ca8a04)", glow: "#ca8a0455" },
  { key: "baccarat",    path: "/baccarat",    img: "/games/baccarat.jpg",    tag: "x8",    tagColor: "#f472b6", bg: "linear-gradient(145deg,#4c0519,#be123c)", glow: "#be123c55" },
  { key: "case",        path: "/case",        img: "/games/case.jpg",        tag: "x25",   tagColor: "#22d3ee", bg: "linear-gradient(145deg,#083344,#0e7490)", glow: "#0e749055" },
  { key: "scratch",     path: "/scratch",     img: "/games/scratch.jpg",     tag: "x10",   tagColor: "#fda4af", bg: "linear-gradient(145deg,#500724,#9d174d)", glow: "#9d174d55" },
  { key: "dragontiger", path: "/dragontiger", img: "/games/dragontiger.jpg", tag: "x9",    tagColor: "#fb923c", bg: "linear-gradient(145deg,#450a0a,#b91c1c)", glow: "#b91c1c55" },
  { key: "rps",         path: "/rps",         img: "/games/rps.jpg",         tag: "x1.9",  tagColor: "#93c5fd", bg: "linear-gradient(145deg,#1e3a8a,#2563eb)", glow: "#2563eb55" },
  { key: "thimbles",    path: "/thimbles",    img: "/games/thimbles.jpg",    tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#7f1d1d,#dc2626)", glow: "#dc262655" },
  { key: "luckycard",   path: "/luckycard",   img: "/games/luckycard.jpg",   tag: "x3.5",  tagColor: "#fcd34d", bg: "linear-gradient(145deg,#0b1f3d,#123a6b)", glow: "#123a6b55" },
  { key: "hands",       path: "/hands",       img: "/games/hands.jpg",       tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#713f12,#ca8a04)", glow: "#ca8a0455" },
  { key: "fruitblast",  path: "/fruitblast",  img: "/games/fruitblast.jpg",  tag: "x2.9",  tagColor: "#f472b6", bg: "linear-gradient(145deg,#500724,#be123c)", glow: "#be123c55" },
  { key: "derby",       path: "/derby",       img: "/games/derby.jpg",       tag: "x12",  tagColor: "#34d399", bg: "linear-gradient(145deg,#064e3b,#059669)", glow: "#05966955" },
  { key: "moneywheel",  path: "/moneywheel",  img: "/games/moneywheel.jpg",  tag: "x40",   tagColor: "#fbbf24", bg: "linear-gradient(145deg,#0d4fb0,#1668e3)", glow: "#1668e355" },
  ...NEW_GAMES.map((g) => ({
    key: g.key,
    path: g.path,
    img: coverOf(g.key),
    sym: g.syms[0],
    tag: g.tag,
    tagColor: g.c1,
    bg: `linear-gradient(145deg,${g.c2},${g.c1})`,
    glow: `${g.c1}55`,
  })),
];

export default function Home() {
  const [, nav] = useLocation();
  const { player, loading, refresh } = usePlayer();
  const { lang, t } = useLang();
  const { theme } = useTheme();
  const u = useU();
  const [tab, setTab] = useState<"games"|"promo">("games");
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [enabledGames, setEnabledGames] = useState<Record<string, boolean>>({});
  const [cols, setCols] = useState<number>(3);
  useEffect(() => {
    const saved = Number(localStorage.getItem("gridCols") || 0);
    if (saved >= 3 && saved <= 5) { setCols(saved); return; }
    // avtomatik: ekran kengligiga qarab qulay ustunlar soni
    const w = window.innerWidth;
    setCols(w >= 620 ? 5 : w >= 460 ? 4 : 3);
  }, []);
  const setColsSaved = (n: number) => { setCols(n); localStorage.setItem("gridCols", String(n)); };
  useEffect(() =>{ getGameConfig().then(config =>{
    if (!config?.games) return;
    setEnabledGames(Object.fromEntries(Object.entries(config.games).map(([key, value]) => [key, (value as { enabled?: boolean }).enabled !== false])));
  }).catch(() =>{}); }, []);

  const isDark = theme === "dark"|| theme ==="black";

  const BG = pageBg(theme);

  const CARD_BG = false ? "#ffffff" : theme === "black" ? "#0d141c" : "#122a42";
  const CARD_BORDER = false ? "rgba(14,33,53,0.12)" : "rgba(255,255,255,0.08)";
  const TEXT = isDark ? "#fff" : "#0b1a2b";
  const TEXT_SUB = isDark ? "rgba(255,255,255,0.58)" : "rgba(11,26,43,0.6)";
  const ACCENT = isDark ? "#2f8fff" : "#1668e3";

  const handleDailyBonus = async () =>{
    if (!player || claiming) return;
    setClaiming(true); setClaimMsg("");
    try {
      const res = await claimDailyBonus(player.telegramId);
      if (res.success) { setClaimMsg(t.claimSuccess(res.amount)); await refresh(); }
      else { setClaimMsg(res.error || t.claimSuccess(0)); }
    } catch { setClaimMsg(t.error); }
    setClaiming(false);
    setTimeout(() => setClaimMsg(""), 3500);
  };

  const handlePromo = async () =>{
    if (!player || !promoCode.trim()) return;
    setPromoMsg("");
    try {
      const res = await redeemPromo(player.telegramId, promoCode.trim().toUpperCase());
      if (res.success) {
        setPromoMsg(t.promoSuccess(res.amount)); await refresh(); setPromoCode("");
        setTimeout(() =>{ setPromoMsg(""); setShowPromo(false); }, 2000);
      } else { setPromoMsg(` ${res.error || t.promoError}`); }
    } catch { setPromoMsg(` ${t.error}`); }
  };

  const avatar = player?.photoUrl || null;
  const initials = (player?.firstName ?? "O")[0].toUpperCase();

  return (
    <div className="min-h-screen flex flex-col"style={{ background: pageBg(theme, GAME_BG.home), fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* ─── TOP HEADER ─── */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-2 w-full max-w-full overflow-hidden">
        {/* Avatar + name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1668e3,#0d4fb0)", border: "2px solid rgba(47,143,255,0.5)" }}>
            {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm leading-tight truncate" style={{ color: TEXT }}>
              {loading ? "...": player?.firstName ?? u("player")}
            </p>
            <p className="text-xs truncate"style={{ color: TEXT_SUB }}>@{player?.username ??"player"}</p>
          </div>
        </div>

        {/* Mavzu (kichik suratcha) + til + balans */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeSwitcher />
          <SoundToggle />
          <LangSwitcher />

          {/* Tanga balansi */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl shrink-0"
            style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}`, boxShadow: `0 6px 18px ${GOLD.glow}` }}>
            <img src="/symbols/coin.png" alt="" width={16} height={16} style={{ filter: "drop-shadow(0 0 6px rgba(255,207,74,.6))" }} />
            {loading ? (
              <span className="font-black text-sm" style={{ color: GOLD.light }}>...</span>
            ) : (
              <Odometer value={player?.balance ?? 0} compact className="font-black text-xs whitespace-nowrap" style={{ color: GOLD.light }} />
            )}
          </div>
        </div>

      </div>

      {/* ─── PRO HERO BANNER (TEKIN O'YIN) ─── */}
      <div className="mx-4 mb-3 rounded-3xl relative overflow-hidden pro-sheen"
        style={{ aspectRatio: "16 / 8", border: `1px solid ${GOLD.border}`, boxShadow: "0 16px 44px rgba(0,0,0,0.5)" }}>
        <SmartImage src="/banner-main.jpg" alt="" loading="eager" fetchPriority="high"
          sizes="360px" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(3,2,12,0.94) 0%, rgba(3,2,12,0.66) 52%, rgba(3,2,12,0.06) 100%)" }} />
        {/* oltin charx surati */}
        <img src="/symbols/wheel.png" alt="" width={112} height={112}
          className="absolute spin-slow"
          style={{ right: 10, top: "50%", marginTop: -56, opacity: 0.95, filter: "drop-shadow(0 8px 26px rgba(255,207,74,0.5))" }} />
        <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-4">
          <span className="font-black gold-text" style={{ fontSize: 9, letterSpacing: "0.28em" }}>VIP CASINO</span>
          <p className="font-black leading-none" style={{ fontSize: 24, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
            1X GAME <span className="gold-text">PRO</span>
          </p>
          <p className="font-bold" style={{ fontSize: 10, color: "rgba(255,255,255,0.72)" }}>
            {u("freeSpinHint")}
          </p>
          <button onClick={() => nav("/spin")}
            className="self-start mt-1.5 px-4 py-2 rounded-2xl font-black active:scale-95 transition-transform pro-sheen flex items-center gap-1.5"
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              background: XGREEN.grad,
              color: "#fff",
              boxShadow: XGREEN.shadow,
              border: "1px solid rgba(255,255,255,0.22)",
            }}>
            <img src="/symbols/gift.png" alt="" width={14} height={14} />
            {u("freeGame").toUpperCase()}
          </button>
        </div>
      </div>

      {/* ─── BALANCE CARD ─── */}
      <div className="mx-4 rounded-3xl p-4 mb-3 relative overflow-hidden pro-sheen"
        style={{
          background: "linear-gradient(135deg,#0d4fb0,#1668e3)",
          boxShadow: "0 6px 24px rgba(13,79,176,0.35)",
        }}>
        <div className="absolute inset-x-0 top-0 h-px"style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)" }} />
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none"style={{ background:"radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%)" }} />
        <p className="text-xs font-bold tracking-widest uppercase mb-1"style={{ color:"rgba(255,255,255,0.65)" }}>
          {t.balance}
        </p>
        {loading ? (
          <div className="h-9 w-40 rounded-xl animate-pulse mb-2"style={{ background:"rgba(255,255,255,0.12)" }} />
        ) : (
          <p className="font-black text-3xl text-white mb-2"style={{ textShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
            <Odometer value={player?.balance ?? 0} /> <span className="text-lg opacity-75">UZS</span>
          </p>
        )}
        <div className="flex gap-4 pt-2"style={{ borderTop:"1px solid rgba(255,255,255,0.15)" }}>
          <div className="text-xs"style={{ color:"rgba(255,255,255,0.65)" }}>
             {t.won}: <b className="text-white">{(player?.totalWon ?? 0).toLocaleString()}</b>
          </div>
          <div className="text-xs"style={{ color:"rgba(255,255,255,0.65)" }}>
             {t.games_played}: <b className="text-white">{player?.gamesPlayed ?? 0}</b>
          </div>
        </div>
      </div>

      {/* ─── LIVE PvP ARENA ─── */}
      <button onClick={() => nav("/live")}
        className="mx-4 mb-4 rounded-3xl relative overflow-hidden text-left active:scale-[0.98] transition-transform"
        style={{
          border: `1px solid ${GOLD.border}`,
          boxShadow: "0 14px 38px rgba(0,0,0,0.45)",
          minHeight: 132,
          background: "linear-gradient(120deg,#12060b,#3a0d16 45%,#0a3b26)",
        }}>
        <div className="lfx lfx-panx absolute inset-0" style={{ opacity: 0.42 }}>
          <img src="/games/pvppoker.jpg" alt="" loading="lazy" decoding="async" />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg,rgba(6,4,10,0.92) 30%,rgba(6,4,10,0.35))" }} />

        <div className="relative p-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-black"
            style={{ fontSize: 9, background: "rgba(239,68,68,0.92)", color: "#fff", letterSpacing: "0.14em" }}>
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 99, background: "#fff" }} /> LIVE
          </span>
          <p className="font-black mt-2 leading-none" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.02em" }}>
            LIVE <span className="gold-text">PvP</span>
          </p>
          <p className="font-bold mt-1.5" style={{ fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
            Haqiqiy odamlar bilan 1x1 · Durak · Blackjack · Poker · 17 duel o'yini
          </p>
          <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl font-black pvp-pulse"
            style={{ fontSize: 11, background: GOLD.grad, color: "#1a1204", border: "1px solid rgba(255,246,207,0.8)" }}>
            <Swords size={13} color="#1a1204" /> ARENAGA KIRISH
          </span>
        </div>

        <span className="fx-spin absolute right-4 top-1/2 -translate-y-1/2" style={{ fontSize: 44, opacity: 0.9 }}>♠️</span>
      </button>

      {/* ─── 4 ACTION BUTTONS ─── */}
      <div className="grid grid-cols-4 gap-2 mx-4 mb-4">
        <button onClick={() => nav("/deposit")}
          className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}><Wallet size={18} color="#fff" /></span>
          <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT, fontSize: 10 }}>
            {t.deposit}
          </span>
        </button>
        <button onClick={() => nav("/withdraw")}
          className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7a5a10,#d4af37)" }}><Banknote size={18} color="#fff" /></span>
          <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT, fontSize: 10 }}>
            {u("withdrawShort")}
          </span>
        </button>
        <button onClick={handleDailyBonus} disabled={claiming}
          className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)" }}><Gift size={18} color="#fff" /></span>
          <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT, fontSize: 10 }}>
            {claiming ? t.claiming : t.dailyBonus}
          </span>
        </button>
        <button onClick={() =>{ setTab("promo"); setShowPromo(true); }}
          className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(180deg,#39c46f,#25a55a)" }}><Ticket size={18} color="#fff" /></span>
          <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT, fontSize: 10 }}>
            {t.promoCode}
          </span>
        </button>
      </div>

      {/* Claim message */}
      {claimMsg && (
        <div className="mx-4 mb-3 rounded-2xl px-4 py-2.5 text-center text-sm font-bold"
          style={{
            background: claimMsg.startsWith("") ? "rgba(37,165,90,0.12)":"rgba(239,68,68,0.12)",
            color: claimMsg.startsWith("") ? "#39c46f":"#f87171",
            border: `1px solid ${claimMsg.startsWith("") ? "#25a55a33":"#ef444433"}`,
          }}>
          {claimMsg}
        </div>
      )}

      {/* ─── TABS ─── */}
      <div className="mx-4 mb-4">
        <div className="flex rounded-2xl p-1 gap-1"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <button onClick={() => setTab("games")}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all active:scale-98"
            style={{
              background: tab === "games"?"linear-gradient(135deg,#1668e3,#2f8fff)":"transparent",
              color: tab === "games"?"#fff" : TEXT_SUB,
              boxShadow: tab === "games"?"0 4px 12px #1668e344":"none",
            }}>
             {t.games}
          </button>
          <button onClick={() =>{ setTab("promo"); setShowPromo(true); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all active:scale-98"
            style={{
              background: tab === "promo"?"linear-gradient(135deg,#1a7d43,#25a55a)":"transparent",
              color: tab === "promo"?"#fff" : TEXT_SUB,
              boxShadow: tab === "promo"?"0 4px 12px #25a55a44":"none",
            }}>
            {u("promoCodes")}
          </button>
        </div>
      </div>

      {/* ─── PROMO INPUT (to'liq ekran modal) ─── */}
      {tab === "promo" && showPromo && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4"
          style={{
            background: "rgba(4,10,20,0.82)",
            backdropFilter: "blur(10px)",
            paddingTop: "calc(env(safe-area-inset-top,0px) + 18vh)",
            paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
          }}
          onClick={() => { setShowPromo(false); setTab("games"); setPromoMsg(""); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-5"
            style={{
              background: isDark ? "#0d1c2e" : "#ffffff",
              border: "1px solid rgba(16,185,129,0.35)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black" style={{ color: "#34d399" }}>{t.enterPromo}</p>
              <button
                onClick={() => { setShowPromo(false); setTab("games"); setPromoMsg(""); }}
                className="w-8 h-8 rounded-full font-black active:scale-95"
                style={{ background: "rgba(255,255,255,0.10)", color: TEXT_SUB }}
              >
                ✕
              </button>
            </div>
            <input
              autoFocus
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") handlePromo(); }}
              placeholder="PROMO123"
              maxLength={20}
              className="w-full rounded-2xl px-4 py-3.5 font-black text-lg outline-none uppercase text-center tracking-widest"
              inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
              style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: TEXT,
              }}
            />
            <button
              onClick={handlePromo}
              className="w-full mt-3 py-3.5 rounded-2xl font-black text-base active:scale-95"
              style={{ background: "linear-gradient(180deg,#39c46f,#25a55a)", color: "white" }}
            >
              {u("apply")}
            </button>
            {promoMsg && (
              <p className="text-sm mt-3 font-bold text-center" style={{ color: promoMsg.startsWith("") ? "#39c46f" : "#f87171" }}>{promoMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* ─── GAME GRID (5 columns, 1win uslubi) ─── */}
      {(tab === "games" || showPromo) && (
        <div className="px-4 pb-20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: TEXT_SUB }}>{t.games}</p>
            <div className="flex items-center gap-1.5">
              {/* Ustunlar soni — 3 / 4 / 5 */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl"
                style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                {[3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setColsSaved(n)}
                    className="px-2 py-1 rounded-lg font-black transition-all active:scale-90"
                    style={{
                      fontSize: 10,
                      background: cols === n ? GOLD.grad : "transparent",
                      color: cols === n ? "#1a1204" : TEXT_SUB,
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <button onClick={() => nav("/leaderboard")}
                className="text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1"
                style={{ background: "rgba(251,191,36,0.12)", color: "#f59e0b", border: "1px solid rgba(251,191,36,0.3)" }}>
                <Trophy size={12} color="#f59e0b" /> {t.leaderboard}
              </button>
            </div>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {GAMES.filter(g => enabledGames[g.key] !== false).map((g) => (
              <button key={g.path} onClick={() => nav(g.path)}
                className="relative overflow-hidden active:scale-[0.93] transition-all pro-tile"
                style={{
                  background: CARD_BG,
                  borderRadius: 12,
                  aspectRatio: "1 / 1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 6px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                  border: `1px solid ${CARD_BORDER}`,
                }}>
                {/* Haqiqiy o'yin surati fon sifatida */}
                {g.img ? (
                  <SmartImage src={g.img} alt={GAME_NAMES[g.key][lang]} loading="lazy" decoding="async"
                    sizes="(max-width: 480px) 30vw, 160px"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none crisp-img"
                    style={{ opacity: 1, borderRadius: 12 }} />
                ) : NEW_GAME_MAP[g.key] ? (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 12 }}>
                    <GameArt cfg={NEW_GAME_MAP[g.key]} />
                    <img src={`/symbols/${(g as { sym?: string }).sym ?? "coin"}.png`} alt="" width={40} height={40}
                      className="idle-float absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
                      style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.65))" }} />
                  </div>
                ) : (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
                    style={{ background: (g as { bg: string }).bg, borderRadius: 12 }}>
                    <span className="absolute inset-0" style={{
                      background: `radial-gradient(60% 50% at 50% 30%, ${(g as { glow: string }).glow}, transparent 70%)`,
                    }} />
                    <img src={`/symbols/${(g as { sym?: string }).sym ?? "coin"}.png`} alt="" width={46} height={46}
                      className="idle-float" style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5))" }} />
                  </div>
                )}
                {/* Matn o'qilishi uchun faqat pastdan yengil qoraytirish */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(4,14,24,0.55) 70%,rgba(4,14,24,0.92) 100%)", borderRadius: 12 }} />
                {/* Tag badge */}
                <div className="absolute top-1 right-1">
                  <span className="font-black px-1.5 py-0.5 rounded-md"
                    style={{
                      background: `linear-gradient(145deg,${g.tagColor},rgba(0,0,0,0.55))`,
                      color: "#0b1020",
                      fontSize: 9,
                      letterSpacing: 0.3,
                      border: "1px solid rgba(255,255,255,0.45)",
                      textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                      boxShadow: `0 2px 10px ${g.tagColor}66`,
                    }}>
                    {g.tag}
                  </span>
                </div>
                <p className="relative text-white font-black leading-tight text-center mt-auto"
                  style={{ fontSize: cols >= 5 ? 8.5 : cols === 4 ? 10 : 12, textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>
                  {GAME_NAMES[g.key][lang]}
                </p>

              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── BRAND FOOTER (pastdagi havola) ─── */}
      {tab === "games" && (
        <div className="px-4 pb-20 -mt-20">
          <div className="rounded-3xl px-4 py-4 relative overflow-hidden pro-sheen"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(18,42,66,0.9), rgba(10,23,38,0.9))"
                : "linear-gradient(135deg,#fffdf7,#f6edd8)",
              border: `1px solid ${GOLD.border}`,
              boxShadow: `0 12px 30px rgba(0,0,0,${isDark ? 0.42 : 0.1})`,
            }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: GOLD.grad, boxShadow: `0 8px 20px ${GOLD.glow}` }}>
                <img src="/symbols/crown.png" alt="" width={22} height={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black leading-none" style={{ fontSize: 14, color: TEXT }}>
                  1X GAME <span className="gold-text">PRO</span>
                </p>
                <p className="mt-1" style={{ fontSize: 10, color: TEXT_SUB }}>{u("brandTagline")}</p>
              </div>
              <a href="https://t.me/soqqa_channel_org" target="_blank" rel="noreferrer"
                className="shrink-0 px-3 py-2 rounded-xl font-black active:scale-95 transition-transform"
                style={{ fontSize: 10, background: XGREEN.grad, color: "#fff", boxShadow: XGREEN.shadow }}>
                {u("openChannel")}
              </a>
            </div>
            <p className="mt-3 text-center" style={{ fontSize: 9, color: TEXT_SUB, letterSpacing: "0.14em" }}>
              © 2026 1X GAME PRO · 18+ · {u("playResponsibly")}
            </p>
          </div>
        </div>
      )}

      {/* ─── BOTTOM DOCK (doim ko'rinadi, qimirlamaydi) ─── */}
      <div className="sticky bottom-0 z-50 mt-auto">
      {/* Referal — oltin tugma */}
      <button onClick={() => nav("/referral")}
        className="absolute left-4 z-40 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl active:scale-95 transition-all"
        style={{
          bottom: "calc(100% + 10px)",
          background: "linear-gradient(145deg,#f7c948,#b45309)",
          border: "1px solid rgba(255,246,207,0.7)",
          boxShadow: "0 10px 28px rgba(247,201,72,0.45)",
        }}>
        <Gift size={16} color="#1a1204" />
        <span className="text-xs font-black" style={{ color: "#1a1204" }}>REFERAL</span>
      </button>

      {/* LIVE PVP — qizil-oltin tugma */}
      <button onClick={() => nav("/live")}
        className="absolute left-1/2 z-40 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl active:scale-95 transition-all pvp-pulse"
        style={{
          bottom: "calc(100% + 10px)",
          transform: "translateX(-50%)",
          background: "linear-gradient(145deg,#ff4d4d,#8b0f0f)",
          border: "1px solid rgba(255,214,140,0.85)",
          boxShadow: "0 10px 28px rgba(255,77,77,0.45)",
        }}>
        <Swords size={16} color="#fff6cf" />
        <span className="text-xs font-black" style={{ color: "#fff6cf" }}>LIVE PVP</span>
      </button>

      {/* Ommaviy chat — oltin tugma */}
      <button onClick={() => nav("/chat")}
        className="absolute right-4 z-40 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl active:scale-95 transition-all"
        style={{
          bottom: "calc(100% + 10px)",
          background: "linear-gradient(145deg,#f7c948,#b45309)",
          border: "1px solid rgba(255,246,207,0.7)",
          boxShadow: "0 10px 28px rgba(247,201,72,0.45)",
        }}>
        <MessageCircle size={16} color="#1a1204" />
        <span className="text-xs font-black" style={{ color: "#1a1204" }}>CHAT</span>
      </button>
        <div className="inset-x-0"
        style={{
          background: isDark ? "rgba(10,23,38,0.97)" : "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)":"rgba(22,104,227,0.15)"}`,
          backdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}>
        <div className="grid grid-cols-6 items-end px-1 py-2">
          <button onClick={() => setTab("games")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all"
            style={{ background: tab === "games"?"rgba(22,104,227,0.12)":"transparent" }}>
            <HomeIcon size={20} color={tab === "games" ? ACCENT : TEXT_SUB} />
            <span className="text-xs font-bold"style={{ color: tab ==="games" ? ACCENT : TEXT_SUB, fontSize: 9 }}>{u("navHome")}</span>
          </button>
          <button onClick={() => nav("/history")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <History size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>{u("navHistory")}</span>
          </button>
          <button onClick={() => nav("/deposit")}
            className="flex flex-col items-center gap-1 px-1 py-1.5 rounded-2xl active:scale-95 transition-all"
            style={{
              background: "linear-gradient(180deg,#2f8fff,#1668e3)",
              boxShadow: "0 4px 16px #1d4ed844",
              marginTop: -16,
              border: "3px solid "+ (isDark ? "#0a1726" : "#fff"),
            }}>
            <Wallet size={22} color="#fff" />
            <span className="text-xs font-black text-white" style={{ fontSize: 9 }}>{t.deposit}</span>
          </button>
          <button onClick={() =>{ setTab("promo"); setShowPromo(true); }}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all"
            style={{ background: tab === "promo"?"rgba(22,104,227,0.12)":"transparent" }}>
            <Ticket size={20} color={tab === "promo" ? ACCENT : TEXT_SUB} />
            <span className="text-xs font-bold"style={{ color: tab ==="promo" ? ACCENT : TEXT_SUB, fontSize: 9 }}>{u("navPromo")}</span>
          </button>
          <button onClick={() => nav("/support")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <MessageCircle size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>{u("navChat")}</span>
          </button>
          <button onClick={() => nav("/howtoplay")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <BookOpen size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>{u("navRules")}</span>
          </button>
        </div>
      </div>
      </div>

    </div>
  );
}
