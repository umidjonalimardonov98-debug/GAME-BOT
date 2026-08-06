import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GOLD } from "@/lib/theme-context";
import { sfx } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import { Send, Flag, Users } from "lucide-react";
import { imgFx, symFx } from "@/lib/live-fx";

/**
 * DUEL — universal 1x1 PVP sahifasi.
 * Har bir o'yin turi (pick / roll / skill / tiles / count) uchun alohida
 * interaktiv panel. Barcha natijalar serverda hisoblanadi.
 */

type Def = {
  key: string; title: string; sub: string; img: string; emoji: string;
  kind: "pick" | "roll" | "skill" | "tiles" | "count";
  rounds: number; picks: string[] | null;
  tiles: { choose: number; of: number; levels?: number } | null;
  count: "click" | "memory" | null;
  timer: number; rule: string; live: number;
};

type State = {
  roomId: string; stake: number; prize: number; rounds: number; round: number;
  phase: "play" | "reveal" | "done"; msLeft: number;
  myScore: number; foeScore: number; foeName: string;
  submitted: boolean; foeSubmitted: boolean;
  last: { my: number; foe: number; detail: string } | null;
  history: string[];
  winner: "me" | "foe" | "draw" | null;
  chat: { n: number; name: string; text: string; emoji: boolean; at: number }[];
  chatLast: number;
};

