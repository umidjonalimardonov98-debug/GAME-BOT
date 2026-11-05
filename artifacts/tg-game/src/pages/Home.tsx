import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG, GOLD, XGREEN } from "@/lib/theme-context";
import { getGameConfig, getPlayerHistory } from "@/lib/api";
import { GAME_NAMES } from "@/lib/game-i18n";
import { useU } from "@/lib/ui-i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import SoundToggle from "@/components/SoundToggle";
import Odometer from "@/components/casino/Odometer";
import { Wallet, Banknote, Gift, Ticket, Home as HomeIcon, History, MessageCircle, BookOpen, Trophy, Swords, SlidersHorizontal, RotateCcw, ArrowUpRight, Search, Users, X } from "lucide-react";

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
import { loadArenaList } from "@/pages/Arena";
import ContestBanner from "@/components/casino/ContestBanner";
import { Button } from "@/components/ui/button";
import { GAMES, CATS, LIVE_GAMES } from "@/lib/game-catalog";
import { mostRecentGame, type HistoryGame } from "@/lib/recent-game";
import "@/game-navigation.css";

export default function Home() {
  const [, nav] = useLocation();
  const { player, loading, refresh } = usePlayer();
  const { lang, t } = useLang();
  const { theme, ts } = useTheme();
  const u = useU();
  const [tab, setTab] = useState<"games"|"promo">("games");
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [dailyOn, setDailyOn] = useState(true);
  useEffect(() => {
    fetch(`${BASE}/daily-bonus/status`).then(r => r.json()).then(d => setDailyOn(d?.enabled !== false)).catch(() => {});
  }, []);
  const [enabledGames, setEnabledGames] = useState<Record<string, boolean>>({});
  const [cols, setCols] = useState<number>(3);
  const [cat, setCat] = useState<string>("top");
  const [search, setSearch] = useState("");
  const [arenaGames, setArenaGames] = useState<{ key: string; path: string; img: string; name: string }[]>([]);
  useEffect(() => { loadArenaList().then(data => setArenaGames((data.games ?? []).map(game => ({ key: `arena-${game.key}`, path: `/arena/${game.key}`, img: game.img, name: game.title })))).catch(() => {}); }, []);
  const [recentRows, setRecentRows] = useState<HistoryGame[]>([]);
  useEffect(() => {
    setRecentRows([]);
    if (!player?.telegramId) return;
    let current = true;
    getPlayerHistory(player.telegramId).then(data => { if (current) setRecentRows(data.games ?? []); }).catch(() => {});
    return () => { current = false; };
  }, [player?.telegramId, player?.gamesPlayed]);
  const recent = mostRecentGame(recentRows, [...GAMES, ...LIVE_GAMES, ...arenaGames], enabledGames);
  const [menu, setMenu] = useState(false);
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

  const isDark = true;

  const BG = pageBg(theme);

  const CARD_BG = ts.card;
  const CARD_BORDER = ts.cardBorder;
  const TEXT = ts.text;
  const TEXT_SUB = ts.textSub;
  const ACCENT = "var(--nav-accent)";

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
    <div className="home-page min-h-screen flex flex-col">

      {/* ─── TOP HEADER (pro) ─── */}
      <div className="pro-header home-top z-50 px-3 py-2 flex items-center gap-2.5">
        <div className="ht-ava">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span>{initials}</span>}
          <i className="ht-dot" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-[13px] leading-tight truncate" style={{ color: TEXT }}>
            {loading ? "..." : player?.firstName ?? u("player")}
          </p>
          <p className="text-[11px] leading-tight truncate" style={{ color: TEXT_SUB }}>@{player?.username ?? "player"}</p>
        </div>

        <Button variant="ghost" onClick={() => nav("/deposit")} className="ht-bal active:scale-95" aria-label="balance">
          <img src="/symbols/coin.png" alt="" width={18} height={18} />
          {loading ? <span>...</span> : <Odometer value={player?.balance ?? 0} compact className="whitespace-nowrap" />}
          <span className="ht-plus">+</span>
        </Button>

        <Button variant="ghost" onClick={() => setMenu((v) => !v)} className="ht-icon active:scale-90" aria-label="settings" data-on={menu ? "1" : "0"}>
          <SlidersHorizontal size={17} />
        </Button>

        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="ht-menu z-50">
              <div className="ht-row"><span>Mavzu</span><ThemeSwitcher /></div>
              <div className="ht-row"><span>Ovoz</span><SoundToggle /></div>
              <div className="ht-row"><span>Til</span><LangSwitcher /></div>
            </div>
          </>
        )}
      </div>
      <section className="home-summary">
        <div className="summary-balance"><span>{t.balance} · UZS</span><strong><Odometer value={player?.balance ?? 0} /></strong></div>
        <div className="summary-stat"><span>{t.won}</span><strong>{(player?.totalWon ?? 0).toLocaleString()}</strong></div>
        <div className="summary-stat"><span>{t.games_played}</span><strong>{player?.gamesPlayed ?? 0}</strong></div>
      </section>
      {recent && <Button variant="ghost" className="replay-game" onClick={() => nav(recent.path)}>
        <img src={recent.img} alt="" width={46} height={46} />
        <span><small>{lang === "ru" ? "Последняя игра" : lang === "en" ? "Last played" : "Oxirgi o‘yin"}</small><strong>{GAME_NAMES[recent.key]?.[lang] ?? ("name" in recent ? recent.name : recent.key)}</strong></span>
        <span className="replay-label"><RotateCcw size={16} />{lang === "ru" ? "Ещё раз" : lang === "en" ? "Play again" : "Qayta o‘ynash"}</span>
      </Button>}
      <div className="home-entry-row">
        <Button variant="ghost" className="home-entry" onClick={() => nav("/spin")}><img src="/symbols/wheel.png" alt="" width={36} height={36} /><span>{u("freeGame")}</span><ArrowUpRight size={16} /></Button>
        <Button variant="ghost" className="home-entry live-entry" onClick={() => nav("/live")}><Users size={22} /><span>LIVE PvP</span><ArrowUpRight size={16} /></Button>
      </div>
      <div className="home-actions">
        <Button variant="ghost" onClick={() => nav("/deposit")}><Wallet size={18} /><span>{t.deposit}</span></Button>
        <Button variant="ghost" onClick={() => nav("/withdraw")}><Banknote size={18} /><span>{u("withdrawShort")}</span></Button>
        {dailyOn && <Button variant="ghost" onClick={handleDailyBonus} disabled={claiming}><Gift size={18} /><span>{claiming ? t.claiming : t.dailyBonus}</span></Button>}
        <Button variant="ghost" onClick={() => { setTab("promo"); setShowPromo(true); }}><Ticket size={18} /><span>{t.promoCode}</span></Button>
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
              <Button variant="ghost"
                onClick={() => { setShowPromo(false); setTab("games"); setPromoMsg(""); }}
                className="w-8 h-8 rounded-full font-black active:scale-95"
                style={{ background: "rgba(255,255,255,0.10)", color: TEXT_SUB }}
              >
                <X size={16} />
              </Button>
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
            <Button variant="ghost"
              onClick={handlePromo}
              className="w-full mt-3 py-3.5 rounded-2xl font-black text-base active:scale-95"
              style={{ background: "linear-gradient(180deg,#39c46f,#25a55a)", color: "white" }}
            >
              {u("apply")}
            </Button>
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
                  <Button variant="ghost" key={n} onClick={() => setColsSaved(n)}
                    className="px-2 py-1 rounded-lg font-black transition-all active:scale-90"
                    style={{
                      fontSize: 10,
                      background: cols === n ? GOLD.grad : "transparent",
                      color: cols === n ? "#1a1204" : TEXT_SUB,
                    }}>
                    {n}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => nav("/leaderboard")}
                className="text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1"
                style={{ background: "rgba(251,191,36,0.12)", color: "#f59e0b", border: "1px solid rgba(251,191,36,0.3)" }}>
                <Trophy size={12} color="#f59e0b" /> {t.leaderboard}
              </Button>
            </div>
          </div>

          <label className="game-search"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "ru" ? "Поиск игр" : lang === "en" ? "Search games" : "O‘yin qidirish"} /></label>
          <div className="cat-chips">
            {[{ id: "all", uz: "Barchasi", ru: "Все", en: "All" }, ...CATS].map((c) => (
              <Button variant="ghost" key={c.id} data-on={cat === c.id ? "1" : "0"} onClick={() => setCat(c.id)} className="cat-chip active:scale-95">
                {(c as any)[lang] ?? c.uz}
              </Button>
            ))}
          </div>
          {CATS.filter((c) => search ? c.id !== "top" : cat === "all" || c.id === cat).map((c) => {
            const list = c.keys.map((k) => GAMES.find((g) => g.key === k)).filter((g): g is (typeof GAMES)[number] => !!g && enabledGames[g.key] !== false && (!search || (GAME_NAMES[g.key]?.[lang] ?? g.key).toLocaleLowerCase().includes(search.toLocaleLowerCase())));
            if (!list.length) return null;
            return (
              <section key={c.id + cat} className="pro-rise">
                <div className="cat-head">
                  <span className="bar" />
                  <span className="ttl">{(c as any)[lang] ?? c.uz}</span>
                  <span className="cnt">{list.length}</span>
                  <span className="ln" />
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {list.map((g, idx) => (
              <Button variant="ghost" key={g.path} onClick={() => nav(g.path)}
                className="relative overflow-hidden active:scale-[0.93] pro-tile pro-rise"
                style={{
                  animationDelay: `${Math.min(idx, 12) * 35}ms`,
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
                  <SmartImage src={g.img} alt={GAME_NAMES[g.key]?.[lang] ?? g.key} loading="lazy" decoding="async"
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
                {/* Tag badge — ustunlar soniga qarab kichrayadi */}
                <div className="absolute" style={{ top: 3, right: 3 }}>
                  <span className="font-black rounded-md"
                    style={{
                      display: "inline-block",
                      padding: cols >= 5 ? "0px 3px" : "1px 5px",
                      background: `linear-gradient(145deg,${g.tagColor},rgba(0,0,0,0.55))`,
                      color: "#0b1020",
                      fontSize: cols >= 5 ? 6.5 : cols === 4 ? 7.5 : 9,
                      lineHeight: 1.45,
                      letterSpacing: 0.2,
                      border: "1px solid rgba(255,255,255,0.45)",
                      textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                      boxShadow: `0 2px 8px ${g.tagColor}55`,
                    }}>
                    {g.tag}
                  </span>
                </div>
                <p className="relative text-white font-black leading-tight text-center mt-auto px-0.5"
                  style={{
                    fontSize: cols >= 5 ? 7.5 : cols === 4 ? 9 : 11.5,
                    lineHeight: 1.15,
                    textShadow: "0 2px 6px rgba(0,0,0,0.95)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                  {GAME_NAMES[g.key]?.[lang] ?? g.key}
                </p>


              </Button>
            ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="mx-4 mb-3"><ContestBanner /></div>

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
      <div className="home-social-row">
        <Button variant="ghost" onClick={() => nav("/referral")}><Gift size={15} />REFERAL</Button>
        <Button variant="ghost" onClick={() => nav("/live")}><Swords size={15} />LIVE PvP</Button>
        <Button variant="ghost" onClick={() => nav("/chat")}><MessageCircle size={15} />CHAT</Button>
      </div>
        <div className="inset-x-0"
        style={{
          background: isDark ? "rgba(10,23,38,0.97)" : "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)":"rgba(22,104,227,0.15)"}`,
          backdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}>
        <div className="grid grid-cols-6 items-end px-1 py-2">
          <Button variant="ghost" onClick={() => setTab("games")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all"
            style={{ background: tab === "games"?"rgba(22,104,227,0.12)":"transparent" }}>
            <HomeIcon size={20} color={tab === "games" ? ACCENT : TEXT_SUB} />
            <span className="text-xs font-bold"style={{ color: tab ==="games" ? ACCENT : TEXT_SUB, fontSize: 9 }}>{u("navHome")}</span>
          </Button>
          <Button variant="ghost" onClick={() => nav("/history")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <History size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>{u("navHistory")}</span>
          </Button>
          <Button variant="ghost" onClick={() => nav("/deposit")}
            className="flex flex-col items-center gap-1 px-1 py-1.5 rounded-2xl active:scale-95 transition-all"
            style={{
              background: "linear-gradient(180deg,#2f8fff,#1668e3)",
              boxShadow: "0 4px 16px #1d4ed844",
              marginTop: -16,
              border: "3px solid "+ (isDark ? "#0a1726" : "#fff"),
            }}>
            <Wallet size={22} color="#fff" />
            <span className="text-xs font-black text-white" style={{ fontSize: 9 }}>{t.deposit}</span>
          </Button>
          <Button variant="ghost" onClick={() =>{ setTab("promo"); setShowPromo(true); }}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all"
            style={{ background: tab === "promo"?"rgba(22,104,227,0.12)":"transparent" }}>
            <Ticket size={20} color={tab === "promo" ? ACCENT : TEXT_SUB} />
            <span className="text-xs font-bold"style={{ color: tab ==="promo" ? ACCENT : TEXT_SUB, fontSize: 9 }}>{u("navPromo")}</span>
          </Button>
          <Button variant="ghost" onClick={() => nav("/support")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <MessageCircle size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>{u("navChat")}</span>
          </Button>
          <Button variant="ghost" onClick={() => nav("/howtoplay")}
            className="flex flex-col items-center gap-1 px-0 py-2 rounded-2xl active:scale-95 transition-all">
            <BookOpen size={20} color={TEXT_SUB} />
            <span className="text-xs font-bold" style={{ color: TEXT_SUB, fontSize: 9 }}>{u("navRules")}</span>
          </Button>
        </div>
      </div>
      </div>

    </div>
  );
}
