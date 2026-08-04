import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import Sym from "@/components/casino/Sym";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

export default function CoinFlip() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("coinflip");
  const [side, setSide] = useState<"h"|"t">("h");
  const [spin, setSpin] = useState(false);
  const [face, setFace] = useState<"h"|"t">("h");
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpin(true);
    const win = riggedWin();
    const stopTick = startTicker(70);
    sfx.spin();
    const iv = setInterval(() => setFace(f => (f === "h"?"t":"h")), 90);
    setTimeout(async () =>{
      clearInterval(iv); stopTick(); setSpin(false);
      const res: "h"|"t"= win ? side : (side ==="h"?"t":"h");
      setFace(res);
      if (win) sfx.win(); else sfx.lose();
      const w = await settle(win ? 1.9 : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.coinflip) }}>
      <GameHeader title={` ${GAME_NAMES.coinflip[lang]}`} subtitle="x1.9" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-10 flex items-center justify-center"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <div className="rounded-full flex items-center justify-center font-black"
            style={{
              width: 130, height: 130, fontSize: 46,
              background: face === "h"?"linear-gradient(145deg,#f7e59b,#d4af37,#8a6b16)":"linear-gradient(145deg,#e5e7eb,#9ca3af,#4b5563)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.45), inset 0 3px 8px rgba(255,255,255,0.4)",
              transform: spin ? "rotateY(180deg) scale(1.06)":"rotateY(0) scale(1)",
              transition: "transform .18s",
            }}>
            <Sym n={face === "h" ? "crown" : "gem"} s={74} />
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          {(["h", "t"] as const).map(s => (
            <button key={s} disabled={busy} onClick={() =>{ setSide(s); sfx.select(); }}
              className="py-4 rounded-2xl font-black active:scale-95 disabled:opacity-40"
              style={{
                background: side === s ? "linear-gradient(145deg,#1668e3,#0d4fb0)" : ts.btnSecondary,
                color: side === s ? "#fff" : ts.btnSecondaryText,
                border: `1px solid ${ts.cardBorder}`,
              }}>
              {s === "h" ? ` ${g("heads", lang)}` : ` ${g("tails", lang)}`}
            </button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