const api = (p: string, body?: unknown) =>
  fetch(`/api${p}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined)
    .then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string }).error || "Xatolik");
      return j as any;
    });

const EMOJIS = ["🔥", "😂", "😎", "😱", "👏", "💪", "🍀", "🤝"];

export default function Duel({ gameKey }: { gameKey: string }) {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const { theme, ts } = useTheme();

  const [def, setDef] = useState<Def | null>(null);
  const [stakes, setStakes] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "waiting" | "playing">("idle");
  const [roomId, setRoomId] = useState("");
  const [st, setSt] = useState<State | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<State["chat"]>([]);
  const chatSince = useRef(0);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api("/duel/list").then((d) => {
      setStakes(d.stakes ?? []);
      setDef((d.games ?? []).find((g: Def) => g.key === gameKey) ?? null);
    }).catch(() => {});
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [gameKey]);

  /* ── matchmaking ── */
  const join = async (stake: number) => {
    if (!player) return;
    setErr("");
    try {
      const r = await api("/duel/queue", {
        telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", game: gameKey, stake,
      });
      sfx.select();
      if (r.status === "matched") start(r.roomId);
      else { setStatus("waiting"); waitLoop(stake); }
    } catch (e) { setErr((e as Error).message); }
  };

  const waitLoop = (stake: number) => {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      if (!player) return;
      try {
        const r = await api("/duel/queue", {
          telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", game: gameKey, stake,
        });
        if (r.status === "matched") start(r.roomId);
      } catch { /* kutamiz */ }
    }, 2000);
  };

  const cancel = async () => {
    if (poll.current) clearInterval(poll.current);
    if (player) await api("/duel/cancel", { telegramId: player.telegramId }).catch(() => {});
    setStatus("idle");
  };

  const start = (rid: string) => {
    setRoomId(rid); setStatus("playing"); setChat([]); chatSince.current = 0;
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(() => tick(rid), 900);
    tick(rid);
  };

  const tick = async (rid: string) => {
    if (!player) return;
    try {
      const s: State = await api(`/duel/state?telegramId=${player.telegramId}&roomId=${rid}&chatSince=${chatSince.current}`);
      setSt(s);
      if (s.chat?.length) {
        chatSince.current = s.chatLast;
        setChat((p) => [...p, ...s.chat].slice(-40));
      }
      if (s.winner) {
        if (poll.current) clearInterval(poll.current);
        if (s.winner === "me") sfx.win(true); else if (s.winner === "foe") sfx.lose();
        refresh();
      }
    } catch { /* xona yopilgan */ }
  };

  const submit = async (value: number, picks?: number[]) => {
    if (!player || !roomId) return;
    sfx.click();
    await api("/duel/submit", { telegramId: player.telegramId, roomId, value, picks }).catch(() => {});
    tick(roomId);
  };

  const sendChat = async (text: string, emoji = false) => {
    if (!player || !roomId || !text.trim()) return;
    await api("/duel/chat", { telegramId: player.telegramId, roomId, text: text.trim(), emoji }).catch(() => {});
    setMsg("");
    tick(roomId);
  };

  const forfeit = async () => {
    if (!player || !roomId) return;
    await api("/duel/forfeit", { telegramId: player.telegramId, roomId }).catch(() => {});
    tick(roomId);
  };

  if (!def) {
    return (
      <div className="min-h-screen" style={{ background: pageBg(theme) }}>
        <GameHeader title="DUEL" />
        <p className="text-center mt-20 font-bold" style={{ color: ts.textSub }}>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: pageBg(theme) }}>
      <GameHeader title={def.title.toUpperCase()} subtitle={def.sub} />

      {status === "idle" && (
        <Lobby def={def} stakes={stakes} onJoin={join} err={err} ts={ts} onBack={() => nav("/live")} />
      )}

      {status === "waiting" && (
        <div className="mx-4 mt-10 rounded-3xl p-6 text-center"
          style={{ background: ts.card, border: `1px solid ${GOLD.border}` }}>
          <div className="text-5xl mb-3 animate-bounce">{def.emoji}</div>
          <p className="font-black text-lg" style={{ color: "#fff" }}>Raqib qidirilmoqda...</p>
          <p className="text-xs font-bold mt-1" style={{ color: ts.textSub }}>Tezkor matchmaking ishlayapti</p>
          <div className="flex justify-center gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full"
                style={{ background: GOLD.light, animation: `pulse 1s ${i * 0.15}s infinite` }} />
            ))}
          </div>
          <button onClick={cancel} className="mt-5 px-5 py-2.5 rounded-2xl font-black active:scale-95 transition"
            style={{ background: ts.btnSecondary, color: ts.btnSecondaryText }}>Bekor qilish</button>
        </div>
      )}

      {status === "playing" && st && (
        <>
          <Scoreboard st={st} def={def} me={player?.firstName ?? "Siz"} ts={ts} />
          <Arena def={def} st={st} onSubmit={submit} />
          {st.winner && (
            <div className="mx-4 mt-3 rounded-3xl p-5 text-center"
              style={{
                background: st.winner === "me" ? "linear-gradient(135deg,#0a5c3a,#14b87a)" : st.winner === "draw" ? "#3a3a3a" : "linear-gradient(135deg,#5c0a0a,#b81414)",
                border: `1px solid ${GOLD.border}`,
              }}>
              <p className="font-black text-2xl" style={{ color: "#fff" }}>
                {st.winner === "me" ? "🏆 SIZ YUTDINGIZ!" : st.winner === "draw" ? "🤝 DURANG" : "😔 YUTQAZDINGIZ"}
              </p>
              <p className="font-bold text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                {st.winner === "me" ? `+${st.prize.toLocaleString()} UZS` : st.winner === "draw" ? "Pul qaytarildi" : `-${st.stake.toLocaleString()} UZS`}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => { setStatus("idle"); setSt(null); }}
                  className="px-5 py-2.5 rounded-2xl font-black active:scale-95 transition"
                  style={{ background: GOLD.grad, color: "#1a1200" }}>Yana o'ynash</button>
                <button onClick={() => nav("/live")}
                  className="px-5 py-2.5 rounded-2xl font-black active:scale-95 transition"
                  style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}>Arena</button>
              </div>
            </div>
          )}

          {/* O'yin ichidagi chat */}
          <div className="mx-4 mt-3 rounded-3xl p-3" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => sendChat(e, true)}
                  className="w-8 h-8 rounded-xl text-base active:scale-90 transition"
                  style={{ background: "rgba(255,255,255,0.07)" }}>{e}</button>
              ))}
            </div>
            <div className="max-h-28 overflow-y-auto flex flex-col gap-1 mb-2">
              {chat.length === 0 && <p className="text-[11px] font-bold" style={{ color: ts.textSub }}>Raqib bilan yozishing 💬</p>}
              {chat.map((c) => (
                <p key={c.n} className="text-[11px] font-bold" style={{ color: "#fff" }}>
                  <span style={{ color: GOLD.light }}>{c.name}:</span> <span style={{ fontSize: c.emoji ? 16 : 11 }}>{c.text}</span>
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={msg} onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat(msg)}
                placeholder="Xabar..." maxLength={160}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: ts.input, border: `1px solid ${ts.inputBorder}`, color: "#fff" }} />
              <button onClick={() => sendChat(msg)} className="px-3 rounded-xl active:scale-90 transition"
                style={{ background: GOLD.grad }}><Send size={16} color="#1a1200" /></button>
              {!st.winner && (
                <button onClick={forfeit} className="px-3 rounded-xl active:scale-90 transition"
                  style={{ background: "rgba(239,68,68,0.85)" }}><Flag size={16} color="#fff" /></button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────── LOBBY ─────────── */
function Lobby({ def, stakes, onJoin, err, ts, onBack }: any) {
  return (
    <div className="px-4 pt-3">
      {/* O'yin surati — to'liq va jonli */}
      <div className="rounded-3xl overflow-hidden relative mb-4 mx-auto"
        style={{ border: `1px solid ${GOLD.border}`, maxWidth: 340, boxShadow: "0 14px 40px rgba(0,0,0,0.45)" }}>
        <div className={`lfx ${imgFx(def.key)} w-full`} style={{ aspectRatio: "1 / 1" }}>
          <img src={def.img} alt={def.title} />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.06) 50%,rgba(0,0,0,0.88))" }} />
        <span className={`absolute left-1/2 -translate-x-1/2 ${symFx(def.key)}`}
          style={{ top: "38%", fontSize: 54, filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.8))" }}>{def.emoji}</span>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-black text-xl" style={{ color: "#fff" }}>{def.title}</p>
          <p className="font-bold text-[11px]" style={{ color: "rgba(255,255,255,0.82)" }}>{def.rule}</p>
        </div>
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full font-black"
          style={{ fontSize: 9, background: "rgba(16,185,129,0.9)", color: "#fff" }}>{def.live} 🟢 online</span>
      </div>

      {/* TIKISH MIQDORI — toza, bir xil o'lchamli kartalar */}
      <div className="rounded-3xl p-3" style={{ background: ts.card, border: `1px solid ${GOLD.border}` }}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="font-black" style={{ fontSize: 11, color: GOLD.light, letterSpacing: "0.1em" }}>TIKISH MIQDORI</p>
          <span className="font-bold px-2 py-0.5 rounded-full"
            style={{ fontSize: 9, color: "#34d399", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
            g'olibga 92%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stakes.map((s: number, i: number) => (
            <button key={s} onClick={() => onJoin(s)}
              className={`rounded-2xl active:scale-95 transition ${i === stakes.length - 1 && stakes.length % 2 === 1 ? "col-span-2" : ""}`}
              style={{
                background: "linear-gradient(160deg,rgba(255,255,255,0.06),rgba(0,0,0,0.25))",
                border: `1px solid ${GOLD.border}`,
                padding: "12px 10px",
              }}>
              <span className="flex items-center justify-center gap-1.5">
                <span className="font-black" style={{ fontSize: 15, color: GOLD.light }}>{s.toLocaleString()}</span>
                <span className="font-bold" style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>UZS</span>
              </span>
              <span className="block text-center font-bold mt-0.5" style={{ fontSize: 9, color: "#34d399" }}>
                + {Math.floor(s * 2 * 0.92).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {err && <p className="text-center mt-3 text-sm font-bold" style={{ color: "#ff6b6b" }}>{err}</p>}
      <button onClick={onBack} className="w-full mt-4 mb-4 py-3 rounded-2xl font-black active:scale-95 transition"
        style={{ background: ts.btnSecondary, color: ts.btnSecondaryText }}>← LIVE arenaga qaytish</button>
    </div>
  );
}

/* ─────────── SCOREBOARD ─────────── */
function Scoreboard({ st, def, me, ts }: any) {
  const sec = Math.ceil(st.msLeft / 1000);
  return (
    <div className="mx-4 mt-3 rounded-3xl p-3" style={{ background: ts.card, border: `1px solid ${GOLD.border}` }}>
      <div className="flex items-center justify-between">
        <Side name={me} score={st.myScore} ok={st.submitted} mine />
        <div className="text-center">
          <p className="font-black" style={{ fontSize: 10, color: GOLD.light }}>
            RAUND {Math.min(st.round + 1, st.rounds)} / {st.rounds}
          </p>
          <p className="font-black text-2xl" style={{ color: "#fff" }}>{sec}s</p>
          <p className="font-bold" style={{ fontSize: 9, color: ts.textSub }}>bank {(st.prize).toLocaleString()}</p>
        </div>
        <Side name={st.foeName} score={st.foeScore} ok={st.foeSubmitted} />
      </div>
      {st.last && (
        <div className="mt-2 pt-2 text-center" style={{ borderTop: `1px solid ${ts.cardBorder}` }}>
          <p className="font-black text-sm" style={{ color: st.last.my > st.last.foe ? "#34d399" : st.last.my < st.last.foe ? "#f87171" : "#fbbf24" }}>
            {st.last.my} : {st.last.foe} — {st.last.detail}
          </p>
        </div>
      )}
    </div>
  );
}

function Side({ name, score, ok, mine }: { name: string; score: number; ok: boolean; mine?: boolean }) {
  return (
    <div className="text-center" style={{ width: 92 }}>
      <div className="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black"
        style={{ background: mine ? "linear-gradient(135deg,#0d4fb0,#1668e3)" : "linear-gradient(135deg,#7a1010,#c62828)", color: "#fff" }}>
        {(name || "?").slice(0, 2).toUpperCase()}
      </div>
      <p className="font-black truncate mt-1" style={{ fontSize: 11, color: "#fff" }}>{name}</p>
      <p className="font-black text-lg" style={{ color: GOLD.light }}>{score}</p>
      <p className="font-bold" style={{ fontSize: 8, color: ok ? "#34d399" : "rgba(255,255,255,0.4)" }}>
        {ok ? "✓ tayyor" : "kutilmoqda"}
      </p>
    </div>
  );
}

/* ─────────── ARENA (o'yin turi bo'yicha) ─────────── */
function Arena({ def, st, onSubmit }: { def: Def; st: State; onSubmit: (v: number, p?: number[]) => void }) {
  const locked = st.phase !== "play" || st.submitted || !!st.winner;
  if (def.kind === "pick") return <PickArena def={def} locked={locked} onSubmit={onSubmit} />;
  if (def.kind === "roll") return <RollArena def={def} locked={locked} onSubmit={onSubmit} />;
  if (def.kind === "skill") return <SkillArena def={def} locked={locked} onSubmit={onSubmit} />;
  if (def.kind === "tiles") return <TilesArena def={def} locked={locked} onSubmit={onSubmit} />;
  if (def.count === "click") return <ClickArena locked={locked} onSubmit={onSubmit} />;
  return <MemoryArena locked={locked} onSubmit={onSubmit} />;
}

const shell = { background: "rgba(0,0,0,0.32)", border: `1px solid ${GOLD.border}` };

function PickArena({ def, locked, onSubmit }: any) {
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { if (!locked) setSel(null); }, [locked]);
  return (
    <div className="mx-4 mt-3 rounded-3xl p-4" style={shell}>
      <p className="text-center font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{def.rule}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(def.picks.length, 3)},1fr)` }}>
        {def.picks.map((p: string, i: number) => (
          <button key={p} disabled={locked}
            onClick={() => { setSel(i); onSubmit(i); }}
            className="py-4 rounded-2xl font-black active:scale-95 transition disabled:opacity-45"
            style={{
              background: sel === i ? GOLD.grad : "rgba(255,255,255,0.08)",
              color: sel === i ? "#1a1200" : "#fff",
              border: `1px solid ${GOLD.border}`,
            }}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function RollArena({ def, locked, onSubmit }: any) {
  const [spin, setSpin] = useState(false);
  return (
    <div className="mx-4 mt-3 rounded-3xl p-6 text-center" style={shell}>
      <div className="text-6xl mb-3" style={{ transition: "transform .6s", transform: spin ? "rotate(720deg) scale(1.15)" : "none" }}>
        {def.emoji}
      </div>
      <p className="font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{def.rule}</p>
      <button disabled={locked}
        onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 700); onSubmit(1); }}
        className="px-8 py-3.5 rounded-2xl font-black active:scale-95 transition disabled:opacity-45"
        style={{ background: GOLD.grad, color: "#1a1200" }}>
        {locked ? "KUTILMOQDA..." : "TASHLASH"}
      </button>
    </div>
  );
}

