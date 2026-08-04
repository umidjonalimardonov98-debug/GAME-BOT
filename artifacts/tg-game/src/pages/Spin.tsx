import { useState, useEffect, useRef } from "react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GAME_BG, GOLD } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";

const BASE = "/api";
const BET = 2000;

const SEGMENTS = [
  { label: "💣", prize: 0, from: "#7f1d1d", to: "#b91c1c" },
  { label: "💣", prize: 0, from: "#111827", to: "#374151" },
  { label: "🍒", prize: 1000, from: "#78350f", to: "#f59e0b" },
  { label: "💣", prize: 0, from: "#7f1d1d", to: "#b91c1c" },
  { label: "💣", prize: 0, from: "#111827", to: "#374151" },
  { label: "⭐", prize: 2000, from: "#064e3b", to: "#10b981" },
  { label: "💣", prize: 0, from: "#7f1d1d", to: "#b91c1c" },
  { label: "💣", prize: 0, from: "#111827", to: "#374151" },
  { label: "💎", prize: 5000, from: "#312e81", to: "#6366f1" },
  { label: "💣", prize: 0, from: "#7f1d1d", to: "#b91c1c" },
];

const LOSE_SEGMENTS = [0, 1, 3, 4, 6, 7, 9];
const SEG = 360 / SEGMENTS.length;

