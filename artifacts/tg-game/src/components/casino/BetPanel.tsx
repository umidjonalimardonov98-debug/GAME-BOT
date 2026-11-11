import { useLang } from "@/lib/lang-context";
import { usePlayer } from "@/lib/player-context";
import { sfx } from "@/lib/sound";
import { digitsOnly, effectiveBet, formatAmount, MAX_BET, MIN_BET, normalizeBetInput } from "@/lib/bet-amount";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onQuick: (a: string) => void;
  disabled?: boolean;
}

/** Fishkalar — maksimal tikishdan (500K) oshmaydi */
const CHIPS = [2000, 5000, 10000, 50000, 100000, 500000];

const short = (c: number) => (c >= 1000000 ? `${c / 1000000}M` : `${c / 1000}K`);

export default function BetPanel({ value, onChange, onQuick, disabled }: Props) {
  const { t } = useLang();
  const { player } = usePlayer();
  const balance = player?.balance ?? 0;
  const digits = digitsOnly(value);
  const cur = Number(digits) || 0;
  const { playable } = effectiveBet(digits, balance);
  const shown = digits ? formatAmount(cur) : "";
  // uzun summalar ham to'liq ko'rinsin — shrift avtomatik kichrayadi
  const fs = shown.length <= 7 ? 24 : shown.length <= 9 ? 20 : 17;
  const warn = digits && !playable
    ? cur < MIN_BET ? `Minimal tikish ${formatAmount(MIN_BET)}`
      : cur > MAX_BET ? `Maksimal tikish ${formatAmount(MAX_BET)}`
      : "Balans yetarli emas"
    : "";

  const haptic = () => {
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* optional */ }
  };
  const set = (n: number) => { sfx.bet(); haptic(); onChange(String(n)); };
  const step = (dir: 1 | -1) => {
    const base = Math.max(cur, MIN_BET);
    const inc = base >= 100000 ? 50000 : base >= 10000 ? 5000 : 1000;
    const top = Math.max(MIN_BET, Math.min(MAX_BET, balance || MIN_BET));
    set(Math.max(MIN_BET, Math.min(top, base + dir * inc)));
  };

  return (
    <div className="bp-wrap w-full flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <button type="button" aria-label="Kamaytirish" disabled={disabled} onClick={() => step(-1)}
          className="bp-step shrink-0 disabled:opacity-40" data-sfx="none">−</button>
        <label className="bp-field relative flex-1 min-w-0" data-warn={warn ? "1" : "0"}>
          <span className="bp-cur">UZS</span>
          <input id="arcade-bet-amount" aria-label={t.betAmount} type="text" inputMode="numeric" autoComplete="off"
            value={shown} disabled={disabled} placeholder={formatAmount(MIN_BET)}
            onChange={e => onChange(digitsOnly(e.target.value))}
            onBlur={() => onChange(normalizeBetInput(digits, balance))}
            onFocus={e => e.currentTarget.select()}
            className="bp-input w-full text-center outline-none disabled:opacity-60"
            style={{ fontSize: fs }} />
        </label>
        <button type="button" aria-label="Ko'paytirish" disabled={disabled} onClick={() => step(1)}
          className="bp-step shrink-0 disabled:opacity-40" data-sfx="none">+</button>
      </div>
      {warn && <p className="bp-warn">{warn}</p>}
      <div className="grid grid-cols-4 gap-1.5">
        {([["MIN", "MIN"], ["½", "1/2"], ["×2", "X2"], ["MAX", "MAX"]] as const).map(([lbl, a]) => (
          <button key={a} type="button" disabled={disabled} data-sfx="none"
            onClick={() => { sfx.bet(); haptic(); if (a === "MIN") onChange(String(MIN_BET)); else onQuick(a); }}
            className="bp-quick disabled:opacity-40">{lbl}</button>
        ))}
      </div>
      <div className="flex justify-between gap-1">
        {CHIPS.map((c, i) => (
          <button key={c} type="button" disabled={disabled || c > balance} aria-pressed={cur === c} data-sfx="none"
            aria-label={`${formatAmount(c)} UZS`}
            onClick={() => set(c)}
            className={`bp-chip bp-chip-${i} disabled:opacity-30`}>
            <span>{short(c)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