/** Harakatlanuvchi chiziq — markazga yaqin to'xtatsa ko'p ochko */
function SkillArena({ def, locked, onSubmit }: any) {
  const [pos, setPos] = useState(0);
  const [stopped, setStopped] = useState<number | null>(null);
  const raf = useRef<number>(0);
  const t0 = useRef(Date.now());

  useEffect(() => {
    if (locked) return;
    setStopped(null);
    const loop = () => {
      const t = (Date.now() - t0.current) / 900;
      setPos(Math.abs((t % 2) - 1));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [locked]);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    const acc = 1 - Math.abs(pos - 0.5) * 2; // 0..1
    setStopped(acc);
    onSubmit(Math.max(0, acc));
  };

  return (
    <div className="mx-4 mt-3 rounded-3xl p-5" style={shell}>
      <p className="text-center font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{def.rule}</p>
      <div className="relative h-8 rounded-full overflow-hidden mb-4"
        style={{ background: "linear-gradient(90deg,#7f1d1d,#f59e0b,#16a34a,#f59e0b,#7f1d1d)" }}>
        <div className="absolute top-0 bottom-0 w-1.5 rounded"
          style={{ left: `calc(${pos * 100}% - 3px)`, background: "#fff", boxShadow: "0 0 12px #fff" }} />
      </div>
      <button disabled={locked} onClick={stop}
        className="w-full py-3.5 rounded-2xl font-black active:scale-95 transition disabled:opacity-45"
        style={{ background: GOLD.grad, color: "#1a1200" }}>
        {stopped !== null ? `Aniqlik: ${Math.round(stopped * 100)}%` : locked ? "KUTILMOQDA..." : "TO'XTATISH"}
      </button>
    </div>
  );
}

function TilesArena({ def, locked, onSubmit }: any) {
  const levels = def.tiles.levels as number | undefined;
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => { if (!locked) setSel([]); }, [locked]);

  if (levels) {
    return (
      <div className="mx-4 mt-3 rounded-3xl p-4" style={shell}>
        <p className="text-center font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{def.rule}</p>
        {Array.from({ length: levels }).map((_, lv) => (
          <div key={lv} className="grid grid-cols-3 gap-1.5 mb-1.5">
            {Array.from({ length: def.tiles.of }).map((__, i) => (
              <button key={i} disabled={locked}
                onClick={() => setSel((p) => { const n = [...p]; n[levels - 1 - lv] = i; return n; })}
                className="py-2.5 rounded-xl font-black text-sm active:scale-95 transition disabled:opacity-45"
                style={{
                  background: sel[levels - 1 - lv] === i ? GOLD.grad : "rgba(255,255,255,0.07)",
                  color: sel[levels - 1 - lv] === i ? "#1a1200" : "#fff",
                }}>🚪</button>
            ))}
          </div>
        ))}
        <button disabled={locked || sel.filter((x) => x !== undefined).length < levels}
          onClick={() => onSubmit(0, sel)}
          className="w-full mt-2 py-3 rounded-2xl font-black disabled:opacity-45"
          style={{ background: GOLD.grad, color: "#1a1200" }}>TASDIQLASH</button>
      </div>
    );
  }

  const choose = def.tiles.choose as number;
  return (
    <div className="mx-4 mt-3 rounded-3xl p-4" style={shell}>
      <p className="text-center font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
        {def.rule} ({sel.length}/{choose})
      </p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: def.tiles.of }).map((_, i) => (
          <button key={i} disabled={locked}
            onClick={() => setSel((p) => p.includes(i) ? p.filter((x) => x !== i) : p.length < choose ? [...p, i] : p)}
            className="aspect-square rounded-xl font-black text-lg active:scale-95 transition disabled:opacity-45"
            style={{ background: sel.includes(i) ? GOLD.grad : "rgba(255,255,255,0.07)" }}>
            {sel.includes(i) ? "💎" : "?"}
          </button>
        ))}
      </div>
      <button disabled={locked || sel.length < choose} onClick={() => onSubmit(0, sel)}
        className="w-full mt-3 py-3 rounded-2xl font-black disabled:opacity-45"
        style={{ background: GOLD.grad, color: "#1a1200" }}>OCHISH</button>
    </div>
  );
}

