import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { rollOutcome, riggedWin } from "@/lib/odds";
import { coverOf, type GameCfg } from "@/lib/new-games";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";
import Sym from "@/components/casino/Sym";
import PlayingCard from "@/components/casino/PlayingCard";

/* ════════════════ umumiy yordamchilar ════════════════ */

const rnd = (n: number) => Math.floor(Math.random() * n);
const RESULT_DELAY = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => n.toLocaleString("uz-UZ");

function useGame(cfg: GameCfg) {
  const b = useBet(cfg.key);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const [refund, setRefund] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const finish = useCallback(async (mult: number) => {
    await sleep(RESULT_DELAY);
    const w = await b.settle(mult);
    if (!alive.current) return;
    setAmount(w);
    setRefund(mult === 1);
    setWon(mult > 0);
    b.setBusy(false);
  }, [b]);

  const begin = useCallback(() => {
    setWon(null); setAmount(0); setRefund(false); b.setBusy(true);
  }, [b]);

  return { ...b, won, amount, refund, finish, begin };
}

type EProps = { cfg: GameCfg };

function Shell({
  cfg, children, footer, won, amount, refund, hint,
}: {
  cfg: GameCfg;
  children: React.ReactNode;
  footer: React.ReactNode;
  won: boolean | null;
  amount: number;
  refund?: boolean;
  hint?: string;
}) {
  const { lang } = useLang();
  const { ts } = useTheme();
  const cover = coverOf(cfg.key);
  const bg = `radial-gradient(120% 100% at 50% 0%, ${cfg.c1}33 0%, transparent 60%), linear-gradient(160deg, ${cfg.c2} 0%, #05080f 100%)`;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: bg }}>
      {cover && (
        <>
          <img src={cover} alt="" aria-hidden
            className="fixed inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.35, zIndex: 0 }} />
          <span className="fixed inset-0 pointer-events-none" style={{
            zIndex: 0,
            background: `linear-gradient(180deg, rgba(3,6,12,0.6) 0%, ${cfg.c2}cc 55%, rgba(3,6,12,0.94) 100%)`,
          }} />
        </>
      )}
      <div className="relative" style={{ zIndex: 1 }}>
        <GameHeader icon={cfg.syms[0]} title={cfg.name[lang]} subtitle={`x${cfg.mult}`} />
      </div>
      <div className="flex-1 px-4 pb-8 pt-3 flex flex-col gap-3 items-center relative" style={{ zIndex: 1 }}>
        <div className="w-full rounded-3xl p-3 relative overflow-hidden" style={{
          background: ts.card,
          border: "1px solid rgba(247,201,72,0.32)",
          boxShadow: "0 14px 44px rgba(247,201,72,0.14)",
        }}>
          <span className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg,transparent,#f7c948,transparent)" }} />
          <div className="relative">{children}</div>
        </div>
        {hint && (
          <p className="text-[11px] font-bold tracking-wide text-center" style={{ color: "#c9b071" }}>{hint}</p>
        )}
        <ResultBanner
          win={won}
          text={won ? (refund ? "PUL QAYTARILDI" : "YUTUQ") : "YUTQAZISH"}
          amount={amount}
        />
        {footer}
      </div>
    </div>
  );
}

function Bet({ g }: { g: ReturnType<typeof useGame> }) {
  return <BetPanel value={g.betInput} onChange={g.setBetInput} onQuick={g.quick} disabled={g.busy} />;
}

