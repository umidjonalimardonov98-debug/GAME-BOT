import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin, rollOutcome } from "@/lib/odds";
import SmartImage from "@/components/SmartImage";
import { NEW_GAME_MAP, coverOf, type GameCfg } from "@/lib/new-games";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";
import NewEngineGame, { NEW_ENGINE_SET } from "@/games/engines";

/* ─────────────────── umumiy yordamchilar ─────────────────── */

const symUrl = (n: string) => `/symbols/${n}.png`;
const rnd = (n: number) => Math.floor(Math.random() * n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** natijadan keyin 1 soniya kutish — o'yin to'xtab, keyin natija chiqadi */
const RESULT_DELAY = 1000;

function useImages(names: string[]) {
  const [imgs, setImgs] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all(
      names.map(
        (n) =>
          new Promise<HTMLImageElement>((resolve) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = () => resolve(im);
            im.src = symUrl(n);
          }),
      ),
    ).then((list) => { if (alive) setImgs(list); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join(",")]);
  return imgs;
}

/** canvas + requestAnimationFrame ilmog'i (DPR bilan) */
function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void,
  h: number,
) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let raf = 0;
    let last = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      cv.width = w * dpr;
      cv.height = h * dpr;
      const c = cv.getContext("2d");
      c?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const ctx = cv.getContext("2d");
      if (ctx) drawRef.current(ctx, cv.clientWidth, h, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [h]);
  return ref;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ═══════════════════════ SAHNALAR ═══════════════════════ */

type StageProps = {
  cfg: GameCfg;
  /** o'yin boshlanishi uchun buyruq raqami (0 = bo'sh) */
  runId: number;
  /** oldindan belgilangan natija indeksi */
  target: number;
  choice: number;
  setChoice: (i: number) => void;
  locked: boolean;
  onDone: () => void;
};

