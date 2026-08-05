import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg } from "@/lib/theme-context";
import { sfx } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import PlayingCard from "@/components/casino/PlayingCard";
import Sym from "@/components/casino/Sym";

/**
 * LIVE PVP — 36 kartali haqiqiy DURAK. Ikki haqiqiy odam pul tikib o'ynaydi.
 * Barcha qoidalar server tomonda tekshiriladi (api-server/src/lib/durak.ts).
 * Bu sahifa faqat holatni ko'rsatadi va harakat yuboradi (1 sek polling).
 */

type Suit = "♠" | "♥" | "♦" | "♣";
type Card = { r: number; s: Suit };
type Pair = { a: Card; d?: Card };

type View = {
  roomId: string;
  stake: number;
  prize: number;
  foeName: string;
  trump: Suit;
  trumpCard: Card | null;
  deckLeft: number;
  myHand: Card[];
  foeCount: number;
  table: Pair[];
  iAmAttacker: boolean;
  myTurn: boolean;
  canPass: boolean;
  winner: "me" | "foe" | null;
  discard: number;
  log: string[];
};

const RANK_LABEL: Record<number, string> = {
  6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

const api = (p: string, body?: unknown) =>
  fetch(`/api${p}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined,
  ).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error || "Xatolik");
    return j;
  });

export default function PvpDurak() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const { theme, ts } = useTheme();

  const [cfg, setCfg] = useState<{ stakes: number[]; online: number; tables: number } | null>(null);
  const [stake, setStake] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "playing" | "done">("idle");
  const [roomId, setRoomId] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [pick, setPick] = useState<Card | null>(null);
  const [err, setErr] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api("/pvp/config").then(setCfg).catch(() => {});
    return () => { if (poll.current) clearInterval(poll.current); };
  }, []);

  /* ── navbat ── */
  const join = async (s: number) => {
    if (!player) return;
    setErr(""); setStake(s);
    try {
      const r = await api("/pvp/queue", { telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", stake: s });
      if (r.status === "matched") { setRoomId(r.roomId); setStatus("playing"); startPoll(r.roomId); }
      else { setStatus("waiting"); waitLoop(s); }
      sfx.select();
    } catch (e) { setErr((e as Error).message); setStake(null); }
  };

  const waitLoop = (s: number) => {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      if (!player) return;
      try {
        const r = await api("/pvp/queue", { telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", stake: s });
        if (r.status === "matched") { setRoomId(r.roomId); setStatus("playing"); startPoll(r.roomId); }
      } catch { /* kutamiz */ }
    }, 2000);
  };

  const cancel = async () => {
    if (!player) return;
    if (poll.current) clearInterval(poll.current);
    await api("/pvp/cancel", { telegramId: player.telegramId }).catch(() => {});
    setStatus("idle"); setStake(null);
  };

  const startPoll = (rid: string) => {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      if (!player) return;
      try {
        const v: View = await api(`/pvp/state?telegramId=${player.telegramId}&roomId=${rid}`);
        setView(v);
        if (v.winner) {
          setStatus("done");
          if (poll.current) clearInterval(poll.current);
          if (v.winner === "me") sfx.win(true); else sfx.lose();
          refresh();
        }
      } catch { /* xona yopilgan */ }
    }, 1000);
  };

  const move = async (action: string, card?: Card, target = -1) => {
    if (!player || !roomId) return;
    setErr("");
    try {
      await api("/pvp/move", { telegramId: player.telegramId, roomId, action, card, target });
      setPick(null); sfx.select();
    } catch (e) { setErr((e as Error).message); }
  };

  const forfeit = async () => {
    if (!player || !roomId) return;
    await api("/pvp/forfeit", { telegramId: player.telegramId, roomId }).catch(() => {});
  };

  const BG = pageBg(theme);

  /* ── LOBBI ── */
  if (status === "idle" || status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: BG }}>
        <GameHeader icon="cardback" title=" LIVE PVP · DURAK" subtitle="36 karta · haqiqiy raqib" />
        <div className="flex-1 px-4 pb-8 flex flex-col gap-4">

          <div className="rounded-3xl p-4 flex items-center justify-around"
            style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
            <div className="text-center">
              <p className="font-black text-lg" style={{ color: "#22c55e" }}>{cfg?.online ?? 0}</p>
              <p style={{ fontSize: 10, color: ts.textSub }}>ONLAYN</p>
            </div>
            <div className="text-center">
              <p className="font-black text-lg" style={{ color: "#f7c948" }}>{cfg?.tables ?? 0}</p>
              <p style={{ fontSize: 10, color: ts.textSub }}>STOL</p>
            </div>
            <div className="text-center">
              <p className="font-black text-lg" style={{ color: "#38bdf8" }}>36</p>
              <p style={{ fontSize: 10, color: ts.textSub }}>KARTA</p>
            </div>
          </div>

          {status === "waiting" ? (
            <div className="rounded-3xl p-6 text-center flex flex-col items-center gap-3"
              style={{ background: ts.card, border: "1px solid rgba(247,201,72,.4)" }}>
              <Sym n="cardback" s={54} className="idle-float" />
              <p className="font-black" style={{ color: "#f7c948" }}>Raqib kutilmoqda...</p>
              <p style={{ fontSize: 11, color: ts.textSub }}>Tikish: {stake?.toLocaleString()} so'm</p>
              <button onClick={cancel} className="rounded-xl px-5 py-2 font-black"
                style={{ fontSize: 12, background: "rgba(239,68,68,.18)", color: "#f87171" }}>BEKOR QILISH</button>
            </div>
          ) : (
            <>
              <p className="font-black" style={{ fontSize: 12, color: ts.textSub }}>TIKISHNI TANLANG</p>
              <div className="grid grid-cols-2 gap-2">
                {(cfg?.stakes ?? [5000, 10000, 25000, 50000, 100000]).map((s) => (
                  <button key={s} onClick={() => join(s)}
                    className="rounded-2xl py-4 font-black active:scale-95 transition-all"
                    style={{
                      background: "linear-gradient(160deg,#1a6b46,#0a3b26)",
                      border: "1px solid rgba(247,201,72,.35)", color: "#fff",
                    }}>
                    {s.toLocaleString()}
                    <div style={{ fontSize: 10, color: "#f7c948" }}>yutuq {Math.floor(s * 2 * 0.92).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {err && <p className="text-center font-bold" style={{ fontSize: 12, color: "#f87171" }}>{err}</p>}

          <div className="rounded-3xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
            <p className="font-black mb-2" style={{ fontSize: 12, color: "#f7c948" }}>QOIDALAR</p>
            <ul className="space-y-1" style={{ fontSize: 11, color: ts.textSub, lineHeight: 1.5 }}>
              <li>• 36 karta (6..A), har kimga 6 ta karta, oxirgi karta — kozir.</li>
              <li>• Eng kichik kozir kimda bo'lsa — birinchi hujum qiladi.</li>
              <li>• Suzish (bito): himoyachi kartani baland karta bilan yopadi, kozir har qanday rangni yopadi.</li>
              <li>• Yopa olmasa — "OLAMAN" bosadi va stoldagi hamma kartani oladi.</li>
              <li>• Kartalar tugab, qo'li bo'shagan birinchi o'yinchi yutadi.</li>
              <li>• 30 soniya ichida harakat qilmasa — avtomatik harakat bo'ladi.</li>
              <li>• Yutuq: ikki tikish summasi, uy ulushi 8%.</li>
            </ul>
          </div>

          <button onClick={() => nav("/")} className="rounded-xl py-3 font-black"
            style={{ fontSize: 12, background: "rgba(255,255,255,.07)", color: ts.textSub }}>ORQAGA</button>
        </div>
      </div>
    );
  }

  /* ── STOL ── */
  const v = view;
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <GameHeader icon="cardback" title=" DURAK PVP" subtitle={v ? `${v.stake.toLocaleString()} · ${v.foeName}` : "..."} />
      <div className="flex-1 px-3 pb-6 flex flex-col gap-3">

        {!v && <p className="text-center font-bold" style={{ color: ts.textSub }}>Stol yuklanmoqda...</p>}

        {v && (
          <>
            {/* raqib */}
            <div className="flex items-center justify-between rounded-2xl px-3 py-2"
              style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
              <span className="font-black" style={{ fontSize: 12, color: "#fff" }}>{v.foeName}</span>
              <span className="flex gap-0.5">
                {Array.from({ length: Math.min(v.foeCount, 8) }).map((_, i) => (
                  <PlayingCard key={i} suit="♠" value="A" hidden w={22} />
                ))}
              </span>
            </div>

            {/* stol */}
            <div className="rounded-3xl p-3 min-h-[190px] flex flex-col justify-between"
              style={{
                background: "radial-gradient(circle at 50% 30%, #1a6b46, #08301f 70%)",
                border: `1px solid ${ts.cardBorder}`,
                boxShadow: "inset 0 0 60px rgba(0,0,0,.6)",
              }}>
              <div className="flex items-center justify-between" style={{ fontSize: 11, color: "rgba(255,255,255,.75)" }}>
                <span>Kozir: <b style={{ color: "#f7c948" }}>{v.trump}</b> {v.trumpCard ? RANK_LABEL[v.trumpCard.r] : ""}</span>
                <span>Paluba: {v.deckLeft}</span>
                <span>{v.iAmAttacker ? "Hujum: SIZ" : "Himoya: SIZ"}</span>
              </div>

              <div className="flex flex-wrap gap-3 justify-center py-2">
                {v.table.length === 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>Stol bo'sh</span>}
                {v.table.map((p, i) => (
                  <button key={i} disabled={!(pick && !p.d && !v.iAmAttacker && v.myTurn)}
                    onClick={() => pick && move("defend", pick, i)}
                    className="relative active:scale-95"
                    style={{ paddingRight: p.d ? 16 : 0, opacity: !p.d && pick && !v.iAmAttacker ? 1 : 0.95 }}>
                    <PlayingCard suit={p.a.s} value={RANK_LABEL[p.a.r]} w={48} />
                    {p.d && (
                      <span style={{ position: "absolute", left: 14, top: 12 }}>
                        <PlayingCard suit={p.d.s} value={RANK_LABEL[p.d.r]} w={48} />
                      </span>
                    )}
                    {!p.d && pick && !v.iAmAttacker && v.myTurn && (
                      <span style={{
                        position: "absolute", inset: -3, borderRadius: 8,
                        border: "2px dashed #f7c948", boxShadow: "0 0 12px rgba(247,201,72,.5)",
                      }} />
                    )}
                  </button>
                ))}
              </div>

              <p className="text-center font-black" style={{ fontSize: 11, color: v.myTurn ? "#4ade80" : "#f7c948" }}>
                {v.winner ? (v.winner === "me" ? "SIZ YUTDINGIZ!" : "Yutqazdingiz") : v.myTurn ? "Sizning navbatingiz" : "Raqib o'ylayapti..."}
              </p>
            </div>

            {/* mening kartalarim */}
            <div className="flex flex-wrap gap-1.5 justify-center rounded-2xl p-2"
              style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
              {v.myHand.map((c, i) => {
                const sel = pick && pick.r === c.r && pick.s === c.s;
                return (
                  <button key={`${c.r}${c.s}`} onClick={() => { setPick(c); sfx.select(); }}
                    className="active:scale-95 transition-transform"
                    style={{
                      borderRadius: 10, padding: 2,
                      transform: sel ? "translateY(-10px)" : "none",
                      background: sel ? "linear-gradient(160deg,#f7e59b,#d4af37)" : "transparent",
                    }}>
                    <PlayingCard suit={c.s} value={RANK_LABEL[c.r]} w={46} delay={i * 60} />
                  </button>
                );
              })}
            </div>

            {/* harakatlar */}
            {!v.winner ? (
              <div className="grid grid-cols-3 gap-2">
                <button disabled={!v.myTurn || !v.iAmAttacker || !pick} onClick={() => pick && move("attack", pick)}
                  className="rounded-xl py-3 font-black active:scale-95"
                  style={{ fontSize: 12, background: "linear-gradient(160deg,#f7e59b,#d4af37)", color: "#1a1200", opacity: v.myTurn && v.iAmAttacker && pick ? 1 : 0.45 }}>
                  HUJUM
                </button>
                <button disabled={!v.myTurn || v.iAmAttacker} onClick={() => move("take")}
                  className="rounded-xl py-3 font-black active:scale-95"
                  style={{ fontSize: 12, background: "rgba(239,68,68,.2)", color: "#f87171", opacity: v.myTurn && !v.iAmAttacker ? 1 : 0.45 }}>
                  OLAMAN
                </button>
                <button disabled={!v.canPass} onClick={() => move("pass")}
                  className="rounded-xl py-3 font-black active:scale-95"
                  style={{ fontSize: 12, background: "rgba(34,197,94,.2)", color: "#4ade80", opacity: v.canPass ? 1 : 0.45 }}>
                  BITA
                </button>
              </div>
            ) : (
              <button onClick={() => { setStatus("idle"); setView(null); setStake(null); }}
                className="rounded-xl py-3 font-black"
                style={{ fontSize: 13, background: "linear-gradient(160deg,#f7e59b,#d4af37)", color: "#1a1200" }}>
                YANA O'YNASH
              </button>
            )}

            {err && <p className="text-center font-bold" style={{ fontSize: 11, color: "#f87171" }}>{err}</p>}

            <div className="rounded-2xl px-3 py-2" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
              {v.log.map((l, i) => (
                <p key={i} style={{ fontSize: 10, color: ts.textSub }}>· {l}</p>
              ))}
            </div>

            {!v.winner && (
              <button onClick={forfeit} className="rounded-xl py-2 font-black"
                style={{ fontSize: 11, background: "rgba(255,255,255,.06)", color: ts.textSub }}>TASLIM BO'LISH</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
