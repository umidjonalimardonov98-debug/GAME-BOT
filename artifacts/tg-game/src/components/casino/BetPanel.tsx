import { useLang } from "@/lib/lang-context";
import { usePlayer } from "@/lib/player-context";
import { sfx } from "@/lib/sound";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="arcade-bet w-full p-3">
      <label htmlFor="arcade-bet-amount" className="arcade-bet-label block text-[11px] font-black mb-3 text-center">{t.betAmount}</label>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {CHIPS.map((c, i) => (
          <Button key={c} type="button" variant="ghost" disabled={disabled || c > balance}
            aria-pressed={cur === c}
            onClick={() => {
              sfx.bet();
              try {
                const telegram = (window as Window & { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (style: string) => void } } } }).Telegram;
                telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
              } catch { /* Haptics are optional outside Telegram. */ }
              onChange(String(c));
            }}
            className={`arcade-chip arcade-chip-${i} h-11 w-full min-w-0 px-1 text-[12px] font-black`}>
            {c.toLocaleString()}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {["MIN", "1/2", "X2", "MAX"].map(a => (
          <Button key={a} type="button" variant="ghost" disabled={disabled} onClick={() => onQuick(a)}
            className="arcade-quick h-9 min-w-0 px-1 text-[11px] font-black">{a}</Button>
        ))}
      </div>
      <input id="arcade-bet-amount" aria-label={t.betAmount} type="number" inputMode="numeric" value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)} className="arcade-input w-full px-4 py-2.5 font-black text-center text-lg outline-none disabled:opacity-60" min={2000} />
    </div>
  );
}