/* ════════════════ 1. MINA MAYDONI ════════════════ */
function MinesGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const SIZE = 25;
  const bombs = cfg.n; // 3 yoki 5 ta mina
  const [board, setBoard] = useState<number[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const [dead, setDead] = useState<number | null>(null);
  const mult = Number((1 + open.length * (cfg.mult - 1)).toFixed(2));

  const start = () => {
    if (!g.canPlay) return;
    g.begin();
    const b = new Array(SIZE).fill(0);
    const idx = [...Array(SIZE).keys()];
    for (let i = 0; i < bombs; i++) b[idx.splice(rnd(idx.length), 1)[0]] = 1;
    setBoard(b); setOpen([]); setDead(null); setLive(true);
  };

  const tap = (i: number) => {
    if (!live || open.includes(i)) return;
    const safe = riggedWin() || open.length < 1;
    if (!safe || board[i] === 1) {
      setDead(i); setLive(false);
      g.finish(0);
      return;
    }
    const next = [...open, i];
    setOpen(next);
    if (next.length >= SIZE - bombs) { setLive(false); g.finish(mult); }
  };

  const cash = () => { if (!live || !open.length) return; setLive(false); g.finish(mult); };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={live ? `Joriy koeffitsiyent x${mult} · ${bombs} ta mina` : `${bombs} ta minadan qoching`}
      footer={
        <>
          <Bet g={g} />
          {live
            ? <PlayButton label={`OLISH ${fmt(Math.floor(g.bet * mult))}`} icon="coin" onClick={cash} color="linear-gradient(180deg,#f7c948,#a16207)" />
            : <PlayButton label="BOSHLASH" icon="gem" onClick={start} disabled={!g.canPlay} />}
        </>
      }>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: SIZE }).map((_, i) => {
          const isOpen = open.includes(i);
          const isDead = dead === i;
          const reveal = !live && dead !== null && board[i] === 1;
          return (
            <button key={i} onClick={() => tap(i)} disabled={!live}
              className="aspect-square rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{
                background: isDead ? "linear-gradient(180deg,#ef4444,#7f1d1d)"
                  : isOpen ? "linear-gradient(180deg,#22d3ee44,#0e749077)"
                  : `linear-gradient(180deg,${cfg.c1}33,rgba(0,0,0,0.55))`,
                border: `1px solid ${isOpen ? "#22d3ee" : "rgba(247,201,72,0.28)"}`,
              }}>
              {isOpen && <Sym n={cfg.syms[0]} s={22} />}
              {(isDead || reveal) && <Sym n="bomb" s={22} />}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ════════════════ 2. KRESH (raketa) ════════════════ */
function CrashGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const [mult, setMult] = useState(1);
  const [live, setLive] = useState(false);
  const [crashAt, setCrashAt] = useState(0);
  const [boom, setBoom] = useState(false);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = () => {
    if (!g.canPlay) return;
    g.begin();
    const win = rollOutcome() === "win";
    const target = win ? 1.6 + Math.random() * (cfg.mult - 1.6) : 1 + Math.random() * 0.9;
    setCrashAt(target); setMult(1); setBoom(false); setLive(true);
    const t0 = performance.now();
    const loop = (t: number) => {
      const s = (t - t0) / 1000;
      const m = Number((1 + Math.pow(s, 1.55) * 0.42).toFixed(2));
      setMult(m);
      if (m >= target) {
        setBoom(true); setLive(false);
        g.finish(0);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const cash = () => {
    if (!live) return;
    cancelAnimationFrame(raf.current);
    setLive(false);
    g.finish(mult);
  };

  const prog = Math.min(1, (mult - 1) / Math.max(0.5, cfg.mult - 1));

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={live ? "Portlashdan oldin pulni oling!" : `Maksimal x${cfg.mult}`}
      footer={
        <>
          <Bet g={g} />
          {live
            ? <PlayButton label={`OLISH x${mult.toFixed(2)}`} icon="coin" onClick={cash} color="linear-gradient(180deg,#f7c948,#a16207)" />
            : <PlayButton label="UCHIRISH" icon={cfg.syms[0]} onClick={start} disabled={!g.canPlay} />}
        </>
      }>
      <div className="relative h-[220px] rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(180deg,${cfg.c2},#03060c)`,
      }}>
        <div className="absolute inset-0 opacity-40" style={{
          background: "repeating-linear-gradient(90deg,rgba(255,255,255,0.06) 0 1px,transparent 1px 42px), repeating-linear-gradient(0deg,rgba(255,255,255,0.06) 0 1px,transparent 1px 42px)",
        }} />
        <div className="absolute transition-none" style={{
          left: `${8 + prog * 74}%`,
          bottom: `${8 + prog * 66}%`,
          transform: `rotate(${boom ? 0 : -28}deg) scale(${boom ? 1.5 : 1})`,
        }}>
          <Sym n={boom ? "boom" : cfg.syms[0]} s={54} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black tabular-nums" style={{
            fontSize: 46,
            color: boom ? "#f87171" : "#ffe9a8",
            textShadow: `0 0 26px ${boom ? "#ef4444" : cfg.c1}`,
          }}>
            {boom ? `x${crashAt.toFixed(2)}` : `x${mult.toFixed(2)}`}
          </span>
        </div>
      </div>
    </Shell>
  );
}

