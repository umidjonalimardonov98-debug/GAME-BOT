import { useEffect, useRef, useState } from "react";

/** Haqiqiy 3D zar — aylanib tushadi va kerakli yuzda to'xtaydi */

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

/** kub ichida yuzlar joylashuvi */
const FACE_TRANSFORM: Record<number, string> = {
  1: "translateZ(var(--h))",
  6: "rotateY(180deg) translateZ(var(--h))",
  3: "rotateY(90deg) translateZ(var(--h))",
  4: "rotateY(-90deg) translateZ(var(--h))",
  5: "rotateX(90deg) translateZ(var(--h))",
  2: "rotateX(-90deg) translateZ(var(--h))",
};

/** qaysi burilishda kerakli yuz oldinga keladi */
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
  /** ikkinchi zar biroz boshqacha aylansin */
  seed?: number;
}

export default function Dice3D({ value, rolling, size = 88, seed = 0 }: Props) {
  const [rot, setRot] = useState<[number, number]>([0, 0]);
  const turns = useRef(0);

  useEffect(() => {
    const v = Math.max(1, Math.min(6, value));
    const [tx, ty] = SHOW[v];
    if (rolling) {
      turns.current += 1;
      const k = 3 + seed;
      setRot([tx + 360 * k * (seed % 2 === 0 ? 1 : -1), ty + 360 * (k + 1)]);
    } else {
      const base = 360 * turns.current;
      setRot([tx + base * (seed % 2 === 0 ? 1 : -1), ty + base]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rolling]);

  const s = size;
  return (
    <div
      style={{
        width: s,
        height: s,
        perspective: s * 4,
        // @ts-expect-error css var
        "--h": `${s / 2}px`,
      }}
      className={rolling ? "dice-bounce" : ""}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)`,
          transition: rolling
            ? "transform 1.35s cubic-bezier(0.2,0.9,0.15,1)"
            : "transform 0.9s cubic-bezier(0.16,0.9,0.2,1)",
          filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.55))",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div
            key={f}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: s * 0.2,
              transform: FACE_TRANSFORM[f],
              background:
                "radial-gradient(circle at 30% 25%, #ffffff 0%, #f4f1e6 45%, #d9d2bd 100%)",
              boxShadow:
                "inset 0 0 0 1px rgba(120,100,50,0.25), inset 0 6px 14px rgba(255,255,255,0.9), inset 0 -8px 16px rgba(120,100,60,0.28)",
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
                  width: s * 0.16,
                  height: s * 0.16,
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 30%, #7a5c12 0%, #3a2a05 60%, #120c00 100%)",
                  boxShadow:
                    "inset 0 2px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.6)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
