import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx } from "@/lib/sound";
import { g } from "@/lib/game-i18n";
import { NEW_GAME_MAP, type GameCfg } from "@/lib/new-games";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

const sym = (n: string) => `/symbols/${n}.png`;
const rnd = (n: number) => Math.floor(Math.random() * n);

/**
 * Universal kazino dvigateli — 5 xil o'yin turi (reel, pick, wheel, race, climb).
 * Har bir o'yin o'z rangi, belgilari va animatsiyasi bilan ishlaydi.
 */
export default function QuickGame({ gameKey }: { gameKey: string }) {
  const cfg = NEW_GAME_MAP[gameKey];
  if (!cfg) return null;
  return <Engine key={cfg.key} cfg={cfg} />;
}

function Engine({ cfg }: { cfg: GameCfg }) {
  const { lang } = useLang();
  const { ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet(cfg.key);

  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  // umumiy holatlar
  const [choice, setChoice] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<number[]>([0, 1, 2]);
  const [angle, setAngle] = useState(0);
  const [progress, setProgress] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [cashMult, setCashMult] = useState(1);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms) as unknown as number); };

  const bg = `radial-gradient(120% 100% at 50% 0%, ${cfg.c1}33 0%, transparent 60%), linear-gradient(160deg, ${cfg.c2} 0%, #05080f 100%)`;

  const finish = async (win: boolean, mult: number) => {
    const w = await settle(win ? mult : 0);
    setAmount(w);
    setWon(win);
    setBusy(false);
  };

  /* ─────────── REEL ─────────── */
  const playReel = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpinning(true);
    sfx.spin();
    const win = riggedWin();
    const iv = window.setInterval(() => setReels([rnd(cfg.syms.length), rnd(cfg.syms.length), rnd(cfg.syms.length)]), 70);
    later(() => {
      clearInterval(iv);
      setSpinning(false);
      if (win) { const s = rnd(cfg.syms.length); setReels([s, s, s]); }
      else {
        let a = rnd(cfg.syms.length), b = rnd(cfg.syms.length), c = rnd(cfg.syms.length);
        if (a === b && b === c) c = (c + 1) % cfg.syms.length;
        setReels([a, b, c]);
      }
      finish(win, cfg.mult);
    }, 1500);
  };

  /* ─────────── PICK ─────────── */
  const playPick = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setRevealed(null); setSpinning(true);
    sfx.reveal();
    const win = riggedWin();
    later(() => {
      setSpinning(false);
      const good = win ? choice : (choice + 1 + rnd(cfg.n - 1)) % cfg.n;
      setRevealed(good);
      finish(win, cfg.mult);
    }, 900);
  };

  /* ─────────── WHEEL ─────────── */
  const playWheel = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpinning(true);
    sfx.wheel();
    const win = riggedWin();
    const seg = 360 / cfg.n;
    const target = win ? 0 : 1 + rnd(cfg.n - 1);
    setAngle((a) => a + 360 * 5 + ((360 - target * seg - seg / 2) - (a % 360) + 360) % 360);
    later(() => { setSpinning(false); finish(win, cfg.mult); }, 2600);
  };

  /* ─────────── RACE ─────────── */
  const playRace = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpinning(true);
    sfx.spin();
    const win = riggedWin();
    const winner = win ? choice : (choice + 1 + rnd(cfg.n - 1)) % cfg.n;
    const finals = Array.from({ length: cfg.n }, (_, i) => (i === winner ? 100 : 45 + Math.random() * 42));
    setProgress(Array.from({ length: cfg.n }, () => 0));
    later(() => setProgress(finals), 60);
    later(() => { setSpinning(false); finish(win, cfg.mult); }, 2400);
  };

  /* ─────────── CLIMB ─────────── */
  const climbNext = () => {
    if (busy && step === 0) return;
    if (!canPlay && step === 0) return;
    if (step === 0) { setBusy(true); setWon(null); }
    sfx.reveal();
    const safe = riggedWin() || step < 1; // birinchi bosqich ko'pincha o'tadi
    if (!safe) { sfx.boom(); setStep(0); setCashMult(1); finish(false, 0); return; }
    const next = step + 1;
    const mult = Number((1 + next * (cfg.mult - 1)).toFixed(2));
    setStep(next); setCashMult(mult);
    if (next >= cfg.n) { setStep(0); setCashMult(1); finish(true, mult); }
  };
  const climbCash = async () => {
    if (step === 0) return;
    sfx.cash();
    const m = cashMult;
    setStep(0); setCashMult(1);
    await finish(true, m);
  };

  const play = () =>
    cfg.engine === "reel" ? playReel()
    : cfg.engine === "pick" ? playPick()
    : cfg.engine === "wheel" ? playWheel()
    : cfg.engine === "race" ? playRace()
    : climbNext();

  const wheelBg = useMemo(() => {
    const seg = 360 / cfg.n;
    const parts = Array.from({ length: cfg.n }, (_, i) =>
      `${i === 0 ? cfg.c1 : i % 2 ? "#12203a" : cfg.c2} ${i * seg}deg ${(i + 1) * seg}deg`);
    return `conic-gradient(${parts.join(",")})`;
  }, [cfg]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg }}>
      <GameHeader icon={cfg.syms[0]} title={cfg.name[lang]} subtitle={`x${cfg.mult}`} />

      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        {/* ───── SAHNA ───── */}
        <div className="w-full rounded-3xl p-4 relative overflow-hidden"
          style={{ background: ts.card, border: `1px solid ${cfg.c1}44`, boxShadow: `0 12px 40px ${cfg.c1}22` }}>
          <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${cfg.c1},transparent)` }} />

          {cfg.engine === "reel" && (
            <div className="grid grid-cols-3 gap-2 py-4">
              {reels.map((s, i) => (
                <div key={i} className="rounded-2xl flex items-center justify-center"
                  style={{
                    height: 92,
                    background: `linear-gradient(180deg,${cfg.c2}cc,#05080fcc)`,
                    border: `1px solid ${cfg.c1}55`,
                    boxShadow: spinning ? "none" : `0 0 18px ${cfg.c1}44 inset`,
                  }}>
                  <img src={sym(cfg.syms[s])} width={54} height={54} alt=""
                    style={{ filter: `drop-shadow(0 6px 12px ${cfg.c1}66)`, transition: "transform .12s", transform: spinning ? "translateY(-6px) scale(0.94)" : "none" }} />
                </div>
              ))}
            </div>
          )}

          {cfg.engine === "pick" && (
            <div className={`grid gap-2 py-3 ${cfg.n > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
              {Array.from({ length: cfg.n }).map((_, i) => {
                const isOpen = revealed !== null;
                const good = revealed === i;
                return (
                  <button key={i} disabled={busy}
                    onClick={() => { setChoice(i); sfx.select(); }}
                    className="rounded-2xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-80"
                    style={{
                      height: 84,
                      background: isOpen
                        ? (good ? `linear-gradient(180deg,${cfg.c1},${cfg.c2})` : "rgba(255,255,255,0.05)")
                        : choice === i ? `linear-gradient(180deg,${cfg.c1}55,${cfg.c2})` : "rgba(255,255,255,0.06)",
                      border: `1px solid ${choice === i ? cfg.c1 : "rgba(255,255,255,0.12)"}`,
                      boxShadow: choice === i ? `0 0 18px ${cfg.c1}55` : "none",
                      transform: spinning && choice === i ? "scale(1.05)" : "none",
                    }}>
                    <img src={sym(isOpen && !good && cfg.syms[1] ? cfg.syms[1] : cfg.syms[0])} width={40} height={40} alt=""
                      className={spinning ? "idle-bob" : ""} style={{ opacity: isOpen && !good ? 0.45 : 1 }} />
                  </button>
                );
              })}
            </div>
          )}

          {cfg.engine === "wheel" && (
            <div className="py-4 flex flex-col items-center">
              <div className="relative" style={{ width: 220, height: 220 }}>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10"
                  style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${cfg.c1}` }} />
                <div className="rounded-full w-full h-full"
                  style={{
                    background: wheelBg,
                    border: `6px solid ${cfg.c1}`,
                    boxShadow: `0 0 30px ${cfg.c1}55`,
                    transform: `rotate(${angle}deg)`,
                    transition: "transform 2.5s cubic-bezier(0.16, 0.8, 0.2, 1)",
                  }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img src={sym("coin")} width={44} height={44} alt="" className="idle-bob" />
                </div>
              </div>
            </div>
          )}

          {cfg.engine === "race" && (
            <div className="py-3 flex flex-col gap-2">
              {Array.from({ length: cfg.n }).map((_, i) => (
                <button key={i} disabled={busy} onClick={() => { setChoice(i); sfx.select(); }}
                  className="relative rounded-xl overflow-hidden text-left active:scale-[0.98] transition-all"
                  style={{
                    height: 38,
                    background: choice === i ? `${cfg.c1}22` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${choice === i ? cfg.c1 : "rgba(255,255,255,0.1)"}`,
                  }}>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-black" style={{ color: cfg.c1 }}>#{i + 1}</span>
                  <img src={sym(cfg.syms[0])} width={26} height={26} alt=""
                    style={{
                      position: "absolute", top: 6,
                      left: `calc(${(progress[i] ?? 0)}% - ${(progress[i] ?? 0) * 0.3}px + 26px)`,
                      transition: "left 2.2s cubic-bezier(0.4,0.1,0.3,1)",
                      filter: `drop-shadow(0 4px 8px ${cfg.c1}88)`,
                    }} />
                </button>
              ))}
            </div>
          )}

          {cfg.engine === "climb" && (
            <div className="py-3 flex flex-col-reverse gap-1.5">
              {Array.from({ length: cfg.n }).map((_, i) => {
                const done = i < step;
                return (
                  <div key={i} className="rounded-xl flex items-center justify-between px-3"
                    style={{
                      height: 40,
                      background: done ? `linear-gradient(90deg,${cfg.c1}44,transparent)` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${done ? cfg.c1 : "rgba(255,255,255,0.1)"}`,
                    }}>
                    <img src={sym(done ? cfg.syms[0] : cfg.syms[1] ?? cfg.syms[0])} width={22} height={22} alt=""
                      style={{ opacity: done ? 1 : 0.35 }} />
                    <span className="text-xs font-black" style={{ color: done ? cfg.c1 : "rgba(255,255,255,0.4)" }}>
                      x{(1 + (i + 1) * (cfg.mult - 1)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy || step > 0} />

        {cfg.engine === "climb" && step > 0 ? (
          <div className="w-full grid grid-cols-2 gap-3">
            <PlayButton label={`${g("play", lang)} x${(1 + (step + 1) * (cfg.mult - 1)).toFixed(2)}`} onClick={climbNext} />
            <PlayButton label={`${g("cashout", lang)} x${cashMult.toFixed(2)}`} onClick={climbCash}
              color="linear-gradient(180deg,#f7c948,#b45309)" />
          </div>
        ) : (
          <PlayButton label={`${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        )}

        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
