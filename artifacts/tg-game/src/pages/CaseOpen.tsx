import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { rollOutcome } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import Sym from "@/components/casino/Sym";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

/**
 * KEYS OCHISH — haqiqiy keys (case) mexanikasi:
 * 3 xil keys (narxi va sovrinlari boshqacha), lenta aylanadi va sovrin ustida to'xtaydi.
 * Koeffitsiyentlar 1.1 dan boshlanadi, hech qayerda toppa-to'g'ri x2 yo'q.
 */

type Prize = { m: number; icon: string; color: string; rare: string };

const CASES: { key: string; uz: string; icon: string; c1: string; prizes: Prize[] }[] = [
  {
    key: "bronze", uz: "Bronza Keys", icon: "chest", c1: "#b45309",
    prizes: [
      { m: 0, icon: "rock", color: "#6b7280", rare: "Bo'sh" },
      { m: 1.1, icon: "coin1", color: "#a3a3a3", rare: "Oddiy" },
      { m: 0, icon: "skull", color: "#6b7280", rare: "Bo'sh" },
      { m: 1.4, icon: "medal-bronze", color: "#b45309", rare: "Oddiy" },
      { m: 0, icon: "paper", color: "#6b7280", rare: "Bo'sh" },
      { m: 2.4, icon: "medal-silver", color: "#94a3b8", rare: "Kamyob" },
      { m: 0, icon: "rock", color: "#6b7280", rare: "Bo'sh" },
      { m: 6.5, icon: "medal-gold", color: "#f59e0b", rare: "Epik" },
    ],
  },
  {
    key: "silver", uz: "Kumush Keys", icon: "gift", c1: "#94a3b8",
    prizes: [
      { m: 0, icon: "skull", color: "#6b7280", rare: "Bo'sh" },
      { m: 1.3, icon: "coin", color: "#a3a3a3", rare: "Oddiy" },
      { m: 0, icon: "rock", color: "#6b7280", rare: "Bo'sh" },
      { m: 2.7, icon: "medal-silver", color: "#94a3b8", rare: "Kamyob" },
      { m: 0, icon: "paper", color: "#6b7280", rare: "Bo'sh" },
      { m: 5.5, icon: "trophy", color: "#f59e0b", rare: "Epik" },
      { m: 0, icon: "skull", color: "#6b7280", rare: "Bo'sh" },
      { m: 14, icon: "gem", color: "#22d3ee", rare: "Legendar" },
    ],
  },
  {
    key: "gold", uz: "Oltin Keys", icon: "treasure", c1: "#f7c948",
    prizes: [
      { m: 0, icon: "skull", color: "#6b7280", rare: "Bo'sh" },
      { m: 1.5, icon: "coin1", color: "#a3a3a3", rare: "Oddiy" },
      { m: 0, icon: "rock", color: "#6b7280", rare: "Bo'sh" },
      { m: 3.4, icon: "crown", color: "#f7c948", rare: "Kamyob" },
      { m: 0, icon: "paper", color: "#6b7280", rare: "Bo'sh" },
      { m: 9, icon: "moneybags", color: "#22c55e", rare: "Epik" },
      { m: 0, icon: "skull", color: "#6b7280", rare: "Bo'sh" },
      { m: 40, icon: "gem", color: "#a78bfa", rare: "Legendar" },
    ],
  },
];

const CELL = 96;

export default function CaseOpen() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("case");
  const [ci, setCi] = useState(0);
  const [offset, setOffset] = useState(0);
  const [spin, setSpin] = useState(false);
  const [hit, setHit] = useState<Prize | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const box = CASES[ci];
  const PRIZES = box.prizes;
  const strip = Array.from({ length: 64 }, (_, i) => PRIZES[i % PRIZES.length]);
  const top = Math.max(...PRIZES.map((p) => p.m));

  const play = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setHit(null); setSpin(true); setOffset(0);
    const out = rollOutcome();
    const pool = PRIZES.map((p, i) => ({ p, i })).filter((x) =>
      out === "win" ? x.p.m > 1.05 : out === "refund" ? x.p.m > 1 && x.p.m < 1.6 : x.p.m === 0,
    );
    const chosen = (pool.length ? pool : PRIZES.map((p, i) => ({ p, i })))[
      Math.floor(Math.random() * (pool.length || PRIZES.length))
    ];
    const idx = 48 + chosen.i;
    const stopTick = startTicker(64);
    sfx.spin();
    requestAnimationFrame(() => setOffset(idx * CELL));
    timer.current = setTimeout(async () => {
      stopTick(); setSpin(false); setHit(chosen.p);
      const m = out === "refund" ? Math.max(1, chosen.p.m) : chosen.p.m;
      const w = await settle(m);
      setAmount(w); setWon(m > 1); setBusy(false);
    }, 3400);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.caseopen) }}>
      <GameHeader icon="chest" title={` ${GAME_NAMES.case[lang]}`} subtitle={`${box.uz} · x${top}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        {/* keys tanlash */}
        <div className="w-full grid grid-cols-3 gap-2">
          {CASES.map((c, i) => (
            <button key={c.key} disabled={busy} onClick={() => { setCi(i); setHit(null); setWon(null); sfx.select(); }}
              className="rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-95 transition-all"
              style={{
                background: ci === i ? `linear-gradient(160deg,${c.c1}44,rgba(0,0,0,.5))` : "rgba(255,255,255,.05)",
                border: `1px solid ${ci === i ? c.c1 : ts.cardBorder}`,
                boxShadow: ci === i ? `0 0 18px ${c.c1}55` : "none",
              }}>
              <Sym n={c.icon} s={34} glow={ci === i} />
              <span className="font-black" style={{ fontSize: 10, color: ci === i ? c.c1 : ts.textSub }}>{c.uz}</span>
            </button>
          ))}
        </div>

        {/* lenta */}
        <div className="w-full rounded-3xl py-6 relative overflow-hidden"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <div style={{
            position: "absolute", left: "50%", top: 0, bottom: 0, width: 3,
            background: box.c1, boxShadow: `0 0 16px ${box.c1}`, zIndex: 2, transform: "translateX(-50%)",
          }} />
          <div className="flex" style={{
            transform: `translateX(calc(50% - ${offset + CELL / 2}px))`,
            transition: spin ? "transform 3.3s cubic-bezier(0.08,0.82,0.03,1)" : "none",
          }}>
            {strip.map((p, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center justify-center rounded-xl mx-0.5"
                style={{
                  width: CELL - 4, height: 100,
                  background: `linear-gradient(180deg,${p.color}33,rgba(0,0,0,.55))`,
                  border: `1px solid ${p.color}66`,
                }}>
                <Sym n={p.icon} s={50} />
                <span className="font-black" style={{ fontSize: 10, color: p.color }}>{p.m > 0 ? `x${p.m}` : "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {hit && (
          <div className="w-full rounded-2xl py-3 text-center font-black"
            style={{ background: `${hit.color}22`, color: hit.color, border: `1px solid ${hit.color}66`, fontSize: 13 }}>
            <Sym n={hit.icon} s={22} /> {hit.rare} {hit.m > 0 ? `· x${hit.m}` : ""}
          </div>
        )}

        <div className="w-full grid grid-cols-4 gap-1.5">
          {PRIZES.filter((p) => p.m > 0).map((p, i) => (
            <div key={i} className="rounded-xl py-2 text-center font-black"
              style={{ fontSize: 11, background: `${p.color}22`, color: p.color }}>
              <Sym n={p.icon} s={18} /> x{p.m}
            </div>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("openCase", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