/* ─────────── 1. REEL: inertsiyali barabanlar ─────────── */
function ReelStage({ cfg, runId, target, onDone }: StageProps) {
  const imgs = useImages(cfg.syms);
  const H = 190;
  const st = useRef({
    off: [0, 0, 0],
    vel: [0, 0, 0],
    stopAt: [0, 0, 0],
    stopping: [false, false, false],
    running: false,
    done: false,
    shake: 0,
  });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!runId) return;
    const s = st.current;
    s.running = true;
    s.done = false;
    s.vel = [26 + Math.random() * 4, 24 + Math.random() * 4, 22 + Math.random() * 4];
    s.stopping = [false, false, false];
    s.stopAt = [0, 0, 0];
    const n = cfg.syms.length;
    // g'olib bo'lsa 3 xil bir xil belgi, aks holda aralash
    const res =
      target >= 0
        ? [target, target, target]
        : [rnd(n), rnd(n), (rnd(n) + 1) % n];
    const timers = [900, 1400, 1950].map((ms, i) =>
      window.setTimeout(() => {
        s.stopping[i] = true;
        s.stopAt[i] = res[i];
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const cell = 62;
  const ref = useCanvas((ctx, w, h, dt) => {
    const s = st.current;
    const n = Math.max(cfg.syms.length, 1);
    ctx.clearRect(0, 0, w, h);

    const shakeY = s.shake > 0 ? Math.sin(s.shake * 60) * s.shake * 6 : 0;
    s.shake = Math.max(0, s.shake - dt * 2.2);

    const gap = 8;
    const cw = (w - gap * 4) / 3;
    let allStopped = true;

    for (let i = 0; i < 3; i++) {
      const x = gap + i * (cw + gap);
      // korpus
      ctx.save();
      roundRect(ctx, x, 12 + shakeY, cw, h - 24, 14);
      ctx.clip();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#05070d");
      grad.addColorStop(0.5, cfg.c2);
      grad.addColorStop(1, "#05070d");
      ctx.fillStyle = grad;
      ctx.fillRect(x, 12 + shakeY, cw, h - 24);

      // fizika
      if (s.running) {
        if (s.stopping[i]) {
          const targetOff = s.stopAt[i] * cell;
          const cur = ((s.off[i] % (n * cell)) + n * cell) % (n * cell);
          let diff = targetOff - cur;
          while (diff < 0) diff += n * cell;
          if (s.vel[i] > 2) s.vel[i] = Math.max(2, s.vel[i] - dt * 26);
          if (s.vel[i] <= 2.2 && diff < 8) {
            s.off[i] = targetOff;
            s.vel[i] = 0;
            if (s.shake < 0.2) s.shake = 0.35;
          } else {
            s.off[i] += s.vel[i] * dt * 60;
          }
        } else {
          s.off[i] += s.vel[i] * dt * 60;
        }
        if (s.vel[i] > 0) allStopped = false;
      }

      // belgilar
      const base = ((s.off[i] % (n * cell)) + n * cell) % (n * cell);
      for (let k = -1; k <= 3; k++) {
        const idx = (((Math.floor(base / cell) + k) % n) + n) % n;
        const y = h / 2 - cell / 2 + k * cell - (base % cell) + shakeY;
        const im = imgs[idx];
        const blur = Math.min(s.vel[i] / 6, 3);
        ctx.globalAlpha = 1;
        if (im && im.width) {
          ctx.save();
          if (blur > 0.3) ctx.filter = `blur(${blur}px)`;
          ctx.drawImage(im, x + cw / 2 - 22, y + 6, 44, 44);
          ctx.restore();
        } else {
          ctx.fillStyle = cfg.c1;
          ctx.beginPath();
          ctx.arc(x + cw / 2, y + 28, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // oltin ramka + markaziy chiziq porlashi
      roundRect(ctx, x, 12 + shakeY, cw, h - 24, 14);
      ctx.strokeStyle = "rgba(247,201,72,0.55)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (!s.running || s.vel[i] === 0) {
        ctx.fillStyle = "rgba(247,201,72,0.10)";
        ctx.fillRect(x, h / 2 - cell / 2 + shakeY, cw, cell);
      }
    }

    if (s.running && allStopped && !s.done) {
      s.done = true;
      s.running = false;
      doneRef.current();
    }
  }, H);

  return <canvas ref={ref} style={{ width: "100%", height: H, display: "block" }} />;
}

/* ─────────── 2. WHEEL: haqiqiy ishqalanish + shar ─────────── */
function WheelStage({ cfg, runId, target, onDone }: StageProps) {
  const H = 260;
  const st = useRef({
    ang: 0, vel: 0,
    ballAng: 0, ballVel: 0, ballR: 1,
    running: false, done: false, settle: 0,
  });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!runId) return;
    const s = st.current;
    s.running = true; s.done = false; s.settle = 0;
    s.vel = 9 + Math.random() * 2;
    s.ballVel = -16 - Math.random() * 3;
    s.ballR = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const ref = useCanvas((ctx, w, h, dt) => {
    const s = st.current;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 14;
    const n = cfg.n;
    const seg = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, w, h);

    if (s.running) {
      s.vel *= Math.pow(0.62, dt);
      s.ballVel *= Math.pow(0.42, dt);
      s.ang += s.vel * dt;
      s.ballAng += s.ballVel * dt;
      if (Math.abs(s.ballVel) < 3.2) s.ballR = Math.max(0.72, s.ballR - dt * 0.45);
      if (Math.abs(s.vel) < 0.25 && Math.abs(s.ballVel) < 0.4) {
        // aniq katakka o'tirish
        s.settle += dt;
        const want = -target * seg - seg / 2;
        const cur = s.ballAng - s.ang;
        let d = ((want - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        s.ballAng += d * Math.min(1, dt * 6);
        s.vel *= 0.9; s.ballVel *= 0.9;
        if (s.settle > 0.75 && !s.done) {
          s.done = true; s.running = false; s.vel = 0; s.ballVel = 0;
          doneRef.current();
        }
      }
    }

    // tashqi oltin halqa
    const ring = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R + 12);
    ring.addColorStop(0, "rgba(247,201,72,0.85)");
    ring.addColorStop(1, "rgba(120,53,15,0.25)");
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2); ctx.fill();

    // sektorlar
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, s.ang + i * seg, s.ang + (i + 1) * seg);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? cfg.c1 : "#0b1220";
      ctx.fill();
      ctx.strokeStyle = "rgba(247,201,72,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // markaz
    const cg = ctx.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, 34);
    cg.addColorStop(0, "#fff6cf");
    cg.addColorStop(0.5, "#f7c948");
    cg.addColorStop(1, "#8a5a09");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1204";
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();

    // shar
    const br = R * s.ballR - 6;
    const bx = cx + Math.cos(s.ballAng) * br;
    const by = cy + Math.sin(s.ballAng) * br;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.arc(bx + 2, by + 3, 8, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 9);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#c9ccd6");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();

    // ko'rsatkich
    ctx.fillStyle = "#f7c948";
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 16);
    ctx.lineTo(cx - 9, cy - R - 30);
    ctx.lineTo(cx + 9, cy - R - 30);
    ctx.closePath();
    ctx.fill();
  }, H);

  return <canvas ref={ref} style={{ width: "100%", height: H, display: "block" }} />;
}

