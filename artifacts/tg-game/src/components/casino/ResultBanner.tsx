import { useEffect, useRef } from "react";
import Sym from "@/components/casino/Sym";
import { sfx } from "@/lib/sound";
import { MOTION } from "@/lib/motion";

interface Props {
  win: boolean | null;
  text: string;
  amount?: number;
}

/** Barcha o'yinlar uchun yagona natija banneri — bir xil animatsiya va bir xil ovoz */
export default function ResultBanner({ win, text, amount }: Props) {
  const last = useRef<boolean | null>(null);

  useEffect(() => {
    if (win === null) { last.current = null; return; }
    if (last.current === win) return;
    last.current = win;
    try {
      if (win) sfx.win?.();
      else sfx.lose?.();
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(win ? "success" : "error");
    } catch { /* ignore */ }
  }, [win]);

  if (win === null) return null;

  return (
    <div
      key={`${win}-${text}-${amount ?? 0}`}
      className="fx-banner w-full rounded-xl py-3 text-center relative overflow-hidden"
      style={{
        background: win ? "rgba(37,165,90,0.14)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${win ? "rgba(37,165,90,0.35)" : "rgba(239,68,68,0.35)"}`,
        animationDuration: `${MOTION.banner}ms`,
      }}
    >
      <p className="font-black text-lg inline-flex items-center justify-center gap-2"
         style={{ color: win ? "#39c46f" : "#f87171" }}>
        <Sym n={win ? "trophy" : "skull"} s={22} className={win ? "idle-bob" : undefined} />
        {text}
      </p>
      {win && !!amount && (
        <p className="font-bold text-sm mt-0.5" style={{ color: "#39c46f" }}>
          +{amount.toLocaleString()} UZS
        </p>
      )}
      {win && <span className="fx-banner-shine" aria-hidden />}
    </div>
  );
}
