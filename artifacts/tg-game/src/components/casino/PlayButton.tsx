interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  shadow?: string;
}

export default function PlayButton({ label, onClick, disabled, color, shadow }: Props) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl font-black text-xl text-white active:scale-95 transition-all disabled:opacity-40"
      style={{
        background: color ?? "linear-gradient(145deg,#7c3aed,#4f46e5)",
        boxShadow: disabled ? "none" : (shadow ?? "0 7px 0 #3b1278, 0 10px 28px #7c3aed55"),
      }}>
      {label}
    </button>
  );
}
