import { useEffect, useRef, useState } from "react";

/**
 * LIVE sport sahnalari — bo'g'imli (skelet) odam figuralari va barmoq bilan boshqaruv.
 * Server protokoli o'zgarmaydi: jang o'yinlari tanlov indeksini, nishon o'yinlari 0..1 aniqlikni yuboradi.
 */

type Pose = {
  lean: number; bob: number; sh: number; // tana egilishi, sakrash, yelka siljishi
  ua1: number; fa1: number; ua2: number; fa2: number; // old/orqa qo'l (gradus)
  th1: number; sn1: number; th2: number; sn2: number; // old/orqa oyoq
  fx: number; // butun gavda oldinga siljishi
};

const P = (o: Partial<Pose>): Pose => ({ lean: 6, bob: 0, sh: 0, ua1: 35, fa1: -110, ua2: 50, fa2: -125, th1: 12, sn1: 4, th2: -14, sn2: 10, fx: 0, ...o });

export const POSES = {
  idle: P({}),
  idle2: P({ bob: 3, ua1: 40, fa1: -115, ua2: 55, fa2: -120, lean: 8 }),
  jab: P({ lean: 16, ua1: 88, fa1: -4, fx: 14, th1: 22, sn1: 0 }),
  cross: P({ lean: 22, ua2: 86, fa2: -2, ua1: 25, fa1: -125, sh: 6, fx: 18, th2: -24, sn2: 18 }),
  guard: P({ lean: -4, ua1: 60, fa1: -150, ua2: 70, fa2: -150, bob: 6, fx: -6 }),
  hit: P({ lean: -26, ua1: 10, fa1: -60, ua2: 20, fa2: -70, fx: -22, bob: -2, th1: 4, sn1: 14 }),
  trip: P({ lean: 24, ua1: 70, fa1: -40, ua2: 80, fa2: -50, th1: 60, sn1: -10, fx: 16 }),
  lift: P({ lean: -8, ua1: 110, fa1: -60, ua2: 115, fa2: -60, bob: 10, th1: 25, sn1: 30, th2: -25, sn2: 30, fx: 10 }),
  down: P({ lean: -70, ua1: 140, fa1: -20, ua2: 150, fa2: -10, bob: -40, th1: 70, sn1: 20, th2: 50, sn2: 30, fx: 6 }),
  win: P({ lean: -2, ua1: 165, fa1: -10, ua2: 160, fa2: -15, bob: 4 }),
} satisfies Record<string, Pose>;
export type PoseKey = keyof typeof POSES;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => { o[k] = lerp(a[k], b[k], t); });
  return o;
};
const rad = (d: number) => (d * Math.PI) / 180;

