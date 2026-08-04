import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG, GOLD } from "@/lib/theme-context";
import { getGameConfig } from "@/lib/api";
import { GAME_NAMES } from "@/lib/game-i18n";
import { Wallet, Gift, Ticket, Home as HomeIcon, History, MessageCircle, BookOpen, Trophy } from "lucide-react";

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

const LANG_FLAG: Record<string, string> = { uz: "", ru: "", en: "" };
const LANG_LABEL: Record<string, string> = { uz: "UZ", ru: "RU", en: "EN" };

const GAMES = [
  { key: "apple",       path: "/apple",       img: "/games/apple.jpg",       tag: "HOT",   tagColor: "#ef4444", bg: "linear-gradient(145deg,#064e3b,#059669)", glow: "#05966955" },
  { key: "dice",        path: "/dice",        img: "/games/dice.jpg",        tag: "x5.8",  tagColor: "#f59e0b", bg: "linear-gradient(145deg,#78350f,#d97706)", glow: "#d9770655" },
  { key: "aviator",     path: "/aviator",     img: "/games/aviator.jpg",     tag: "∞x",    tagColor: "#818cf8", bg: "linear-gradient(145deg,#1e1b4b,#4f46e5)", glow: "#4f46e555" },
  { key: "spin",        path: "/spin",        img: "/games/spin.jpg",        tag: "FREE",  tagColor: "#34d399", bg: "linear-gradient(145deg,#4c1d95,#7c3aed)", glow: "#7c3aed55" },
  { key: "blackjack",   path: "/blackjack",   img: "/games/blackjack.jpg",   tag: "x2.5",  tagColor: "#2dd4bf", bg: "linear-gradient(145deg,#134e4a,#0d9488)", glow: "#0d948855" },
  { key: "slots",       path: "/slots",       img: "/games/slots.jpg",       tag: "x10",   tagColor: "#f0abfc", bg: "linear-gradient(145deg,#581c87,#9333ea)", glow: "#9333ea55" },
  { key: "parity",      path: "/parity",      img: "/games/parity.jpg",      tag: "50/50", tagColor: "#7dd3fc", bg: "linear-gradient(145deg,#0c4a6e,#0284c7)", glow: "#0284c755" },
  { key: "mines",       path: "/mines",       img: "/games/mines.jpg",       tag: "x24",   tagColor: "#f87171", bg: "linear-gradient(145deg,#7f1d1d,#dc2626)", glow: "#dc262655" },
  { key: "roulette",    path: "/roulette",    img: "/games/roulette.jpg",    tag: "x36",   tagColor: "#fcd34d", bg: "linear-gradient(145deg,#78350f,#b45309)", glow: "#b4530955" },
  { key: "plinko",      path: "/plinko",      img: "/games/plinko.jpg",      tag: "NEW",   tagColor: "#4ade80", bg: "linear-gradient(145deg,#312e81,#6366f1)", glow: "#6366f155" },
  { key: "towers",      path: "/towers",      img: "/games/towers.jpg",      tag: "NEW",   tagColor: "#4ade80", bg: "linear-gradient(145deg,#164e63,#0891b2)", glow: "#0891b255" },
  { key: "limbo",       path: "/limbo",       img: "/games/limbo.jpg",       tag: "x100",  tagColor: "#a78bfa", bg: "linear-gradient(145deg,#3b0764,#8b5cf6)", glow: "#8b5cf655" },
  { key: "keno",        path: "/keno",        img: "/games/keno.jpg",        tag: "x60",   tagColor: "#fbbf24", bg: "linear-gradient(145deg,#7c2d12,#ea580c)", glow: "#ea580c55" },
  { key: "hilo",        path: "/hilo",        img: "/games/hilo.jpg",        tag: "NEW",   tagColor: "#4ade80", bg: "linear-gradient(145deg,#14532d,#16a34a)", glow: "#16a34a55" },
  { key: "coinflip",    path: "/coinflip",    img: "/games/coinflip.jpg",    tag: "x1.9",  tagColor: "#fcd34d", bg: "linear-gradient(145deg,#713f12,#ca8a04)", glow: "#ca8a0455" },
  { key: "baccarat",    path: "/baccarat",    img: "/games/baccarat.jpg",    tag: "x8",    tagColor: "#f472b6", bg: "linear-gradient(145deg,#4c0519,#be123c)", glow: "#be123c55" },
  { key: "case",        path: "/case",        img: "/games/case.jpg",        tag: "x25",   tagColor: "#22d3ee", bg: "linear-gradient(145deg,#083344,#0e7490)", glow: "#0e749055" },
  { key: "scratch",     path: "/scratch",     img: "/games/scratch.jpg",     tag: "x10",   tagColor: "#fda4af", bg: "linear-gradient(145deg,#500724,#9d174d)", glow: "#9d174d55" },
  { key: "dragontiger", path: "/dragontiger", img: "/games/dragontiger.jpg", tag: "x9",    tagColor: "#fb923c", bg: "linear-gradient(145deg,#450a0a,#b91c1c)", glow: "#b91c1c55" },
  { key: "rps",         path: "/rps",         img: "/games/rps.jpg",         tag: "x1.9",  tagColor: "#93c5fd", bg: "linear-gradient(145deg,#1e3a8a,#2563eb)", glow: "#2563eb55" },
];

