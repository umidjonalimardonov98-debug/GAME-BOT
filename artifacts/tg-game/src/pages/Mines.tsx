import { useState, useCallback } from "react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GAME_BG } from "@/lib/theme-context";
import { placeBet } from "@/lib/api";
import { riggedLose } from "@/lib/odds";
import GameHeader from "@/components/GameHeader";
import TableFrame from "@/components/casino/TableFrame";
import Sym from "@/components/casino/Sym";
import { sfx } from "@/lib/sound";
import { useU } from "@/lib/ui-i18n";

const SIZE = 25;
const MINE_OPTIONS = [3, 5, 7, 10];

/** Har bir ochilgan olmos uchun koeffitsiyent (uy foydasi ~5%) */
function multiplier(mines: number, opened: number) {
  let m = 1;
  for (let i = 0; i < opened; i++) {
    m *= (SIZE - i) / (SIZE - mines - i);
  }
  return Math.max(1, m * 0.99);
}

function pickMines(count: number) {
  const set = new Set<number>();
  while (set.size < count) set.add(Math.floor(Math.random() * SIZE));
  return set;
}

type State = "idle"|"playing"|"over";

export default function Mines() {
  const u = useU();
  const { player, refresh } = usePlayer();
  const { theme, ts } = useTheme();
  const isLight = false;

  const [betInput, setBetInput] = useState("2000");
  const [mines, setMines] = useState(3);
  const [state, setState] = useState<State>("idle");
  const [bombs, setBombs] = useState<Set<number>>(new Set());
  const [opened, setOpened] = useState<number[]>([]);
  const [boom, setBoom] = useState<number | null>(null);
  const [prize, setPrize] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // Uy foydasi: 69% raundda bomba oldindan belgilangan qadamda chiqadi
  const [loseAt, setLoseAt] = useState<number>(Number.POSITIVE_INFINITY);
  const [shown, setShown] = useState<number[]>([]);   // ketma-ket ochiladigan bombalar
  const [shake, setShake] = useState(0);

  const bet = Math.max(Number(betInput) || 0, 0);
  const mult = multiplier(mines, opened.length);
  const cashout = Math.floor(bet * mult);
  const nextMult = multiplier(mines, opened.length + 1);

  function quick(action: string) {
    const bal = player?.balance ?? 0;
    let v = bet;
    if (action === "MIN") v = 2000;
    else if (action === "MAX") v = Math.min(bal, 500000);
    else if (action === "X2") v = Math.min(bet * 2, bal, 500000);
    else if (action === "X/2") v = Math.max(Math.floor(bet / 2), 2000);
    setBetInput(String(v));
  }

  const start = useCallback(() =>{
    if (!player || bet < 2000 || player.balance < bet || busy) return;
    setBombs(pickMines(mines));
    setLoseAt(riggedLose() ? 1 + Math.floor(Math.random() * 3) : Number.POSITIVE_INFINITY);
    setOpened([]);
    setBoom(null);
    setPrize(0);
    setMsg("");
    setShown([]);
    setShake(0);
    sfx.spin();
    setState("playing");
  }, [player, bet, mines, busy]);

  const finish = useCallback(
    async (win: boolean, amount: number) =>{
      setBusy(true);
      setState("over");
      if (player) {
        await placeBet(player.telegramId, {
          amount: bet,
          game: "mines",
          won: win,
          winAmount: win ? amount : 0,
        }).catch(() =>{});
        await refresh();
      }
      setBusy(false);
    },
    [player, bet, refresh],
  );

  const openCell = (i: number) =>{
    if (state !== "playing" || opened.includes(i) || busy) return;
    const forcedBoom = opened.length + 1 === loseAt;
    if (forcedBoom || bombs.has(i)) {
      const allBombs = forcedBoom ? new Set([...bombs, i]) : bombs;
      if (forcedBoom) setBombs(allBombs);
      setBoom(i);
      sfx.lose();
      setShake(1);
      setTimeout(() => setShake(0), 620);
      // qolgan bombalar ketma-ket ochiladi (haqiqiy kazino kabi)
      [...allBombs].filter((b) => b !== i).forEach((b, k) => {
        setTimeout(() => { setShown((s2) => [...s2, b]); sfx.reveal(); }, 260 + k * 130);
      });
      setPrize(0);
      setMsg(u("boomLose"));
      void finish(false, 0);
      return;
    }
    const next = [...opened, i];
    sfx.reveal();
    sfx.select();
    setOpened(next);
    if (next.length === SIZE - mines) {
      const all = Math.floor(bet * multiplier(mines, next.length));
      setPrize(all);
      setMsg(` Barcha olmoslar! +${all.toLocaleString()} UZS`);
      void finish(true, all);
    }
  };

  const doCashout = () =>{
    if (state !== "playing" || opened.length === 0 || busy) return;
    setPrize(cashout);
    setMsg(` Olindi! +${cashout.toLocaleString()} UZS`);
    void finish(true, cashout);
  };

  const cellBg = (i: number) =>{
    if (boom === i) return "linear-gradient(145deg,#7f1d1d,#ef4444)";
    if (state === "over"&& bombs.has(i)) return"linear-gradient(145deg,#450a0a,#991b1b)";
    if (opened.includes(i)) return "linear-gradient(145deg,#065f46,#25a55a)";
    return isLight ? "linear-gradient(145deg,#e0e7ff,#c7d2fe)":"linear-gradient(145deg,#312e81,#0d4fb0)";
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.mines) }}>
      <style>{`
        @keyframes mn-pop { 0%{transform:rotateY(180deg) scale(.7)} 60%{transform:rotateY(180deg) scale(1.12)} 100%{transform:rotateY(180deg) scale(1)} }
        @keyframes mn-boom { 0%{transform:rotateY(180deg) scale(.6);filter:brightness(2.2)} 45%{transform:rotateY(180deg) scale(1.28);filter:brightness(1.6)} 100%{transform:rotateY(180deg) scale(1);filter:brightness(1)} }
        @keyframes mn-shake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-4px,2px) rotate(-3deg)} 40%{transform:translate(4px,-2px) rotate(3deg)} 60%{transform:translate(-3px,-1px)} 80%{transform:translate(3px,1px)} }
        @keyframes mn-spark { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(.3)} }
      `}</style>

      <GameHeader icon="bomb" title=" MINES" subtitle="Olmoslarni top · bombadan qoch" />

      <div className="flex-1 px-4 pb-8 flex flex-col gap-4">
        {/* Multiplier bar */}
        <div
          className="rounded-3xl px-5 py-4 flex items-center justify-between relative overflow-hidden"
          style={{
            background: ts.card,
            border: `1px solid ${ts.cardBorder}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(16,185,129,0.16) 0%, transparent 60%)" }}
          />
          <div className="relative">
            <p className="text-xs font-black tracking-widest" style={{ color: ts.textSub }}>
              KOEFFITSIYENT
            </p>
            <p className="font-black text-3xl"style={{ color:"#34d399" }}>
              x{mult.toFixed(2)}
            </p>
          </div>
          <div className="relative text-right">
            <p className="text-xs font-black tracking-widest" style={{ color: ts.textSub }}>
              YIG'ILGAN
            </p>
            <p className="font-black text-2xl"style={{ color:"#fbbf24" }}>
              {(state === "playing" ? cashout : prize).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Grid — GEMS MINES (ko'k kristall skin) */}
        <TableFrame skin="blue" title="GEMS MINES" bulbs bulbsActive={state === "playing"}>
          <div
            className="rounded-2xl p-3"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(80,170,255,0.16) 0%, rgba(3,16,31,0.92) 70%)",
              border: "1px solid rgba(120,190,255,0.3)",
              boxShadow: "inset 0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: SIZE }).map((_, i) =>{
              const isOpen = opened.includes(i);
              const isBoom = boom === i;
              const revealed = state === "over" && bombs.has(i) && (shown.includes(i) || isBoom);
              const flipped = isOpen || revealed;
              return (
                <button
                  key={i}
                  onClick={() => openCell(i)}
                  disabled={state !== "playing"}
                  className="relative active:scale-90"
                  style={{
                    aspectRatio: "1 / 1",
                    perspective: 520,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    animation: isBoom && shake ? "mn-shake .6s ease-out" : undefined,
                  }}
                >
                  <div style={{
                    position: "relative", width: "100%", height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform .42s cubic-bezier(.2,.9,.25,1.1)",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}>
                    {/* orqa yuz — yopiq katak */}
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: 14, backfaceVisibility: "hidden",
                      background: "linear-gradient(145deg,#312e81,#0d4fb0)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      boxShadow: "0 4px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        width: "42%", height: "42%", borderRadius: 6,
                        background: "linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))",
                      }} />
                    </div>
                    {/* old yuz — natija */}
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: 14,
                      backfaceVisibility: "hidden", transform: "rotateY(180deg)",
                      background: isBoom
                        ? "radial-gradient(circle at 50% 40%,#ffd28a,#ef4444 45%,#7f1d1d)"
                        : revealed ? "linear-gradient(145deg,#450a0a,#991b1b)"
                        : "radial-gradient(circle at 50% 35%,#5ce89a,#25a55a 55%,#065f46)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      boxShadow: isOpen
                        ? "inset 0 2px 10px rgba(0,0,0,0.35), 0 0 16px rgba(52,211,153,0.45)"
                        : "inset 0 2px 10px rgba(0,0,0,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      animation: isBoom ? "mn-boom .5s ease-out" : isOpen ? "mn-pop .38s ease-out" : undefined,
                    }}>
                      {isOpen ? <Sym n="gem" s={30} glow /> : <Sym n="bomb" s={30} />}
                    </div>
                  </div>
                  {/* portlash uchqunlari */}
                  {isBoom && [...Array(10)].map((_, k) => (
                    <span key={k} style={{
                      position: "absolute", left: "50%", top: "50%", width: 5, height: 5, borderRadius: 99,
                      background: k % 2 ? "#ffd766" : "#ff6b4a", pointerEvents: "none",
                      animation: `mn-spark .7s ease-out ${k * 0.015}s forwards`,
                      "--tx": `${Math.cos((k / 10) * 6.283) * 46}px`,
                      "--ty": `${Math.sin((k / 10) * 6.283) * 46}px`,
                    } as React.CSSProperties} />
                  ))}
                </button>
              );
            })}
          </div>
          {msg && (
            <p
              className="text-center font-black mt-4"
              style={{ color: prize > 0 ? "#39c46f":"#f87171" }}
            >
              {msg}
            </p>
          )}
          </div>
        </TableFrame>

        {/* Mines count */}
        <div className="rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-black mb-3 tracking-widest" style={{ color: ts.textSub }}>
             BOMBALAR SONI
          </p>
          <div className="grid grid-cols-4 gap-2">
            {MINE_OPTIONS.map((m) =>{
              const sel = mines === m;
              return (
                <button
                  key={m}
                  disabled={state === "playing"}
                  onClick={() => setMines(m)}
                  className="py-3 rounded-2xl font-black active:scale-95 transition-all"
                  style={{
                    background: sel ? "rgba(239,68,68,0.18)" : ts.input,
                    border: sel ? "1.5px solid #ef444488" : `1px solid ${ts.inputBorder}`,
                    color: sel ? "#f87171" : ts.text,
                    boxShadow: sel ? "0 4px 18px rgba(239,68,68,0.25)":"0 2px 0 rgba(0,0,0,0.12)",
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bet */}
        <div className="rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: ts.textSub }}>
             TIKISH MIQDORI
          </p>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {["MIN", "X2", "X/2", "MAX"].map((a) => (
              <button
                key={a}
                disabled={state === "playing"}
                onClick={() => quick(a)}
                className="py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                style={{
                  background: ts.btnSecondary,
                  color: ts.btnSecondaryText,
                  border: `1px solid ${ts.cardBorder}`,
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={betInput}
            disabled={state === "playing"}
            onChange={(e) => setBetInput(e.target.value)}
            placeholder="min 2 000"
            className="w-full rounded-xl px-4 py-3 font-black text-lg outline-none"
            style={{ background: ts.input, border: `1px solid ${ts.inputBorder}`, color: ts.text }}
          />
        </div>

        {/* Action */}
        {state === "playing" ? (
          <button
            onClick={doCashout}
            disabled={opened.length === 0 || busy}
            className="w-full py-4 rounded-2xl font-black text-lg text-white active:scale-95 transition-all"
            style={{
              background: opened.length ? "linear-gradient(135deg,#1a7d43,#34d399)":"rgba(120,120,120,0.35)",
              boxShadow: opened.length ? "0 8px 0 #065f46, 0 10px 30px rgba(16,185,129,0.4)":"none",
            }}
          >
            {opened.length
              ? ` OLISH · ${cashout.toLocaleString()} UZS`
              : `Katak oching (keyingi x${nextMult.toFixed(2)})`}
          </button>
        ) : (
          <button
            onClick={start}
            disabled={!player || bet < 2000 || (player?.balance ?? 0) < bet || busy}
            className="w-full py-4 rounded-2xl font-black text-lg text-white active:scale-95 transition-all"
            style={{
              background: "linear-gradient(135deg,#1668e3,#a855f7)",
              boxShadow: "0 8px 0 #0b3f8f, 0 10px 30px rgba(22,104,227,0.5)",
              opacity: !player || bet < 2000 || (player?.balance ?? 0) < bet ? 0.5 : 1,
            }}
          >
             BOSHLASH
          </button>
        )}
      </div>
    </div>
  );
}