/* ─────────── 3. RACE: haqiqiy yugurish, quvish, chang ─────────── */
function RaceStage({ cfg, runId, target, choice, setChoice, locked, onDone }: StageProps) {
  const H = 210;
  const imgs = useImages([cfg.syms[0]]);
  const n = cfg.n;
  const st = useRef({
    pos: [] as number[],
    spd: [] as number[],
    running: false, done: false, t: 0,
    dust: [] as { x: number; y: number; l: number }[],
  });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!runId) return;
    const s = st.current;
    s.pos = Array.from({ length: n }, () => 0);
    s.spd = Array.from({ length: n }, () => 0.10 + Math.random() * 0.05);
    s.running = true; s.done = false; s.t = 0; s.dust = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const ref = useCanvas((ctx, w, h, dt) => {
    const s = st.current;
    ctx.clearRect(0, 0, w, h);
    const top = 22;
    const laneH = (h - top - 10) / n;
    const finish = w - 26;

    // trek
    ctx.fillStyle = "rgba(4,12,8,0.75)";
    ctx.fillRect(0, top - 8, w, h - top);
    for (let i = 0; i <= n; i++) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      ctx.moveTo(0, top + i * laneH);
      ctx.lineTo(w, top + i * laneH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // marra
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 2 ? "#ffffff" : "#101010";
      ctx.fillRect(finish + (i % 2) * 6, top + i * 8, 6, 8);
    }

    if (s.running) {
      s.t += dt;
      let winnerDone = false;
      for (let i = 0; i < n; i++) {
        // tabiiy tezlik tebranishi + g'olibga sekin ustunlik
        const boost = i === target ? 0.030 : 0;
        s.spd[i] += (Math.random() - 0.5) * 0.05 * dt * 60 * 0.02;
        s.spd[i] = Math.max(0.05, Math.min(0.20, s.spd[i] + boost * dt));
        s.pos[i] = Math.min(1, s.pos[i] + s.spd[i] * dt);
        if (i === target && s.pos[i] >= 1) winnerDone = true;
        if (Math.random() < 0.4) {
          s.dust.push({ x: 10 + s.pos[i] * (finish - 20), y: top + i * laneH + laneH / 2 + 8, l: 1 });
        }
      }
      // g'olib finishga yaqinlashganda boshqalarni ushlab turish
      const lead = Math.max(...s.pos);
      if (lead > 0.92 && s.pos[target] < 1) {
        for (let i = 0; i < n; i++) if (i !== target) s.pos[i] = Math.min(s.pos[i], 0.96);
        s.pos[target] = Math.min(1, s.pos[target] + 0.35 * dt);
      }
      if (winnerDone && !s.done) {
        s.done = true; s.running = false;
        doneRef.current();
      }
    }

    // chang
    s.dust = s.dust.filter((d) => (d.l -= dt * 2.2) > 0);
    for (const d of s.dust) {
      ctx.fillStyle = `rgba(200,190,160,${d.l * 0.25})`;
      ctx.beginPath(); ctx.arc(d.x - 8, d.y, 3 * d.l, 0, Math.PI * 2); ctx.fill();
    }

    // ishtirokchilar
    for (let i = 0; i < n; i++) {
      const p = s.pos[i] ?? 0;
      const x = 10 + p * (finish - 20);
      const y = top + i * laneH + laneH / 2;
      const bob = s.running ? Math.sin(s.t * 16 + i) * 3 : 0;
      const sel = i === choice;
      ctx.save();
      ctx.globalAlpha = sel ? 1 : 0.85;
      ctx.fillStyle = sel ? "#f7c948" : cfg.c1;
      ctx.beginPath(); ctx.arc(x, y + bob, sel ? 12 : 10, 0, Math.PI * 2); ctx.fill();
      if (imgs[0]?.width) ctx.drawImage(imgs[0], x - 9, y + bob - 9, 18, 18);
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.fillText(String(i + 1), 3, y + 4);
    }
  }, H);

  return (
    <div>
      <canvas ref={ref} style={{ width: "100%", height: H, display: "block" }} />
      <div className="grid gap-1.5 mt-2" style={{ gridTemplateColumns: `repeat(${Math.min(n, 6)},1fr)` }}>
        {Array.from({ length: n }).map((_, i) => (
          <button key={i} disabled={locked} onClick={() => setChoice(i)}
            className="py-2 rounded-xl text-xs font-black active:scale-95 transition disabled:opacity-60"
            style={{
              background: choice === i ? "linear-gradient(145deg,#f7c948,#b45309)" : "rgba(255,255,255,0.06)",
              color: choice === i ? "#1a1204" : "#fff",
              border: `1px solid ${choice === i ? "#f7c948" : "rgba(255,255,255,0.12)"}`,
            }}>
            #{i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 4. CLIMB: qadam-qadam ko'tarilish ─────────── */
function ClimbStage({ cfg, step, alive, crashed }: { cfg: GameCfg; step: number; alive: boolean; crashed: boolean }) {
  const H = 250;
  const anim = useRef({ y: 0, shake: 0, prev: 0 });
  const ref = useCanvas((ctx, w, h, dt) => {
    const a = anim.current;
    if (a.prev !== step) { a.prev = step; a.shake = crashed ? 0.6 : 0.3; }
    a.y = lerp(a.y, step, Math.min(1, dt * 8));
    a.shake = Math.max(0, a.shake - dt * 1.6);

    ctx.clearRect(0, 0, w, h);
    const rows = cfg.n;
    const rh = (h - 30) / rows;
    const sx = a.shake > 0 ? (Math.random() - 0.5) * a.shake * 8 : 0;

    for (let i = 0; i < rows; i++) {
      const y = h - 22 - i * rh;
      const passed = i < step;
      const width = w - 40 - i * 4;
      roundRect(ctx, 20 + i * 2 + sx, y - rh * 0.62, width, rh * 0.62, 8);
      const g = ctx.createLinearGradient(0, y - rh, 0, y);
      if (passed) { g.addColorStop(0, "#f7c948"); g.addColorStop(1, cfg.c1); }
      else { g.addColorStop(0, "#0e1626"); g.addColorStop(1, "#070b13"); }
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = passed ? "rgba(255,246,207,0.9)" : "rgba(247,201,72,0.22)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = passed ? "rgba(26,18,4,0.85)" : "rgba(255,255,255,0.35)";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillText(`x${(1 + (i + 1) * (cfg.mult - 1)).toFixed(2)}`, 28 + sx, y - rh * 0.22);
    }

    // qahramon
    const hy = h - 22 - a.y * rh - rh * 0.85;
    const hx = w / 2 + sx;
    ctx.fillStyle = crashed ? "#ef4444" : "#fff6cf";
    ctx.beginPath(); ctx.arc(hx, hy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = crashed ? "#7f1d1d" : "#b45309";
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
    if (!alive && crashed) {
      ctx.strokeStyle = "rgba(239,68,68,0.7)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const an = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(an) * 14, hy + Math.sin(an) * 14);
        ctx.lineTo(hx + Math.cos(an) * 24, hy + Math.sin(an) * 24);
        ctx.stroke();
      }
    }
  }, H);
  return <canvas ref={ref} style={{ width: "100%", height: H, display: "block" }} />;
}

/* ─────────── 5. PICK: 3D ochilish ─────────── */
function PickStage({ cfg, choice, setChoice, locked, revealed, shaking, target }: {
  cfg: GameCfg; choice: number; setChoice: (i: number) => void;
  locked: boolean; revealed: boolean; shaking: boolean; target: number;
}) {
  return (
    <div className={`grid gap-2.5 py-2 ${cfg.n > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
      {Array.from({ length: cfg.n }).map((_, i) => {
        const good = revealed && i === target;
        const open = revealed;
        return (
          <button key={i} disabled={locked} onClick={() => setChoice(i)}
            className="relative active:scale-95 transition-transform disabled:cursor-default"
            style={{ height: 96, perspective: 700 }}>
            <div
              className="w-full h-full rounded-2xl"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform .55s cubic-bezier(.2,.8,.2,1)",
                transform: `rotateY(${open ? 180 : 0}deg)${shaking && i === choice ? " translateY(-6px)" : ""}`,
                animation: shaking ? `pickShake .28s ${i * 0.05}s infinite alternate` : undefined,
              }}
            >
              {/* old tomon */}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundImage: `linear-gradient(160deg,${choice === i ? "rgba(247,201,72,0.55)" : "rgba(6,10,18,0.55)"},rgba(4,7,13,0.85)), url(${coverOf(cfg.key)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: `1.5px solid ${choice === i ? "#f7c948" : "rgba(247,201,72,0.28)"}`,
                  boxShadow: choice === i ? "0 0 22px rgba(247,201,72,0.45)" : "none",
                }}>
                <img src={symUrl(cfg.syms[0])} width={42} height={42} alt="" />
              </div>
              {/* orqa tomon */}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: good
                    ? "linear-gradient(160deg,#fff6cf,#f7c948)"
                    : "linear-gradient(160deg,#131a28,#070b13)",
                  border: `1.5px solid ${good ? "#fff6cf" : "rgba(255,255,255,0.10)"}`,
                  boxShadow: good ? "0 0 30px rgba(247,201,72,0.65)" : "none",
                }}>
                <img src={symUrl(good ? cfg.syms[0] : (cfg.syms[1] ?? cfg.syms[0]))}
                  width={42} height={42} alt="" style={{ opacity: good ? 1 : 0.4 }} />
              </div>
            </div>
          </button>
        );
      })}
      <style>{`@keyframes pickShake{from{transform:translateX(-3px) rotate(-1.5deg)}to{transform:translateX(3px) rotate(1.5deg)}}`}</style>
    </div>
  );
}


