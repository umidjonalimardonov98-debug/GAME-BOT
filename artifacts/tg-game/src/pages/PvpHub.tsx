import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";
import { sfx } from "@/lib/sound";

/**
 * LIVE O'YINLAR LOBBISI — ochiq stollar ro'yxati.
 * Har bir stolda o'rinlar, o'yinchi avatarlari, ID va tikish ko'rinadi.
 * 1 / 2 / 3 / 4 kishilik stol yaratish mumkin. Emoji ishlatilmaydi.
 */

type Seat = { name: string; photo: string | null; id: string } | null;
type Room = {
  id: string;
  stake: number;
  max: number;
  started: boolean;
  finished: boolean;
  prize: number;
  seats: Seat[];
};

const GAMES = [
  { key: "durak", title: "DURAK", path: "/pvp", cfg: "/pvp/config", list: "/pvp/rooms" },
  { key: "blackjack", title: "BLACKJACK", path: "/pvp-blackjack", cfg: "/pvp-bj/config", list: "" },
  { key: "poker", title: "TEXAS POKER", path: "/pvp-poker", cfg: "/pvp-poker/config", list: "" },
] as const;

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

function Avatar({ seat, size = 42 }: { seat: Seat; size?: number }) {
  if (!seat) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          border: "2px dashed rgba(255,255,255,0.28)",
          display: "grid", placeItems: "center",
          color: "rgba(255,255,255,0.4)", fontSize: size * 0.4, fontWeight: 900,
        }}
      >
        +
      </div>
    );
  }
  const letter = (seat.name || "P").trim().charAt(0).toUpperCase();
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {seat.photo ? (
        <img
          src={seat.photo}
          alt={seat.name}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #38d47a" }}
        />
      ) : (
        <div
          style={{
            width: size, height: size, borderRadius: "50%",
            background: "linear-gradient(150deg,#2f6bff,#7a2fff)",
            border: "2px solid #38d47a",
            display: "grid", placeItems: "center",
            color: "#fff", fontWeight: 900, fontSize: size * 0.42,
          }}
        >
          {letter}
        </div>
      )}
    </div>
  );
}