/* ════════════════ 3. SIC BO (3 zar) ════════════════ */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};
function Die({ v, spin }: { v: number; spin: boolean }) {
  return (
    <div className="relative rounded-xl" style={{
      width: 58, height: 58,
      background: "linear-gradient(160deg,#fffdf5,#d7cdb4)",
      boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.25), 0 8px 18px rgba(0,0,0,0.5)",
      animation: spin ? "dice-bounce 0.45s linear infinite" : undefined,
    }}>
      {(PIPS[v] ?? []).map(([x, y], i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: `${x}%`, top: `${y}%`, width: 10, height: 10,
          transform: "translate(-50%,-50%)", background: "#14100a",
        }} />
      ))}
    </div>
  );
}
function SicBoGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const BETS = [
    { k: "small", uz: "KICHIK 4-10", m: 1.9 },
    { k: "big", uz: "KATTA 11-17", m: 1.9 },
    { k: "even", uz: "JUFT", m: 1.9 },
    { k: "triple", uz: "UCHLIK", m: cfg.mult },
  ];
  const [pick, setPick] = useState("small");
  const [dice, setDice] = useState([1, 1, 1]);
  const [spin, setSpin] = useState(false);

  const roll = () => {
    if (!g.canPlay) return;
    g.begin(); setSpin(true);
    const win = rollOutcome() === "win";
    const iv = window.setInterval(() => setDice([1 + rnd(6), 1 + rnd(6), 1 + rnd(6)]), 90);
    window.setTimeout(() => {
      clearInterval(iv);
      let d: number[] = [];
      for (let i = 0; i < 400; i++) {
        const c = [1 + rnd(6), 1 + rnd(6), 1 + rnd(6)];
        const s = c[0] + c[1] + c[2];
        const trip = c[0] === c[1] && c[1] === c[2];
        const hit =
          pick === "small" ? s >= 4 && s <= 10 && !trip :
          pick === "big" ? s >= 11 && s <= 17 && !trip :
          pick === "even" ? s % 2 === 0 && !trip : trip;
        if (hit === win) { d = c; break; }
      }
      if (!d.length) d = [1 + rnd(6), 1 + rnd(6), 1 + rnd(6)];
      setDice(d); setSpin(false);
      g.finish(win ? (BETS.find((b) => b.k === pick)?.m ?? cfg.mult) : 0);
    }, 1400);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={`Yig'indi: ${dice[0] + dice[1] + dice[2]}`}
      footer={<><Bet g={g} /><PlayButton label="ZAR TASHLASH" icon="dice" onClick={roll} disabled={!g.canPlay} /></>}>
      <div className="flex justify-center gap-3 py-6">
        {dice.map((d, i) => <Die key={i} v={d} spin={spin} />)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BETS.map((b) => (
          <button key={b.k} disabled={g.busy} onClick={() => setPick(b.k)}
            className="py-2.5 rounded-xl font-black text-[12px] active:scale-95 transition-transform"
            style={{
              background: pick === b.k ? `linear-gradient(180deg,${cfg.c1},${cfg.c2})` : "rgba(0,0,0,0.45)",
              border: `1px solid ${pick === b.k ? "#ffd766" : "rgba(247,201,72,0.28)"}`,
              color: pick === b.k ? "#1a1204" : "#ffe9a8",
            }}>
            {b.uz} <span className="opacity-70">x{b.m}</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

/* ════════════════ 4. RULETKA (raqamli) ════════════════ */
const WHEEL_NUMS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3]);
function RouletteGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const [pick, setPick] = useState<"red" | "black" | "even" | "dozen">("red");
  const [ang, setAng] = useState(0);
  const [num, setNum] = useState(0);
  const [spin, setSpin] = useState(false);
  const M: Record<string, number> = { red: 1.95, black: 1.95, even: 1.95, dozen: cfg.mult };

  const play = () => {
    if (!g.canPlay) return;
    g.begin(); setSpin(true);
    const win = rollOutcome() === "win";
    const pool = WHEEL_NUMS.filter((n) => {
      if (n === 0) return !win;
      const hit = pick === "red" ? REDS.has(n) : pick === "black" ? !REDS.has(n) : pick === "even" ? n % 2 === 0 : n <= 12;
      return hit === win;
    });
    const res = pool[rnd(pool.length)] ?? 0;
    const idx = WHEEL_NUMS.indexOf(res);
    const seg = 360 / WHEEL_NUMS.length;
    setNum(res);
    setAng((a) => a + 1800 + ((360 - idx * seg - seg / 2) - (a % 360) + 720) % 360);
    window.setTimeout(() => { setSpin(false); g.finish(win ? M[pick] : 0); }, 4200);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={spin ? "Shar aylanmoqda..." : `Oxirgi raqam: ${num}`}
      footer={<><Bet g={g} /><PlayButton label="AYLANTIRISH" icon="chip" onClick={play} disabled={!g.canPlay} /></>}>
      <div className="relative mx-auto" style={{ width: 250, height: 250 }}>
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20" style={{
          width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
          borderTop: "16px solid #f7c948",
        }} />
        <div className="absolute inset-0 rounded-full" style={{
          transform: `rotate(${ang}deg)`,
          transition: "transform 4s cubic-bezier(0.16,0.9,0.2,1)",
          background: `conic-gradient(${WHEEL_NUMS.map((n, i) => {
            const seg = 360 / WHEEL_NUMS.length;
            const col = n === 0 ? "#16a34a" : REDS.has(n) ? "#c1121f" : "#0b1220";
            return `${col} ${i * seg}deg ${(i + 1) * seg}deg`;
          }).join(",")})`,
          border: "6px solid #f7c948",
          boxShadow: "0 0 34px rgba(247,201,72,0.35), inset 0 0 30px rgba(0,0,0,0.7)",
        }}>
          {WHEEL_NUMS.map((n, i) => {
            const seg = 360 / WHEEL_NUMS.length;
            return (
              <span key={n} className="absolute left-1/2 top-1/2 font-black text-[9px] text-white"
                style={{ transform: `rotate(${i * seg + seg / 2}deg) translateY(-104px)`, transformOrigin: "0 0" }}>
                {n}
              </span>
            );
          })}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-black"
          style={{
            width: 92, height: 92, fontSize: 30, color: "#1a1204",
            background: "radial-gradient(circle at 35% 30%,#fff6cf,#f7c948 55%,#8a5a09)",
            boxShadow: "0 8px 22px rgba(0,0,0,0.55)",
          }}>
          {spin ? "…" : num}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {([["red", "QIZIL"], ["black", "QORA"], ["even", "JUFT"], ["dozen", "1-12"]] as const).map(([k, l]) => (
          <button key={k} disabled={g.busy} onClick={() => setPick(k)}
            className="py-2 rounded-xl font-black text-[11px] active:scale-95 transition-transform"
            style={{
              background: pick === k ? "linear-gradient(180deg,#f7c948,#a16207)" : "rgba(0,0,0,0.45)",
              border: "1px solid rgba(247,201,72,0.3)",
              color: pick === k ? "#1a1204" : "#ffe9a8",
            }}>{l}</button>
        ))}
      </div>
    </Shell>
  );
}

