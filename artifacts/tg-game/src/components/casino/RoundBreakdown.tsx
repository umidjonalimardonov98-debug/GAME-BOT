import { useEffect, useState } from "react";
import { subscribeRounds, gameLabel, type Round } from "@/lib/round-log";
import { sfx } from "@/lib/sound";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

/**
 * Har bir raunddan keyin natijani shaffof ko'rsatadigan oyna:
 * tikilgan pul, koeffitsiyent, yutuq va sof foyda/zarar.
 */
export default function RoundBreakdown() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => subscribeRounds(setRounds), []);

  const last = rounds[0];

  useEffect(() =>{
    if (!last) return;
    // Natija tez chiqadi va ~1 soniyada avtomatik yopiladi
    setOpen(false);
    const show = setTimeout(() => setOpen(true), 450);
    const hide = setTimeout(() => setOpen(false), 1700);
    return () =>{ clearTimeout(show); clearTimeout(hide); };
  }, [last?.id]);

  if (!last || !open) return null;

  const win = last.won;
  const accent = win ? "#39c46f":"#f87171";

  return (
    <div
      className="fixed left-1/2 z-[70] w-[92vw] max-w-sm sfx-panel"
      style={{ bottom: 16, transform: "translate3d(-50%,0,0)" }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(12,8,28,0.94)",
          border: `1px solid ${accent}55`,
          boxShadow: `0 18px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset`,
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ background: `linear-gradient(90deg, ${accent}22, transparent)` }}>
          <span className="text-xs font-black tracking-wider" style={{ color: accent }}>
            {win ? " YUTUQ":" YUTQAZISH"} · {gameLabel(last.game)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>{ sfx.click(); setShowHistory((v) => !v); }}
              className="text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.08)" }}
            >
              {showHistory ? "Natija":"Tarix"}
            </button>
            <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded-lg"
              style={{ color: "rgba(255,255,255,0.55)" }}></button>
          </div>
        </div>

        {!showHistory ? (
          <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
            <Cell label="Tikilgan" value={`${fmt(last.bet)}`} color="#e5e7eb" />
            <Cell label="Koeffitsiyent" value={`x${last.mult.toFixed(2)}`} color="#fbbf24" />
            <Cell label="Yutuq" value={fmt(last.winAmount)} color={accent} />
            <div className="col-span-3 mt-1 pt-2 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-[11px]"style={{ color:"rgba(255,255,255,0.55)" }}>
                Hisob: {fmt(last.bet)} × {last.mult.toFixed(2)} = {fmt(last.winAmount)}
              </span>
              <span className="text-sm font-black" style={{ color: accent }}>
                {last.net >= 0 ? "+":"−"}{fmt(Math.abs(last.net))} UZS
              </span>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 max-h-44 overflow-y-auto">
            {rounds.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5 text-[11px]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>{gameLabel(r.game)}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{fmt(r.bet)} · x{r.mult.toFixed(2)}</span>
                <span className="font-bold"style={{ color: r.net >= 0 ?"#39c46f":"#f87171" }}>
                  {r.net >= 0 ? "+":"−"}{fmt(Math.abs(r.net))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] mb-0.5"style={{ color:"rgba(255,255,255,0.45)" }}>{label}</p>
      <p className="font-black text-sm" style={{ color }}>{value}</p>
    </div>
  );
}
