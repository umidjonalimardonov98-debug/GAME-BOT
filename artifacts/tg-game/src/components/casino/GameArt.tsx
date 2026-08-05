import type { GameCfg } from "@/lib/new-games";

/**
 * Har bir yangi o'yin uchun protsedural "pro" muqova rasmi.
 * Oddiy emoji o'rniga — oltin ramka, nurlar, chuqurlik va o'yin turiga mos sahna.
 */
export default function GameArt({ cfg }: { cfg: GameCfg }) {
  const { c1, c2, engine, key } = cfg;
  const id = `a-${key}`;

  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c2} />
          <stop offset="55%" stopColor={c1} stopOpacity="0.75" />
          <stop offset="100%" stopColor="#07090f" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="45%" stopColor={c1} stopOpacity="0.28" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#f7c948" />
          <stop offset="100%" stopColor="#8a5a09" />
        </linearGradient>
      </defs>

      <rect width="120" height="120" fill={`url(#${id}-bg)`} />
      <rect width="120" height="120" fill={`url(#${id}-glow)`} />

      {/* nur chiziqlari */}
      {engine !== "race" &&
        Array.from({ length: 12 }).map((_, i) => (
          <polygon
            key={i}
            points="60,44 120,-30 120,20"
            fill="#ffffff"
            opacity={i % 2 ? 0.05 : 0.09}
            transform={`rotate(${i * 30} 60 44)`}
          />
        ))}

      {engine === "reel" && (
        <g>
          {[16, 45, 74].map((x, i) => (
            <g key={x}>
              <rect x={x} y={38} width="30" height="52" rx="7"
                fill="#05070d" opacity="0.72" />
              <rect x={x} y={38} width="30" height="52" rx="7" fill="none"
                stroke="#f7c948" strokeOpacity="0.55" strokeWidth="1.2" />
              <circle cx={x + 15} cy={64} r={9 - i * 0.5} fill={c1} opacity="0.9" />
              <circle cx={x + 15} cy={62} r={4} fill="#fff8dc" opacity="0.8" />
            </g>
          ))}
        </g>
      )}

      {engine === "wheel" && (
        <g>
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i}
              d="M60 64 L60 24 A40 40 0 0 1 80 29.4 Z"
              fill={i % 2 ? c1 : "#0b1220"}
              opacity={i % 2 ? 0.95 : 0.85}
              transform={`rotate(${i * 30} 60 64)`} />
          ))}
          <circle cx="60" cy="64" r="40" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="4" />
          <circle cx="60" cy="64" r="11" fill={`url(#${id}-gold)`} />
          <circle cx="60" cy="64" r="5" fill="#1a1204" />
          <polygon points="60,18 55,7 65,7" fill="#f7c948" />
        </g>
      )}

      {(engine as string) === "pick" && (
        <g>
          {[[24, 46], [66, 46], [24, 80], [66, 80]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width="30" height="26" rx="6"
                fill={i === 1 ? c1 : "#0a0f1a"} opacity={i === 1 ? 0.95 : 0.85} />
              <rect x={x} y={y} width="30" height="26" rx="6" fill="none"
                stroke="#f7c948" strokeOpacity={i === 1 ? 0.95 : 0.4} strokeWidth="1.4" />
              <rect x={x + 13} y={y} width="4" height="26" fill="#f7c948" opacity={i === 1 ? 0.9 : 0.3} />
            </g>
          ))}
        </g>
      )}

      {engine === "race" && (
        <g>
          <rect x="0" y="52" width="120" height="56" fill="#07110b" opacity="0.85" />
          {[60, 74, 88, 102].map((y) => (
            <g key={y}>
              <line x1="0" y1={y} x2="120" y2={y} stroke="#ffffff" strokeOpacity="0.14" strokeDasharray="6 6" />
              <circle cx={20 + ((y * 7) % 70)} cy={y - 5} r="5.5" fill={c1} opacity="0.95" />
              <circle cx={20 + ((y * 7) % 70)} cy={y - 5} r="2" fill="#fff8dc" opacity="0.7" />
            </g>
          ))}
          <rect x="104" y="52" width="8" height="56" fill="#f7c948" opacity="0.25" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={104 + (i % 2) * 4} y={52 + i * 7} width="4" height="7"
              fill={i % 2 ? "#fff" : "#111"} opacity="0.85" />
          ))}
        </g>
      )}

      {engine === "climb" && (
        <g>
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x={30 + i * 1.5} y={100 - i * 12} width={60 - i * 3} height="9" rx="3"
              fill={i === 5 ? c1 : "#0b1220"}
              stroke="#f7c948" strokeOpacity={0.25 + i * 0.12} strokeWidth="1" />
          ))}
          <circle cx="60" cy="30" r="7" fill={`url(#${id}-gold)`} />
        </g>
      )}

      {/* oltin ramka */}
      <rect x="1.5" y="1.5" width="117" height="117" rx="14" fill="none"
        stroke={`url(#${id}-gold)`} strokeWidth="2" opacity="0.75" />
      {/* yorug'lik yaltirashi */}
      <path d="M-10 90 L40 -10 L62 -10 L12 90 Z" fill="#fff" opacity="0.06" />
    </svg>
  );
}
