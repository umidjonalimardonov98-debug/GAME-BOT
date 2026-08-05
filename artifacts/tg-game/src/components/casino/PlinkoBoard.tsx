import { useEffect, useRef } from "react";
import { fitCanvas, useRaf, clamp, rand, spawnBurst, stepParticles, drawParticles, type Particle } from "@/lib/anim";

interface Ball {
  x: number; y: number; vx: number; vy: number; r: number; done: boolean; trail: { x: number; y: number }[];
}

interface Props {
  rows: number;
  mults: number[];
  width: number;
  /** o'yin boshlanganda tashlanadigan to'p — target katak indeksi */
  drop: { id: number; target: number } | null;
  onLanded: (idx: number) => void;
  onPeg?: () => void;
}

/**
 * HAQIQIY FIZIKA: tortishish kuchi, mixlardan sakrash, ishqalanish, uchqunlar.
 * To'p yo'li oldindan chizilmagan — har sakrash real hisoblanadi.
 */
export default function PlinkoBoard({ rows, mults, width, drop, onLanded, onPeg }: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const partRef = useRef<Particle[]>([]);
  const pegsRef = useRef<{ x: number; y: number; hit: number }[]>([]);
  const targetRef = useRef(0);
  const flashRef = useRef<{ idx: number; t: number } | null>(null);
  const doneRef = useRef(false);

  const buckets = rows + 1;
  const padX = 14;
  const gapX = (width - padX * 2) / (buckets + 1);
  const boardTop = 26;
  const gapY = Math.max(19, Math.min(30, gapX * 0.92));
  const height = boardTop + rows * gapY + 62;
  const bucketTop = boardTop + rows * gapY + 14;

  // mixlarni qurish
  useEffect(() => {
    const pegs: { x: number; y: number; hit: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const n = r + 3;
      const y = boardTop + r * gapY;
      const w = (n - 1) * gapX;
      const x0 = width / 2 - w / 2;
      for (let c = 0; c < n; c++) pegs.push({ x: x0 + c * gapX, y, hit: 0 });
    }
    pegsRef.current = pegs;
  }, [rows, width, gapX, gapY, boardTop]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = fitCanvas(cv, width, height);
  }, [width, height]);

  // yangi to'p
  useEffect(() => {
    if (!drop) return;
    targetRef.current = drop.target;
    doneRef.current = false;
    flashRef.current = null;
    ballsRef.current = [{
      x: width / 2 + rand(-2.5, 2.5),
      y: -8,
      vx: rand(-14, 14),
      vy: 20,
      r: Math.max(5.5, gapX * 0.27),
      done: false,
      trail: [],
    }];
  }, [drop, width, gapX]);

  useRaf((dt) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const G = 1180;
    const pegs = pegsRef.current;
    const bucketW = width / buckets;
    const targetX = bucketW * (targetRef.current + 0.5);

    // ---- fizika
    for (const b of ballsRef.current) {
      if (b.done) continue;
      b.vy += G * dt;
      // yumshoq boshqarish: pastga tushgan sari nishonga intiladi (kazino RTP mantig'i)
      const prog = clamp((b.y - boardTop) / (bucketTop - boardTop), 0, 1);
      b.vx += (targetX - b.x) * (0.7 + prog * 5.2) * dt;
      b.vx *= 0.995;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // devorlar
      if (b.x < padX * 0.4 + b.r) { b.x = padX * 0.4 + b.r; b.vx = Math.abs(b.vx) * 0.55; }
      if (b.x > width - padX * 0.4 - b.r) { b.x = width - padX * 0.4 - b.r; b.vx = -Math.abs(b.vx) * 0.55; }

      // mixlar bilan to'qnashuv
      for (const p of pegs) {
        const dx = b.x - p.x, dy = b.y - p.y;
        const rr = b.r + 4.6;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d, ny = dy / d;
          b.x = p.x + nx * rr;
          b.y = p.y + ny * rr;
          const vn = b.vx * nx + b.vy * ny;
          b.vx -= 1.62 * vn * nx;
          b.vy -= 1.62 * vn * ny;
          b.vx += rand(-26, 26);
          b.vy *= 0.7;
          p.hit = 1;
          partRef.current.push(...spawnBurst(p.x, p.y, 3, ["#ffe9a8", "#ffd766", "#9fd8ff"], 90));
          onPeg?.();
        }
      }

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 16) b.trail.shift();

      if (b.y >= bucketTop + 12 && !doneRef.current) {
        b.done = true;
        doneRef.current = true;
        const idx = clamp(Math.floor(b.x / bucketW), 0, buckets - 1);
        flashRef.current = { idx, t: 1 };
        partRef.current.push(...spawnBurst(bucketW * (idx + 0.5), bucketTop + 10, 22,
          mults[idx] > 0 ? ["#ffd766", "#39c46f", "#fff3c4"] : ["#8aa0b5", "#4b5b6b"], 300));
        onLanded(idx);
      }
    }
    ballsRef.current = ballsRef.current.filter((b) => !b.done || b.y < height + 40);
    partRef.current = stepParticles(partRef.current, dt, 780);
    for (const p of pegs) p.hit = Math.max(0, p.hit - dt * 3.4);
    if (flashRef.current) {
      flashRef.current.t -= dt * 1.1;
      if (flashRef.current.t <= 0) flashRef.current = null;
    }

    // ---- chizish
    ctx.clearRect(0, 0, width, height);
    // fon nurlanishi
    const bg = ctx.createRadialGradient(width / 2, 0, 10, width / 2, height, height);
    bg.addColorStop(0, "rgba(80,170,255,0.20)");
    bg.addColorStop(1, "rgba(3,14,28,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // mixlar
    for (const p of pegs) {
      const glow = p.hit;
      if (glow > 0.02) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5 + glow * 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,102,${0.35 * glow})`;
        ctx.fill();
      }
      const g = ctx.createRadialGradient(p.x - 1.5, p.y - 1.8, 0.4, p.x, p.y, 5);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(glow > 0.1 ? 0.5 : 0.55, glow > 0.1 ? "#ffd766" : "#bfe3ff");
      g.addColorStop(1, glow > 0.1 ? "#a16207" : "#2f6f9f");
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // kataklar
    for (let i = 0; i < buckets; i++) {
      const x = i * bucketW + 2;
      const w = bucketW - 4;
      const win = mults[i] > 0;
      const fl = flashRef.current?.idx === i ? flashRef.current.t : 0;
      const grd = ctx.createLinearGradient(0, bucketTop, 0, bucketTop + 30);
      if (fl > 0) {
        grd.addColorStop(0, win ? "#5ce89a" : "#ef8b8b");
        grd.addColorStop(1, win ? "#0f6b3c" : "#7f1d1d");
      } else if (win) {
        grd.addColorStop(0, "rgba(255,214,102,0.35)");
        grd.addColorStop(1, "rgba(160,110,10,0.28)");
      } else {
        grd.addColorStop(0, "rgba(255,255,255,0.10)");
        grd.addColorStop(1, "rgba(255,255,255,0.03)");
      }
      ctx.fillStyle = grd;
      const rr = 7;
      ctx.beginPath();
      ctx.roundRect(x, bucketTop + (fl > 0 ? 4 : 0), w, 27, rr);
      ctx.fill();
      ctx.strokeStyle = win ? "rgba(255,214,102,0.45)" : "rgba(150,190,235,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = fl > 0 ? "#ffffff" : win ? "#ffe9a8" : "rgba(200,225,255,0.6)";
      ctx.font = `900 ${Math.min(12, bucketW * 0.34)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mults[i] > 0 ? `x${mults[i]}` : "0", x + w / 2, bucketTop + 14 + (fl > 0 ? 4 : 0));
    }

    // to'p izlari
    for (const b of ballsRef.current) {
      for (let i = 0; i < b.trail.length; i++) {
        const t = i / b.trail.length;
        ctx.beginPath();
        ctx.arc(b.trail[i].x, b.trail[i].y, b.r * (0.25 + t * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,214,102,${t * 0.22})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,214,102,0.15)";
      ctx.fill();
      const g = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.5, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, "#fffdf2");
      g.addColorStop(0.45, "#ffd766");
      g.addColorStop(1, "#b45309");
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    drawParticles(ctx, partRef.current);
  });

  return <canvas ref={cvRef} style={{ display: "block", width, height }} />;
}
