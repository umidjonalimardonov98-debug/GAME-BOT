import { useCallback, useRef, useState } from "react";
import { usePlayer } from "./player-context";
import { placeBet } from "./api";
import { capWin } from "./odds";
import { effectiveBet, MAX_BET, MIN_BET } from "./bet-amount";

export { MIN_BET, MAX_BET };

/** Barcha o'yinlar uchun yagona tikish/hisob-kitob dvigateli */
export function useBet(game: string) {
  const { player, refresh } = usePlayer();
  const [betInput, setBetInput] = useState(String(MIN_BET));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const balance = player?.balance ?? 0;
  const eff = effectiveBet(betInput, balance);
  const bet = eff.amount;
  const canPlay = !!player && eff.playable && !busy && !saving;

  /** Raund boshida tikishni qulflash — raund davomida miqdor o'zgarmaydi */
  const lockRef = useRef<number | null>(null);
  const inflight = useRef<Promise<number> | null>(null);
  const lock = useCallback(() => { lockRef.current = bet; return bet; }, [bet]);

  const quick = useCallback((a: string) => {
    let v = bet;
    if (a === "MIN") v = MIN_BET;
    else if (a === "MAX") v = Math.max(MIN_BET, Math.min(balance, MAX_BET));
    else if (a === "X2") v = Math.min(bet * 2, Math.max(MIN_BET, balance), MAX_BET);
    else if (a === "1/2") v = Math.max(MIN_BET, Math.floor(bet / 2));
    setBetInput(String(v));
  }, [bet, balance]);

  /**
   * Raundni yopish: mult=0 → yutqazish, mult=1 → pul qaytarildi.
   * amount — raund boshida qulflangan tikish (berilmasa joriy tikish).
   * Server rad etsa 0 qaytadi (xato xabari api.placeBet tomonidan ko'rsatiladi).
   */
  const settle = useCallback((mult: number, amount?: number): Promise<number> => {
    // bir raund uchun ikki marta hisob-kitob qilinmaydi
    if (inflight.current) return inflight.current;
    const p = doSettle(mult, amount).finally(() => { inflight.current = null; });
    inflight.current = p;
    return p;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, bet, game, refresh]);

  async function doSettle(mult: number, amount?: number) {
    if (!player) return 0;
    const stake = amount ?? lockRef.current ?? bet;
    lockRef.current = null;
    const win = mult > 0 ? capWin(Math.floor(stake * mult), game) : 0;
    setSaving(true);
    try {
      await placeBet(player.telegramId, { amount: stake, game, won: win > 0, winAmount: win });
      return win;
    } catch {
      return 0;
    } finally {
      await refresh().catch(() => {});
      setSaving(false);
    }
  }

  return { player, balance, bet, betInput, setBetInput, quick, settle, lock, saving, busy, setBusy, canPlay };
}
