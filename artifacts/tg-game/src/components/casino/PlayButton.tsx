import { sfx } from "@/lib/sound";

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
      className="pro-btn w-full py-4 rounded-2xl font-black text-xl text-white relative overflow-hidden disabled:opacity-40"
      style={{
        background: color ?? "linear-gradient(145deg,#7c3aed,#4f46e5)",
        boxShadow: disabled ? "none" : (shadow ?? "0 7px 0 #3b1278, 0 10px 28px #7c3aed55"),
      }}
    >
      <span className="relative z-10">{label}</span>
      <span className="pro-btn-shine" aria-hidden />
    </button>
  );
}
