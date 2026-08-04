interface Props {
  win: boolean | null;
  text: string;
  amount?: number;
}

export default function ResultBanner({ win, text, amount }: Props) {
  if (win === null) return null;
  return (
    <div className="w-full rounded-2xl py-3 text-center"
      style={{
        background: win ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${win ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
      }}>
      <p className="font-black text-lg" style={{ color: win ? "#4ade80" : "#f87171" }}>{text}</p>
      {win && !!amount && <p className="font-bold text-sm mt-0.5" style={{ color: "#4ade80" }}>+{amount.toLocaleString()} UZS</p>}
    </div>
  );
}
