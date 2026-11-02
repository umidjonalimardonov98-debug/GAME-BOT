import { useEffect, useRef } from "react";

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
    try { sessionStorage.setItem("lastRound", JSON.stringify({ natija: win ? "yutdi" : "yutqazdi", matn: text, summa: amount, sahifa: location.pathname })); } catch { /* ignore */ }
    try {
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(win ? "success" : "error");
    } catch { /* ignore */ }
  }, [win]);

  return null;
}
