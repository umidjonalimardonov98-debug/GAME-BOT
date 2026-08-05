import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { rollOutcome } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import PlayingCard from "@/components/casino/PlayingCard";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

/**
 * OMADLI KARTA — 36 kartali (6..A) haqiqiy palubadan 5 ta karta yopiq tushadi.
 * O'yinchi bittasini tanlaydi. Eng baland karta topilsa — yutuq.
 * Koeffitsiyent tanlangan qiyinlik bilan o'sadi (1.1 dan boshlanadi).
 */

type Suit = "♠" | "♥" | "♦" | "♣";
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const VALS = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/** qiyinlik: nechta kartadan tanlaydi → koeffitsiyent */
const LEVELS = [
  { cards: 2, mult: 1.1, uz: "Oson" },
  { cards: 3, mult: 1.3, uz: "O'rta" },
  { cards: 4, mult: 2.6, uz: "Qiyin" },
  { cards: 5, mult: 4.2, uz: "PRO" },
];

type Card = { s: Suit; v: string };
const vIdx = (v: string) => VALS.indexOf(v);

function deal(n: number): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const v of VALS) deck.push({ s, v });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}

export default function LuckyCard() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("luckycard");
  const [lvl, setLvl] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [open, setOpen] = useState<number[]>([]);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const level = LEVELS[lvl];

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setOpen([]);
    const out = rollOutcome("luckycard");
    const win = out === "win";
    const n = level.cards;

    // natijaga mos taqsimot: yutsa — tanlangan karta eng baland
    let hand = deal(n);
    for (let guard = 0; guard < 400; guard++) {
      const best = hand.reduce((a, b) => (vIdx(b.v) > vIdx(a.v) ? b : a));
      const isBestMine = hand[pick] === best;
      const uniqueTop = hand.filter((c) => vIdx(c.v) === vIdx(best.v)).length === 1;
      if (uniqueTop && isBestMine === win) break;
      hand = deal(n);
    }
    setCards(hand);

    const stopTick = startTicker(95);
    sfx.spin();
    // kartalar ketma-ket ochiladi
    hand.forEach((_, i) => {
      setTimeout(() => { sfx.reveal(); setOpen((p) => [...p, i]); }, 500 + i * 420);
    });
    setTimeout(async () => {
      stopTick();
      const m = out === "win" ? level.mult : out === "refund" ? 1 : 0;
      const w = await settle(m);
      setAmount(w); setWon(m > 1 ? true : m === 1 ? null : false); setBusy(false);
    }, 700 + hand.length * 420);
  };

  const reset = () => { setCards([]); setOpen([]); setPick(null); setWon(null); };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.luckycard) }}>
      <GameHeader icon="cardback" title={` ${GAME_NAMES.luckycard[lang]}`} subtitle={`x${level.mult} · 36 karta`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        {/* qiyinlik tanlash */}
        <div className="w-full grid grid-cols-4 gap-1.5">
          {LEVELS.map((L, i) => (
            <button key={i} disabled={busy}
              onClick={() => { setLvl(i); reset(); sfx.select(); }}
              className="rounded-xl py-2 font-black active:scale-95 transition-all"
              style={{
                fontSize: 11,
                background: lvl === i ? "linear-gradient(160deg,#f7e59b,#d4af37)" : "rgba(255,255,255,.06)",
                color: lvl === i ? "#1a1200" : ts.textSub,
                border: `1px solid ${lvl === i ? "#f7e59b" : ts.cardBorder}`,
              }}>
              {L.uz}<br />x{L.mult}
            </button>
          ))}
        </div>

        <div className="w-full rounded-3xl py-6 px-3 flex items-center justify-center gap-2 flex-wrap"
          style={{
            background: "radial-gradient(circle at 50% 20%, #1a6b46, #0a3b26 70%)",
            border: `1px solid ${ts.cardBorder}`,
            boxShadow: "inset 0 0 60px rgba(0,0,0,.55)",
          }}>
          {Array.from({ length: level.cards }).map((_, i) => {
            const card = cards[i];
            const shown = card && open.includes(i);
            const w = level.cards > 4 ? 58 : level.cards > 3 ? 66 : 76;
            return (
              <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                className="active:scale-95 transition-transform"
                style={{
                  borderRadius: 12,
                  padding: 3,
                  background: pick === i ? "linear-gradient(160deg,#f7e59b,#d4af37)" : "transparent",
                  boxShadow: pick === i ? "0 0 20px rgba(247,229,155,.5)" : "none",
                }}>
                <PlayingCard suit={(card?.s ?? "♠") as Suit} value={card?.v ?? "A"} hidden={!shown} w={w} delay={i * 90} />
              </button>
            );
          })}
        </div>

        <p className="text-xs font-bold text-center" style={{ color: ts.textSub }}>
          Eng baland kartani toping — {level.cards} tadan 1 ta
        </p>

        <ResultBanner win={won} text={won ? `${g("win", lang)} x${level.mult}` : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || pick === null} />
        {pick === null && <p className="text-xs" style={{ color: ts.textSub }}>Avval kartani tanlang</p>}
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