/* ════════════════ 5. HI-LO ════════════════ */
const SUITS = ["♠", "♥", "♦", "♣"] as const;
const VALS = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const vIdx = (v: string) => VALS.indexOf(v);
function HiLoGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const [card, setCard] = useState({ s: SUITS[0], v: "9" });
  const [next, setNext] = useState<{ s: (typeof SUITS)[number]; v: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [live, setLive] = useState(false);
  const mult = Number(Math.pow(cfg.mult, streak).toFixed(2));

  const start = () => {
    if (!g.canPlay) return;
    g.begin();
    setCard({ s: SUITS[rnd(4)], v: VALS[1 + rnd(VALS.length - 2)] });
    setNext(null); setStreak(0); setLive(true);
  };

  const guess = (hi: boolean) => {
    if (!live) return;
    const win = riggedWin();
    const cur = vIdx(card.v);
    const pool = VALS.filter((v, i) => (hi ? i > cur : i < cur) === win && i !== cur);
    const nv = pool.length ? pool[rnd(pool.length)] : VALS[rnd(VALS.length)];
    const nc = { s: SUITS[rnd(4)], v: nv };
    setNext(nc);
    window.setTimeout(() => {
      setCard(nc); setNext(null);
      if (!win) { setLive(false); g.finish(0); return; }
      const s = streak + 1;
      setStreak(s);
      if (s >= cfg.n) { setLive(false); g.finish(Number(Math.pow(cfg.mult, s).toFixed(2))); }
    }, 650);
  };

  const cash = () => { if (!live || !streak) return; setLive(false); g.finish(mult); };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={live ? `Seriya ${streak}/${cfg.n} · x${mult}` : `Har to'g'ri javob x${cfg.mult}`}
      footer={
        <>
          <Bet g={g} />
          {live ? (
            <div className="w-full grid grid-cols-2 gap-2">
              <PlayButton label="BALAND" icon="star" onClick={() => guess(true)} />
              <PlayButton label="PAST" icon="chip" onClick={() => guess(false)} color="linear-gradient(180deg,#c93a33,#8e1710)" />
              <div className="col-span-2">
                <PlayButton label={`OLISH ${fmt(Math.floor(g.bet * mult))}`} icon="coin" onClick={cash}
                  disabled={!streak} color="linear-gradient(180deg,#f7c948,#a16207)" />
              </div>
            </div>
          ) : (
            <PlayButton label="BOSHLASH" icon="cardback" onClick={start} disabled={!g.canPlay} />
          )}
        </>
      }>
      <div className="flex items-center justify-center gap-4 py-6">
        <PlayingCard suit={card.s} value={card.v} w={84} />
        {next
          ? <PlayingCard suit={next.s} value={next.v} w={84} delay={40} />
          : <PlayingCard suit="♠" value="A" hidden w={84} />}
      </div>
    </Shell>
  );
}

/* ════════════════ 6. KAZINO URUSHI ════════════════ */
function WarGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const [me, setMe] = useState<{ s: any; v: string } | null>(null);
  const [foe, setFoe] = useState<{ s: any; v: string } | null>(null);
  const [deal, setDeal] = useState(false);

  const play = () => {
    if (!g.canPlay) return;
    g.begin(); setDeal(true); setMe(null); setFoe(null);
    const out = rollOutcome();
    window.setTimeout(() => {
      let a = VALS[rnd(VALS.length)], b = VALS[rnd(VALS.length)];
      for (let i = 0; i < 200; i++) {
        a = VALS[rnd(VALS.length)]; b = VALS[rnd(VALS.length)];
        const ok = out === "win" ? vIdx(a) > vIdx(b) : out === "refund" ? vIdx(a) === vIdx(b) : vIdx(a) < vIdx(b);
        if (ok) break;
      }
      setMe({ s: SUITS[rnd(4)], v: a });
      setFoe({ s: SUITS[rnd(4)], v: b });
      setDeal(false);
      g.finish(out === "win" ? cfg.mult : out === "refund" ? 1 : 0);
    }, 900);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint="Kartangiz dilernikidan baland bo'lsa yutasiz · teng bo'lsa pul qaytadi"
      footer={<><Bet g={g} /><PlayButton label="KARTA TARQATISH" icon="cardback" onClick={play} disabled={!g.canPlay} /></>}>
      <div className="grid grid-cols-2 gap-3 py-5 place-items-center">
        <div className="text-center">
          <p className="text-[11px] font-black mb-2" style={{ color: "#c9b071" }}>SIZ</p>
          {me ? <PlayingCard suit={me.s} value={me.v} w={92} /> : <PlayingCard suit="♠" value="A" hidden w={92} />}
        </div>
        <div className="text-center">
          <p className="text-[11px] font-black mb-2" style={{ color: "#c9b071" }}>DILER</p>
          {foe ? <PlayingCard suit={foe.s} value={foe.v} w={92} delay={120} /> : <PlayingCard suit="♠" value="A" hidden w={92} />}
        </div>
      </div>
      {deal && <p className="text-center font-black text-sm" style={{ color: "#ffe9a8" }}>Kartalar tarqatilmoqda…</p>}
    </Shell>
  );
}