/* ─────────── 6. BOARD: Nard — zar tashlab bosqichma-bosqich yurish ─────────── */
function BoardStage({ cfg, runId, target, onDone }: StageProps) {
  const H = 240;
  const CELLS = 12;
  const st = useRef({
    running: false, done: false, t: 0, nextRoll: 0,
    me: 0, foe: 0, dice: [1, 1] as [number, number], spin: 0, turn: 0,
  });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!runId) return;
    const s = st.current;
    s.running = true; s.done = false; s.t = 0; s.nextRoll = 0;
    s.me = 0; s.foe = 0; s.turn = 0; s.spin = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const ref = useCanvas((ctx, w, h, dt) => {
    const s = st.current;
    ctx.clearRect(0, 0, w, h);

    if (s.running) {
      s.t += dt;
      s.spin += dt * 16;
      if (s.t >= s.nextRoll) {
        s.nextRoll = s.t + 0.62;
        const winning = target === 0; // 0 → o'yinchi g'olib
        const meFirst = s.turn % 2 === 0;
        const a = 1 + rnd(6), b = 1 + rnd(6);
        s.dice = [a, b];
        const stepAmt = Math.max(1, Math.round((a + b) / 2));
        if (meFirst) s.me = Math.min(CELLS, s.me + (winning ? stepAmt : Math.max(1, stepAmt - 1)));
        else s.foe = Math.min(CELLS, s.foe + (winning ? Math.max(1, stepAmt - 1) : stepAmt));
        s.turn++;
        if ((winning && s.me >= CELLS) || (!winning && s.foe >= CELLS)) {
          if (winning) s.me = CELLS; else s.foe = CELLS;
          s.running = false;
          if (!s.done) { s.done = true; doneRef.current(); }
        }
      }
    }

    // nard taxtasi
    const pad = 12, bw = w - pad * 2, bh = 132, by = 22;
    roundRect(ctx, pad, by, bw, bh, 14);
    const wood = ctx.createLinearGradient(pad, by, pad + bw, by + bh);
    wood.addColorStop(0, "#3b2410");
    wood.addColorStop(0.5, cfg.c2);
    wood.addColorStop(1, "#20130a");
    ctx.fillStyle = wood; ctx.fill();
    ctx.strokeStyle = "rgba(247,201,72,0.5)"; ctx.lineWidth = 2; ctx.stroke();

    // uchburchak nuqtalar
    const cw = bw / CELLS;
    for (let i = 0; i < CELLS; i++) {
      for (const topRow of [true, false]) {
        ctx.beginPath();
        const x = pad + i * cw;
        if (topRow) { ctx.moveTo(x, by + 4); ctx.lineTo(x + cw, by + 4); ctx.lineTo(x + cw / 2, by + bh / 2 - 6); }
        else { ctx.moveTo(x, by + bh - 4); ctx.lineTo(x + cw, by + bh - 4); ctx.lineTo(x + cw / 2, by + bh / 2 + 6); }
        ctx.closePath();
        ctx.fillStyle = i % 2 ? "rgba(247,201,72,0.20)" : "rgba(255,255,255,0.06)";
        ctx.fill();
      }
    }

    // toshlar (siz — oltin, raqib — kumush)
    const drawStone = (cell: number, y: number, gold: boolean) => {
      const x = pad + Math.min(cell, CELLS - 1) * cw + cw / 2;
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 12);
      g.addColorStop(0, gold ? "#fff6cf" : "#e6ecf5");
      g.addColorStop(1, gold ? "#b45309" : "#64748b");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.stroke();
    };
    drawStone(s.me, by + bh / 2 - 22, true);
    drawStone(s.foe, by + bh / 2 + 22, false);

    // zarlar
    const dy = by + bh + 18;
    s.dice.forEach((d, i) => {
      const dx = w / 2 - 34 + i * 40;
      ctx.save();
      ctx.translate(dx + 14, dy + 14);
      if (s.running) ctx.rotate(Math.sin(s.spin + i) * 0.22);
      roundRect(ctx, -14, -14, 28, 28, 7);
      ctx.fillStyle = "#fff6e6"; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.stroke();
      ctx.fillStyle = "#1a1204";
      const pips: Record<number, [number, number][]> = {
        1: [[0, 0]], 2: [[-6, -6], [6, 6]], 3: [[-6, -6], [0, 0], [6, 6]],
        4: [[-6, -6], [6, -6], [-6, 6], [6, 6]],
        5: [[-6, -6], [6, -6], [0, 0], [-6, 6], [6, 6]],
        6: [[-6, -7], [6, -7], [-6, 0], [6, 0], [-6, 7], [6, 7]],
      };
      for (const [px, py] of pips[d] ?? []) {
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillText(`SIZ ${s.me}/${CELLS}`, pad, 14);
    ctx.textAlign = "right";
    ctx.fillText(`RAQIB ${s.foe}/${CELLS}`, w - pad, 14);
    ctx.textAlign = "left";
  }, H);

  return <canvas ref={ref} style={{ width: "100%", height: H, display: "block" }} />;
}

/* ═══════════════════════ ASOSIY ═══════════════════════ */


export default function QuickGame({ gameKey }: { gameKey: string }) {
  const cfg = NEW_GAME_MAP[gameKey];
  if (!cfg) return null;
  if (NEW_ENGINE_SET.has(cfg.engine)) return <NewEngineGame key={cfg.key} cfg={cfg} />;
  return <Game key={cfg.key} cfg={cfg} />;
}

function Game({ cfg }: { cfg: GameCfg }) {
  const { lang } = useLang();
  const { ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet(cfg.key);

  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const [choice, setChoice] = useState(0);
  const [runId, setRunId] = useState(0);
  const [target, setTarget] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [step, setStep] = useState(0);
  const [cashMult, setCashMult] = useState(1);
  const [crashed, setCrashed] = useState(false);
  const [refunded, setRefunded] = useState(false);
  const pending = useRef<{ win: boolean; mult: number } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) =>
    timers.current.push(window.setTimeout(fn, ms) as unknown as number);

  /** animatsiya tugadi → 1 soniyadan keyin natija */
  const onDone = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    later(async () => {
      const w = await settle(p.win ? p.mult : p.mult === 1 ? 1 : 0);
      setAmount(w);
      setRefunded(!p.win && p.mult === 1);
      setWon(p.win || p.mult === 1);
      setBusy(false);
    }, RESULT_DELAY);
  }, [settle, setBusy]);

  const start = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setRevealed(false); setCrashed(false); setRefunded(false);
    // 50% yutuq · x1 pul qaytarish · qolgani yutqazish
    const outcome = rollOutcome(cfg.key);
    const win = outcome === "win";
    pending.current = { win, mult: win ? cfg.mult : outcome === "refund" ? 1 : 0 };

    if (cfg.engine === "reel") {
      setTarget(win ? rnd(cfg.syms.length) : -1);
      setRunId((v) => v + 1);
    } else if (cfg.engine === "wheel") {
      setTarget(win ? 0 : 1 + rnd(cfg.n - 1));
      setRunId((v) => v + 1);
    } else if (cfg.engine === "race") {
      setTarget(win ? choice : (choice + 1 + rnd(cfg.n - 1)) % cfg.n);
      setRunId((v) => v + 1);
    } else if (cfg.engine === "board") {
      setTarget(win ? 0 : 1);
      setRunId((v) => v + 1);
    } else if ((cfg.engine as string) === "pick") {
      setTarget(win ? choice : (choice + 1 + rnd(cfg.n - 1)) % cfg.n);
      setShaking(true);
      later(() => { setShaking(false); setRevealed(true); later(onDone, 620); }, 1100);
    }
  };

  /* CLIMB boshqaruvi */
  const climbNext = () => {
    if (step === 0) {
      if (!canPlay) return;
      setBusy(true); setWon(null); setCrashed(false);
    }
    const safe = riggedWin(cfg.key) || step < 1;
    if (!safe) {
      setCrashed(true);
      pending.current = { win: false, mult: 0 };
      later(() => { setStep(0); setCashMult(1); onDone(); }, 500);
      return;
    }
    const next = step + 1;
    const mult = Number((1 + next * (cfg.mult - 1)).toFixed(2));
    setStep(next); setCashMult(mult);
    if (next >= cfg.n) {
      pending.current = { win: true, mult };
      later(() => { setStep(0); setCashMult(1); onDone(); }, 600);
    }
  };
  const climbCash = () => {
    if (step === 0) return;
    pending.current = { win: true, mult: cashMult };
    setStep(0); setCashMult(1);
    onDone();
  };

  const cover = coverOf(cfg.key);
  const bg = `radial-gradient(120% 100% at 50% 0%, ${cfg.c1}33 0%, transparent 60%), linear-gradient(160deg, ${cfg.c2} 0%, #05080f 100%)`;
  const stageProps: StageProps = {
    cfg, runId, target, choice, setChoice, locked: busy, onDone,
  };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: bg }}>
      {cover && (
        <>
          <SmartImage src={cover} alt="" sizes="360px" loading="eager"
            className="fixed inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.42, zIndex: 0 }} />
          <span className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0, background: `linear-gradient(180deg, rgba(3,6,12,0.55) 0%, ${cfg.c2}99 55%, rgba(3,6,12,0.92) 100%)` }} />
        </>
      )}
      <div className="relative" style={{ zIndex: 1 }}>
      <GameHeader icon={cfg.syms[0]} title={cfg.name[lang]} subtitle={`x${cfg.mult}`} />

      </div>
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center relative" style={{ zIndex: 1 }}>
        <div className="w-full rounded-3xl p-3 relative overflow-hidden"
          style={{
            background: ts.card,
            border: "1px solid rgba(247,201,72,0.32)",
            boxShadow: "0 14px 44px rgba(247,201,72,0.14)",
          }}>
          {cover && (
            <>
              <SmartImage src={cover} alt="" sizes="360px" loading="lazy"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ opacity: 0.34, filter: "saturate(1.15)" }} />
              <span className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(0,0,0,0.28), rgba(3,6,12,0.86))" }} />
            </>
          )}
          <span className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg,transparent,#f7c948,transparent)" }} />

          <div className="relative">
          {cfg.engine === "reel" && <ReelStage {...stageProps} />}
          {cfg.engine === "wheel" && <WheelStage {...stageProps} />}
          {cfg.engine === "race" && <RaceStage {...stageProps} />}
          {cfg.engine === "board" && <BoardStage {...stageProps} />}
          {(cfg.engine as string) === "pick" && (
            <PickStage cfg={cfg} choice={choice} setChoice={setChoice}
              locked={busy} revealed={revealed} shaking={shaking} target={target} />
          )}
          {cfg.engine === "climb" && (
            <ClimbStage cfg={cfg} step={step} alive={!crashed} crashed={crashed} />
          )}
          </div>
        </div>

        {cfg.engine === "climb" && step > 0 && (
          <div className="w-full text-center py-2 rounded-2xl font-black"
            style={{
              background: "linear-gradient(145deg,rgba(247,201,72,0.18),rgba(180,83,9,0.2))",
              border: "1px solid rgba(247,201,72,0.45)", color: "#f7c948",
            }}>
            x{cashMult} — {Math.floor(bet * cashMult).toLocaleString()} so'm
          </div>
        )}

        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />

        {cfg.engine === "climb" ? (
          <div className="w-full flex gap-2">
            <PlayButton onClick={climbNext} disabled={(!canPlay && step === 0) || saving}
              label={step === 0 ? "BOSHLASH" : "KEYINGI"} />
            {step > 0 && (
              <button onClick={climbCash}
                className="px-5 rounded-2xl font-black active:scale-95 transition"
                style={{ background: "linear-gradient(145deg,#f7c948,#b45309)", color: "#1a1204" }}>
                OLISH
              </button>
            )}
          </div>
        ) : (
          <PlayButton label="O'YNASH" onClick={start} disabled={!canPlay || saving} />
        )}

        <ResultBanner
          win={won}
          amount={amount}
          text={refunded ? "PUL QAYTARILDI (x1)" : won ? "YUTDINGIZ!" : "OMAD KEYINGI SAFAR"}
        />
      </div>
    </div>
  );
}
