import StageFx from "@/components/casino/StageFx";
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
import Sym from "@/components/casino/Sym";
import PlayingCard, { type Suit } from "@/components/casino/PlayingCard";

const FACES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
type Side = "dragon"|"tiger"|"tie";
const PAY: Record<Side, number> = { dragon: 1.95, tiger: 1.95, tie: 9 };

export default function DragonTiger() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("dragontiger");
  const [side, setSide] = useState<Side>("dragon");
  const [d, setD] = useState<number | null>(null);
  const [t, setT] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setD(null); setT(null);
    const win = riggedWin("dragontiger");
    const outcome: Side = win ? side
      : side === "tie"? (Math.random() < 0.5 ?"dragon":"tiger")
      : side === "dragon"? (Math.random() < 0.9 ?"tiger":"tie")
      : (Math.random() < 0.9 ? "dragon":"tie");

    let dv = Math.floor(Math.random() * 13), tv = Math.floor(Math.random() * 13);
    if (outcome === "tie") tv = dv;
    else if (outcome === "dragon") { if (dv <= tv) { dv = Math.min(12, tv + 1 + Math.floor(Math.random() * 3)); if (dv === tv) dv = Math.min(12, tv + 1); } }
    else { if (tv <= dv) { tv = Math.min(12, dv + 1 + Math.floor(Math.random() * 3)); if (tv === dv) tv = Math.min(12, dv + 1); } }
    if (outcome !== "tie"&& dv === tv) { if (outcome ==="dragon") dv = Math.min(12, tv + 1); else tv = Math.min(12, dv + 1); }

    sfx.card();
    setTimeout(() =>{ setD(dv); sfx.reveal(); }, 350);
    setTimeout(() =>{ setT(tv); sfx.reveal(); }, 700);
    setTimeout(async () =>{
      const w = await settle(win ? PAY[side] : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 1050);
  };

  const CardBox = ({ v, color, label, icon }: { v: number | null; color: string; label: string; icon: string }) => (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Sym n={icon} s={26} className="idle-tilt" />
        <p className="font-black text-xs tracking-widest" style={{ color }}>{label}</p>
      </div>
      <div style={{ filter: `drop-shadow(0 0 ${v !== null && won !== null ? 14 : 0}px ${color})`, transition: "filter .3s" }}>
        {v === null
          ? <div style={{ animation: busy ? "dt-wait .6s ease-in-out infinite" : undefined }}><PlayingCard suit="♠" value="A" hidden w={88} /></div>
          : <PlayingCard key={v + label} suit={(["♠","♥","♦","♣"][v % 4]) as Suit} value={FACES[v]} w={88} />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.dragontiger) }}>
      <GameHeader icon="dragon" title={` ${GAME_NAMES.dragontiger[lang]}`} subtitle="x9" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-6 flex relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 25%,#1d7a4c 0%,#0e4a2e 55%,#06261a 100%)", border: "3px solid #8a5a1c", boxShadow: "inset 0 0 0 2px #d4af37, inset 0 0 50px rgba(0,0,0,.6), 0 12px 30px rgba(0,0,0,.5)" }}>
          <style>{`@keyframes dt-wait{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-lg px-2 py-1 rounded-full" style={{ color: "#ffd54a", background: "rgba(0,0,0,.55)", border: "1px solid #d4af37", zIndex: 2 }}>VS</div>
          <CardBox v={d} icon="dragon" color="#f87171" label={g("dragon", lang)} />
          <CardBox v={t} icon="tiger" color="#fbbf24" label={g("tiger", lang)} />
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          {(["dragon", "tie", "tiger"] as Side[]).map(s => (
            <button key={s} disabled={busy} onClick={() =>{ setSide(s); sfx.select(); }}
              className="py-3 rounded-xl text-xs font-black active:scale-95 disabled:opacity-40"
              style={{
                background: side === s ? "linear-gradient(135deg,#1668e3,#0d4fb0)" : ts.btnSecondary,
                color: side === s ? "#fff" : ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}`,
              }}>
              {g(s, lang)}<br /><span style={{ fontSize: 9, opacity: .8 }}>x{PAY[s]}</span>
            </button>
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