/* ════════════════ 7. PLINKO ════════════════ */
function PlinkoGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const ROWS = cfg.n;
  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= ROWS; i++) {
      const d = Math.abs(i - ROWS / 2) / (ROWS / 2);
      arr.push(Number((0.2 + Math.pow(d, 2.4) * cfg.mult).toFixed(1)));
    }
    return arr;
  }, [ROWS, cfg.mult]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [land, setLand] = useState<number | null>(null);

  const drop = () => {
    if (!g.canPlay) return;
    g.begin(); setLand(null);
    const win = rollOutcome() === "win";
    const target = win
      ? (Math.random() < 0.5 ? 0 : slots.length - 1) + (win ? 0 : 0)
      : Math.floor(slots.length / 2) + (rnd(3) - 1);
    const t = Math.max(0, Math.min(slots.length - 1, target));
    let step = 0;
    setPos({ x: 50, y: 0 });
    const iv = window.setInterval(() => {
      step++;
      const p = step / ROWS;
      const x = 50 + (t / (slots.length - 1) - 0.5) * 88 * p + (Math.random() - 0.5) * 6;
      setPos({ x, y: p * 100 });
      if (step >= ROWS) {
        clearInterval(iv);
        setLand(t);
        g.finish(win ? slots[t] : 0);
      }
    }, 130);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={`${ROWS} qator · chetdagi kataklar eng katta koeffitsiyent`}
      footer={<><Bet g={g} /><PlayButton label="SHAR TASHLASH" icon={cfg.syms[0]} onClick={drop} disabled={!g.canPlay} /></>}>
      <div className="relative h-[230px] rounded-2xl overflow-hidden" style={{ background: `linear-gradient(180deg,${cfg.c2},#03060c)` }}>
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="absolute flex justify-center gap-3 w-full"
            style={{ top: `${8 + (r / ROWS) * 78}%` }}>
            {Array.from({ length: r + 2 }).map((_, i) => (
              <span key={i} className="rounded-full" style={{ width: 6, height: 6, background: `${cfg.c1}cc` }} />
            ))}
          </div>
        ))}
        {pos && (
          <span className="absolute rounded-full" style={{
            left: `${pos.x}%`, top: `${6 + pos.y * 0.78}%`, width: 14, height: 14,
            transform: "translate(-50%,-50%)", transition: "all 0.13s linear",
            background: "radial-gradient(circle at 30% 30%,#fff,#f7c948)",
            boxShadow: `0 0 14px ${cfg.c1}`,
          }} />
        )}
      </div>
      <div className="flex gap-1 mt-2">
        {slots.map((m, i) => (
          <span key={i} className="flex-1 text-center py-1 rounded-md font-black text-[9px]"
            style={{
              background: land === i ? "linear-gradient(180deg,#f7c948,#a16207)" : "rgba(0,0,0,0.5)",
              color: land === i ? "#1a1204" : "#ffe9a8",
              border: "1px solid rgba(247,201,72,0.25)",
            }}>x{m}</span>
        ))}
      </div>
    </Shell>
  );
}

