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

  const rnd = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

  const play = () => {
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpin(true);
    const win = riggedWin();
    const stopTick = startTicker(70);
    sfx.spin();
    const iv = setInterval(() => setCells([rnd(), rnd(), rnd()]), 110);
    setTimeout(async () => {
      clearInterval(iv); stopTick(); setSpin(false);
      let res: string[];
      if (win) { const f = rnd(); res = [f, f, f]; }
      else {
        do { res = [rnd(), rnd(), rnd()]; } while (res[0] === res[1] && res[1] === res[2]);
      }
      setCells(res);
      if (win) sfx.win(); else sfx.lose();
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.fruitblast) }}>
      <GameHeader icon="cherry" title={` ${GAME_NAMES.fruitblast[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-8 grid grid-cols-3 gap-3 px-5"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {cells.map((c, i) => (
            <div key={i} className="rounded-2xl flex items-center justify-center"
              style={{
                height: 104,
                background: "radial-gradient(circle at 50% 30%, #123a6b, #061428)",
                border: "1px solid rgba(255,255,255,.1)",
                boxShadow: "inset 0 -12px 24px rgba(0,0,0,.5)",
                transform: spin ? "translateY(-4px) scale(1.03)" : "none",
                transition: "transform .16s",
              }}>
              <Sym n={c} s={56} glow={!spin && won === true} className={spin ? "" : "idle-bob"} />
            </div>
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
