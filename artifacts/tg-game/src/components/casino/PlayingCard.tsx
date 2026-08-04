/** Haqiqiy qarta ko'rinishi — pip joylashuvi, indekslar, orqa naqsh */

type Suit = "♠" | "♥" | "♦" | "♣";

const PIP_LAYOUT: Record<string, [number, number][]> = {
  A: [[50, 50]],
  "2": [[50, 20], [50, 80]],
  "3": [[50, 20], [50, 50], [50, 80]],
  "4": [[30, 20], [70, 20], [30, 80], [70, 80]],
  "5": [[30, 20], [70, 20], [50, 50], [30, 80], [70, 80]],
  "6": [[30, 20], [70, 20], [30, 50], [70, 50], [30, 80], [70, 80]],
  "7": [[30, 20], [70, 20], [50, 35], [30, 50], [70, 50], [30, 80], [70, 80]],
  "8": [[30, 20], [70, 20], [50, 35], [30, 50], [70, 50], [50, 65], [30, 80], [70, 80]],
  "9": [[30, 18], [70, 18], [30, 40], [70, 40], [50, 50], [30, 62], [70, 62], [30, 84], [70, 84]],
  "10": [[30, 18], [70, 18], [50, 29], [30, 40], [70, 40], [30, 62], [70, 62], [50, 71], [30, 84], [70, 84]],
};

const FACE_GLYPH: Record<string, string> = { J: "🤴", Q: "👸", K: "🤵" };

interface Props {
  suit: Suit;
  value: string;
  hidden?: boolean;
  w?: number;
  delay?: number;
}

export default function PlayingCard({ suit, value, hidden, w = 62, delay = 0 }: Props) {
  const h = Math.round(w * 1.45);
  const isRed = suit === "♥" || suit === "♦";
  const ink = isRed ? "#c8102e" : "#101418";

  if (hidden) {
    return (
      <div
        className="card-deal"
        style={{
          width: w,
          height: h,
          borderRadius: w * 0.13,
          animationDelay: `${delay}ms`,
          background:
            "repeating-linear-gradient(45deg,#8c1c2b 0 6px,#6d1220 6px 12px)",
          border: "3px solid #fdfaf3",
          boxShadow:
            "0 8px 18px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(212,175,55,0.55)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: w * 0.12,
            borderRadius: w * 0.08,
            border: "1.5px solid rgba(212,175,55,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: w * 0.42,
          }}
        >
          ♠
        </div>
      </div>
    );
  }

  const pips = PIP_LAYOUT[value];

  return (
    <div
      className="card-deal"
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.13,
        animationDelay: `${delay}ms`,
        background: "linear-gradient(160deg,#ffffff 0%,#f7f5ef 60%,#eae6da 100%)",
        boxShadow:
          "0 8px 18px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.12), inset 0 2px 0 #fff",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* indekslar */}
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 5,
          lineHeight: 1,
          color: ink,
          fontWeight: 700,
          fontSize: w * 0.24,
          textAlign: "center",
        }}
      >
        {value}
        <div style={{ fontSize: w * 0.22 }}>{suit}</div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 5,
          lineHeight: 1,
          color: ink,
          fontWeight: 700,
          fontSize: w * 0.24,
          textAlign: "center",
          transform: "rotate(180deg)",
        }}
      >
        {value}
        <div style={{ fontSize: w * 0.22 }}>{suit}</div>
      </div>

      {/* markaz */}
      {pips ? (
        <div style={{ position: "absolute", inset: `${h * 0.1}px ${w * 0.24}px` }}>
          {pips.map(([x, y], i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%,-50%) ${y > 55 ? "rotate(180deg)" : ""}`,
                color: ink,
                fontSize: value === "A" ? w * 0.5 : w * 0.26,
                lineHeight: 1,
              }}
            >
              {suit}
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: `${h * 0.14}px ${w * 0.16}px`,
            borderRadius: 4,
            border: `1.5px solid ${ink}55`,
            background: isRed
              ? "linear-gradient(160deg,#fff2f2,#ffe3e3)"
              : "linear-gradient(160deg,#f2f4f8,#e4e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: w * 0.5,
          }}
        >
          {FACE_GLYPH[value] ?? suit}
        </div>
      )}
    </div>
  );
}
