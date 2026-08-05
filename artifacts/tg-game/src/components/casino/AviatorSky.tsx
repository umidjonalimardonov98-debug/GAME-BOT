import { useEffect, useRef } from "react";
import { fitCanvas, useRaf, clamp, rand, loadImg, spawnBurst, stepParticles, drawParticles, type Particle } from "@/lib/anim";

type Phase = "idle" | "countdown" | "flying" | "done";

interface Props {
  phase: Phase;
  multiplier: number;
  countdown: number;
  crashed: boolean;
  width: number;
  height?: number;
}

/**
 * HAQIQIY UCHISH: samolyot egri chiziq bo'ylab real yuradi, qanotlari qaltiraydi,
 * dvigatel tutuni orqada qoladi, osmon parallaks bilan siljiydi, crashda uchib ketadi.
 */
export default function AviatorSky({ phase, multiplier, countdown, crashed, width, height = 210 }: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef({ phase, multiplier, countdown, crashed });
  stateRef.current = { phase, multiplier, countdown, crashed };

  const scrollRef = useRef(0);
  const smokeRef = useRef<{ x: number; y: number; r: number; life: number; max: number }[]>([]);
  const partRef = useRef<Particle[]>([]);
  const starsRef = useRef(Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.6, 1.7), p: rand(0, 6.28) })));
  const cloudsRef = useRef(Array.from({ length: 5 }, (_, i) => ({ x: rand(0, 1), y: rand(0.1, 0.75), s: rand(0.5, 1.3), sp: rand(6, 22), i })));
  const crashRef = useRef({ t: 0, x: 0, y: 0, vx: 0, vy: 0, started: false });
  const shakeRef = useRef(0);
  const planeImg = loadImg("/symbols/plane.png");

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = fitCanvas(cv, width, height);
  }, [width, height]);

  useEffect(() => {
    if (phase === "flying") {
      crashRef.current = { t: 0, x: 0, y: 0, vx: 0, vy: 0, started: false };
      smokeRef.current = [];
      partRef.current = [];
    }
  }, [phase]);

  useRaf((dt, time) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const st = stateRef.current;
    const W = width, H = height;
    const padL = 26, padB = 26;

    // ---- egri chiziq geometriyasi (multiplikatorga bog'liq real trayektoriya)
    const m = Math.max(1, st.multiplier);
    const prog = clamp(Math.log(m) / Math.log(14), 0, 1); // logaritmik o'sish
    const endX = padL + (W - padL - 20) * (0.12 + prog * 0.86);
    const endY = H - padB - (H - padB - 24) * (0.06 + prog * 0.9);
    const curve = (t: number) => {
      // kvadratik Bezier: pastdan chapdan yuqoriga o'ngga
      const x0 = padL, y0 = H - padB;
      const cx = padL + (endX - padL) * 0.62, cy = y0 - (y0 - endY) * 0.12;
      const mt = 1 - t;
      return {
        x: mt * mt * x0 + 2 * mt * t * cx + t * t * endX,
        y: mt * mt * y0 + 2 * mt * t * cy + t * t * endY,
      };
    };

    scrollRef.current += dt * (st.phase === "flying" ? 46 + prog * 90 : 12);
    if (st.phase === "flying") shakeRef.current = 0.6 + prog * 2.2;
    else shakeRef.current = Math.max(0, shakeRef.current - dt * 4);

    // ---- crash: samolyot uchib ketadi
    if (st.phase === "done" && st.crashed) {
      const c = crashRef.current;
      if (!c.started) {
        const p = curve(1);
        c.started = true; c.x = p.x; c.y = p.y; c.vx = 240; c.vy = -170; c.t = 0;
        partRef.current.push(...spawnBurst(p.x, p.y, 26, ["#ff6b4a", "#ffb347", "#ffe9a8", "#7a7a7a"], 320));
      }
      c.t += dt;
      c.vy += 150 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }

    partRef.current = stepParticles(partRef.current, dt, 340);
    smokeRef.current = smokeRef.current
      .map((s) => ({ ...s, x: s.x - dt * 60, y: s.y + dt * 10, r: s.r + dt * 22, life: s.life - dt }))
      .filter((s) => s.life > 0);

    // ---- fon
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createRadialGradient(W * 0.3, H * 0.15, 8, W * 0.5, H, H * 1.5);
    sky.addColorStop(0, st.phase === "flying" ? "rgba(224,72,63,0.22)" : "rgba(70,110,190,0.16)");
    sky.addColorStop(0.55, "#07070c");
    sky.addColorStop(1, "#000");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // yulduzlar
    for (const s of starsRef.current) {
      const tw = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(time * 2 + s.p));
      ctx.globalAlpha = tw;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(((s.x * W - scrollRef.current * 0.12) % W + W) % W, s.y * H * 0.8, s.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // parallaks bulutlar
    for (const c of cloudsRef.current) {
      const cx = ((c.x * W - scrollRef.current * (c.sp / 22) * 0.9) % (W + 140) + W + 140) % (W + 140) - 70;
      const cy = c.y * H * 0.85;
      ctx.globalAlpha = 0.07 + c.s * 0.05;
      ctx.fillStyle = "#cfe6ff";
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + k * 16 * c.s, cy + (k % 2) * 5, 24 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // siljuvchi to'r (tezlik hissi)
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const step = 34;
    const off = scrollRef.current % step;
    for (let x = -off; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = H - padB; y > 0; y -= step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ---- tutun
    for (const s of smokeRef.current) {
      const a = (s.life / s.max) * 0.22;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ffd0b0";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ---- trayektoriya
    if (st.phase === "flying" || st.phase === "done") {
      const col = st.crashed ? "#f87171" : m >= 10 ? "#c084fc" : m >= 5 ? "#34d399" : m >= 2 ? "#fbbf24" : "#ff7a5c";
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 40; i++) pts.push(curve(i / 40));
      // to'ldirish
      const fill = ctx.createLinearGradient(0, endY, 0, H);
      fill.addColorStop(0, `${col}55`);
      fill.addColorStop(1, `${col}00`);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(pts[pts.length - 1].x, H - padB);
      ctx.lineTo(pts[0].x, H - padB);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      // chiziq
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ---- samolyot
      const tip = curve(1), pre = curve(0.965);
      let px = tip.x, py = tip.y, ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
      if (st.phase === "done" && st.crashed) {
        px = crashRef.current.x; py = crashRef.current.y;
        ang = Math.atan2(crashRef.current.vy, crashRef.current.vx);
      }
      const sh = shakeRef.current;
      px += rand(-sh, sh) * 0.6;
      py += rand(-sh, sh) * 0.6;

      if (st.phase === "flying") {
        smokeRef.current.push({ x: px - 12, y: py + 5, r: rand(3, 6), life: 0.75, max: 0.75 });
        if (Math.random() < 0.35) partRef.current.push(...spawnBurst(px - 10, py + 4, 1, ["#ffb347", "#ff6b4a"], 40));
      }

      const size = 40;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(clamp(ang, -0.9, 0.5));
      if (planeImg.complete && planeImg.naturalWidth) {
        ctx.shadowColor = "rgba(255,180,90,0.55)";
        ctx.shadowBlur = 16;
        ctx.drawImage(planeImg, -size * 0.62, -size * 0.5, size, size);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#ff5f57";
        ctx.beginPath();
        ctx.moveTo(-14, 8); ctx.lineTo(16, 0); ctx.lineTo(-14, -8); ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (st.phase === "idle" || st.phase === "countdown") {
      const bob = Math.sin(time * 2) * 6;
      const size = 54;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.52 + bob);
      ctx.rotate(-0.14 + Math.sin(time * 1.4) * 0.05);
      if (planeImg.complete && planeImg.naturalWidth) ctx.drawImage(planeImg, -size / 2, -size / 2, size, size);
      ctx.restore();
      if (st.phase === "countdown") {
        // aylanuvchi tayyorgarlik halqasi
        ctx.strokeStyle = "rgba(255,214,102,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W * 0.5, H * 0.52, 46, time * 3, time * 3 + 1.6);
        ctx.stroke();
      }
    }

    drawParticles(ctx, partRef.current);

    // ---- multiplikator matni
    if (st.phase === "flying" || (st.phase === "done" && st.multiplier > 1)) {
      const col = st.crashed ? "#f87171" : m >= 10 ? "#c084fc" : m >= 5 ? "#34d399" : m >= 2 ? "#fbbf24" : "#ffd766";
      const pop = st.phase === "flying" ? 1 + Math.sin(time * 8) * 0.012 : 1;
      ctx.save();
      ctx.translate(W / 2, H * 0.34);
      ctx.scale(pop, pop);
      ctx.font = "900 46px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = col;
      ctx.shadowBlur = 26;
      ctx.fillStyle = col;
      ctx.fillText(`${m.toFixed(2)}x`, 0, 0);
      ctx.restore();
      if (st.crashed) {
        ctx.font = "900 13px system-ui, sans-serif";
        ctx.fillStyle = "#f87171";
        ctx.textAlign = "center";
        ctx.fillText("QULAB TUSHDI!", W / 2, H * 0.34 + 36);
      }
    }
    if (st.phase === "countdown") {
      ctx.font = "900 58px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(120,182,255,0.9)";
      ctx.shadowBlur = 22;
      ctx.fillText(String(Math.max(0, st.countdown)), W / 2, H * 0.2);
      ctx.shadowBlur = 0;
    }
  });

  return <canvas ref={cvRef} style={{ display: "block", width, height }} />;
}
