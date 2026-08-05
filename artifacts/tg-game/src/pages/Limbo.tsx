import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

export default function Limbo() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("limbo");
  const [target, setTarget] = useState("2.00");
  const [display, setDisplay] = useState(1);
  const [final, setFinal] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => () =>{ if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const tgt = Math.min(Math.max(Number(target) || 2, 1.1), 100);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setFinal(null);
    const win = riggedWin();
    const res = win
      ? +(tgt + Math.random() * Math.max(0.5, tgt * 0.6)).toFixed(2)
      : +(1 + Math.random() * (tgt - 1.01)).toFixed(2);

    const stopTick = startTicker(60);
    sfx.fly();
    const t0 = performance.now();
    const step = (t: number) =>{
      const p = Math.min(1, (t - t0) / 900);
      setDisplay(+(1 + (res - 1) * (1 - Math.pow(1 - p, 3))).toFixed(2));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else void finish(res, win, stopTick);
    };
    raf.current = requestAnimationFrame(step);
  };

  const finish = async (res: number, win: boolean, stopTick: () => void) =>{
    stopTick();
    setFinal(res);
    const w = await settle(win ? tgt : 0);
    setAmount(w); setWon(win); setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.limbo) }}>
      <GameHeader icon="rocket" title={` ${GAME_NAMES.limbo[lang]}`} subtitle="x100" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-10 flex flex-col items-center justify-center"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="font-black" style={{
            fontSize: 54,
            color: final === null ? "#78b6ff": final >= tgt ?"#39c46f":"#f87171",
            textShadow: "0 0 28px rgba(47,143,255,0.5)",
          }}>
            {(final ?? display).toFixed(2)}x
          </p>
          <p className="text-xs mt-1" style={{ color: ts.textSub }}>{g("target", lang)}: x{tgt.toFixed(2)}</p>
        </div>

        <div className="w-full rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-bold mb-2 tracking-widest" style={{ color: ts.textSub }}>{g("target", lang)}</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {["1.50", "2.00", "5.00", "10.00"].map(v => (
              <button key={v} disabled={busy} onClick={() =>{ setTarget(v); sfx.select(); }}
                className="py-2 rounded-xl text-xs font-bold active:scale-95 disabled:opacity-40"
                style={{ background: target === v ? "linear-gradient(135deg,#1668e3,#0d4fb0)": ts.btnSecondary, color: target === v ?"#fff" : ts.btnSecondaryText }}>
                x{v}
              </button>
            ))}
          </div>
          <input type="number" step="0.1" value={target} disabled={busy} onChange={e => setTarget(e.target.value)}
            className="w-full rounded-xl px-4 py-3 font-black text-center text-lg outline-none"
            style={{ background: ts.input, border: `1px solid ${ts.inputBorder}`, color: ts.text }} />
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
