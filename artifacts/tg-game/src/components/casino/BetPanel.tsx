import { useLang } from "@/lib/lang-context";
import { usePlayer } from "@/lib/player-context";
import { sfx } from "@/lib/sound";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onQuick: (a: string) => void;
  disabled?: boolean;
}

const CHIPS = [3000, 10000, 40000, 100000, 200000, 1000000];

export default function BetPanel({ value, onChange, onQuick, disabled }: Props) {
  const { t } = useLang();
  const { player } = usePlayer();
  const balance = player?.balance ?? 0;
  const cur = Number(value) || 0;

  const haptic = () => {
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* optional */ }
  };
  const short = (c: number) => (c >= 1000000 ? `${c / 1000000}M` : `${c / 1000}K`);
  const step = (dir: 1 | -1) => {
    const n = Math.max(2000, Math.min(balance || 2000, cur + dir * (cur >= 100000 ? 50000 : cur >= 10000 ? 5000 : 1000)));
    sfx.bet(); haptic(); onChange(String(n));
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="-" disabled={disabled} onClick={() => step(-1)}
          className="bp-step shrink-0 disabled:opacity-40">−</button>
        <div className="relative flex-1 min-w-0">
          <input id="arcade-bet-amount" aria-label={t.betAmount} type="number" inputMode="numeric" value={value} disabled={disabled}
            onChange={e => onChange(e.target.value)} min={2000}
            className="bp-input w-full font-black text-center outline-none disabled:opacity-60" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black tracking-wider" style={{ color: "rgba(247,229,155,.6)" }}>UZS</span>
        </div>
        <button type="button" aria-label="+" disabled={disabled} onClick={() => step(1)}
          className="bp-step shrink-0 disabled:opacity-40">+</button>
        {["½", "×2", "MAX"].map(a => (
          <button key={a} type="button" disabled={disabled}
            onClick={() => { haptic(); onQuick(a === "½" ? "1/2" : a === "×2" ? "X2" : "MAX"); }}
            className="bp-quick shrink-0 disabled:opacity-40">{a}</button>
        ))}
      </div>
      <div className="flex justify-between gap-1">
        {CHIPS.map((c, i) => (
          <button key={c} type="button" disabled={disabled || c > balance} aria-pressed={cur === c}
            onClick={() => { sfx.bet(); haptic(); onChange(String(c)); }}
            className={`bp-chip bp-chip-${i} disabled:opacity-30`}>
            <span>{short(c)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
