import { sfx } from "@/lib/sound";
import { XGREEN } from "@/lib/theme-context";

interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  shadow?: string;
}

/** PRO tugma — bosilganda cho'kadi, yaltirash animatsiyasi va haptik javob */
export default function PlayButton({ label, onClick, disabled, color, shadow }: Props) {
  const press = () => {
    if (disabled) return;
    sfx.click();
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("medium"); } catch { /* ignore */ }
    onClick();
  };
  return (
    <button
      onClick={press}
      disabled={disabled}
      className="pro-btn w-full py-4 rounded-xl font-black text-lg tracking-wide uppercase text-white relative overflow-hidden disabled:opacity-40"
      style={{
        background: color ?? XGREEN.grad,
        boxShadow: disabled ? "none" : (shadow ?? XGREEN.shadow),
      }}
    >
      <span className="relative z-10">{label}</span>
      <span className="pro-btn-shine" aria-hidden />
    </button>
  );
}
