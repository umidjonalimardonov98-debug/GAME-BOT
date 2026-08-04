import { useTheme } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onQuick: (a: string) => void;
  disabled?: boolean;
}

export default function BetPanel({ value, onChange, onQuick, disabled }: Props) {
  const { ts } = useTheme();
  const { t } = useLang();
  return (
    <div className="w-full rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
      <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: ts.textSub }}>{t.betAmount}</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {["MIN", "1/2", "X2", "MAX"].map(a => (
          <button key={a} disabled={disabled} onClick={() => onQuick(a)}
            className="py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: ts.btnSecondary, color: ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}` }}>
            {a}
          </button>
        ))}
      </div>
      <input type="number" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 font-black text-center text-lg outline-none disabled:opacity-60"
        style={{ background: ts.input, border: `1px solid ${ts.inputBorder}`, color: ts.text }} min={2000} />
    </div>
  );
}
