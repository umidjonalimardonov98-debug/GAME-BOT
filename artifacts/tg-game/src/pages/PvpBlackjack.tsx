import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg } from "@/lib/theme-context";
import { sfx } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import PlayingCard from "@/components/casino/PlayingCard";
import Sym from "@/components/casino/Sym";

/**
 * LIVE PVP — Blackjack 1x1. Ikki haqiqiy odam pul tikib 21 o'ynaydi.
 * Barcha qoidalar server tomonda tekshiriladi (api-server/src/lib/pvp-blackjack.ts).
 */

type Suit = "♠" | "♥" | "♦" | "♣";
type Card = { r: number; s: Suit };

type View = {
  roomId: string;
  stake: number;
  prize: number;
  foeName: string;
  myHand: Card[];
  myScore: number;
  foeHand: Card[];
  foeScore?: number;
  foeCount: number;
  deckLeft: number;
  myTurn: boolean;
  iStand: boolean;
  iBust: boolean;
  foeStand: boolean;
  foeBust: boolean;
  winner: "me" | "foe" | "draw" | null;
  log: string[];
};

const RANK_LABEL: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
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

export default function PvpBlackjack() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const { theme, ts } = useTheme();

  const [cfg, setCfg] = useState<{ stakes: number[]; online: number; tables: number } | null>(null);
  const [stake, setStake] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "playing" | "done">("idle");
  const [roomId, setRoomId] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api("/pvp-bj/config").then(setCfg).catch(() => {});
    return () => { if (poll.current) clearInterval(poll.current); };
  }, []);

  const join = async (s: number) => {
    if (!player) return;
    setErr(""); setStake(s);
    try {
      const r = await api("/pvp-bj/queue", { telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", stake: s });
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
        const r = await api("/pvp-bj/queue", { telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", stake: s });
        if (r.status === "matched") { setRoomId(r.roomId); setStatus("playing"); startPoll(r.roomId); }
      } catch { /* kutamiz */ }
    }, 2000);
  };

  const cancel = async () => {
    if (!player) return;
    if (poll.current) clearInterval(poll.current);
    await api("/pvp-bj/cancel", { telegramId: player.telegramId }).catch(() => {});
    setStatus("idle"); setStake(null);
  };

  const startPoll = (rid: string) => {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      if (!player) return;
      try {
        const v: View = await api(`/pvp-bj/state?telegramId=${player.telegramId}&roomId=${rid}`);
        setView(v);
        if (v.winner) {
          setStatus("done");
          if (poll.current) clearInterval(poll.current);
          if (v.winner === "me") sfx.win(true); else if (v.winner === "foe") sfx.lose();
          refresh();
        }
      } catch { /* xona yopilgan */ }
    }, 1000);
  };

  const move = async (action: string) => {
    if (!player || !roomId) return;
    setErr("");
    try {
      await api("/pvp-bj/move", { telegramId: player.telegramId, roomId, action });
      sfx.select();
    } catch (e) { setErr((e as Error).message); }
  };

  const forfeit = async () => {
    if (!player || !roomId) return;
    await api("/pvp-bj/forfeit", { telegramId: player.telegramId, roomId }).catch(() => {});
  };

  const BG = pageBg(theme);

  if (status === "idle" || status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: BG }}>
        <GameHeader icon="cardback" title=" LIVE PVP · BLACKJACK" subtitle="21 · haqiqiy raqib" />
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
              <p className="font-black text-lg" style={{ color: "#38bdf8" }}>21</p>
              <p style={{ fontSize: 10, color: ts.textSub }}>O'YIN</p>
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
                      background: "linear-gradient(160deg,#1a1f6b,#0a0a3b)",
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
              <li>• Har ikki o'yinchiga 2 tadan qarta beriladi.</li>
              <li>• Navbat bilan HIT (qarta olish) yoki STAND (to'xtash) tanlanadi.</li>
              <li>• 21 dan oshirib yuborsangiz — avtomatik yutqazasiz (BUST).</li>
              <li>• Ikkalasi ham to'xtaganda — 21ga yaqinroq raqam yutadi.</li>
              <li>• Durrang bo'lsa — ikkala tikish qaytariladi.</li>
              <li>• 30 soniya ichida harakat qilmasa — avtomatik STAND bo'ladi.</li>
              <li>• Yutuq: ikki tikish summasi, uy ulushi 8%.</li>
            </ul>
          </div>

          <button onClick={() => nav("/")} className="rounded-xl py-3 font-black"
            style={{ fontSize: 12, background: "rgba(255,255,255,.07)", color: ts.textSub }}>ORQAGA</button>
        </div>
      </div>
    );
  }

  const v = view;
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: BG }}>
      <GameHeader icon="cardback" title=" BLACKJACK PVP" subtitle={v ? `${v.stake.toLocaleString()} · ${v.foeName}` : "..."} />
      <div className="flex-1 px-3 pb-6 flex flex-col gap-3">

        {!v && <p className="text-center font-bold" style={{ color: ts.textSub }}>Stol yuklanmoqda...</p>}

        {v && (
          <>
            <div className="flex items-center justify-between rounded-2xl px-3 py-2"
              style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
              <span className="font-black" style={{ fontSize: 12, color: "#fff" }}>{v.foeName}</span>
              <span style={{ fontSize: 11, fontWeight: 900, color: v.foeBust ? "#f87171" : "#f7c948" }}>
                {v.foeBust ? "BUST" : v.foeStand || v.winner ? (v.foeScore ?? "?") : "?"}
              </span>
            </div>

            <div className="rounded-3xl p-3 min-h-[130px] flex flex-col items-center justify-center gap-2"
              style={{
                background: "radial-gradient(circle at 50% 20%, #1a1f6b, #05051f 70%)",
                border: `1px solid ${ts.cardBorder}`,
                boxShadow: "inset 0 0 60px rgba(0,0,0,.6)",
              }}>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {v.foeHand.map((c, i) => (
                  <PlayingCard key={i} suit={c.s} value={RANK_LABEL[c.r]} w={42} delay={i * 60} />
                ))}
                {Array.from({ length: Math.max(0, v.foeCount - v.foeHand.length) }).map((_, i) => (
                  <PlayingCard key={`h${i}`} suit="♠" value="A" hidden w={42} />
                ))}
              </div>
              <p className="text-center font-black" style={{ fontSize: 11, color: v.myTurn ? "#4ade80" : "#f7c948" }}>
                {v.winner ? (v.winner === "me" ? "SIZ YUTDINGIZ!" : v.winner === "draw" ? "DURRANG" : "Yutqazdingiz") : v.myTurn ? "Sizning navbatingiz" : "Raqib o'ylayapti..."}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 rounded-2xl p-3"
              style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {v.myHand.map((c, i) => (
                  <PlayingCard key={i} suit={c.s} value={RANK_LABEL[c.r]} w={48} delay={i * 60} />
                ))}
              </div>
              <p className="font-black" style={{ fontSize: 14, color: v.iBust ? "#f87171" : "#fff" }}>
                Ballaringiz: {v.myScore}{v.iBust ? " (BUST)" : ""}
              </p>
            </div>

            {!v.winner ? (
              <div className="grid grid-cols-2 gap-2">
                <button disabled={!v.myTurn || v.iStand || v.iBust} onClick={() => move("hit")}
                  className="rounded-xl py-3 font-black active:scale-95"
                  style={{ fontSize: 13, background: "linear-gradient(160deg,#f7e59b,#d4af37)", color: "#1a1200", opacity: v.myTurn && !v.iStand && !v.iBust ? 1 : 0.45 }}>
                  HIT (OLISH)
                </button>
                <button disabled={!v.myTurn || v.iStand || v.iBust} onClick={() => move("stand")}
                  className="rounded-xl py-3 font-black active:scale-95"
                  style={{ fontSize: 13, background: "rgba(34,197,94,.2)", color: "#4ade80", opacity: v.myTurn && !v.iStand && !v.iBust ? 1 : 0.45 }}>
                  STAND (TO'XTASH)
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
