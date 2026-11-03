import { Ambient } from "@/components/casino/GameAtmosphere";
import StageFx from "@/components/casino/StageFx";
import { useState, useRef, useEffect } from "react";
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
    const win = riggedWin("limbo");
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
    <div className="min-h-screen flex flex-col relative isolate" style={{ background: pageBg(theme, GAME_BG.limbo) }}>
      <Ambient behind color="#38bdf8" layer="stars" syms={["rocket", "star"]} live={busy} />
      <GameHeader icon="rocket" title={` ${GAME_NAMES.limbo[lang]}`} subtitle="x100" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <style>{`
          @keyframes lbStar { 0%{transform:translateY(-20px)} 100%{transform:translateY(300px)} }
          @keyframes lbFlame { 0%,100%{transform:scaleY(1);opacity:.95} 50%{transform:scaleY(1.35);opacity:.75} }
          @keyframes lbShake { 0%,100%{translate:0 0} 25%{translate:-1.5px 1px} 75%{translate:1.5px -1px} }
          @keyframes lbBoom { 0%{transform:scale(.3);opacity:1} 100%{transform:scale(2.4);opacity:0} }
          @keyframes lbWin { 0%{transform:scale(.7)} 60%{transform:scale(1.18)} 100%{transform:scale(1)} }
        `}</style>
        <div className="w-full rounded-3xl relative overflow-hidden" style={{
          height: 270,
          background: "radial-gradient(ellipse at 50% 120%, #1e3a8a 0%, #0b1530 45%, #02050f 100%)",
          border: "1px solid rgba(120,170,255,.3)", boxShadow: "inset 0 0 40px rgba(0,0,0,.8), 0 14px 30px rgba(0,0,0,.5)",
        }}>
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} className="absolute rounded-full" style={{
              left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: i % 4 ? 2 : 3, height: busy ? 18 : (i % 4 ? 2 : 3),
              background: "rgba(255,255,255,.75)", opacity: .6,
              animation: busy ? `lbStar ${0.35 + (i % 5) * 0.08}s linear infinite` : undefined, transition: "height .3s",
            }} />
          ))}
          <div className="absolute inset-x-0 top-6 text-center">
            <p className="font-black" style={{
              fontSize: 56, lineHeight: 1,
              color: final === null ? "#e0edff" : final >= tgt ? "#4ade80" : "#f87171",
              textShadow: final === null ? "0 0 26px rgba(96,165,250,.8)" : final >= tgt ? "0 0 30px rgba(74,222,128,.9)" : "0 0 30px rgba(248,113,113,.9)",
              animation: final !== null ? "lbWin .5s ease-out" : undefined,
            }}>{(final ?? display).toFixed(2)}x</p>
            <p className="text-xs mt-2 font-bold tracking-widest" style={{ color: "rgba(200,220,255,.7)" }}>{g("target", lang).toUpperCase()}: x{tgt.toFixed(2)}</p>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2" style={{
            bottom: busy ? 70 : final !== null && final >= tgt ? 150 : 24,
            transition: busy ? "bottom .9s cubic-bezier(.3,.7,.3,1)" : "bottom .5s ease-out",
            animation: busy ? "lbShake .08s linear infinite" : undefined,
          }}>
            {final !== null && final < tgt ? (
              <div className="relative w-[70px] h-[70px]">
                <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle,#fde68a,#f97316 45%,transparent 70%)", animation: "lbBoom .7s ease-out forwards" }} />
                <Sym n="boom" s={70} />
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                <Sym n="rocket" s={70} style={{ transform: "rotate(-45deg)" }} />
                {(busy || (final !== null && final >= tgt)) && (
                  <span className="rounded-full" style={{ width: 16, height: 38, marginTop: -10, transformOrigin: "top",
                    background: "linear-gradient(180deg,#fff7c2,#fb923c 40%,#ef4444 75%,transparent)", filter: "blur(1px)", animation: "lbFlame .12s ease-in-out infinite" }} />
                )}
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-6" style={{ background: "linear-gradient(0deg,rgba(30,58,138,.6),transparent)" }} />
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

        </StageFx>
        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <div className="bet-dock">
          <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
          <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        </div>
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
