import { useEffect, useRef, useState } from "react";
import { subscribeRounds, type Round } from "@/lib/round-log";
import WinFx from "@/components/casino/WinFx";

/**
 * Barcha o'yinlar uchun yagona 1XBET uslubidagi yutuq/yutqazish effekti.
 * round-log ga yozilgan har bir raund avtomatik effekt chaqiradi.
 */
export default function GlobalWinFx() {
  const [fx, setFx] = useState<{ round: Round; key: number } | null>(null);
  const lastId = useRef<string | number | null>(null);

  useEffect(
    () =>
      subscribeRounds((rounds) => {
        const last = rounds[0];
        if (!last || last.id === lastId.current) return;
        lastId.current = last.id;
        setFx({ round: last, key: Date.now() });
      }),
    [],
  );

  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), fx.round.won ? 2600 : 1500);
    return () => clearTimeout(t);
  }, [fx?.key]);

  if (!fx) return null;
  const r = fx.round;
  return (
    <WinFx
      key={fx.key}
      open
      win={r.won}
      amount={r.winAmount}
      multiplier={r.mult}
      big={r.mult >= 5 || r.net >= r.bet * 5}
      onClose={() => setFx(null)}
    />
  );
}