function timeLeft(nextSpinAt: string): string {
  const diff = new Date(nextSpinAt).getTime() - Date.now();
  if (diff <= 0) return "";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}s ${m}d ${s}s`;
}

export default function Spin() {
  const { player, refresh } = usePlayer();
  const { theme, ts } = useTheme();

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ prize: number; segIdx: number; penalty: number } | null>(null);
  const [lastFree, setLastFree] = useState(false);
  const [canFree, setCanFree] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotRef = useRef(0);

  const isLight = theme === "light";
  const canPaid = (player?.balance ?? 0) >= BET;

  useEffect(() => {
    if (!player) return;
    fetch(`${BASE}/spin/status/${player.telegramId}`)
      .then(r => r.json())
      .then(d => { setCanFree(d.canSpin); setNextSpinAt(d.nextSpinAt); setLoading(false); })
      .catch(() => setLoading(false));
  }, [player]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!nextSpinAt) return;
    const tick = () => {
      const t = timeLeft(nextSpinAt);
      if (!t) { setCanFree(true); setNextSpinAt(null); setCountdown(""); }
      else setCountdown(t);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [nextSpinAt]);

  const doSpin = async (free: boolean) => {
    if (!player || spinning) return;
    if (!free && player.balance < BET) return;
    setSpinning(true);
    setResult(null);

    let prizeFromApi = 0;
    let penaltyFromApi = 0;
    let nextSpinAtFromApi: string | null = null;
    try {
      const resp = await fetch(`${BASE}/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: player.telegramId, paid: !free, amount: free ? 0 : BET }),
      });
      const d = await resp.json();
      prizeFromApi = d.prize ?? 0;
      penaltyFromApi = d.penalty ?? 0;
      nextSpinAtFromApi = d.nextSpinAt ?? null;
    } catch {}

    const isWin = prizeFromApi > 0;
    let segIdx: number;
    if (isWin) {
      if (prizeFromApi >= 5000) segIdx = 8;
      else if (prizeFromApi >= 2000) segIdx = 5;
      else segIdx = 2;
    } else {
      segIdx = LOSE_SEGMENTS[Math.floor(Math.random() * LOSE_SEGMENTS.length)];
    }

    // markazni ko'rsatkich ostiga aniq olib kelamiz (kichik tabiiy siljish bilan)
    const jitter = (Math.random() - 0.5) * (SEG * 0.5);
    const targetAngle = segIdx * SEG + SEG / 2 + jitter;
    const landAngle = (360 - targetAngle + 360) % 360;
    const total = rotRef.current + 360 * 8 + landAngle;
    rotRef.current = total;
    setRotation(total);

    setTimeout(() => {
      setResult({ prize: prizeFromApi, segIdx, penalty: penaltyFromApi });
      setLastFree(free);
      setSpinning(false);
      if (free) { setCanFree(false); setNextSpinAt(nextSpinAtFromApi); }
      refresh();
    }, 5200);
  };

  const size = 288;
  const cx = size / 2;
  const cy = size / 2;
  const r = 118;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function segmentPath(startAngle: number, endAngle: number): string {
    const s = polarToXY(startAngle, r);
    const e = polarToXY(endAngle, r);
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y} Z`;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.spin) }}>
      <GameHeader title="🎡 OMAD CHARXI" subtitle="Har kuni bepul aylantirish!" />

      <div className="flex-1 flex flex-col items-center px-4 pb-6 gap-5">

        {/* ─── CHARX ─── */}
        <div className="relative flex flex-col items-center" style={{ width: size + 24 }}>
          {/* oltin ramka + lampalar */}
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: size + 24,
              height: size + 24,
              background: GOLD.grad,
              boxShadow: `0 18px 46px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.18) inset, 0 0 60px ${GOLD.glow}`,
            }}
          >
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i * 360) / 16;
              const rad = ((a - 90) * Math.PI) / 180;
              const rr = (size + 24) / 2 - 7;
              return (
                <span
                  key={i}
                  className={spinning ? "bulb-run" : ""}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${Math.cos(rad) * rr}px)`,
                    top: `calc(50% + ${Math.sin(rad) * rr}px)`,
                    width: 9,
                    height: 9,
                    marginLeft: -4.5,
                    marginTop: -4.5,
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 30%,#fffbe6,#fbbf24 60%,#b45309)",
                    boxShadow: "0 0 10px rgba(251,191,36,0.9)",
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              );
            })}

            {/* aylanuvchi disk */}
            <div
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                overflow: "hidden",
                transition: spinning ? "transform 5.2s cubic-bezier(0.12,0.72,0.02,1)" : "none",
                transform: `rotate(${rotation}deg)`,
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.55)",
              }}
            >
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  {SEGMENTS.map((s, i) => (
                    <radialGradient key={i} id={`sg${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="35%" stopColor={s.to} />
                      <stop offset="100%" stopColor={s.from} />
                    </radialGradient>
                  ))}
                  <radialGradient id="hub" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#fff7d6" />
                    <stop offset="55%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#8a6b16" />
                  </radialGradient>
                </defs>

                <circle cx={cx} cy={cy} r={r + 8} fill="#1b1206" />
                {SEGMENTS.map((seg, i) => (
                  <g key={i}>
                    <path
                      d={segmentPath(i * SEG, (i + 1) * SEG)}
                      fill={`url(#sg${i})`}
                      stroke="rgba(212,175,55,0.85)"
                      strokeWidth="1.5"
                    />
                    {(() => {
                      const ang = i * SEG + SEG / 2;
                      const mid = polarToXY(ang, r * 0.6);
                      const flip = ang > 90 && ang < 270;
                      const rotDeg = flip ? ang + 180 : ang;

                      return (
                        <g transform={`translate(${mid.x},${mid.y}) rotate(${rotDeg})`}>

                          <text
                            textAnchor="middle"
                            y={-7}
                            style={{ fontSize: 22, userSelect: "none" }}
                          >
                            {seg.label}
                          </text>
                          <text
                            textAnchor="middle"
                            y={14}
                            style={{
                              fontSize: 13,
                              fontWeight: 900,
                              fill: "#fff7d6",
                              paintOrder: "stroke",
                              stroke: "rgba(0,0,0,0.55)",
                              strokeWidth: 3,
                              userSelect: "none",
                            }}
                          >
                            {seg.prize > 0 ? `${seg.prize / 1000}K` : "—"}
                          </text>
                        </g>
                      );
                    })()}

                  </g>
                ))}
                {/* markaz hub */}
                <circle cx={cx} cy={cy} r={30} fill="url(#hub)" stroke="#4b3607" strokeWidth="2" />
                <circle cx={cx} cy={cy} r={9} fill="#2b1e05" opacity="0.6" />
              </svg>
            </div>
          </div>

          {/* ko'rsatkich */}
          <div
            className={spinning ? "pointer-tick" : ""}
            style={{
              position: "absolute",
              top: -6,
              left: "50%",
              marginLeft: -13,
              zIndex: 30,
              width: 26,
              height: 34,
              background: GOLD.grad,
              clipPath: "polygon(50% 100%, 0 0, 100% 0)",
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))",
            }}
          />
        </div>

        {/* Natija */}
        {result && !spinning && (
          <div className="text-center py-3 px-6 rounded-2xl pop-in"
            style={{
              background: result.prize > 0 ? "linear-gradient(145deg,#064e3b,#059669)" : "linear-gradient(145deg,#7f1d1d,#b91c1c)",
              boxShadow: "0 8px 26px rgba(0,0,0,0.45)",
            }}>
            {result.prize > 0 ? (
              <>
                <p className="font-black text-2xl text-white">+{result.prize.toLocaleString()} UZS 🎉</p>
                <p className="text-sm mt-1 text-white/80">Balansingizga qo'shildi!</p>
              </>
            ) : (
              <>
                <p className="font-black text-xl text-white">Omad kelmadi 😔</p>
                {result.penalty > 0 ? (
                  <p className="font-black text-lg mt-1 text-white">−{result.penalty.toLocaleString()} UZS</p>
                ) : null}
                <p className="text-sm mt-1 text-white/80">Keyingi gal albatta!</p>
              </>
            )}
          </div>
        )}

        {spinning && (
          <p className="font-black text-lg animate-pulse gold-text">Charx aylanmoqda...</p>
        )}

        {!spinning && !result && !loading && countdown && (
          <div className="text-center">
            <p className="text-sm" style={{ color: ts.textSub }}>Tekin spin:</p>
            <p className="font-black text-xl" style={{ color: GOLD.light }}>⏳ {countdown}</p>
          </div>
        )}

        {/* Mukofotlar */}
        <div className="w-full rounded-2xl p-3 pro-glass"
          style={{ background: "rgba(20,14,4,0.55)", border: `1px solid ${GOLD.border}` }}>
          <p className="text-xs font-black mb-2 text-center tracking-widest gold-text">🏆 MUKOFOTLAR</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "💣 Omadsiz", prize: "—", color: "#f87171" },
              { label: "🍒 Birinchi", prize: "1 000", color: "#fbbf24" },
              { label: "⭐ Ikkinchi", prize: "2 000", color: "#34d399" },
              { label: "💎 Katta", prize: "5 000", color: "#a5b4fc" },
            ].map(p => (
              <div key={p.label}>
                <p className="text-xs font-black" style={{ color: p.color }}>{p.prize}</p>
                <p style={{ fontSize: 10, color: isLight ? "rgba(30,27,75,0.6)" : "rgba(255,255,255,0.6)" }}>{p.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tugmalar */}
        <div className="w-full flex flex-col gap-3">
          <button onClick={() => doSpin(true)}
            disabled={!canFree || spinning || loading}
            className="w-full py-4 rounded-2xl font-black text-base text-white active:scale-95 transition-all pro-sheen overflow-hidden disabled:opacity-45"
            style={{
              background: "linear-gradient(145deg,#7c3aed,#c026d3)",
              boxShadow: "0 7px 0 #4c1d95, 0 12px 28px rgba(192,38,211,0.5)",
            }}>
            {loading ? "Yuklanmoqda..." : canFree ? "🎁 TEKIN AYLANTIRISH" : `⏳ ${countdown || "Kutilmoqda..."}`}
          </button>

          {result && !spinning && (
            <button onClick={() => doSpin(lastFree && canFree)}
              disabled={spinning || (!canPaid && !canFree)}
              className="w-full py-4 rounded-2xl font-black text-base text-white active:scale-95 transition-all disabled:opacity-45"
              style={{
                background: "linear-gradient(145deg,#0ea5e9,#2563eb)",
                boxShadow: "0 7px 0 #1e3a8a, 0 12px 28px rgba(37,99,235,0.45)",
              }}>
              🔁 QAYTA AYLANTIRISH
            </button>
          )}

          <button onClick={() => doSpin(false)}
            disabled={!canPaid || spinning}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all pro-sheen overflow-hidden disabled:opacity-45"
            style={{
              background: GOLD.grad,
              color: "#2b1e05",
              boxShadow: "0 7px 0 #6b5210, 0 12px 28px rgba(212,175,55,0.45)",
            }}>
            🎰 {BET.toLocaleString()} UZS GA AYLANTIRISH
          </button>

          <p className="text-center text-xs" style={{ color: ts.textSub }}>
            Tekin spin har 24 soatda bir marta • Yutqazsangiz hisobingizdan 2 000 UZS yechiladi
          </p>
        </div>
      </div>
    </div>
  );
}
