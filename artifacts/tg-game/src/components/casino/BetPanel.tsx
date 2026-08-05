import { useTheme, GOLD } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import { usePlayer } from "@/lib/player-context";
import { sfx } from "@/lib/sound";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onQuick: (a: string) => void;
  disabled?: boolean;
}

/** 1XBET uslubidagi tikish paneli — qizil chiplar + oltin ramka */
const CHIPS = [3000, 10000, 40000, 100000, 200000, 1000000];

export default function BetPanel({ value, onChange, onQuick, disabled }: Props) {
  const { ts } = useTheme();
  const { t } = useLang();
  const { player } = usePlayer();
  const balance = player?.balance ?? 0;
  const cur = Number(value) || 0;

  return (
    <div className="w-full rounded-2xl p-[2px]" style={{ background: GOLD.frame, boxShadow: `0 8px 24px rgba(0,0,0,0.45)` }}>
      <div className="rounded-[14px] p-3" style={{ background: "linear-gradient(180deg,rgba(20,13,3,0.92),rgba(8,5,1,0.95))" }}>
        <p className="text-[11px] font-black mb-2.5 tracking-[0.2em] text-center" style={{ color: "#c9b071" }}>
          {t.betAmount}
        </p>

        {/* chiplar */}
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {CHIPS.map(c => {
            const active = cur === c;
            return (
              <button key={c} disabled={disabled || c > balance} onClick={() => { sfx.bet(); try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* ignore */ } onChange(String(c)); }}
                className="py-2 rounded-xl font-black text-[12px] active:scale-90 transition-all duration-150 disabled:opacity-35"
                style={{
                  background: active
                    ? "linear-gradient(180deg,#ff5f57 0%,#d61f18 55%,#8e0b06 100%)"
                    : "linear-gradient(180deg,#c93a33 0%,#8e1710 60%,#5a0703 100%)",
                  color: "#fff3c4",
                  border: `1px solid ${active ? "#ffd766" : "rgba(255,214,102,0.32)"}`,
                  boxShadow: active ? `0 3px 0 #4a0503, 0 0 16px ${GOLD.glow}` : "0 3px 0 #3d0402",
                  textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                }}>
                {c.toLocaleString()}
              </button>
            );
          })}
        </div>

        {/* tez tanlash */}
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          {["MIN", "1/2", "X2", "MAX"].map(a => (
            <button key={a} disabled={disabled} onClick={() => onQuick(a)}
              className="py-1.5 rounded-lg text-[11px] font-black active:scale-95 transition-transform disabled:opacity-40"
              style={{
                background: "linear-gradient(180deg,rgba(212,175,55,0.22),rgba(0,0,0,0.4))",
                color: "#ffe9a8",
                border: `1px solid ${GOLD.border}`,
              }}>
              {a}
            </button>
          ))}
        </div>

        <input type="number" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 font-black text-center text-lg outline-none disabled:opacity-60"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${GOLD.main}`,
            color: "#ffe9a8",
            textShadow: `0 0 10px ${GOLD.glow}`,
          }} min={2000} />
      </div>
    </div>
  );
}
