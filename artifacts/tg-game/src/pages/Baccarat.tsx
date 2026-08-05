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

const FACES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];
const val = (i: number) => (i >= 9 ? 0 : i + 1);
const draw = () => Math.floor(Math.random() * 13);

type Side = "player"|"banker"|"tie";
const PAY: Record<Side, number> = { player: 1.95, banker: 1.9, tie: 8 };

export default function Baccarat() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("baccarat");
  const [side, setSide] = useState<Side>("player");
  const [pc, setPc] = useState<number[]>([]);
  const [bc, setBc] = useState<number[]>([]);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const handFor = (target: number) =>{
    for (let i = 0; i < 400; i++) {
      const a = [draw(), draw()], b = [draw(), draw()];
      const sa = (val(a[0]) + val(a[1])) % 10, sb = (val(b[0]) + val(b[1])) % 10;
      if (target === 0 && sa > sb) return { a, b };
      if (target === 1 && sb > sa) return { a, b };
      if (target === 2 && sa === sb) return { a, b };
    }
    return { a: [0, 0], b: [0, 0] };
  };

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setPc([]); setBc([]);
    const win = riggedWin();
    const winnerIdx = win ? (side === "player"? 0 : side ==="banker" ? 1 : 2)
      : (side === "player"? (Math.random() < 0.85 ? 1 : 2) : side ==="banker" ? (Math.random() < 0.85 ? 0 : 2) : (Math.random() < 0.5 ? 0 : 1));
    const { a, b } = handFor(winnerIdx);

    [0, 1].forEach(i =>{
      setTimeout(() =>{ sfx.card(); setPc(p => [...p, a[i]]); }, i * 300);
      setTimeout(() =>{ sfx.card(); setBc(p => [...p, b[i]]); }, i * 300 + 150);
    });
    setTimeout(async () =>{
      if (win) sfx.win(side === "tie"); else sfx.lose();
      const w = await settle(win ? PAY[side] : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 900);
  };

  const total = (h: number[]) => h.reduce((s, c) => s + val(c), 0) % 10;

  const Hand = ({ h, label }: { h: number[]; label: string }) => (
    <div className="flex-1 flex flex-col items-center gap-2">
      <p className="text-xs font-black tracking-widest" style={{ color: ts.textSub }}>{label}</p>
      <div className="flex gap-1.5">
        {(h.length ? h : [-1, -1]).map((c, i) => (
          <div key={i} className="rounded-xl flex flex-col items-center justify-center font-black"
            style={{ width: 46, height: 66, background: c < 0 ? "rgba(255,255,255,0.07)":"#fff", color: c < 0 ? "transparent":"#111" }}>
            <span style={{ fontSize: 16 }}>{c < 0 ? "?" : FACES[c]}</span>
            <span style={{ fontSize: 12, color: c < 0 ? "transparent":"#dc2626" }}>{SUITS[i % 4]}</span>
          </div>
        ))}
      </div>
      <p className="font-black"style={{ color:"#fbbf24"}}>{h.length ? total(h) :"-"}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.baccarat) }}>
      <GameHeader icon="cardback" title={` ${GAME_NAMES.baccarat[lang]}`} subtitle="x8" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-6 flex" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <Hand h={pc} label={g("player", lang)} />
          <Hand h={bc} label={g("banker", lang)} />
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          {(["player", "banker", "tie"] as Side[]).map(s => (
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

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
