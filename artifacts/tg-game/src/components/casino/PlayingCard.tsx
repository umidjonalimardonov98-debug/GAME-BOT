/**
 * Haqiqiy o'yin kartasi — SVG masti (yurak / g'isht / qarg'a / chillak),
 * yirik indekslar, to'liq ko'rinadigan pip joylashuvi va rasmli kartalar.
 * Hech qanday emoji ishlatilmaydi — hammasi vektor.
 */

export type Suit = "♠" | "♥" | "♦" | "♣";

const RED = "#d81f36";
const BLACK = "#12161c";

/* ── Vektor mastlar (viewBox 0 0 100 100) ────────────────────────── */
const PATHS: Record<Suit, string> = {
  "♥": "M50 88C22 68 8 52 8 35 8 21 19 11 32 11c8 0 14 4 18 10 4-6 10-10 18-10 13 0 24 10 24 24 0 17-14 33-42 53z",
  "♦": "M50 6 92 50 50 94 8 50z",
  "♠": "M50 6c14 16 38 30 38 49 0 12-9 20-20 20-6 0-11-2-14-6 1 9 4 16 9 21H37c5-5 8-12 9-21-3 4-8 6-14 6-11 0-20-8-20-20C12 36 36 22 50 6z",
  "♣": "M43 92c5-6 7-13 7-21-4 5-10 8-17 8-12 0-21-9-21-21 0-11 8-19 18-20-2-3-3-7-3-11 0-13 10-23 23-23s23 10 23 23c0 4-1 8-3 11 10 1 18 9 18 20 0 12-9 21-21 21-7 0-13-3-17-8 0 8 2 15 7 21z",
};

export function SuitIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden>
      <path d={PATHS[suit]} fill={color} />
    </svg>
  );
}

/* ── Pip joylashuvi (foizda) ─────────────────────────────────────── */
const PIPS: Record<string, [number, number][]> = {
  A: [[50, 50]],
  "2": [[50, 8], [50, 92]],
  "3": [[50, 8], [50, 50], [50, 92]],
  "4": [[24, 8], [76, 8], [24, 92], [76, 92]],
  "5": [[24, 8], [76, 8], [50, 50], [24, 92], [76, 92]],
  "6": [[24, 8], [76, 8], [24, 50], [76, 50], [24, 92], [76, 92]],
  "7": [[24, 8], [76, 8], [50, 29], [24, 50], [76, 50], [24, 92], [76, 92]],
  "8": [[24, 8], [76, 8], [50, 29], [24, 50], [76, 50], [50, 71], [24, 92], [76, 92]],
  "9": [[24, 8], [76, 8], [24, 36], [76, 36], [50, 50], [24, 64], [76, 64], [24, 92], [76, 92]],
  "10": [[24, 8], [76, 8], [50, 22], [24, 36], [76, 36], [24, 64], [76, 64], [50, 78], [24, 92], [76, 92]],
};

const FACE_NAME: Record<string, string> = { J: "VALET", Q: "DAMA", K: "KOROL" };

interface Props {
  suit: Suit;
  value: string;
  hidden?: boolean;
  /** karta eni (px). Standart — katta va aniq */
  w?: number;
  delay?: number;
  dim?: boolean;
}

export default function PlayingCard({ suit, value, hidden, w = 76, delay = 0, dim }: Props) {
  const h = Math.round(w * 1.46);
  const red = suit === "♥" || suit === "♦";
  const ink = red ? RED : BLACK;
  const r = Math.max(5, w * 0.1);

  if (hidden) {
    return (
      <div
        className="card-deal"
        style={{
          width: w,
          height: h,
          borderRadius: r,
          animationDelay: `${delay}ms`,
          background: "linear-gradient(150deg,#9d2233,#6d1220 60%,#4b0a15)",
          border: `${Math.max(2, w * 0.045)}px solid #fdfaf3`,
          boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
          position: "relative",
          overflow: "hidden",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: w * 0.1,
            borderRadius: r * 0.6,
            border: `2px solid rgba(226,190,90,0.85)`,
            display: "grid",
            placeItems: "center",
            backgroundImage:
              "repeating-linear-gradient(45deg,rgba(255,255,255,0.07) 0 4px,transparent 4px 8px)",
          }}
        >
          <SuitIcon suit="♠" size={w * 0.42} color="rgba(226,190,90,0.9)" />
        </div>
      </div>
    );
  }

  const pips = PIPS[value];
  const idxSize = w * 0.3;

  const Corner = ({ flip }: { flip?: boolean }) => (
    <div
      style={{
        position: "absolute",
        ...(flip ? { bottom: w * 0.05, right: w * 0.07 } : { top: w * 0.05, left: w * 0.07 }),
        transform: flip ? "rotate(180deg)" : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 0.9,
      }}
    >
      <span
        style={{
          color: ink,
          fontWeight: 900,
          fontSize: idxSize,
          fontFamily: "'Trebuchet MS', Arial, sans-serif",
          letterSpacing: value === "10" ? "-0.06em" : 0,
        }}
      >
        {value}
      </span>
      <SuitIcon suit={suit} size={idxSize * 0.86} color={ink} />
    </div>
  );

  return (
    <div
      className="card-deal"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        animationDelay: `${delay}ms`,
        background: "linear-gradient(165deg,#ffffff 0%,#fbfaf6 55%,#f0ede4 100%)",
        boxShadow: "0 10px 22px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.15)",
        position: "relative",
        overflow: "hidden",
        flex: "0 0 auto",
        opacity: dim ? 0.55 : 1,
      }}
    >
      <Corner />
      <Corner flip />

      {value === "A" ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <SuitIcon suit={suit} size={w * 0.62} color={ink} />
        </div>
      ) : pips ? (
        <div style={{ position: "absolute", inset: `${h * 0.12}px ${w * 0.28}px` }}>
          {pips.map(([x, y], i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%,-50%) ${y > 55 ? "rotate(180deg)" : ""}`,
              }}
            >
              <SuitIcon suit={suit} size={w * 0.24} color={ink} />
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: `${h * 0.13}px ${w * 0.15}px`,
            borderRadius: r * 0.5,
            border: `2px solid ${ink}`,
            background: red
              ? "linear-gradient(160deg,#fff5f5,#ffe6e8)"
              : "linear-gradient(160deg,#f4f6fa,#e6eaf2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: w * 0.04,
          }}
        >
          <SuitIcon suit={suit} size={w * 0.36} color={ink} />
          <span
            style={{
              color: ink,
              fontWeight: 900,
              fontSize: w * 0.14,
              letterSpacing: "0.06em",
              fontFamily: "'Trebuchet MS', Arial, sans-serif",
            }}
          >
            {FACE_NAME[value] ?? value}
          </span>
        </div>
      )}
    </div>
  );
}