/** Poza ketma-ketligini silliq o'ynatadigan hook */
function usePose(seq: PoseKey[], ms = 260, loopIdle = true) {
  const [pose, setPose] = useState<Pose>(POSES[seq[0] ?? "idle"]);
  const cur = useRef<Pose>(pose);
  useEffect(() => {
    let raf = 0, cancelled = false;
    let steps: PoseKey[] = seq.length ? [...seq] : ["idle"];
    let i = 0, from = cur.current, t0 = performance.now();
    const tick = (t: number) => {
      if (cancelled) return;
      const target = POSES[steps[i]!];
      const k = Math.min(1, (t - t0) / ms);
      const p = mix(from, target, ease(k));
      cur.current = p; setPose(p);
      if (k >= 1) {
        if (i < steps.length - 1) { i += 1; from = p; t0 = t; }
        else if (loopIdle && (steps[i] === "idle" || steps[i] === "idle2")) {
          steps = [steps[i] === "idle" ? "idle2" : "idle"]; i = 0; from = p; t0 = t;
        } else return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq.join(","), ms]);
  return pose;
}

/** Bo'g'imli sportchi. flip=true — chapga qaraydi. */
export function Athlete({ pose, color, flip, x, kit = "box" }: { pose: Pose; color: string; flip?: boolean; x: number; kit?: "box" | "kurash" }) {
  const hip: [number, number] = [pose.fx, 110 - pose.bob];
  const nk: [number, number] = [hip[0] + Math.sin(rad(pose.lean)) * 58, hip[1] - Math.cos(rad(pose.lean)) * 58];
  const shF: [number, number] = [nk[0] + 4 + pose.sh, nk[1] + 6];
  const shB: [number, number] = [nk[0] - 6, nk[1] + 8];
  const arm = (s: [number, number], ua: number, fa: number) => {
    const e = [s[0] + Math.sin(rad(ua)) * 26, s[1] + Math.cos(rad(ua)) * 26];
    const h = [e[0]! + Math.sin(rad(ua + fa + 180)) * -24, e[1]! + Math.cos(rad(ua + fa + 180)) * -24];
    return { e, h };
  };
  const leg = (th: number, sn: number) => {
    const k = [hip[0] + Math.sin(rad(th)) * 32, hip[1] + Math.cos(rad(th)) * 32];
    const f = [k[0]! + Math.sin(rad(th - sn)) * 32, k[1]! + Math.cos(rad(th - sn)) * 32];
    return { k, f };
  };
  const aF = arm(shF, pose.ua1, pose.fa1), aB = arm(shB, pose.ua2, pose.fa2);
  const lF = leg(pose.th1, pose.sn1), lB = leg(pose.th2, pose.sn2);
  const skin = "#d8a27a", skinD = "#b9825c";
  const line = (pts: number[][], w: number, c: string) => <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
  const head = [nk[0] + Math.sin(rad(pose.lean)) * 14, nk[1] - Math.cos(rad(pose.lean)) * 14];
  return (
    <g transform={`translate(${x},0) scale(${flip ? -1 : 1},1)`}>
      <ellipse cx={pose.fx * 0.6} cy={176} rx={34} ry={5} fill="#000" opacity={0.35} />
      {line([hip, lB.k, lB.f], 13, skinD)}
      {line([shB, aB.e, aB.h], 10, skinD)}
      {kit === "box" ? <circle cx={aB.h[0]} cy={aB.h[1]} r={9} fill={color} stroke="#0006" strokeWidth={2} /> : <circle cx={aB.h[0]} cy={aB.h[1]} r={5} fill={skinD} />}
      {/* tana */}
      {kit === "box"
        ? line([hip, nk], 24, skin)
        : line([hip, nk], 26, color)}
      {kit === "box" && <path d={`M${hip[0] - 15},${hip[1] - 6} L${hip[0] + 15},${hip[1] - 6} L${hip[0] + 17},${hip[1] + 14} L${hip[0] - 17},${hip[1] + 14} Z`} fill={color} />}
      {kit === "kurash" && line([[hip[0] - 13, hip[1] - 4], [hip[0] + 13, hip[1] - 4]], 5, "#111")}
      {line([hip, lF.k, lF.f], 14, kit === "kurash" ? "#f1f5f9" : skin)}
      {line([lF.f, [lF.f[0]! + 10, lF.f[1]!]], 8, "#111")}
      {line([lB.f, [lB.f[0]! + 10, lB.f[1]!]], 8, "#111")}
      <circle cx={head[0]} cy={head[1]} r={13} fill={skin} />
      <path d={`M${head[0]! - 12},${head[1]! - 4} Q${head[0]},${head[1]! - 20} ${head[0]! + 12},${head[1]! - 4}`} fill="#1f1308" />
      <circle cx={head[0]! + 7} cy={head[1]! - 1} r={1.8} fill="#111" />
      {line([shF, aF.e, aF.h], 11, kit === "kurash" ? color : skin)}
      {kit === "box" ? <circle cx={aF.h[0]} cy={aF.h[1]} r={10} fill={color} stroke="#0006" strokeWidth={2} /> : <circle cx={aF.h[0]} cy={aF.h[1]} r={5.5} fill={skin} />}
    </g>
  );
}

const MOVE_SEQ: Record<"boxing" | "kurash", PoseKey[][]> = {
  boxing: [["jab", "idle"], ["cross", "idle"], ["guard"]],
  kurash: [["trip", "idle"], ["lift", "idle"], ["guard"]],
};

function Ring({ kind, children }: { kind: "boxing" | "kurash"; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 190" className="ls-stage" role="img" aria-label={kind === "boxing" ? "Boks ringi" : "Kurash gilami"}>
      <defs>
        <radialGradient id="ls-spot" cx="50%" cy="20%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <linearGradient id="ls-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={kind === "boxing" ? "#1e3a8a" : "#14532d"} /><stop offset="1" stopColor="#020617" /></linearGradient>
      </defs>
      <rect width="320" height="190" fill="#05070d" />
      <rect y="150" width="320" height="40" fill="url(#ls-floor)" />
      {kind === "boxing" && [0, 1, 2].map((r) => <line key={r} x1="0" x2="320" y1={70 + r * 26} y2={70 + r * 26} stroke={["#dc2626", "#f8fafc", "#2563eb"][r]} strokeWidth="3" opacity=".75" />)}
      {kind === "kurash" && <ellipse cx="160" cy="168" rx="140" ry="16" fill="none" stroke="#facc15" strokeWidth="2" opacity=".6" />}
      <rect width="320" height="190" fill="url(#ls-spot)" />
      {children}
    </svg>
  );
}

/** Jang paneli: suring yoki tugmani bosing — sportchingiz darhol harakat qiladi. */
export function FightPanel({ kind, picks, color, done, onSubmit }: { kind: "boxing" | "kurash"; picks: string[]; color: string; done: boolean; onSubmit: (v: number) => void }) {
  const [move, setMove] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const me = usePose(move === null ? ["idle"] : MOVE_SEQ[kind][move]!, 220);
  const foe = usePose(["guard"], 400);
  const choose = (i: number) => {
    if (done || move !== null) return;
    setMove(i);
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(i === 2 ? "light" : "heavy"); } catch { /* */ }
    setTimeout(() => onSubmit(i), 450);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="ls-touch"
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const s = start.current; start.current = null; if (!s) return;
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (Math.abs(dy) > 30 && dy > Math.abs(dx)) choose(2);
          else if (Math.abs(dx) > 30) choose(dx < 0 ? 0 : 1);
        }}>
        <Ring kind={kind}>
          <Athlete pose={me} color={color} x={110} kit={kind === "boxing" ? "box" : "kurash"} />
          <Athlete pose={foe} color="#64748b" x={212} flip kit={kind === "boxing" ? "box" : "kurash"} />
        </Ring>
        <span className="ls-hint">{move !== null ? "Harakat yuborildi" : "Chapga / o'ngga suring — zarba, pastga — himoya"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {picks.map((p, i) => (
          <button key={p} type="button" disabled={done || move !== null} className={`ls-move ${move === i ? "on" : ""}`}
            style={{ ["--c" as any]: color }} onClick={() => choose(i)}>{p}</button>
        ))}
      </div>
    </div>
  );
}

