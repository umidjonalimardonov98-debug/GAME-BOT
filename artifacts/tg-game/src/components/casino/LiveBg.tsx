import { useMemo } from "react";
import { useLocation } from "wouter";

/**
 * Har bir o'yin uchun "tirik" (qimirlab turadigan) orqa fon.
 * — pointer-events: none, shuning uchun bosishga xalal bermaydi
 * — mix-blend-mode: screen + past opacity → matn o'qilishi saqlanadi
 */

type Variant = {
  /** ambiyent nur dog'lari */
  glow: [string, string];
  /** uchib yuruvchi belgilar */
  syms: string[];
  /** qo'shimcha qatlam turi */
  layer: "rays" | "stars" | "grid" | "bubbles" | "smoke";
  count?: number;
  size?: [number, number];
};

const V: Record<string, Variant> = {
  "/":            { glow: ["#f7c948", "#c026d3"], syms: ["coin", "crown", "star"], layer: "rays", count: 12 },
  "/spin":        { glow: ["#f7c948", "#b91c1c"], syms: ["wheel", "coin", "star"], layer: "rays", count: 10 },
  "/roulette":    { glow: ["#25a55a", "#f7c948"], syms: ["chip", "wheel", "coin"], layer: "rays", count: 10 },
  "/slots":       { glow: ["#f7c948", "#e11d48"], syms: ["seven", "cherry", "lemon", "bell", "grape"], layer: "rays", count: 14 },
  "/mines":       { glow: ["#3d8fd6", "#0d4b8a"], syms: ["gem", "bomb"], layer: "grid", count: 10 },
  "/dice":        { glow: ["#25a55a", "#0ea5e9"], syms: ["dice", "chip"], layer: "grid", count: 10 },
  "/aviator":     { glow: ["#e0483f", "#1e3a8a"], syms: ["plane", "rocket"], layer: "smoke", count: 7, size: [26, 54] },
  "/limbo":       { glow: ["#e0483f", "#7c3aed"], syms: ["rocket", "target"], layer: "smoke", count: 8 },
  "/towers":      { glow: ["#7c3aed", "#0ea5e9"], syms: ["gem", "skull"], layer: "grid", count: 9 },
  "/apple":       { glow: ["#78b45a", "#f7c948"], syms: ["apple", "clover"], layer: "bubbles", count: 11 },
  "/blackjack":   { glow: ["#1a7d43", "#f7c948"], syms: ["cardback", "chip"], layer: "rays", count: 9 },
  "/baccarat":    { glow: ["#1a7d43", "#c026d3"], syms: ["cardback", "coin"], layer: "rays", count: 9 },
  "/dragontiger": { glow: ["#b91c1c", "#f7c948"], syms: ["dragon", "tiger"], layer: "smoke", count: 7, size: [30, 58] },
  "/hilo":        { glow: ["#0ea5e9", "#f7c948"], syms: ["cardback", "star"], layer: "bubbles", count: 10 },
  "/coinflip":    { glow: ["#f7c948", "#0ea5e9"], syms: ["coin", "coin1"], layer: "bubbles", count: 12 },
  "/plinko":      { glow: ["#3d8fd6", "#c026d3"], syms: ["gem", "coin"], layer: "bubbles", count: 12 },
  "/keno":        { glow: ["#c026d3", "#f7c948"], syms: ["ticket", "clover", "star"], layer: "stars", count: 12 },
  "/scratch":     { glow: ["#f7c948", "#25a55a"], syms: ["ticket", "gift"], layer: "stars", count: 10 },
  "/case":        { glow: ["#f7c948", "#7c3aed"], syms: ["chest", "gift", "gem"], layer: "stars", count: 11 },
  "/rps":         { glow: ["#0ea5e9", "#e11d48"], syms: ["rock", "paper", "scissors"], layer: "bubbles", count: 9 },
  "/parity":      { glow: ["#c026d3", "#0ea5e9"], syms: ["coin", "target"], layer: "grid", count: 10 },
  "/deposit":     { glow: ["#25a55a", "#f7c948"], syms: ["money", "coin"], layer: "rays", count: 10 },
  "/withdraw":    { glow: ["#0ea5e9", "#f7c948"], syms: ["money", "coin1"], layer: "rays", count: 10 },
  "/leaderboard": { glow: ["#f7c948", "#b45309"], syms: ["trophy", "medal-gold", "crown"], layer: "stars", count: 10 },
};

const DEFAULT: Variant = { glow: ["#f7c948", "#7c3aed"], syms: ["coin", "star"], layer: "stars", count: 9 };

function rnd(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export default function LiveBg() {
  const [path] = useLocation();
  const v = V[path] ?? DEFAULT;

  const items = useMemo(() => {
    const n = v.count ?? 10;
    const [smin, smax] = v.size ?? [20, 40];
    return Array.from({ length: n }).map((_, i) => {
      const r1 = rnd(i + 1), r2 = rnd(i + 7), r3 = rnd(i + 13), r4 = rnd(i + 21);
      return {
        sym: v.syms[i % v.syms.length],
        left: 3 + r1 * 92,
        size: smin + r2 * (smax - smin),
        dur: 13 + r3 * 14,
        delay: -r4 * 20,
        drift: (r3 - 0.5) * 90,
        spin: r2 > 0.5 ? 1 : -1,
      };
    });
  }, [path]);

  return (
    <div className="live-bg" aria-hidden>
      <span className="live-blob" style={{ background: v.glow[0], left: "-18%", top: "4%" }} />
      <span className="live-blob live-blob-2" style={{ background: v.glow[1], right: "-20%", top: "38%" }} />
      <span className="live-blob live-blob-3" style={{ background: v.glow[0], left: "22%", bottom: "-16%" }} />

      {v.layer === "rays" && <span className="live-rays" />}
      {v.layer === "grid" && <span className="live-grid" />}
      {v.layer === "smoke" && <span className="live-smoke" />}
      {v.layer === "stars" && (
        <span className="live-stars">
          {Array.from({ length: 26 }).map((_, i) => (
            <i key={i} style={{
              left: `${rnd(i + 3) * 100}%`, top: `${rnd(i + 31) * 100}%`,
              animationDelay: `${rnd(i + 5) * 3}s`,
              width: 2 + rnd(i + 9) * 2, height: 2 + rnd(i + 9) * 2,
            }} />
          ))}
        </span>
      )}
      {v.layer === "bubbles" && <span className="live-bubbles" />}

      {items.map((it, i) => (
        <img
          key={i}
          src={`/symbols/${it.sym}.png`}
          alt=""
          className="live-sym"
          style={{
            left: `${it.left}%`,
            width: it.size,
            height: it.size,
            animationDuration: `${it.dur}s, ${it.dur / 2.2}s`,
            animationDelay: `${it.delay}s, ${it.delay}s`,
            ["--drift" as string]: `${it.drift}px`,
            ["--spin" as string]: `${it.spin * 360}deg`,
          }}
        />
      ))}
    </div>
  );
}
