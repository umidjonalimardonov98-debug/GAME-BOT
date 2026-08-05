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
}

export default function Dice3D({ value, rolling, size = 88, seed = 0, duration = 3000 }: Props) {
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
      timer.current = setTimeout(() => setSpinning(false), duration);
    } else {
      setSpinning(false);
    }

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, rolling, seed, duration]);


  const s = size;
  return (
    <div
      className={rolling ? "dice-scene dice-bounce" : "dice-scene"}
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
            ? "transform 1.4s cubic-bezier(0.15,0.62,0.2,1)"
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
              background:
                "radial-gradient(circle at 30% 25%, #ffffff 0%, #f6f3e8 45%, #ddd6c1 100%)",
              boxShadow:
                "inset 0 0 0 1px rgba(120,100,50,0.3), inset 0 6px 14px rgba(255,255,255,0.9), inset 0 -8px 16px rgba(120,100,60,0.3)",
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
                  background:
                    "radial-gradient(circle at 35% 30%, #8a6a14 0%, #3a2a05 60%, #120c00 100%)",
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