/** Raund natijasi — ikkala sportchi tanlagan harakatini real bajaradi. */
export function FightReplay({ kind, a, b, aWon, bWon, color }: { kind: "boxing" | "kurash"; a: number; b: number; aWon: boolean; bWon: boolean; color: string }) {
  const seq = (mine: number, theirs: number, won: boolean, lost: boolean): PoseKey[] => {
    const base = MOVE_SEQ[kind][mine]!.filter((k) => k !== "idle");
    const struck = theirs !== 2 && mine !== 2;
    const end: PoseKey = won && !lost ? "win" : lost && !won ? (kind === "kurash" ? "down" : "hit") : struck ? "hit" : "idle";
    return ["idle", ...base, end];
  };
  const pa = usePose(seq(a, b, aWon, bWon), 330, false);
  const pb = usePose(seq(b, a, bWon, aWon), 330, false);
  const k = kind === "boxing" ? "box" : "kurash";
  return (
    <Ring kind={kind}>
      <Athlete pose={pa} color={color} x={112} kit={k} />
      <Athlete pose={pb} color="#64748b" x={210} flip kit={k} />
    </Ring>
  );
}

/* ═══════════ Nishon o'yinlari: kamon, darts, basketbol ═══════════ */

type AimKind = "archery" | "dartsarena" | "basketball";

