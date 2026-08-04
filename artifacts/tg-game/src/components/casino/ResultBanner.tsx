interface Props {
  win: boolean | null;
  text: string;
  amount?: number;
}

export default function ResultBanner({ win, text, amount }: Props) {
  if (win === null) return null;
  return (
    <div className="w-full rounded-xl py-3 text-center"
      style={{
        background: win ? "rgba(37,165,90,0.14)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${win ? "rgba(37,165,90,0.35)" : "rgba(239,68,68,0.35)"}`,
      }}>
      <p className="font-black text-lg" style={{ color: win ? "#39c46f" : "#f87171" }}>{text}</p>
      {win && !!amount && <p className="font-bold text-sm mt-0.5" style={{ color: "#39c46f" }}>+{amount.toLocaleString()} UZS</p>}
    </div>
  );
}
