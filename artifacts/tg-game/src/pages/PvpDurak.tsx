import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg } from "@/lib/theme-context";
import { sfx } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import PlayingCard from "@/components/casino/PlayingCard";

/**
 * LIVE DURAK STOLI — 2, 3 yoki 4 kishi. Kartalar yirik va to'liq ko'rinadi.
 * Barcha qoidalar serverda (api-server/src/lib/durak.ts), bu sahifa faqat ko'rsatadi.
 */

type Suit = "♠" | "♥" | "♦" | "♣";
type Card = { r: number; s: Suit };
type Pair = { a: Card; d?: Card };
type SeatInfo = { name: string; photo: string | null; id: string } | null;

type Foe = {
  seat: number;
  cards: number;
  out: boolean;
  isAttacker: boolean;
  isDefender: boolean;
  isTurn: boolean;
};

type View = {
  roomId: string;
  stake: number;
  max: number;
  prize: number;
  seats: SeatInfo[];
  mySeat: number;
  started: boolean;
  trump?: Suit;
  trumpCard?: Card | null;
  deckLeft?: number;
  myHand?: Card[];
  foes?: Foe[];
  table?: Pair[];
  iAmAttacker?: boolean;
  iAmDefender?: boolean;
  myTurn?: boolean;
  canPass?: boolean;
  finished?: boolean;
  result?: "win" | "lose" | null;
  discard?: number;
  log?: string[];
};