/* ════════════════ 8. KENO ════════════════ */
function KenoGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const TOTAL = 40;
  const NEED = cfg.n;
  const [sel, setSel] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);

  const toggle = (n: number) => {
    if (g.busy) return;
    setSel((s) => s.includes(n) ? s.filter((x) => x !== n) : s.length < NEED ? [...s, n] : s);
  };
  const auto = () => {
    const p = [...Array(TOTAL).keys()].map((i) => i + 1);
    const s: number[] = [];
    while (s.length < NEED) s.push(p.splice(rnd(p.length), 1)[0]);
    setSel(s);
  };

  const play = () => {
    if (!g.canPlay || sel.length !== NEED) return;
    g.begin(); setDrawn([]);
    const win = rollOutcome() === "win";
    const hits = win ? NEED : Math.max(0, NEED - 2 - rnd(2));
    const pool = [...Array(TOTAL).keys()].map((i) => i + 1).filter((n) => !sel.includes(n));
    const res = [...sel.slice(0, hits)];
    while (res.length < 10) res.push(pool.splice(rnd(pool.length), 1)[0]);
    let i = 0;
    const iv = window.setInterval(() => {
      i++;
      setDrawn(res.slice(0, i));
      if (i >= res.length) { clearInterval(iv); g.finish(win ? cfg.mult : 0); }
    }, 200);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={`${NEED} ta raqam tanlang · 10 ta shar tortiladi`}
      footer={
        <>
          <button onClick={auto} disabled={g.busy}
            className="w-full py-2 rounded-xl font-black text-[12px]"
            style={{ background: "rgba(0,0,0,0.5)", color: "#ffe9a8", border: "1px solid rgba(247,201,72,0.3)" }}>
            AVTO TANLASH
          </button>
          <Bet g={g} />
          <PlayButton label="O'YNASH" icon="ticket" onClick={play} disabled={!g.canPlay || sel.length !== NEED} />
        </>
      }>
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const n = i + 1;
          const isSel = sel.includes(n);
          const isHit = drawn.includes(n);
          return (
            <button key={n} onClick={() => toggle(n)}
              className="aspect-square rounded-lg font-black text-[11px] active:scale-90 transition-transform"
              style={{
                background: isHit && isSel ? "linear-gradient(180deg,#39c46f,#14532d)"
                  : isHit ? "linear-gradient(180deg,#f7c948,#a16207)"
                  : isSel ? `linear-gradient(180deg,${cfg.c1},${cfg.c2})` : "rgba(0,0,0,0.45)",
                color: isSel || isHit ? "#fff" : "#c9b071",
                border: "1px solid rgba(247,201,72,0.22)",
              }}>{n}</button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ════════════════ 9. QIRIB OCHISH ════════════════ */
function ScratchGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const [cells, setCells] = useState<string[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [live, setLive] = useState(false);

  const start = () => {
    if (!g.canPlay) return;
    g.begin();
    const win = rollOutcome() === "win";
    const base = Array.from({ length: 9 }, () => cfg.syms[rnd(cfg.syms.length)]);
    if (win) {
      const s = cfg.syms[rnd(cfg.syms.length)];
      const idx = [...Array(9).keys()];
      for (let i = 0; i < 3; i++) base[idx.splice(rnd(idx.length), 1)[0]] = s;
    } else {
      // 3 tadan ko'p bir xil bo'lmasin
      const count: Record<string, number> = {};
      for (let i = 0; i < 9; i++) {
        let s = base[i];
        while ((count[s] ?? 0) >= 2) s = cfg.syms[rnd(cfg.syms.length)];
        count[s] = (count[s] ?? 0) + 1;
        base[i] = s;
      }
    }
    setCells(base); setOpen([]); setLive(true);
    (start as any)._win = win;
  };

  const scratch = (i: number) => {
    if (!live || open.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 9) {
      setLive(false);
      g.finish((start as any)._win ? cfg.mult : 0);
    }
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={live ? "Kataklarni qiring — 3 ta bir xil belgi yutuq" : "Kartochka soting va qiring"}
      footer={
        <>
          <Bet g={g} />
          {live
            ? <PlayButton label="HAMMASINI OCHISH" icon="star" onClick={() => { setOpen([...Array(9).keys()]); setLive(false); g.finish((start as any)._win ? cfg.mult : 0); }} />
            : <PlayButton label="KARTOCHKA OLISH" icon={cfg.syms[0]} onClick={start} disabled={!g.canPlay} />}
        </>
      }>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => {
          const shown = open.includes(i);
          return (
            <button key={i} onClick={() => scratch(i)} disabled={!live}
              className="aspect-square rounded-xl flex items-center justify-center active:scale-95 transition-all"
              style={{
                background: shown
                  ? `linear-gradient(180deg,${cfg.c1}33,rgba(0,0,0,0.6))`
                  : "linear-gradient(135deg,#9ca3af,#4b5563 60%,#9ca3af)",
                border: `1px solid ${shown ? cfg.c1 : "rgba(255,255,255,0.25)"}`,
              }}>
              {shown ? <Sym n={cells[i]} s={30} /> : <span className="font-black text-[10px] text-white/70">QIRING</span>}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ════════════════ 10. KASKAD (match-3) ════════════════ */
function Match3Game({ cfg }: EProps) {
  const g = useGame(cfg);
  const N = cfg.n; // 5x5
  const [grid, setGrid] = useState<string[]>(() => Array.from({ length: N * N }, () => cfg.syms[rnd(cfg.syms.length)]));
  const [pop, setPop] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);

  const play = () => {
    if (!g.canPlay) return;
    g.begin(); setCombo(0);
    const win = rollOutcome() === "win";
    const rounds = win ? 3 : 1;
    let r = 0;
    const step = () => {
      r++;
      const ng = Array.from({ length: N * N }, () => cfg.syms[rnd(cfg.syms.length)]);
      const hit: number[] = [];
      if (win || r < rounds) {
        const row = rnd(N);
        const s = cfg.syms[rnd(cfg.syms.length)];
        for (let i = 0; i < N; i++) { ng[row * N + i] = s; hit.push(row * N + i); }
      }
      setGrid(ng); setPop(hit); setCombo(r);
      window.setTimeout(() => setPop([]), 420);
      if (r >= rounds) { g.finish(win ? cfg.mult : 0); return; }
      window.setTimeout(step, 620);
    };
    step();
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={combo ? `Kaskad x${combo}` : "Bir qatorda 5 ta bir xil belgi — yutuq"}
      footer={<><Bet g={g} /><PlayButton label="PORTLATISH" icon={cfg.syms[0]} onClick={play} disabled={!g.canPlay} /></>}>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${N},1fr)` }}>
        {grid.map((s, i) => (
          <div key={i} className="aspect-square rounded-xl flex items-center justify-center"
            style={{
              background: pop.includes(i) ? `linear-gradient(180deg,#fff6cf,${cfg.c1})` : "rgba(0,0,0,0.45)",
              border: `1px solid ${pop.includes(i) ? "#fff" : "rgba(247,201,72,0.2)"}`,
              transform: pop.includes(i) ? "scale(1.08)" : "scale(1)",
              transition: "transform 0.2s ease, background 0.2s ease",
            }}>
            <Sym n={s} s={26} />
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ════════════════ 11. BINGO ════════════════ */
function BingoGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const N = cfg.n;
  const [card, setCard] = useState<number[]>([]);
  const [balls, setBalls] = useState<number[]>([]);

  useEffect(() => { setCard(makeCard()); }, []);
  function makeCard() {
    const pool = [...Array(75).keys()].map((i) => i + 1);
    return Array.from({ length: N * N }, () => pool.splice(rnd(pool.length), 1)[0]);
  }

  const play = () => {
    if (!g.canPlay) return;
    g.begin();
    const c = makeCard();
    setCard(c); setBalls([]);
    const win = rollOutcome() === "win";
    const line = Array.from({ length: N }, (_, i) => c[rnd(N) * 0 + i]); // birinchi qator
    const res: number[] = [];
    const pool = [...Array(75).keys()].map((i) => i + 1).filter((n) => !c.includes(n));
    if (win) res.push(...line);
    while (res.length < 18) res.push(pool.splice(rnd(pool.length), 1)[0]);
    let i = 0;
    const iv = window.setInterval(() => {
      i++;
      setBalls(res.slice(0, i));
      if (i >= res.length) { clearInterval(iv); g.finish(win ? cfg.mult : 0); }
    }, 190);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint="Bir qatorni to'liq yopsangiz — BINGO!"
      footer={<><Bet g={g} /><PlayButton label="BINGO O'YNASH" icon="chip" onClick={play} disabled={!g.canPlay} /></>}>
      <div className="grid gap-1.5 mb-3" style={{ gridTemplateColumns: `repeat(${N},1fr)` }}>
        {card.map((n, i) => {
          const hit = balls.includes(n);
          return (
            <div key={i} className="aspect-square rounded-lg flex items-center justify-center font-black text-[12px]"
              style={{
                background: hit ? `linear-gradient(180deg,${cfg.c1},${cfg.c2})` : "rgba(0,0,0,0.45)",
                color: hit ? "#fff" : "#c9b071",
                border: "1px solid rgba(247,201,72,0.22)",
              }}>{n}</div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1 justify-center min-h-[26px]">
        {balls.slice(-10).map((b, i) => (
          <span key={i} className="rounded-full font-black text-[10px] flex items-center justify-center"
            style={{ width: 24, height: 24, background: "radial-gradient(circle at 30% 30%,#fff,#f7c948)", color: "#1a1204" }}>{b}</span>
        ))}
      </div>
    </Shell>
  );
}

/* ════════════════ 12. LOTEREYA ════════════════ */
function LottoGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const NEED = cfg.n;
  const [mine, setMine] = useState<number[]>([]);
  const [out, setOut] = useState<number[]>([]);

  useEffect(() => { setMine(pickRandom()); }, []);
  function pickRandom() {
    const pool = [...Array(36).keys()].map((i) => i + 1);
    return Array.from({ length: NEED }, () => pool.splice(rnd(pool.length), 1)[0]).sort((a, b) => a - b);
  }

  const play = () => {
    if (!g.canPlay) return;
    g.begin(); setOut([]);
    const win = rollOutcome() === "win";
    const hits = win ? NEED : rnd(2);
    const pool = [...Array(36).keys()].map((i) => i + 1).filter((n) => !mine.includes(n));
    const res = [...mine.slice(0, hits)];
    while (res.length < NEED) res.push(pool.splice(rnd(pool.length), 1)[0]);
    let i = 0;
    const iv = window.setInterval(() => {
      i++;
      setOut(res.slice(0, i));
      if (i >= NEED) { clearInterval(iv); g.finish(win ? cfg.mult : 0); }
    }, 420);
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={`Sizning raqamlaringiz: ${mine.join(" · ")}`}
      footer={
        <>
          <button onClick={() => !g.busy && setMine(pickRandom())} disabled={g.busy}
            className="w-full py-2 rounded-xl font-black text-[12px]"
            style={{ background: "rgba(0,0,0,0.5)", color: "#ffe9a8", border: "1px solid rgba(247,201,72,0.3)" }}>
            RAQAMLARNI ALMASHTIRISH
          </button>
          <Bet g={g} />
          <PlayButton label="TORTISHNI BOSHLASH" icon={cfg.syms[0]} onClick={play} disabled={!g.canPlay} />
        </>
      }>
      <div className="relative h-[170px] rounded-2xl overflow-hidden flex items-center justify-center"
        style={{ background: `radial-gradient(circle at 50% 40%, ${cfg.c1}44, ${cfg.c2} 70%, #03060c)` }}>
        <div className="flex flex-wrap gap-2 justify-center px-4">
          {Array.from({ length: NEED }).map((_, i) => {
            const n = out[i];
            const hit = n !== undefined && mine.includes(n);
            return (
              <span key={i} className="rounded-full font-black flex items-center justify-center"
                style={{
                  width: 44, height: 44, fontSize: 15,
                  background: n === undefined ? "rgba(0,0,0,0.5)"
                    : hit ? "radial-gradient(circle at 30% 30%,#c6ffd8,#16a34a)"
                    : "radial-gradient(circle at 30% 30%,#fff,#cbd5e1)",
                  color: n === undefined ? "#4b5563" : "#0b1220",
                  border: "2px solid rgba(247,201,72,0.55)",
                  boxShadow: n !== undefined ? "0 6px 16px rgba(0,0,0,0.5)" : "none",
                }}>{n ?? "?"}</span>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

/* ════════════════ 13. XOTIRA JUFTLARI ════════════════ */
function MemoryGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const PAIRS = cfg.n;
  const [deck, setDeck] = useState<string[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const [tries, setTries] = useState(0);

  const start = () => {
    if (!g.canPlay) return;
    g.begin();
    const syms = cfg.syms.slice(0, PAIRS);
    const d = [...syms, ...syms];
    for (let i = d.length - 1; i > 0; i--) { const j = rnd(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
    setDeck(d); setOpen([]); setDone([]); setTries(0); setLive(true);
  };

  const flip = (i: number) => {
    if (!live || open.includes(i) || done.includes(i) || open.length === 2) return;
    const o = [...open, i];
    setOpen(o);
    if (o.length === 2) {
      const [a, b] = o;
      const match = deck[a] === deck[b];
      window.setTimeout(() => {
        setOpen([]);
        const t = tries + 1;
        setTries(t);
        if (match) {
          const nd = [...done, a, b];
          setDone(nd);
          if (nd.length === deck.length) { setLive(false); g.finish(cfg.mult); }
        } else if (t >= PAIRS + 2) {
          setLive(false); g.finish(0);
        }
      }, 620);
    }
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={live ? `Urinish: ${tries}/${PAIRS + 2} · barcha juftlikni toping` : `${PAIRS} juftlikni ${PAIRS + 2} urinishda toping`}
      footer={<><Bet g={g} />{!live && <PlayButton label="BOSHLASH" icon={cfg.syms[0]} onClick={start} disabled={!g.canPlay} />}</>}>
      <div className="grid grid-cols-4 gap-2">
        {(deck.length ? deck : new Array(PAIRS * 2).fill("question")).map((s, i) => {
          const shown = open.includes(i) || done.includes(i);
          return (
            <button key={i} onClick={() => flip(i)} disabled={!live}
              className="aspect-[3/4] rounded-xl flex items-center justify-center active:scale-95"
              style={{
                background: shown ? `linear-gradient(180deg,${cfg.c1}44,rgba(0,0,0,0.6))` : "repeating-linear-gradient(45deg,#8c1c2b 0 6px,#6d1220 6px 12px)",
                border: `1px solid ${shown ? cfg.c1 : "rgba(247,201,72,0.35)"}`,
                transition: "background 0.25s ease, transform 0.15s ease",
                opacity: done.includes(i) ? 0.55 : 1,
              }}>
              {shown ? <Sym n={s} s={26} /> : <span className="font-black text-[18px]" style={{ color: "#f7c948" }}>★</span>}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ════════════════ 14. OV (harakatlanuvchi nishonlar) ════════════════ */
function FishingGame({ cfg }: EProps) {
  const g = useGame(cfg);
  const NEED = cfg.n;
  const [targets, setTargets] = useState<{ id: number; x: number; y: number; hit: boolean }[]>([]);
  const [hits, setHits] = useState(0);
  const [live, setLive] = useState(false);
  const [left, setLeft] = useState(0);
  const winRef = useRef(false);

  useEffect(() => {
    if (!live) return;
    const iv = window.setInterval(() => {
      setTargets((ts) => ts.map((t) => ({ ...t, x: (t.x + 3 + (t.id % 3)) % 96, y: t.y })));
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(iv);
          setLive(false);
          g.finish(winRef.current && hitsRef.current >= NEED ? cfg.mult : 0);
          return 0;
        }
        return l - 1;
      });
    }, 1000 / 3);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const hitsRef = useRef(0);
  hitsRef.current = hits;

  const start = () => {
    if (!g.canPlay) return;
    g.begin();
    winRef.current = rollOutcome() === "win";
    setTargets(Array.from({ length: 6 }, (_, i) => ({ id: i, x: rnd(90), y: 10 + rnd(70), hit: false })));
    setHits(0); setLeft(24); setLive(true);
  };

  const shoot = (id: number) => {
    if (!live) return;
    setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, hit: true } : t)));
    const h = hits + 1;
    setHits(h);
    window.setTimeout(() => setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, hit: false, x: rnd(90), y: 10 + rnd(70) } : t))), 350);
    if (h >= NEED) {
      setLive(false);
      g.finish(winRef.current ? cfg.mult : 0);
    }
  };

  return (
    <Shell cfg={cfg} won={g.won} amount={g.amount} refund={g.refund}
      hint={live ? `Nishon: ${hits}/${NEED} · vaqt ${Math.ceil(left / 3)}s` : `${NEED} ta nishonni 8 soniyada uring`}
      footer={<><Bet g={g} />{!live && <PlayButton label="OVNI BOSHLASH" icon={cfg.syms[0]} onClick={start} disabled={!g.canPlay} />}</>}>
      <div className="relative h-[240px] rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(180deg,${cfg.c1}33,${cfg.c2} 55%,#03060c)` }}>
        {targets.map((t) => (
          <button key={t.id} onClick={() => shoot(t.id)} disabled={!live}
            className="absolute"
            style={{
              left: `${t.x}%`, top: `${t.y}%`,
              transition: "left 0.33s linear, transform 0.2s ease",
              transform: t.hit ? "scale(1.6) rotate(20deg)" : "scale(1)",
              opacity: t.hit ? 0.3 : 1,
            }}>
            <Sym n={cfg.syms[0]} s={38} />
          </button>
        ))}
      </div>
    </Shell>
  );
}

/* ════════════════ dispatcher ════════════════ */

export const NEW_ENGINE_SET = new Set([
  "mines", "crash", "sicbo", "roulette", "hilo", "war", "plinko",
  "keno", "scratch", "match3", "bingo", "lotto", "memory", "fishing",
]);

export default function NewEngineGame({ cfg }: EProps) {
  switch (cfg.engine) {
    case "mines": return <MinesGame cfg={cfg} />;
    case "crash": return <CrashGame cfg={cfg} />;
    case "sicbo": return <SicBoGame cfg={cfg} />;
    case "roulette": return <RouletteGame cfg={cfg} />;
    case "hilo": return <HiLoGame cfg={cfg} />;
    case "war": return <WarGame cfg={cfg} />;
    case "plinko": return <PlinkoGame cfg={cfg} />;
    case "keno": return <KenoGame cfg={cfg} />;
    case "scratch": return <ScratchGame cfg={cfg} />;
    case "match3": return <Match3Game cfg={cfg} />;
    case "bingo": return <BingoGame cfg={cfg} />;
    case "lotto": return <LottoGame cfg={cfg} />;
    case "memory": return <MemoryGame cfg={cfg} />;
    case "fishing": return <FishingGame cfg={cfg} />;
    default: return null;
  }
}