export default function PvpHub() {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const { theme } = useTheme();

  const [tab, setTab] = useState<(typeof GAMES)[number]["key"]>("durak");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cfg, setCfg] = useState<{ stakes: number[]; maxOptions: number[]; online: number } | null>(null);
  const [stake, setStake] = useState(10000);
  const [max, setMax] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const game = GAMES.find((g) => g.key === tab)!;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const c = await api(game.cfg);
        if (!alive) return;
        setCfg({ stakes: c.stakes ?? [5000, 10000, 25000, 50000, 100000], maxOptions: c.maxOptions ?? [2, 3, 4], online: c.online ?? 0 });
        if (c.stakes?.length && !c.stakes.includes(stake)) setStake(c.stakes[1] ?? c.stakes[0]);
      } catch { /* ignore */ }
      if (!game.list) { setRooms([]); return; }
      try {
        const r = await api(game.list);
        if (alive) setRooms(r.rooms ?? []);
      } catch { /* ignore */ }
    };
    void load();
    const t = window.setInterval(load, 3000);
    return () => { alive = false; window.clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const create = async () => {
    if (!player || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await api("/pvp/create", {
        telegramId: player.telegramId,
        name: player.firstName ?? "O'yinchi",
        photo: (player as any).photoUrl ?? null,
        stake, max,
      });
      sfx.select();
      nav(`${game.path}?room=${r.roomId}`);
    } catch (e: any) { setErr(e?.message || "Xatolik"); }
    setBusy(false);
  };

  const join = async (room: Room) => {
    if (!player || busy) return;
    setBusy(true); setErr("");
    try {
      await api("/pvp/join", {
        telegramId: player.telegramId,
        name: player.firstName ?? "O'yinchi",
        photo: (player as any).photoUrl ?? null,
        roomId: room.id,
      });
      sfx.select();
      nav(`${game.path}?room=${room.id}`);
    } catch (e: any) { setErr(e?.message || "Xatolik"); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: pageBg(theme) }}>
      <GameHeader icon="cardback" title="LIVE O'YINLAR" subtitle={`Onlayn: ${cfg?.online ?? 0}`} />

      {/* o'yin tanlash */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", overflowX: "auto" }}>
        {GAMES.map((g) => (
          <button
            key={g.key}
            onClick={() => { sfx.select(); setTab(g.key); }}
            style={{
              flex: "0 0 auto", padding: "9px 16px", borderRadius: 12,
              fontWeight: 900, fontSize: 13, letterSpacing: "0.04em",
              color: tab === g.key ? "#08120c" : "rgba(255,255,255,0.75)",
              background: tab === g.key ? "linear-gradient(135deg,#4ce38a,#19b45f)" : "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {g.title}
          </button>
        ))}
      </div>

      {/* stol yaratish */}
      <div style={{ margin: "4px 12px 14px", padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, marginBottom: 10, letterSpacing: "0.05em" }}>YANGI STOL</div>

        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 6 }}>NECHA KISHILIK</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(cfg?.maxOptions ?? [2, 3, 4]).map((m) => (
            <button
              key={m}
              onClick={() => { sfx.select(); setMax(m); }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 900, fontSize: 14,
                color: max === m ? "#08120c" : "#fff",
                background: max === m ? "linear-gradient(135deg,#ffd85e,#f2a52a)" : "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 6 }}>TIKISH</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
          {(cfg?.stakes ?? []).map((s) => (
            <button
              key={s}
              onClick={() => { sfx.select(); setStake(s); }}
              style={{
                flex: "0 0 auto", padding: "9px 14px", borderRadius: 12, fontWeight: 900, fontSize: 13,
                color: stake === s ? "#08120c" : "#fff",
                background: stake === s ? "linear-gradient(135deg,#4ce38a,#19b45f)" : "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {money(s)}
            </button>
          ))}
        </div>

        <button
          onClick={create}
          disabled={busy || !player || !game.list}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 14, fontWeight: 900, fontSize: 15,
            color: "#08120c", background: "linear-gradient(135deg,#4ce38a,#19b45f)",
            opacity: busy || !game.list ? 0.5 : 1, letterSpacing: "0.06em",
          }}
        >
          STOL YARATISH
        </button>
        {!game.list && (
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 8, textAlign: "center" }}>
            Bu o'yin tez orada lobbi rejimida
          </div>
        )}
        {err && <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>{err}</div>}
      </div>

      {/* ochiq stollar */}
      <div style={{ padding: "0 12px", color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 8, letterSpacing: "0.08em" }}>
        OCHIQ STOLLAR
      </div>

      {rooms.length === 0 && (
        <div style={{ margin: "0 12px", padding: 22, borderRadius: 16, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)" }}>
          Hozircha ochiq stol yo'q — birinchi bo'lib yarating
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 12px" }}>
        {rooms.map((room) => {
          const taken = room.seats.filter(Boolean).length;
          const mine = !!player && room.seats.some((s) => s?.id === player.telegramId);
          return (
            <div
              key={room.id}
              style={{
                borderRadius: 16, padding: 12,
                background: "linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))",
                border: `1px solid ${room.started ? "rgba(255,216,94,0.4)" : "rgba(76,227,138,0.35)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>#{room.id}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 8,
                    color: room.started ? "#4a3200" : "#08120c",
                    background: room.started ? "#ffd85e" : "#4ce38a",
                  }}>
                    {room.started ? "O'YINDA" : `${taken}/${room.max}`}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#ffd85e", fontWeight: 900, fontSize: 14 }}>{money(room.stake)}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>bank {money(room.prize)}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                {room.seats.map((s, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 58 }}>
                    <Avatar seat={s} />
                    <span style={{ color: s ? "#fff" : "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s ? s.name : "bo'sh"}
                    </span>
                    {s && (
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>ID {s.id.slice(-5)}</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => join(room)}
                disabled={busy || (room.started && !mine)}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 12, fontWeight: 900, fontSize: 14,
                  color: "#08120c",
                  background: mine
                    ? "linear-gradient(135deg,#ffd85e,#f2a52a)"
                    : "linear-gradient(135deg,#4ce38a,#19b45f)",
                  opacity: room.started && !mine ? 0.4 : 1,
                }}
              >
                {mine ? "STOLGA QAYTISH" : room.started ? "BAND" : "QO'SHILISH"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