export default function Home() {
  const [, nav] = useLocation();
  const { player, loading, refresh } = usePlayer();
  const { lang, t, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<"games"|"promo">("games");
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [showLang, setShowLang] = useState(false);
  const [enabledGames, setEnabledGames] = useState<Record<string, boolean>>({});
  useEffect(() =>{ getGameConfig().then(config =>{
    if (!config?.games) return;
    setEnabledGames(Object.fromEntries(Object.entries(config.games).map(([key, value]) => [key, (value as { enabled?: boolean }).enabled !== false])));
  }).catch(() =>{}); }, []);

  const isDark = theme === "dark"|| theme ==="black";

  const BG = theme === "light"
    ? "linear-gradient(160deg, #eef0ff 0%, #e8ebff 50%, #f0eeff 100%)"
    : theme === "black"
    ? "linear-gradient(160deg, #000 0%, #0a0a0a 100%)"
    : "linear-gradient(160deg, #0f0a1e 0%, #1a0f2e 50%, #0f1428 100%)";

  const CARD_BG = theme === "light"?"#ffffff": theme ==="black"?"rgba(10,10,12,0.96)":"rgba(20,14,38,0.94)";
  const CARD_BORDER = theme === "light"?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.14)";
  const TEXT = isDark ? "#fff":"#1e1b4b";
  const TEXT_SUB = isDark ? "rgba(255,255,255,0.62)":"rgba(30,27,75,0.62)";
  const ACCENT = isDark ? "#a78bfa":"#6366f1";

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
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "2px solid rgba(167,139,250,0.5)" }}>
            {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : initials}
          </div>
          <div>
            <p className="font-black text-sm leading-tight" style={{ color: TEXT }}>
              {loading ? "...": player?.firstName ??"O'yinchi"}
            </p>
            <p className="text-xs"style={{ color: TEXT_SUB }}>@{player?.username ??"player"}</p>
          </div>
        </div>

        {/* Coin balance + lang + theme */}
        <div className="flex items-center gap-2">
          {/* Theme dots */}
          <div className="flex gap-1">
            {(["dark", "light", "black"] as const).map(th => (
              <button key={th} onClick={() => setTheme(th)}
                className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{
                  background: theme === th ? ACCENT : "rgba(167,139,250,0.15)",
                  border: `1.5px solid ${theme === th ? ACCENT : "rgba(167,139,250,0.25)"}`,
                  fontSize: 11,
                }}>
                {th === "light"?"": th ==="black"?"●":""}
              </button>
            ))}
          </div>

          {/* Lang */}
          <div className="relative">
            {showLang && <div className="fixed inset-0 z-40" onClick={() => setShowLang(false)} />}
            <button onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl active:scale-95 transition-transform"
              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: ACCENT, fontSize: 12, fontWeight: 700 }}>
              {LANG_FLAG[lang]} {LANG_LABEL[lang]}
            </button>
            {showLang && (
              <div className="absolute right-0 top-10 z-50 rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: isDark ? "#1a0a3a":"#fff", border: "1px solid rgba(167,139,250,0.3)", minWidth: 100, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
                {(["uz", "ru", "en"] as const).map(l => (
                  <button key={l} onClick={() =>{ setLang(l); setShowLang(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold"
                    style={{ color: lang === l ? ACCENT : TEXT_SUB, background: lang === l ? "rgba(124,58,237,0.18)":"transparent" }}>
                    {LANG_FLAG[l]} {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coin balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
            style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}`, boxShadow: `0 6px 18px ${GOLD.glow}` }}>
            <span style={{ fontSize: 16 }}></span>
            <span className="font-black text-sm" style={{ color: GOLD.light }}>
              {loading ? "..." : (player?.balance ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ─── PRO HERO BANNER ─── */}
      <div className="mx-4 mb-3 rounded-3xl relative overflow-hidden pro-sheen"
        style={{ aspectRatio: "16 / 7", border: "1px solid rgba(251,191,36,0.35)", boxShadow: "0 14px 40px rgba(0,0,0,0.45)" }}>
        <img src="/banner-main.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(4,2,16,0.92) 0%, rgba(4,2,16,0.6) 48%, rgba(4,2,16,0.05) 100%)" }} />
        <div className="absolute inset-0 flex flex-col justify-center gap-1 px-4">
          <span className="font-black gold-text"style={{ fontSize: 9, letterSpacing:"0.28em" }}>VIP CASINO</span>
          <p className="font-black leading-none"style={{ fontSize: 22, color:"#fff", textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
            1X GAME <span className="gold-text">PRO</span>
          </p>
          <button onClick={() => nav("/spin")}
            className="self-start mt-1.5 px-3 py-1.5 rounded-xl font-black active:scale-95 transition-transform"
            style={{ fontSize: 10, background: GOLD.grad, color: "#1a1004", boxShadow: "0 6px 18px rgba(245,158,11,0.45)" }}>
             BEPUL AYLANTIRISH
          </button>
        </div>
      </div>

      {/* ─── BALANCE CARD ─── */}
      <div className="mx-4 rounded-3xl p-4 mb-3 relative overflow-hidden pro-sheen"
        style={{
          background: "linear-gradient(145deg,#1d4ed8,#3b82f6,#1e40af)",
          boxShadow: "0 12px 40px #1d4ed844, 0 2px 0 #1e3a8a, inset 0 1px 0 rgba(255,255,255,0.2)",
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
            {(player?.balance ?? 0).toLocaleString()} <span className="text-lg opacity-75">UZS</span>
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

      {/* ─── 3 ACTION BUTTONS ─── */}
      <div className="grid grid-cols-3 gap-2.5 mx-4 mb-4">
        <button onClick={() => nav("/deposit")}
          className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-transform"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}><Wallet size={18} color="#fff" /></span>
          <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT, fontSize: 10 }}>
            {t.deposit}
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
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}><Ticket size={18} color="#fff" /></span>
          <span className="text-xs font-bold text-center leading-tight" style={{ color: TEXT, fontSize: 10 }}>
            {t.promoCode}
          </span>
        </button>
      </div>

      {/* Claim message */}
      {claimMsg && (
        <div className="mx-4 mb-3 rounded-2xl px-4 py-2.5 text-center text-sm font-bold"
          style={{
            background: claimMsg.startsWith("") ? "rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",
            color: claimMsg.startsWith("") ? "#4ade80":"#f87171",
            border: `1px solid ${claimMsg.startsWith("") ? "#22c55e33":"#ef444433"}`,
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
              background: tab === "games"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",
              color: tab === "games"?"#fff" : TEXT_SUB,
              boxShadow: tab === "games"?"0 4px 12px #6366f144":"none",
            }}>
             {t.games}
          </button>
          <button onClick={() =>{ setTab("promo"); setShowPromo(true); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all active:scale-98"
            style={{
              background: tab === "promo"?"linear-gradient(135deg,#059669,#10b981)":"transparent",
              color: tab === "promo"?"#fff" : TEXT_SUB,
              boxShadow: tab === "promo"?"0 4px 12px #10b98144":"none",
            }}>
             Promokodlar
          </button>
        </div>
      </div>

      {/* ─── PROMO INPUT ─── */}
      {tab === "promo" && showPromo && (
        <div className="mx-4 mb-4 rounded-2xl p-4"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <p className="text-xs font-bold mb-2"style={{ color:"#34d399" }}>{t.enterPromo}</p>
          <div className="flex gap-2">
            <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="PROMO123" maxLength={20}
              className="flex-1 min-w-0 rounded-xl px-3 py-2.5 font-black text-base outline-none uppercase"
              inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: TEXT }} />
            <button onClick={handlePromo}
              className="shrink-0 px-4 py-2.5 rounded-xl font-black text-sm active:scale-95"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "white" }}>
              
            </button>
          </div>
          {promoMsg && <p className="text-xs mt-2 font-bold" style={{ color: promoMsg.startsWith("") ? "#4ade80":"#f87171" }}>{promoMsg}</p>}
        </div>
      )}

      {/* ─── GAME GRID (5 columns, 1win uslubi) ─── */}
      {tab === "games" && (
        <div className="px-4 pb-24">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: TEXT_SUB }}>{t.games}</p>
            <button onClick={() => nav("/leaderboard")}
              className="text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1"
              style={{ background: "rgba(251,191,36,0.12)", color: "#f59e0b", border: "1px solid rgba(251,191,36,0.3)" }}>
               <Trophy size={12} color="#f59e0b" /> {t.leaderboard}
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {GAMES.filter(g => enabledGames[g.key] !== false).map((g) => (
              <button key={g.path} onClick={() => nav(g.path)}
                className="relative overflow-hidden active:scale-[0.93] transition-all pro-tile"
                style={{
                  background: g.bg,
                  borderRadius: 16,
                  aspectRatio: "1 / 1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 5px",
                  boxShadow: `0 6px 0 rgba(0,0,0,0.35), 0 10px 24px ${g.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                {/* Haqiqiy o'yin surati fon sifatida */}
                <img src={g.img} alt={GAME_NAMES[g.key][lang]} loading="lazy" decoding="async"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none crisp-img"
                  style={{ opacity: 1, borderRadius: 16 }} />
                {/* Matn o'qilishi uchun faqat pastdan yengil qoraytirish */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 42%,rgba(0,0,0,0.35) 72%,rgba(0,0,0,0.8) 100%)", borderRadius: 16 }} />
                {/* Top shine line */}
                <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)" }} />
                {/* Tag badge */}
                <div className="absolute top-1 right-1">
                  <span className="font-black px-1.5 py-0.5 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.6)", color: g.tagColor, fontSize: 6.5, letterSpacing: 0.2 }}>
                    {g.tag}
                  </span>
                </div>
                <p className="relative text-white font-black leading-tight text-center mt-auto"
                  style={{ fontSize: 8, textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>
                  {GAME_NAMES[g.key][lang]}
                </p>

              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── BOTTOM NAV ─── */}
      <div className="fixed bottom-0 inset-x-0 z-50"
        style={{
          background: isDark ? "rgba(15,10,30,0.95)":"rgba(255,255,255,0.97)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)":"rgba(99,102,241,0.15)"}`,
          backdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}>
        <div className="grid grid-cols-6 items-end px-1 py-2">
          <button onClick={() => setTab("games")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all"
            style={{ background: tab === "games"?"rgba(99,102,241,0.12)":"transparent" }}>
            <HomeIcon size={20} color={tab === "games" ? ACCENT : TEXT_SUB} />
            <span className="text-xs font-bold"style={{ color: tab ==="games" ? ACCENT : TEXT_SUB, fontSize: 9 }}>Bosh sahifa</span>
          </button>
          <button onClick={() => nav("/history")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <History size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>Tarix</span>
          </button>
          <button onClick={() => nav("/deposit")}
            className="flex flex-col items-center gap-1 px-1 py-1.5 rounded-2xl active:scale-95 transition-all"
            style={{
              background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
              boxShadow: "0 4px 16px #1d4ed844",
              marginTop: -16,
              border: "3px solid "+ (isDark ?"#0f0a1e":"#fff"),
            }}>
            <Wallet size={22} color="#fff" />
            <span className="text-xs font-black text-white" style={{ fontSize: 9 }}>{t.deposit}</span>
          </button>
          <button onClick={() =>{ setTab("promo"); setShowPromo(true); }}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all"
            style={{ background: tab === "promo"?"rgba(99,102,241,0.12)":"transparent" }}>
            <Ticket size={20} color={tab === "promo" ? ACCENT : TEXT_SUB} />
            <span className="text-xs font-bold"style={{ color: tab ==="promo" ? ACCENT : TEXT_SUB, fontSize: 9 }}>Promo</span>
          </button>
          <button onClick={() => nav("/support")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <MessageCircle size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>Suhbat</span>
          </button>
          <button onClick={() => nav("/howtoplay")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <BookOpen size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>Qoidalar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
