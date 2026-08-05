import { useEffect, useState } from "react";
import { subscribeRounds, gameLabel, type Round } from "@/lib/round-log";
import { sfx } from "@/lib/sound";
import { useU } from "@/lib/ui-i18n";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

/**
 * Raund natijasi — pastki burchakdagi KICHIK chip.
 * Bosilganda kengayadi: hisob-kitob va oxirgi raundlar tarixi.
 */
export default function RoundBreakdown() {
  const u = useU();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => subscribeRounds(setRounds), []);

  const last = rounds[0];

  useEffect(() => {
    if (!last) return;
    setOpen(false);
    setExpanded(false);
    const show = setTimeout(() => setOpen(true), 300);
    const hide = setTimeout(() => setOpen(false), 2600);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [last?.id]);

  if (!last || !open) return null;

  const win = last.won;
  const accent = win ? "#39c46f" : "#f87171";

  return (
    <div className="fixed z-[70] sfx-panel" style={{ right: 10, bottom: 10, maxWidth: "72vw" }}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(10,7,22,0.92)",
          border: `1px solid ${accent}55`,
          boxShadow: "0 10px 26px rgba(0,0,0,0.5)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* kichik chip */}
        <button
          onClick={() => { sfx.click(); setExpanded((v) => !v); }}
          className="flex items-center gap-2 px-2.5 py-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
            {gameLabel(last.game)}
          </span>
          <span className="text-[10px] font-black" style={{ color: "#fbbf24" }}>
            x{last.mult.toFixed(2)}
          </span>
          <span className="text-[11px] font-black" style={{ color: accent }}>
            {last.net >= 0 ? "+" : "−"}{fmt(Math.abs(last.net))}
          </span>
        </button>

        {expanded && (
          <div className="px-2.5 pb-2 w-[220px]" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between py-1.5 text-[10px]">
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{u("staked")}: {fmt(last.bet)}</span>
              <span style={{ color: accent }}>{u("payout")}: {fmt(last.winAmount)}</span>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {rounds.slice(1).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1 text-[10px]"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>{gameLabel(r.game)}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>x{r.mult.toFixed(2)}</span>
                  <span className="font-bold" style={{ color: r.net >= 0 ? "#39c46f" : "#f87171" }}>
                    {r.net >= 0 ? "+" : "−"}{fmt(Math.abs(r.net))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