function ClickArena({ locked, onSubmit }: any) {
  const [n, setN] = useState(0);
  const [left, setLeft] = useState(10);
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!run) return;
    const iv = setInterval(() => setLeft((l) => {
      if (l <= 1) { clearInterval(iv); setRun(false); onSubmit(nRef.current); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const nRef = useRef(0);
  const hit = () => { nRef.current += 1; setN(nRef.current); };

  return (
    <div className="mx-4 mt-3 rounded-3xl p-5 text-center" style={shell}>
      <p className="font-black text-4xl" style={{ color: GOLD.light }}>{n}</p>
      <p className="font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{left} soniya qoldi</p>
      {!run ? (
        <button disabled={locked} onClick={() => { nRef.current = 0; setN(0); setLeft(10); setRun(true); }}
          className="w-full py-3.5 rounded-2xl font-black disabled:opacity-45"
          style={{ background: GOLD.grad, color: "#1a1200" }}>BOSHLASH</button>
      ) : (
        <button onClick={hit} className="w-full py-10 rounded-3xl font-black text-2xl active:scale-95 transition"
          style={{ background: "linear-gradient(135deg,#b91c1c,#ef4444)", color: "#fff" }}>⚡ BOS!</button>
      )}
    </div>
  );
}

function MemoryArena({ locked, onSubmit }: any) {
  const deck = useMemo(() => {
    const s = ["🍒", "🔔", "💎", "7️⃣", "🍋", "⭐"];
    return [...s, ...s].sort(() => Math.random() - 0.5);
  }, []);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const t0 = useRef(Date.now());
  const sent = useRef(false);

  useEffect(() => {
    if (done.length === deck.length && !sent.current) {
      sent.current = true;
      onSubmit(Math.max(0, 60000 - (Date.now() - t0.current)));
    }
  }, [done, deck.length, onSubmit]);

  const flip = (i: number) => {
    if (locked || open.includes(i) || done.includes(i) || open.length === 2) return;
    const nx = [...open, i];
    setOpen(nx);
    if (nx.length === 2) {
      const [a, b] = nx;
      if (deck[a!] === deck[b!]) { setDone((d) => [...d, a!, b!]); setOpen([]); }
      else setTimeout(() => setOpen([]), 650);
    }
  };

  return (
    <div className="mx-4 mt-3 rounded-3xl p-4" style={shell}>
      <p className="text-center font-bold mb-3" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
        Juftliklarni tez toping — qolgan vaqt ochko bo'ladi
      </p>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((c, i) => {
          const vis = open.includes(i) || done.includes(i);
          return (
            <button key={i} onClick={() => flip(i)}
              className="aspect-square rounded-xl text-2xl font-black active:scale-95 transition"
              style={{
                background: vis ? GOLD.grad : "rgba(255,255,255,0.08)",
                transform: vis ? "rotateY(0deg)" : "rotateY(0deg)",
              }}>{vis ? c : "🂠"}</button>
          );
        })}
      </div>
    </div>
  );
}