/**
 * Barmoqni bosib turing — kamon taranglashadi (qo'l titraydi), nishonga suring, qo'yib yuboring — o'q uchadi.
 * Aniqlik = nishon markazigacha masofa; juda erta yoki ortiqcha tortish chayqalishni oshiradi.
 */
export function AimPanel({ kind, color, done, onSubmit }: { kind: AimKind; color: string; done: boolean; onSubmit: (v: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [aim, setAim] = useState({ x: 0.5, y: 0.62 });
  const [draw, setDraw] = useState(0);
  const [holding, setHolding] = useState(false);
  const [shot, setShot] = useState<{ x: number; y: number; acc: number } | null>(null);
  const [sway, setSway] = useState({ x: 0, y: 0 });
  const t0 = useRef(0);
  const held = useRef(false);
  const finger = useRef({ x: 0.5, y: 0.62 });
  const target = { x: 0.5, y: kind === "basketball" ? 0.28 : 0.34 };

  useEffect(() => {
    if (shot || done) return;
    let raf = 0;
    const loop = (t: number) => {
      const s = t / 1000;
      const d = holding ? Math.min(1, (t - t0.current) / 900) : 0;
      // To'liq tortilganda qo'l eng barqaror; 2.2 s dan keyin charchab titraydi
      const over = holding ? Math.max(0, (t - t0.current - 2200) / 1500) : 0;
      const amp = (holding ? 0.012 + (1 - d) * 0.05 + over * 0.07 : 0.03);
      setSway({ x: Math.sin(s * 2.3) * amp + Math.sin(s * 5.1) * amp * 0.4, y: Math.cos(s * 1.7) * amp + Math.sin(s * 4.3) * amp * 0.35 });
      setDraw(d);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [holding, shot, done]);

  const rel = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const cross = { x: aim.x + sway.x, y: aim.y + sway.y };

  const release = () => {
    if (!held.current || shot || done) return;
    held.current = false; setHolding(false);
    const power = draw;
    // Kuchsiz tortilsa o'q pastga tushadi
    const hit = { x: cross.x, y: cross.y + (1 - power) * 0.18 };
    const dist = Math.hypot(hit.x - target.x, (hit.y - target.y) * 1.1);
    const acc = Math.max(0, Math.min(1, 1 - dist / 0.22));
    setShot({ ...hit, acc });
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("heavy"); } catch { /* */ }
    setTimeout(() => onSubmit(Number(acc.toFixed(3))), 700);
  };

  const label = kind === "archery" ? "Kamon" : kind === "dartsarena" ? "Darts" : "Basketbol";
  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className={`ls-aim ls-aim-${kind}`} style={{ ["--c" as any]: color }}
        onPointerDown={(e) => {
          if (shot || done) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          const p = rel(e); finger.current = p;
          setAim({ x: 0.5, y: 0.62 }); t0.current = performance.now(); held.current = true; setHolding(true);
        }}
        onPointerMove={(e) => {
          if (!held.current) return;
          const p = rel(e);
          // Barmoq harakati nishon ko'rsatkichini nisbiy suradi (aniq nishonga olish uchun 0.6 sezgirlik)
          const dx = (p.x - finger.current.x) * 0.6, dy = (p.y - finger.current.y) * 0.6;
          setAim((a) => ({ x: Math.max(0.05, Math.min(0.95, a.x + dx)), y: Math.max(0.08, Math.min(0.9, a.y + dy)) }));
          finger.current = p;
        }}
        onPointerUp={release} onPointerCancel={release}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ls-aim-bg" aria-label={label}>
          <defs><linearGradient id={`sky-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={kind === "basketball" ? "#1e1b4b" : "#0c4a6e"} /><stop offset=".6" stopColor={kind === "basketball" ? "#312e81" : "#166534"} /><stop offset="1" stopColor="#052e16" /></linearGradient></defs>
          <rect width="100" height="100" fill={`url(#sky-${kind})`} />
          {kind === "basketball" ? <rect y="72" width="100" height="28" fill="#92400e" /> : <rect y="66" width="100" height="34" fill="#14532d" />}
        </svg>
        {/* nishon */}
        <div className={`ls-target ls-target-${kind}`} style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} />
        {/* o'yinchi figurasi */}
        <svg viewBox="0 0 120 140" className="ls-shooter" style={{ transform: `translateX(-50%) rotate(${(cross.x - 0.5) * 18}deg)` }} aria-hidden>
          <ShooterFigure kind={kind} draw={shot ? 0 : draw} />
        </svg>
        {/* nishonga olish ko'rsatkichi */}
        {!shot && holding && <span className="ls-cross" style={{ left: `${cross.x * 100}%`, top: `${cross.y * 100}%`, opacity: 0.4 + draw * 0.6, transform: `translate(-50%,-50%) scale(${1.6 - draw * 0.6})` }} />}
        {shot && <span className={`ls-proj ls-proj-${kind}`} style={{ ["--tx" as any]: `${shot.x * 100}%`, ["--ty" as any]: `${shot.y * 100}%` }} />}
        {shot && <span className="ls-impact" style={{ left: `${shot.x * 100}%`, top: `${shot.y * 100}%` }} />}
        <span className="ls-hint">{shot ? `Aniqlik ${Math.round(shot.acc * 100)}%` : holding ? (draw < 1 ? "Taranglash..." : "Nishonga oling va qo'yib yuboring") : "Barmoqni bosib turing"}</span>
        <span className="ls-power"><span style={{ width: `${(shot ? 0 : draw) * 100}%` }} /></span>
      </div>
    </div>
  );
}

function ShooterFigure({ kind, draw }: { kind: AimKind; draw: number }) {
  const skin = "#d8a27a";
  const pull = draw * 18;
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M52 140 L56 104 L64 104 L68 140" stroke="#1f2937" strokeWidth="11" />
      <path d="M60 104 L60 66" stroke="#0f766e" strokeWidth="22" />
      <circle cx="60" cy="50" r="12" fill={skin} stroke="none" />
      <path d="M48 47 Q60 32 72 47" fill="#1f1308" stroke="none" />
      {kind === "archery" && <>
        <path d={`M60 72 L60 34`} stroke={skin} strokeWidth="9" />
        <path d={`M42 34 Q60 ${10 - draw * 4} 78 34`} stroke="#7c4a1e" strokeWidth="4" />
        <path d={`M42 34 L60 ${34 + pull} L78 34`} stroke="#e5e7eb" strokeWidth="1.2" />
        <path d={`M60 ${34 + pull} L60 ${4 + pull * 0.2}`} stroke="#f8fafc" strokeWidth="2" />
        <path d={`M68 72 L62 ${36 + pull}`} stroke={skin} strokeWidth="8" />
      </>}
      {kind === "dartsarena" && <>
        <path d={`M68 72 L74 ${56 + pull * 0.6} L66 ${40 + pull}`} stroke={skin} strokeWidth="8" />
        <path d={`M66 ${40 + pull} L66 ${24 + pull}`} stroke="#e5e7eb" strokeWidth="2.5" />
      </>}
      {kind === "basketball" && <>
        <path d={`M52 72 L50 ${50 + pull * 0.4} L56 ${30 + pull}`} stroke={skin} strokeWidth="8" />
        <path d={`M68 72 L70 ${50 + pull * 0.4} L64 ${30 + pull}`} stroke={skin} strokeWidth="8" />
        <circle cx="60" cy={22 + pull} r="11" fill="#ea580c" stroke="#7c2d12" strokeWidth="1.5" />
      </>}
    </g>
  );
}
