import { useEffect, useRef } from "react";
import { fitCanvas, useRaf, clamp, rand, spawnBurst, stepParticles, drawParticles, type Particle } from "@/lib/anim";

const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const N = WHEEL.length;
const SEG = (Math.PI * 2) / N;

interface Props {
  size: number;
  /** aylantirish buyrug'i — natija soni bilan */
  spin: { id: number; num: number } | null;
  onSettled: (num: number) => void;
  onTick?: () => void;
}

/**
 * HAQIQIY RULETKA: g'ildirak inertsiya bilan aylanadi, shar teskari yo'nalishda
 * orbitada yuguradi, sekinlashib ichkariga tushadi, to'siqlarga urилиб sakraydi
 * va o'z uyasida to'xtaydi.
 */
export default function RouletteWheel({ size, spin, onSettled, onTick }: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const partRef = useRef<Particle[]>([]);
  const st = useRef({
    rot: 0, rotV: 0,
    ballA: 0, ballV: 0, ballR: 1, targetR: 1,
    phase: "idle" as "idle" | "spin" | "drop" | "settle" | "done",
    num: 0, t: 0, bounce: 0, flash: 0, lastTick: 0, settleT: 0,
  });

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = fitCanvas(cv, size, size);
  }, [size]);

  useEffect(() => {
    if (!spin) return;
    const s = st.current;
    s.phase = "spin";
    s.num = spin.num;
    s.rotV = rand(4.2, 5.4);         // rad/s
    s.ballV = -rand(9.5, 11.5);      // teskari yo'nalish
    s.ballR = 0.93;
    s.targetR = 0.93;
    s.t = 0;
    s.settleT = 0;
    s.flash = 0;
    partRef.current = [];
  }, [spin]);

  useRaf((dt, time) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const s = st.current;
    const R = size / 2;
    const cx = R, cy = R;

    // ---- fizika
    if (s.phase === "idle") {
      s.rot += 0.28 * dt;
    } else {
      s.t += dt;
      s.rot += s.rotV * dt;
      if (s.phase === "settle" || s.phase === "done") s.rotV = Math.max(0, s.rotV - 1.2 * dt);
      else s.rotV = Math.max(0.35, s.rotV - 0.62 * dt);      // g'ildirak sekinlashadi

      if (s.phase === "spin") {
        s.ballA += s.ballV * dt;
        s.ballV += 1.55 * dt;                                // ishqalanish (manfiy tezlik nolga)
        if (s.t > 2.6 || Math.abs(s.ballV) < 5.4) s.phase = "drop";
      } else if (s.phase === "drop") {
        s.ballA += s.ballV * dt;
        s.ballV += 2.0 * dt;
        s.targetR = 0.70;
        s.ballR += (s.targetR - s.ballR) * clamp(dt * 2.4, 0, 1);
        // to'siqlarga urilish
        if (Math.abs(s.ballV) < 3.2) {
          s.bounce = 0.9;
          s.phase = "settle";
          partRef.current.push(...spawnBurst(
            cx + Math.cos(s.ballA) * R * s.ballR,
            cy + Math.sin(s.ballA) * R * s.ballR,
            8, ["#fff", "#ffd766"], 120));
        }
      } else if (s.phase === "settle") {
        // shar uyaga tushadi: g'ildirak bilan birga aylanadi
        const idx = WHEEL.indexOf(s.num);
        const pocketA = s.rot + (idx + 0.5) * SEG;
        let diff = ((pocketA - s.ballA + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        s.settleT += dt;
        // shar uyaga tez va ishonchli o'tiradi (g'ildirak bilan birga aylanadi)
        s.ballA += diff * clamp(dt * 6.5, 0, 1) + s.rotV * dt;
        s.targetR = 0.615;
        s.ballR += (s.targetR - s.ballR) * clamp(dt * 3, 0, 1);
        s.bounce = Math.max(0, s.bounce - dt * 1.6);
        // g'ildirakni ham to'liq to'xtatamiz
        s.rotV = Math.max(0, s.rotV - 0.85 * dt);
        // aniq o'tirdi YOKI 2.6s ichida majburiy o'tiradi (cheksiz aylanish bo'lmasin)
        if ((Math.abs(diff) < 0.05 && s.rotV < 0.25) || s.settleT > 2.6) {
          s.ballA = pocketA;
          s.phase = "done";
          s.flash = 1;
          partRef.current.push(...spawnBurst(
            cx + Math.cos(s.ballA) * R * s.ballR,
            cy + Math.sin(s.ballA) * R * s.ballR,
            26, ["#ffd766", "#fff3c4", "#39c46f"], 260));
          onSettled(s.num);
        }
      } else if (s.phase === "done") {
        const idx = WHEEL.indexOf(s.num);
        s.rotV = Math.max(0, s.rotV - 1.6 * dt);
        s.ballA = s.rot + (idx + 0.5) * SEG;
        s.flash = Math.max(0, s.flash - dt * 0.5);
      }

      // tiqillash ovozi (har uya ostidan o'tganda)
      const rel = Math.abs(s.ballA - s.rot) / SEG;
      if (Math.floor(rel) !== s.lastTick) { s.lastTick = Math.floor(rel); onTick?.(); }
    }

    partRef.current = stepParticles(partRef.current, dt, 420);

    // ---- chizish
    ctx.clearRect(0, 0, size, size);

    // tashqi oltin ramka
    const rim = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    rim.addColorStop(0, "#fff3c4");
    rim.addColorStop(0.45, "#d4af37");
    rim.addColorStop(0.8, "#8a6a12");
    rim.addColorStop(1, "#3b2a05");
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();

    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#160c02"; ctx.fill();

    // segmentlar
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.rot);
    for (let i = 0; i < N; i++) {
      const n = WHEEL[i];
      const a0 = i * SEG, a1 = a0 + SEG;
      const hit = s.phase === "done" && n === s.num;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R * 0.88, a0, a1);
      ctx.closePath();
      const base = n === 0 ? "#25a55a" : REDS.has(n) ? "#c81f1f" : "#15181d";
      if (hit && s.flash > 0) {
        ctx.fillStyle = `rgba(255,236,160,${0.55 + 0.45 * Math.sin(time * 14)})`;
      } else ctx.fillStyle = base;
      ctx.fill();
      ctx.strokeStyle = "rgba(212,175,55,0.55)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // raqam
      ctx.save();
      ctx.rotate(a0 + SEG / 2);
      ctx.translate(R * 0.78, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${Math.max(8, R * 0.11)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), 0, 0);
      ctx.restore();

      // uya to'sig'i (fret)
      ctx.save();
      ctx.rotate(a0);
      ctx.beginPath();
      ctx.moveTo(R * 0.55, 0); ctx.lineTo(R * 0.88, 0);
      ctx.strokeStyle = "rgba(220,200,140,0.5)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
    // ichki konus
    const hub = ctx.createRadialGradient(-R * 0.15, -R * 0.2, R * 0.05, 0, 0, R * 0.55);
    hub.addColorStop(0, "#fff7d6");
    hub.addColorStop(0.5, "#d4af37");
    hub.addColorStop(1, "#6b4f0e");
    ctx.beginPath(); ctx.arc(0, 0, R * 0.52, 0, Math.PI * 2); ctx.fillStyle = hub; ctx.fill();
    // konus qanotchalari
    for (let k = 0; k < 8; k++) {
      ctx.save();
      ctx.rotate((k / 8) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(R * 0.5, -R * 0.06); ctx.lineTo(R * 0.5, R * 0.06);
      ctx.closePath();
      ctx.fillStyle = k % 2 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)";
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // markaz natija raqami
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.font = `900 ${R * 0.3}px system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.phase === "done" ? String(s.num) : s.phase === "idle" ? "" : "…", cx, cy);

    // ko'rsatkich
    ctx.beginPath();
    ctx.moveTo(cx, cy - R + 1);
    ctx.lineTo(cx - R * 0.045, cy - R * 0.9);
    ctx.lineTo(cx + R * 0.045, cy - R * 0.9);
    ctx.closePath();
    ctx.fillStyle = "#fff3c4";
    ctx.fill();

    // shar
    if (s.phase !== "idle") {
      const br = R * 0.055;
      const bx = cx + Math.cos(s.ballA) * R * s.ballR;
      const by = cy + Math.sin(s.ballA) * R * s.ballR - s.bounce * br * 1.6 * Math.abs(Math.sin(time * 22));
      ctx.beginPath(); ctx.arc(bx, by + br * 0.6, br * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();
      const bg = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.45, br * 0.1, bx, by, br);
      bg.addColorStop(0, "#ffffff");
      bg.addColorStop(0.55, "#e8eef5");
      bg.addColorStop(1, "#8b98a6");
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.shadowColor = "rgba(255,255,255,0.7)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    drawParticles(ctx, partRef.current);
  });

  return <canvas ref={cvRef} style={{ display: "block", width: size, height: size }} />;
}
