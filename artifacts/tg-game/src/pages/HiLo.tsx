import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

const FACES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♠", "♥", "♦", "♣"];
const rnd = (max: number) => Math.floor(Math.random() * max);

export default function HiLo() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("hilo");
  const [card, setCard] = useState(() => ({ f: rnd(13), s: rnd(4) }));
  const [next, setNext] = useState<{ f: number; s: number } | null>(null);
  const [active, setActive] = useState(false);
  const [mult, setMult] = useState(1);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const start = () =>{
    if (!canPlay) return;
    sfx.card();
    setActive(true); setBusy(true); setMult(1); setWon(null); setNext(null);
    setCard({ f: rnd(13), s: rnd(4) });
  };

  const guess = async (hi: boolean) =>{
    if (!active) return;
    sfx.card();
    const win = riggedWin("hilo");
    let f: number;
    if (win) f = hi ? Math.min(12, card.f + 1 + rnd(Math.max(1, 12 - card.f))) : Math.max(0, card.f - 1 - rnd(Math.max(1, card.f)));
    else f = hi ? Math.max(0, card.f - 1 - rnd(Math.max(1, card.f))) : Math.min(12, card.f + 1 + rnd(Math.max(1, 12 - card.f)));
    if (f === card.f) f = Math.min(12, Math.max(0, f + (hi === win ? 1 : -1)));
    const nc = { f, s: rnd(4) };
    setNext(nc);
    setTimeout(async () =>{
      if (win) {
        sfx.tile();
        setCard(nc); setNext(null); setMult(m => +(m * 1.65).toFixed(2));
      } else {
        setActive(false);
        const w = await settle(0);
        setAmount(w); setWon(false); setBusy(false);
      }
    }, 450);
  };

  const cashout = async () =>{
    if (!active || mult <= 1) return;
    sfx.cash();
    const w = await settle(mult);
    setAmount(w); setWon(true); setActive(false); setBusy(false);
  };

  const Card = ({ c, hidden }: { c: { f: number; s: number }; hidden?: boolean }) => (
    <div className="rounded-2xl flex flex-col items-center justify-center font-black"
      style={{ width: 96, height: 132, background: hidden ? "linear-gradient(135deg,#0d4fb0,#1668e3)":"#fff", color: hidden ? "#fff": (c.s === 1 || c.s === 2 ?"#dc2626":"#111"), boxShadow: "0 8px 22px rgba(0,0,0,0.35)" }}>
      {hidden ? <span style={{ fontSize: 40 }}>?</span> : <><span style={{ fontSize: 34 }}>{FACES[c.f]}</span><span style={{ fontSize: 26 }}>{SUITS[c.s]}</span></>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.hilo) }}>
      <GameHeader icon="cardback" title={` ${GAME_NAMES.hilo[lang]}`} subtitle="x1.65 / qadam" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-6 flex items-center justify-center gap-4"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <Card c={card} />
          <span className="font-black text-2xl" style={{ color: ts.textSub }}>→</span>
          {next ? <Card c={next} /> : <Card c={card} hidden />}
        </div>

        <p className="font-black text-lg"style={{ color:"#fbbf24" }}>x{mult.toFixed(2)}</p>

        {active ? (
          <>
            <div className="w-full grid grid-cols-2 gap-3">
              <button onClick={() => guess(true)} className="py-4 rounded-2xl font-black text-white active:scale-95"
                style={{ background: "linear-gradient(145deg,#1a7d43,#25a55a)", boxShadow: "0 6px 0 #064e3b" }}>{g("higher", lang)}</button>
              <button onClick={() => guess(false)} className="py-4 rounded-2xl font-black text-white active:scale-95"
                style={{ background: "linear-gradient(145deg,#dc2626,#ef4444)", boxShadow: "0 6px 0 #7f1d1d" }}>{g("lower", lang)}</button>
            </div>
            <PlayButton label={` ${g("cashout", lang)} · x${mult.toFixed(2)}`} onClick={cashout} disabled={mult <= 1}
              color="linear-gradient(145deg,#b45309,#f59e0b)" shadow="0 7px 0 #78350f" />
          </>
        ) : (
          <>
            <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
            <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} />
            <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={start} disabled={!canPlay} />
          </>
        )}
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
