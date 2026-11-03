import { useEffect, useRef, useState } from "react";

/** Haqiqiy 3D zar — havoda ag'anab aylanadi va aynan tushgan yuzda to'xtaydi.
 *  MUHIM: preserve-3d elementga filter/backdrop-filter berilmaydi —
 *  aks holda brauzer kubni "qog'oz" kabi yassilaydi. */

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

/** kub ichida yuzlar joylashuvi (qarama-qarshi yuzlar yig'indisi 7) */
const FACE_TRANSFORM: Record<number, string> = {
  1: "translateZ(var(--h))",
  6: "rotateY(180deg) translateZ(var(--h))",
  3: "rotateY(90deg) translateZ(var(--h))",
  4: "rotateY(-90deg) translateZ(var(--h))",
  5: "rotateX(90deg) translateZ(var(--h))",
  2: "rotateX(-90deg) translateZ(var(--h))",
};

/** rotateX(x) rotateY(y) — shu burchaklarda kerakli yuz kameraga qaraydi */
const SHOW: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  2: [90, 0],
};

interface Props {
  value: number;
  rolling: boolean;
  size?: number;
  /** ikkinchi zar boshqacha aylansin */
  seed?: number;
  /** aylanish davomiyligi (ms) */
  duration?: number;
  /** o'yinga xos zar ko'rinishi */
  skin?: DiceSkin;
}

export type DiceSkin = "ivory" | "ruby" | "gold" | "wood" | "emerald";
const SKINS: Record<DiceSkin, { face: string; pip: string; edge: string }> = {
  ivory: { face: "radial-gradient(circle at 30% 25%, #ffffff 0%, #f6f3e8 45%, #ddd6c1 100%)", pip: "radial-gradient(circle at 35% 30%, #8a6a14 0%, #3a2a05 60%, #120c00 100%)", edge: "rgba(120,100,50,0.3)" },
  ruby: { face: "radial-gradient(circle at 30% 25%, #ff8a8a 0%, #d61f2c 45%, #7a0610 100%)", pip: "radial-gradient(circle at 35% 30%, #ffffff 0%, #f1e6e6 60%, #c9b7b7 100%)", edge: "rgba(255,180,180,0.45)" },
  gold: { face: "radial-gradient(circle at 30% 25%, #fff6c8 0%, #f2c94c 45%, #a0700e 100%)", pip: "radial-gradient(circle at 35% 30%, #4a2f00 0%, #241600 60%, #0d0800 100%)", edge: "rgba(255,240,180,0.6)" },
  wood: { face: "repeating-linear-gradient(115deg, #b77a3e 0 6px, #a86c33 6px 11px, #c4884a 11px 15px)", pip: "radial-gradient(circle at 35% 30%, #f6e7c8 0%, #e2cfa6 60%, #b49a6c 100%)", edge: "rgba(60,30,5,0.5)" },
  emerald: { face: "radial-gradient(circle at 30% 25%, #9ff5c8 0%, #17a560 45%, #04512b 100%)", pip: "radial-gradient(circle at 35% 30%, #ffffff 0%, #e6f5ec 60%, #b2cdbd 100%)", edge: "rgba(180,255,210,0.45)" },
};

export default function Dice3D({ value, rolling, size = 88, seed = 0, duration = 3000, skin = "ivory" }: Props) {
  const sk = SKINS[skin];
  const [landed, setLanded] = useState(0);
  const clamp = (v: number) => Math.max(1, Math.min(6, Math.round(v) || 1));
  const [rot, setRot] = useState<[number, number]>(() => SHOW[clamp(value)]);
  const [spinning, setSpinning] = useState(false);
  /** aylanishlar to'planadi — zar hech qachon orqaga qaytmaydi */
  const spins = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = clamp(value);
    const [tx, ty] = SHOW[v];
    const dir = seed % 2 === 0 ? 1 : -1;

    if (timer.current) clearTimeout(timer.current);

    if (rolling) {
      // MUHIM: burchak har safar TO'PLANADI. Aks holda yangi qiymat eskisi bilan
      // bir xil bo'lsa transform o'zgarmay qolib, zar umuman aylanmasdi
      // (shu sabab "bitta zar aylanib, ikkinchisi qotib turardi").
      setSpinning(true);
      const turnsX = 5 + (seed % 2);
      const turnsY = 6 + (seed % 2);
      spins.current += 1;
      const base = 360 * spins.current * (5 + seed);
      setRot([tx + (base + 360 * turnsX) * dir, ty + base + 360 * turnsY]);
      timer.current = setTimeout(() => {
        setSpinning(false);
        setLanded((n) => n + 1);
        try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(seed === 0 ? "medium" : "light"); } catch { /* ignore */ }
      }, duration);
    } else {
      setSpinning(false);
    }

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, rolling, seed, duration]);


  const s = size;
  return (
    <div
      key={`land-${landed}`}
      className={rolling ? "dice-scene dice-bounce" : landed ? "dice-scene dice-land" : "dice-scene"}
      style={{
        animationDuration: rolling ? `${duration}ms` : undefined,
        width: s,
        height: s,
        perspective: s * 4.5,
        position: "relative",
      }}
    >
      {/* stoldagi soya — kubdan tashqarida (filter kubni yassilamasligi uchun) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: -s * 0.16,
          width: s * 0.86,
          height: s * 0.2,
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 72%)",
          opacity: rolling ? 0.45 : 0.8,
          transition: "opacity 0.4s",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)`,
          transition: rolling
            ? `transform ${Math.round(duration * 0.86)}ms cubic-bezier(0.12,0.7,0.16,1)`
            : "transform 0.6s cubic-bezier(0.18,0.9,0.22,1.02)",
          willChange: "transform",
          // @ts-expect-error css var
          "--h": `${s / 2}px`,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div
            key={f}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: s * 0.18,
              transform: FACE_TRANSFORM[f],
              background: sk.face,
              boxShadow:
                `inset 0 0 0 1px ${sk.edge}, inset 0 6px 14px rgba(255,255,255,0.55), inset 0 -8px 16px rgba(0,0,0,0.3)`,
              backfaceVisibility: "hidden",
            }}
          >
            {PIPS[f].map(([x, y], i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: s * 0.17,
                  height: s * 0.17,
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  background: sk.pip,
                  boxShadow:
                    "inset 0 2px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.55)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* natija belgisi — to'xtagandan keyin ko'rinadi */}
      {!rolling && !spinning && (
        <span
          style={{
            position: "absolute",
            left: "50%",
            bottom: -s * 0.3,
            transform: "translateX(-50%)",
            fontSize: Math.max(10, s * 0.15),
            fontWeight: 900,
            color: "#f7e59b",
            textShadow: "0 2px 6px rgba(0,0,0,0.8)",
            pointerEvents: "none",
          }}
        >
          {clamp(value)}
        </span>
      )}
    </div>
  );
}
