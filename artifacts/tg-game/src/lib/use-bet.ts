import { useCallback, useState } from "react";
import { usePlayer } from "./player-context";
import { placeBet } from "./api";

export const MIN_BET = 2000;
export const MAX_BET = 500000;

/** Barcha o'yinlar uchun yagona tikish/hisob-kitob dvigateli */
export function useBet(game: string) {
  const { player, refresh } = usePlayer();
  const [betInput, setBetInput] = useState(String(MIN_BET));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const bet = Math.min(Math.max(Number(betInput) || MIN_BET, MIN_BET), MAX_BET);
  const balance = player?.balance ?? 0;
  const canPlay = !!player && balance >= bet && !busy;

  const quick = useCallback((a: string) => {
    let v = bet;
    if (a === "MIN") v = MIN_BET;
    else if (a === "MAX") v = Math.max(MIN_BET, Math.min(balance, MAX_BET));
    else if (a === "X2") v = Math.min(bet * 2, Math.max(MIN_BET, balance), MAX_BET);
    else if (a === "1/2") v = Math.max(MIN_BET, Math.floor(bet / 2));
    setBetInput(String(v));
  }, [bet, balance]);

  /** Raundni yopish: mult=0 → yutqazish */
  const settle = useCallback(async (mult: number) => {
    if (!player) return 0;
    const win = mult > 0 ? Math.floor(bet * mult) : 0;
    setSaving(true);
    try {
      await placeBet(player.telegramId, { amount: bet, game, won: mult > 0, winAmount: win });
      await refresh();
    } catch { /* tarmoq xatosi — balans keyingi yangilanishda tiklanadi */ }
    setSaving(false);
    return win;
  }, [player, bet, game, refresh]);

  return { player, balance, bet, betInput, setBetInput, quick, settle, saving, busy, setBusy, canPlay };
}