const RANK: Record<number, string> = {
  6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

const api = (p: string, body?: unknown) =>
  fetch(`/api${p}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined,
  ).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error || "Xatolik");
    return j as any;
  });

const money = (n: number) => n.toLocaleString("ru-RU");

function Seat({ info, foe, me }: { info: SeatInfo; foe?: Foe; me?: boolean }) {
  const letter = (info?.name || "P").trim().charAt(0).toUpperCase();
  const active = foe?.isTurn || me;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 66 }}>
      <div style={{ position: "relative" }}>
        {info?.photo ? (
          <img src={info.photo} alt={info.name} style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: `2px solid ${active ? "#ffd85e" : "rgba(255,255,255,0.25)"}` }} />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(150deg,#2f6bff,#7a2fff)", border: `2px solid ${active ? "#ffd85e" : "rgba(255,255,255,0.25)"}`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>
            {letter}
          </div>
        )}
        {foe && (
          <span style={{ position: "absolute", right: -4, bottom: -4, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10, background: "#12161c", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 11, fontWeight: 900, display: "grid", placeItems: "center" }}>
            {foe.cards}
          </span>
        )}
      </div>
      <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, maxWidth: 66, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {info?.name ?? "kutilmoqda"}
      </span>
      <span style={{ color: foe?.isDefender ? "#4ce38a" : "rgba(255,255,255,0.45)", fontSize: 9, fontWeight: 800 }}>
        {foe?.isDefender ? "HIMOYA" : foe?.isAttacker ? "HUJUM" : info ? `ID ${info.id.slice(-5)}` : ""}
      </span>
    </div>
  );
}

export default function PvpDurak() {
  const [loc, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const { theme } = useTheme();

  const roomId = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("room") ?? "";
  const [view, setView] = useState<View | null>(null);
  const [pick, setPick] = useState<Card | null>(null);
  const [err, setErr] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!roomId || !player) { nav("/live"); return; }
    const tick = async () => {
      try {
        const v = await api(`/pvp/state?roomId=${roomId}&telegramId=${player.telegramId}`);
        setView(v);
        if (v.finished && !done.current) { done.current = true; sfx.select(); void refresh?.(); }
      } catch (e: any) { setErr(e?.message || ""); }
    };
    void tick();
    poll.current = setInterval(tick, 1200);
    return () => { if (poll.current) clearInterval(poll.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, player?.telegramId]);

  const move = async (action: string, card?: Card, target?: number) => {
    if (!player) return;
    setErr("");
    try {
      await api("/pvp/move", { roomId, telegramId: player.telegramId, action, card, target });
      sfx.select();
      setPick(null);
    } catch (e: any) { setErr(e?.message || "Xatolik"); }
  };

  const onCard = (c: Card) => {
    if (!view?.started) return;
    if (view.iAmDefender) {
      const idx = (view.table ?? []).findIndex((p) => !p.d);
      if (idx >= 0) void move("defend", c, idx);
      return;
    }
    if (view.iAmAttacker) void move("attack", c);
  };

  const leave = async () => {
    if (player) await api("/pvp/leave", { telegramId: player.telegramId }).catch(() => {});
    nav("/live");
  };

  const foes = view?.foes ?? [];
  const seats = view?.seats ?? [];

  return (
    <div className="min-h-screen pb-28" style={{ background: pageBg(theme) }}>
      <GameHeader
        icon="cardback"
        title="DURAK LIVE"
        subtitle={view ? `#${view.roomId} · ${money(view.stake)} · bank ${money(view.prize)}` : "..."}
      />

      {/* raqiblar */}
      <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 8px" }}>
        {foes.length === 0 && seats.filter((_, i) => i !== view?.mySeat).map((s, i) => (
          <Seat key={i} info={s} />
        ))}
        {foes.map((f) => <Seat key={f.seat} info={seats[f.seat] ?? null} foe={f} />)}
      </div>

      {!view?.started && (
        <div style={{ margin: "18px 14px", padding: 24, borderRadius: 18, textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.16)" }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 15, marginBottom: 6 }}>Raqiblar kutilmoqda</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
            {seats.filter(Boolean).length}/{view?.max ?? 2} o'yinchi · stol to'lganda o'yin boshlanadi
          </div>
          <button onClick={leave} style={{ marginTop: 16, padding: "10px 22px", borderRadius: 12, fontWeight: 900, color: "#fff", background: "rgba(255,255,255,0.1)" }}>
            CHIQISH
          </button>
        </div>
      )}

      {view?.started && (
        <>
          {/* stol */}
          <div
            style={{
              margin: "6px 12px",
              minHeight: 190,
              borderRadius: 20,
              padding: 14,
              background: "radial-gradient(ellipse at 50% 35%, #1f6b8c 0%, #114a63 55%, #0a3346 100%)",
              border: "3px solid #0b2634",
              boxShadow: "inset 0 6px 26px rgba(0,0,0,0.45)",
              display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center",
            }}
          >
            {(view.table ?? []).length === 0 && (
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700 }}>
                {view.iAmAttacker ? "Hujum kartangizni tanlang" : "Hujum kutilmoqda"}
              </span>
            )}
            {(view.table ?? []).map((p, i) => (
              <div key={i} style={{ position: "relative", width: 74, height: 128 }}>
                <div style={{ position: "absolute", left: 0, top: 0 }}>
                  <PlayingCard suit={p.a.s} value={RANK[p.a.r]} w={68} />
                </div>
                {p.d && (
                  <div style={{ position: "absolute", left: 14, top: 22 }}>
                    <PlayingCard suit={p.d.s} value={RANK[p.d.r]} w={68} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* koloda va kozır */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px" }}>
            <PlayingCard suit="♠" value="A" hidden w={44} />
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>
              Koloda: {view.deckLeft ?? 0}
            </div>
            {view.trumpCard && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 800 }}>KOZIR</span>
                <PlayingCard suit={view.trumpCard.s} value={RANK[view.trumpCard.r]} w={44} />
              </div>
            )}
          </div>

          {/* mening qo'lim */}
          <div style={{ padding: "6px 10px" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
              {view.finished
                ? view.result === "win" ? "SIZ YUTDINGIZ" : "SIZ DURAK"
                : view.myTurn ? (view.iAmDefender ? "HIMOYA QILING" : "HUJUM QILING") : "RAQIB O'YLAYAPTI"}
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
              {(view.myHand ?? []).map((c, i) => (
                <button
                  key={`${c.r}${c.s}`}
                  onClick={() => { setPick(c); onCard(c); }}
                  disabled={!view.myTurn || view.finished}
                  style={{
                    flex: "0 0 auto",
                    transform: pick && pick.r === c.r && pick.s === c.s ? "translateY(-10px)" : "none",
                    transition: "transform .15s",
                    opacity: view.myTurn ? 1 : 0.7,
                  }}
                >
                  <PlayingCard suit={c.s} value={RANK[c.r]} w={72} delay={i * 40} />
                </button>
              ))}
            </div>
          </div>

          {/* boshqaruv */}
          <div style={{ display: "flex", gap: 8, padding: "4px 12px" }}>
            {view.iAmDefender && !view.finished && (
              <button
                onClick={() => move("take")}
                style={{ flex: 1, padding: "13px 0", borderRadius: 14, fontWeight: 900, color: "#08120c", background: "linear-gradient(135deg,#ffd85e,#f2a52a)" }}
              >
                OLAMAN
              </button>
            )}
            {view.canPass && !view.finished && (
              <button
                onClick={() => move("pass")}
                style={{ flex: 1, padding: "13px 0", borderRadius: 14, fontWeight: 900, color: "#08120c", background: "linear-gradient(135deg,#4ce38a,#19b45f)" }}
              >
                BITA
              </button>
            )}
            {view.finished && (
              <button
                onClick={() => nav("/live")}
                style={{ flex: 1, padding: "13px 0", borderRadius: 14, fontWeight: 900, color: "#08120c", background: "linear-gradient(135deg,#4ce38a,#19b45f)" }}
              >
                LOBBIGA QAYTISH
              </button>
            )}
          </div>
        </>
      )}

      {err && <div style={{ color: "#ff6b6b", fontSize: 12, textAlign: "center", padding: 8 }}>{err}</div>}
      <div style={{ display: "none" }}>{loc}</div>
    </div>
  );
}
