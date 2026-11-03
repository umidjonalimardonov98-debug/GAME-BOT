import StageFx from "@/components/casino/StageFx";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import Sym from "@/components/casino/Sym";
import SlotReel from "@/components/casino/SlotReel";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

const FRUITS = ["cherry", "lemon", "orange", "grape", "melon", "strawberry"] as const;
const MULT = 2.91;

/** Fruit Blast — 3 ta meva bir xil bo'lsa yutuq */
export default function FruitBlast() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("fruitblast");
  const [cells, setCells] = useState<string[]>(["cherry", "lemon", "grape"]);
  const [spin, setSpin] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const [spinId, setSpinId] = useState(0);

  const rnd = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

  const play = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpin(true);
    const win = riggedWin("fruitblast");
    const stopTick = startTicker(70);
    sfx.spin();
    let res: string[];
    if (win) { const f = rnd(); res = [f, f, f]; }
    else { do { res = [rnd(), rnd(), rnd()]; } while (res[0] === res[1] && res[1] === res[2]); }
    setCells(res); setSpinId(n => n + 1);
    setTimeout(async () => {
      stopTick(); setSpin(false);
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.fruitblast) }}>
      <GameHeader icon="cherry" title={` ${GAME_NAMES.fruitblast[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <style>{`@keyframes fb-bulb{0%,100%{opacity:1}50%{opacity:.2}}@keyframes fb-lever{0%{transform:rotate(0)}40%{transform:rotate(38deg)}100%{transform:rotate(0)}}
          @keyframes fb-win{0%,100%{box-shadow:0 0 0 rgba(255,213,74,0)}50%{box-shadow:0 0 40px 8px rgba(255,213,74,.8)}}
          @keyframes fb-coin{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(240px) rotate(540deg);opacity:0}}`}</style>
        <div className="w-full relative">
          <div className="rounded-[28px] p-[5px] relative" style={{ background: "linear-gradient(150deg,#fff6cf,#d4af37 30%,#7a520a 60%,#ffe9a0)", animation: won ? "fb-win 1s ease-in-out 3" : undefined }}>
            <div className="rounded-[24px] px-4 pt-3 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(180deg,#7a0f1d,#3b0610 70%)" }}>
              <div className="flex justify-between px-1 mb-2">
                {Array.from({ length: 12 }).map((_, k) => (
                  <span key={k} className="rounded-full" style={{ width: 8, height: 8, background: k % 2 ? "#ffd54a" : "#fff3b0", boxShadow: "0 0 8px #ffd54a", animation: `fb-bulb ${spin || won ? .25 : 1.6}s ${k % 2 ? .12 : 0}s infinite` }} />
                ))}
              </div>
              <p className="text-center font-black tracking-[0.3em] mb-3" style={{ color: "#ffd54a", textShadow: "0 0 12px rgba(255,213,74,.7)", fontSize: 13 }}>FRUIT BLAST · x{MULT}</p>
              <div className="relative rounded-2xl p-2 flex justify-center gap-2" style={{ background: "#14040a", boxShadow: "inset 0 0 20px rgba(0,0,0,.9)" }}>
                {cells.map((c, i) => (
                  <SlotReel key={i} strip={[...FRUITS]} target={c} spinning={spin && spinId > 0} idx={i} cell={92} />
                ))}
                <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 pointer-events-none" style={{ height: 2, background: won ? "#ffd54a" : "rgba(255,213,74,.35)", boxShadow: won ? "0 0 12px #ffd54a" : undefined }} />
              </div>
            </div>
          </div>
          <div className="absolute -right-1 top-16" style={{ transformOrigin: "50% 100%", animation: spin ? "fb-lever .6s ease" : undefined }}>
            <div style={{ width: 6, height: 54, margin: "0 auto", background: "linear-gradient(90deg,#999,#eee,#888)", borderRadius: 3 }} />
            <div className="rounded-full" style={{ width: 20, height: 20, marginTop: -64, background: "radial-gradient(circle at 35% 30%,#ff8a8a,#c0101f)", boxShadow: "0 2px 6px rgba(0,0,0,.6)" }} />
          </div>
          {won && Array.from({ length: 14 }).map((_, k) => (
            <img key={k} src="/symbols/coin.png" alt="" className="absolute pointer-events-none" style={{ width: 26, left: `${5 + k * 6.5}%`, top: 10, animation: `fb-coin ${1 + (k % 4) * .25}s ease-in ${k * .06}s both` }} />
          ))}
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
