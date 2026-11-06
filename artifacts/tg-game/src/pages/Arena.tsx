import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { sfx } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import SmartImage from "@/components/SmartImage";
import Sym from "@/components/casino/Sym";
import Dice3D from "@/components/casino/Dice3D";
import PlayingCard, { type Suit } from "@/components/casino/PlayingCard";
import StageFx from "@/components/casino/StageFx";
import { Ambient } from "@/components/casino/GameAtmosphere";
import { Horse, ArmWrestle } from "@/components/casino/LiveSport2";
import { AimPanel, FightPanel, FightReplay } from "@/components/casino/LiveSport";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, RefreshCw, Users, Clock3, Coins } from "lucide-react";
import { countdownGroups, sortGroups, type Group, type GroupSort } from "@/lib/arena-groups";

/**
 * ARENA — 2–4 kishilik LIVE o'yinlar.
 * Lobbi → kutish (o'rinlar to'ladi) → raundlar → natija (podium, yutuq).
 * Barcha natija serverda; mijoz faqat harakat yuboradi va chiroyli ko'rsatadi.
 * Emoji yo'q: belgilar — haqiqiy suratlar, emotsiyalar — chizilgan stikerlar.
 */

export type ArenaDef = {
  key: string; title: string; sub: string; img: string;
  kind: "pick" | "roll" | "skill" | "tap" | "reaction" | "tiles";
  rounds: number; timer: number; rule: string; picks?: string[];
  tiles?: { choose: number; of: number }; color: string; action: string; live: number;
};
type ArenaList = { stakes: number[]; rake: number; min: number; max: number; waitMs: number; online: number; games: ArenaDef[] };
type APlayer = { seat: number; name: string; score: number; left: boolean; submitted: boolean };
type AState = {
  roomId: string; stake: number; prize: number; rounds: number; round: number;
  phase: "intro" | "play" | "reveal" | "done"; timer: number; msLeft: number; mySeat: number;
  players: APlayer[]; last: { scores: number[]; detail: string; reveal: any } | null;
  history: string[]; winners: number[] | null; payouts: number[] | null; refund: boolean;
  chat: { n: number; seat: number; name: string; text: string; sticker: boolean; at: number }[]; chatLast: number;
};

const STICKERS = ["laugh", "fire", "clap", "angry", "cry", "win"] as const;
const SEAT_COL = ["#f59e0b", "#3b82f6", "#22c55e", "#ec4899"];
const fmt = (n: number) => (Number(n) || 0).toLocaleString("ru-RU");

const api = (p: string, body?: unknown) =>
  fetch(`/api${p}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined)
    .then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string }).error || "Xatolik");
      return j as any;
    });

let listCache: ArenaList | null = null;
export async function loadArenaList(): Promise<ArenaList> {
  if (listCache) return listCache;
  const l = await api("/arena/list");
  if (l?.games?.length) listCache = l;
  return l;
}

const haptic = (k: "light" | "medium" | "heavy" = "light") => {
  try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(k); } catch { /* ignore */ }
};

/* ════════════════ Umumiy bo'laklar ════════════════ */

function Avatar({ name, seat, size = 40, glow }: { name: string; seat: number; size?: number; glow?: boolean }) {
  return (
    <span className="ar-avatar" style={{ width: size, height: size, fontSize: size * 0.42, ["--c" as any]: SEAT_COL[seat % 4],
      boxShadow: glow ? `0 0 0 2px #fff3b0, 0 0 22px ${SEAT_COL[seat % 4]}` : undefined }}>
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Seats({ st, gained }: { st: AState; gained: number[] | null }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${st.players.length}, minmax(0,1fr))` }}>
      {st.players.map((p, i) => {
        const me = p.seat === st.mySeat;
        const win = st.winners?.includes(i);
        return (
          <div key={i} className={`ar-seat ${me ? "is-me" : ""} ${win ? "is-win" : ""}`} style={{ ["--c" as any]: SEAT_COL[i % 4] }}>
            <Avatar name={p.name} seat={i} size={34} glow={win} />
            <span className="ar-seat-name">{me ? "Siz" : p.name}</span>
            <span className="ar-seat-score">{p.score}</span>
            {gained && gained[i]! > 0 && <span key={`${st.round}-${i}`} className="ar-gain">+{gained[i]}</span>}
            {st.phase === "play" && (
              <span className={`ar-seat-dot ${p.submitted ? "ok" : ""}`}>{p.left ? "chiqdi" : p.submitted ? "tayyor" : "o'ylayapti"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimerBar({ ms, total, color }: { ms: number; total: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (ms / Math.max(1, total)) * 100));
  return (
    <div className="ar-timer"><div style={{ width: `${pct}%`, background: pct < 30 ? "linear-gradient(90deg,#ef4444,#f97316)" : `linear-gradient(90deg,${color},#fff3b0)` }} /></div>
  );
}

/** Uchib chiqadigan stikerlar (emotsiyalar) */
function StickerLayer({ items }: { items: { id: number; seat: number; name: string; key: string }[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {items.map((s) => (
        <div key={s.id} className="ar-sticker-fly" style={{ left: `${12 + (s.seat % 4) * 22}%` }}>
          <img src={`/stickers/${s.key}.png`} alt="" width={84} height={84} />
          <span>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

const mmss = (ms: number) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };


/** O'yin ostidagi ochiq guruhlar — har 3 s yangilanadi */
function OpenGroups({ game, onJoin }: { game: string; color: string; onJoin: (stake: number) => void }) {
  const [data, setData] = useState<{ groups: Group[]; playing: { stake: number; names: string[]; round: number }[] } | null>(null);
  const [sort, setSort] = useState<GroupSort>("time");
  const [descending, setDescending] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const fetchedAt = useRef(Date.now());
  const reload = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    let loading = false;
    setData(null); setError(false);
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const d = await api(`/arena/rooms?game=${encodeURIComponent(game)}`);
        if (alive) { fetchedAt.current = Date.now(); setNow(Date.now()); setData(d); setError(false); }
      } catch { if (alive) setError(true); }
      finally { loading = false; }
    };
    reload.current = () => void load();
    load();
    const iv = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    const tk = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 1000);
    return () => { alive = false; clearInterval(iv); clearInterval(tk); };
  }, [game]);
  const groups = sortGroups(countdownGroups(data?.groups ?? [], Math.max(0, now - fetchedAt.current)), sort, descending);
  const labels = { stake: "Tikish", seats: "Bo'sh joy", time: "Vaqt" };
  return (
    <section className="og-wrap" aria-label="Ochiq guruhlar">
      <header className="og-head"><span>OCHIQ GURUHLAR <span className="og-count">{groups.length}</span></span><Button type="button" variant="ghost" size="icon" className="og-refresh" aria-label="Guruhlarni yangilash" title="Yangilash" onClick={() => reload.current()}><RefreshCw /></Button></header>
      <div className="og-toolbar">
        <div className="og-sort" role="group" aria-label="Guruhlarni saralash">
          {(["stake", "seats", "time"] as const).map((key) => {
            const Icon = key === "stake" ? Coins : key === "seats" ? Users : Clock3;
            return <Button key={key} variant="ghost" size="sm" className="og-sort-option" aria-pressed={sort === key} onClick={() => { setSort(key); setDescending(key === "seats"); }}><Icon />{labels[key]}</Button>;
          })}
        </div>
        <Button variant="ghost" size="icon" className="og-direction" aria-label={descending ? "O'sish tartibida" : "Kamayish tartibida"} title={descending ? "O'sish tartibida" : "Kamayish tartibida"} onClick={() => setDescending((d) => !d)}>{descending ? <ArrowDown /> : <ArrowUp />}</Button>
      </div>
      {error && <p className="og-empty" role="status">Guruhlar yangilanmadi. Qayta urinib ko'ring.</p>}
      {!data && !error && <div className="og-skel" />}
      {data && !groups.length && <p className="og-empty">Hozir ochiq guruh yo'q.</p>}
      {groups.map((g) => (
        <div key={g.stake} className="og-row">
          <div className="og-avatars">
            {Array.from({ length: g.max }, (_, k) => g.names[k]
              ? <Avatar key={k} name={g.names[k] ?? ""} seat={k} size={28} />
              : <span key={k} className="og-free" />)}
          </div>
          <div className="og-info">
            <strong>{fmt(g.stake)} UZS</strong>
            <span>{g.max - g.count} bo'sh joy · {g.startsIn != null ? `${Math.ceil(g.startsIn / 1000)} s da start` : g.expiresIn != null ? `${mmss(g.expiresIn)} qoldi` : ""}</span>
            <small>{g.names[0] ?? "Ochiq guruh"}{g.ownerOnline === false ? " · egasi offline" : ""}</small>
          </div>
          <Button type="button" variant="ghost" size="sm" className="og-join" onClick={() => { sfx.select(); haptic(); onJoin(g.stake); }}>Qo'shilish</Button>
        </div>
      ))}
      {!!data?.playing.length && (
        <div className="og-playing">
          <span className="og-sub">HOZIR O'YNALMOQDA</span>
          {data.playing.slice(0, 4).map((r, i) => (
            <div key={i} className="og-live"><span className="og-dot" />{r.names.join(" · ")}<em>{fmt(r.stake)} · {r.round}-raund</em></div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ════════════════ Harakat panellari (har tur o'zgacha) ════════════════ */

const HORSE = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#f8fafc"];

function PickOption({ def, i, label, on, onClick, disabled }: { def: ArenaDef; i: number; label: string; on: boolean; onClick: () => void; disabled: boolean }) {
  let art: React.ReactNode = null;
  switch (def.key) {
    case "bombbox": art = <Sym n="gift" s={40} />; break;
    case "treasure": art = <Sym n="chest" s={42} />; break;
    case "crasharena": art = <Sym n="rocket" s={32} />; break;
    case "horserace": art = <span className="ar-silk" style={{ background: `linear-gradient(135deg, ${HORSE[i]} 0 50%, #111 50% 100%)` }}>{i + 1}</span>; break;
    case "roulettearena": art = <span className="ar-chip" style={{ background: ["#c1121f", "#111827", "#475569", "#64748b", "#16a34a"][i] }}>{["Q", "Q", "J", "T", "0"][i]}</span>; break;
    case "kurash": art = <span className={`ar-move m${i}`} />; break;
    case "boxing": art = <span className={`ar-glove ${i === 2 ? "block" : i === 0 ? "left" : "right"}`} />; break;
    default: break;
  }
  const isNum = def.key === "uniquenum";
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`ar-pick ${on ? "on" : ""} ${isNum ? "num" : ""}`} style={{ ["--c" as any]: def.color }}>
      {art}
      <span className={isNum ? "ar-num" : "ar-pick-label"}>{label}</span>
    </button>
  );
}

function PickPanel({ def, done, onSubmit }: { def: ArenaDef; done: boolean; onSubmit: (v: number) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const picks = def.picks ?? [];
  const cols = picks.length >= 10 ? 5 : picks.length === 6 ? 3 : picks.length === 5 ? 5 : picks.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {picks.map((p, i) => (
          <PickOption key={i} def={def} i={i} label={p} on={sel === i} disabled={done}
            onClick={() => { sfx.select(); haptic(); setSel(i); }} />
        ))}
      </div>
      <button type="button" className="ar-cta" disabled={done || sel === null} style={{ ["--c" as any]: def.color }}
        onClick={() => sel !== null && onSubmit(sel)}>{done ? "QABUL QILINDI" : def.action}</button>
    </div>
  );
}

function RollPanel({ def, done, onSubmit }: { def: ArenaDef; done: boolean; onSubmit: (v: number) => void }) {
  const art = def.key === "pokerhand" ? "cardback" : def.key === "wheelarena" ? "wheel" : def.key === "eggfight" ? "gift" : "dice";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`ar-roll-art ${done ? "" : "idle"}`}>
        {def.key === "eggfight" ? <span className="ar-egg big" style={{ ["--c" as any]: def.color }} /> : <Sym n={art} s={86} glow />}
      </div>
      <button type="button" className="ar-cta" disabled={done} style={{ ["--c" as any]: def.color }}
        onClick={() => { sfx.dice?.(); haptic("medium"); onSubmit(1); }}>{done ? "BOSHQALAR KUTILMOQDA" : def.action}</button>
    </div>
  );
}

/** Kuch / aniqlik chizig'i — markazda to'xtatish */
function SkillPanel({ def, done, onSubmit }: { def: ArenaDef; done: boolean; onSubmit: (v: number) => void }) {
  const [pos, setPos] = useState(0);
  const [shot, setShot] = useState<number | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    if (done || shot !== null) return;
    const t0 = performance.now();
    const speed = def.key === "dartsarena" ? 1.7 : def.key === "archery" ? 1.35 : 1.1;
    const loop = (t: number) => {
      const x = ((t - t0) / 1000) * speed;
      setPos(0.5 - 0.5 * Math.cos(x * Math.PI));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [done, shot, def.key]);
  const stop = () => {
    if (done || shot !== null) return;
    cancelAnimationFrame(raf.current);
    const acc = Math.max(0, 1 - Math.abs(pos - 0.5) * 2);
    setShot(acc); haptic("heavy"); sfx.fly?.();
    onSubmit(Number(acc.toFixed(3)));
  };
  const target = def.key === "basketball" ? "ar-hoop" : def.key === "archery" ? "ar-bow" : "ar-board";
  return (
    <div className="flex flex-col gap-3 items-center">
      <div className={`ar-skill-stage ${target}`}>
        <span className="ar-skill-target" />
        <span className="ar-skill-projectile" style={{ left: `${pos * 100}%`, opacity: shot !== null ? 0 : 1 }} />
        {shot !== null && <span className="ar-skill-hit" style={{ left: `${pos * 100}%` }} />}
      </div>
      <div className="ar-meter" style={{ ["--c" as any]: def.color }}>
        <span className="ar-meter-zone" />
        <span className="ar-meter-needle" style={{ left: `${pos * 100}%` }} />
      </div>
      {shot !== null && <p className="ar-note">Aniqlik: {Math.round(shot * 100)}%</p>}
      <button type="button" className="ar-cta" disabled={done || shot !== null} style={{ ["--c" as any]: def.color }} onClick={stop}>
        {done || shot !== null ? "BOSHQALAR KUTILMOQDA" : def.action}
      </button>
    </div>
  );
}

/** Tez bosish — ko'pkari oti chopadi / bilak egiladi */
function TapPanel({ def, done, onSubmit }: { def: ArenaDef; done: boolean; onSubmit: (v: number) => void }) {
  const LEN = def.key === "kopkari" ? 6000 : 5000;
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const tapsRef = useRef(0);
  const sent = useRef(false);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      if (!sent.current) { sent.current = true; onSubmit(tapsRef.current); }
      return;
    }
    const t = setTimeout(() => setLeft((l) => (l ?? 0) - 100), 100);
    return () => clearTimeout(t);
  }, [left, onSubmit]);
  const tap = () => {
    if (done || sent.current) return;
    if (left === null) setLeft(LEN);
    tapsRef.current += 1; setTaps(tapsRef.current); haptic();
  };
  const prog = Math.min(1, taps / (def.key === "kopkari" ? 60 : 45));
  return (
    <div className="flex flex-col gap-3 items-center">
      {def.key === "kopkari" ? (
        <div className="ar-track">
          <span className="ar-rider-img ls-rider" style={{ left: `${2 + prog * 72}%` }}><Horse speed={left !== null ? Math.min(1, 0.4 + taps / 40) : 0} silk={def.color} size={78} /></span>
          <span className="ar-finish"><Sym n="trophy" s={30} glow /></span>
        </div>
      ) : (
        <div className="ls-touch"><ArmWrestle angle={left === null ? 0 : -0.35 + prog * 1.35} color={def.color} strain={left !== null && !sent.current} /></div>
      )}
      <p className="ar-note">{left === null ? "Birinchi bosish bilan vaqt boshlanadi" : `${(Math.max(0, left) / 1000).toFixed(1)} s · ${taps} marta`}</p>
      <button type="button" className="ar-tap" disabled={done || sent.current} style={{ ["--c" as any]: def.color }}
        onPointerDown={(e) => { e.preventDefault(); tap(); }}>
        {done || sent.current ? "YUBORILDI" : def.action}
      </button>
    </div>
  );
}

function ReactionPanel({ def, done, onSubmit }: { def: ArenaDef; done: boolean; onSubmit: (v: number) => void }) {
  const [phase, setPhase] = useState<"wait" | "red" | "green" | "sent">("wait");
  const greenAt = useRef(0);
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (phase !== "red") return;
    const t = setTimeout(() => { greenAt.current = performance.now(); setPhase("green"); haptic("medium"); }, 1400 + Math.random() * 2600);
    return () => clearTimeout(t);
  }, [phase]);
  const press = () => {
    if (done || phase === "sent") return;
    if (phase === "wait") { setPhase("red"); return; }
    if (phase === "red") { setPhase("sent"); setMs(-1); onSubmit(50); return; } // erta bosish
    const d = Math.round(performance.now() - greenAt.current);
    setMs(d); setPhase("sent"); onSubmit(d);
  };
  return (
    <div className="flex flex-col gap-3 items-center">
      <div className={`ar-light ${phase}`} />
      <p className="ar-note">{ms === -1 ? "Erta bosdingiz!" : ms !== null ? `${ms} ms` : phase === "wait" ? "Tayyor bo'lsangiz bosing" : phase === "red" ? "Kuting..." : "HOZIR!"}</p>
      <button type="button" className="ar-tap" disabled={done || phase === "sent"} style={{ ["--c" as any]: phase === "green" ? "#22c55e" : def.color }}
        onPointerDown={(e) => { e.preventDefault(); press(); }}>
        {phase === "wait" ? "TAYYORMAN" : phase === "sent" || done ? "YUBORILDI" : def.action}
      </button>
    </div>
  );
}

function TilesPanel({ def, done, onSubmit }: { def: ArenaDef; done: boolean; onSubmit: (v: number, picks: number[]) => void }) {
  const of = def.tiles?.of ?? 16, k = def.tiles?.choose ?? 4;
  const [sel, setSel] = useState<number[]>([]);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: of }, (_, i) => (
          <button key={i} type="button" disabled={done} className={`ar-tile ${sel.includes(i) ? "on" : ""}`}
            onClick={() => { sfx.tile?.(); haptic(); setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < k ? [...s, i] : s)); }}>
            {sel.includes(i) ? <Sym n="gem" s={26} /> : null}
          </button>
        ))}
      </div>
      <button type="button" className="ar-cta" disabled={done || sel.length !== k} style={{ ["--c" as any]: def.color }}
        onClick={() => onSubmit(0, sel)}>{done ? "QABUL QILINDI" : `${def.action} (${sel.length}/${k})`}</button>
    </div>
  );
}

/* ════════════════ Natija ko'rinishi (har o'yinga xos) ════════════════ */

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const FACES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function Reveal({ def, st }: { def: ArenaDef; st: AState }) {
  const L = st.last;
  if (!L) return null;
  const r = L.reveal ?? {};
  const name = (i: number) => (st.players[i]?.seat === st.mySeat ? "Siz" : st.players[i]?.name ?? "");
  const row = (i: number, body: React.ReactNode) => (
    <div key={i} className="ar-rev-row" style={{ ["--c" as any]: SEAT_COL[i % 4] }}>
      <Avatar name={st.players[i]?.name ?? "?"} seat={i} size={28} />
      <span className="ar-rev-name">{name(i)}</span>
      <div className="ar-rev-body">{body}</div>
      <span className={`ar-rev-pts ${L.scores[i]! > 0 ? "pos" : ""}`}>+{L.scores[i]}</span>
    </div>
  );
  let rows: React.ReactNode = null;
  let hero: React.ReactNode = null;
  switch (def.key) {
    case "nardarena":
    case "pokerdice":
      rows = (r.dice as number[][]).map((d, i) => row(i, (
        <span className="flex gap-1 items-center flex-wrap">
          {d.map((v, k) => <Dice3D key={`${st.round}-${k}`} value={v} rolling={false} size={def.key === "nardarena" ? 30 : 22} seed={k} skin={def.key === "nardarena" ? "wood" : "ruby"} />)}
          {r.names && <span className="ar-tag">{r.names[i]}</span>}
        </span>
      )));
      break;
    case "pokerhand":
      rows = (r.hands as number[][]).map((h, i) => row(i, (
        <span className="flex flex-col gap-1">
          <span className="flex items-center">
            {h.map((c, k) => <span key={k} style={{ marginLeft: k ? -12 : 0, transform: `rotate(${(k - 2) * 4}deg)` }}><PlayingCard suit={SUITS[Math.floor(c / 13)]!} value={FACES[c % 13]!} w={36} delay={k * 80} /></span>)}
          </span>
          <span className="ar-tag self-start">{r.names[i]}</span>
        </span>
      )));
      break;
    case "eggfight": {
      const mx = Math.max(...(r.power as number[]));
      rows = (r.power as number[]).map((p, i) => row(i, (
        <span className="flex items-center gap-2"><span className={`ar-egg ${p === mx ? "" : "cracked"}`} style={{ ["--c" as any]: SEAT_COL[i % 4] }} /><span className="ar-tag">kuch {p}</span></span>
      )));
      break;
    }
    case "horserace":
      hero = (
        <div className="ar-race">
          {(r.order as number[]).map((h, pos) => (
            <div key={h} className="ar-lane">
              <span className="ar-lane-rider ls-rider" style={{ ["--to" as any]: `${76 - pos * 11}%`, animationDelay: `${pos * 0.08}s` }}><Horse silk={HORSE[h]} color={["#7c2d12", "#3f2a1d", "#a16207", "#1c1917", "#78350f", "#57534e"][h]} size={56} /></span>
              <span className="ar-silk xs" style={{ background: HORSE[h] }}>{h + 1}</span>
            </div>
          ))}
        </div>
      );
      rows = (r.picks as number[]).map((p, i) => row(i, <span className="ar-tag">{p + 1}-ot · {(r.order as number[]).indexOf(p) + 1}-o'rin</span>));
      break;
    case "roulettearena": {
      const n = r.num as number;
      const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n);
      hero = <div className="ar-ball-num" style={{ background: n === 0 ? "#16a34a" : red ? "#c1121f" : "#111827" }}>{n}</div>;
      rows = (r.picks as number[]).map((p, i) => row(i, <span className="ar-tag">{def.picks?.[p]}</span>));
      break;
    }
    case "crasharena":
      hero = <div className="ar-crash"><Sym n="rocket" s={46} /><span>x{r.crash}</span></div>;
      rows = (r.picks as number[]).map((p, i) => row(i, <span className="ar-tag">{def.picks?.[p]}</span>));
      break;
    case "bombbox":
    case "treasure":
      hero = (
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 6 }, (_, b) => (
            <div key={b} className="ar-box-open" style={{ animationDelay: `${b * 0.08}s` }}>
              {def.key === "bombbox"
                ? <Sym n={b === r.bomb ? "boom" : b === r.gold ? "coin" : "gift"} s={30} />
                : <><Sym n="chest" s={26} /><span>{r.pool[b]}</span></>}
            </div>
          ))}
        </div>
      );
      rows = (r.picks as number[]).map((p, i) => row(i, <span className="ar-tag">{p + 1}-{def.key === "bombbox" ? "quti" : "sandiq"}</span>));
      break;
    case "uniquenum":
      rows = (r.picks as number[]).map((p, i) => row(i, <span className={`ar-num-chip ${p === r.win ? "win" : ""}`}>{p + 1}</span>));
      break;
    case "wheelarena":
      rows = (r.idx as number[]).map((x, i) => row(i, <span className="ar-tag"><Sym n="wheel" s={18} /> {r.sectors[x]}</span>));
      break;
    case "kurash":
    case "boxing": {
      const pk = r.picks as number[];
      const mi = Math.max(0, st.players.findIndex((p) => p.seat === st.mySeat));
      const oi = mi === 0 ? 1 : 0;
      if (pk.length > 1) hero = <FightReplay key={st.round} kind={def.key as "boxing" | "kurash"} a={pk[mi]!} b={pk[oi]!} aWon={L.scores[mi]! > L.scores[oi]!} bWon={L.scores[oi]! > L.scores[mi]!} color={def.color} />;
      rows = pk.map((p, i) => row(i, <span className="ar-tag">{def.picks?.[p]}</span>));
      break;
    }
    case "reaction":
      rows = (r.ms as number[]).map((m, i) => row(i, <span className="ar-tag">{m < 120 ? "erta bosdi" : m >= 2000 ? "kech qoldi" : `${m} ms`}</span>));
      break;
    case "kopkari": {
      const mx = Math.max(1, ...(r.taps as number[]));
      hero = (
        <div className="ar-race">
          {(r.taps as number[]).map((t, i) => (
            <div key={i} className="ar-lane">
              <span className="ar-lane-rider ls-rider" style={{ ["--to" as any]: `${(t / mx) * 78}%` }}><Horse silk={SEAT_COL[i % 4]} size={56} /></span>
              {t === mx && <span className="ar-lane-win"><Sym n="trophy" s={20} glow /></span>}
            </div>
          ))}
        </div>
      );
      rows = (r.taps as number[]).map((t, i) => row(i, <span className="ar-tag">{t} marta bosdi</span>));
      break;
    }
    case "armwrestle":
      rows = (r.taps as number[]).map((t, i) => row(i, <span className="ar-bar"><span style={{ width: `${Math.min(100, t * 1.6)}%` }} /> {t}</span>));
      break;
    case "basketball":
      rows = (r.shots as number[]).map((x, i) => row(i, <span className={`ar-tag ${x > 0 ? "ok" : "miss"}`}>{x === 3 ? "Aniq uch ochkolik" : x === 2 ? "Savatga tushdi" : "Xato"}</span>));
      break;
    case "archery":
    case "dartsarena":
      rows = (r.pts as number[]).map((x, i) => row(i, <span className={`ar-tag ${x > 0 ? "ok" : "miss"}`}>{def.key === "dartsarena" ? (x === 50 ? "Buqa ko'zi!" : x === 25 ? "Ichki halqa" : `${x} ochko`) : x >= 9 ? "Markazga!" : `${x} ball`}</span>));
      break;
    case "minesarena":
      rows = st.players.map((_, i) => row(i, (
        <span className="flex gap-0.5">{((r.picks as number[][])[i] ?? []).map((x, k) => <Sym key={k} n={(r.bombs as number[]).includes(x) ? "bomb" : "gem"} s={18} />)}</span>
      )));
      break;
    default:
      rows = st.players.map((_, i) => row(i, <span className="ar-tag">{L.detail}</span>));
  }
  return (
    <div className="ar-reveal">
      <p className="ar-rev-title">{L.detail}</p>
      {hero}
      <div className="flex flex-col gap-1.5">{rows}</div>
    </div>
  );
}

/* ════════════════ Sahifa ════════════════ */

export default function Arena({ gameKey }: { gameKey: string }) {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [list, setList] = useState<ArenaList | null>(listCache);
  const def = useMemo(() => list?.games.find((g) => g.key === gameKey) ?? null, [list, gameKey]);
  const [stake, setStake] = useState(5000);
  const [mode, setMode] = useState<"lobby" | "waiting" | "room">("lobby");
  const [wait, setWait] = useState<{ count: number; max: number; names: string[]; startsIn: number | null; expiresIn?: number | null } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [st, setSt] = useState<AState | null>(null);
  const [err, setErr] = useState("");
  const [submittedRound, setSubmittedRound] = useState(-1);
  const [fly, setFly] = useState<{ id: number; seat: number; name: string; key: string }[]>([]);
  const chatSince = useRef(0);
  const doneOnce = useRef(false);
  const flyId = useRef(0);

  useEffect(() => { loadArenaList().then(setList).catch((e) => setErr(e.message)); }, []);

  const pushSticker = useCallback((seat: number, name: string, key: string) => {
    const id = ++flyId.current;
    setFly((f) => [...f, { id, seat, name, key }].slice(-8));
    setTimeout(() => setFly((f) => f.filter((x) => x.id !== id)), 2600);
  }, []);

  /* kutish: har 1.5 s so'rov — lobbi to'lsa yoki vaqt tugasa boshlanadi */
  useEffect(() => {
    if (mode !== "waiting" || !player) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await api("/arena/queue", { telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", game: gameKey, stake, poll: true });
        if (!alive) return;
        if (r.status === "expired") { setMode("lobby"); setWait(null); setErr("5 daqiqada hech kim qo'shilmadi — guruh yopildi. Ochiq guruhga qo'shiling yoki yangisini oching."); return; }
        if (r.status === "matched") { setRoomId(r.roomId); setMode("room"); sfx.select(); haptic("heavy"); }
        else setWait({ count: r.count, max: r.max, names: r.names ?? [], startsIn: r.startsIn, expiresIn: r.expiresIn });
      } catch (e) { if (alive) setErr((e as Error).message); }
    };
    poll();
    const iv = setInterval(poll, 1500);
    return () => { alive = false; clearInterval(iv); };
  }, [mode, player, gameKey, stake]);

  /* xona holati — har 0.8 s */
  useEffect(() => {
    if (mode !== "room" || !roomId || !player) return;
    let alive = true;
    const poll = async () => {
      try {
        const s: AState = await api(`/arena/state?telegramId=${encodeURIComponent(player.telegramId)}&roomId=${roomId}&chatSince=${chatSince.current}`);
        if (!alive) return;
        if (s.chat?.length) {
          chatSince.current = s.chatLast;
          s.chat.filter((c) => c.sticker).forEach((c) => pushSticker(c.seat, c.seat === s.mySeat ? "Siz" : c.name, c.text));
        }
        setSt((prev) => {
          if (prev && prev.phase !== "reveal" && s.phase === "reveal") { sfx.reveal?.(); haptic("medium"); }
          return s;
        });
        if (s.phase === "done" && !doneOnce.current) {
          doneOnce.current = true;
          const meIdx = s.players.findIndex((p) => p.seat === s.mySeat);
          if (s.winners?.includes(meIdx) && !s.refund) { sfx.win(true); pushSticker(s.mySeat, "Siz", "win"); } else if (!s.refund) sfx.lose();
          refresh();
        }
      } catch { /* keyingi so'rov */ }
    };
    poll();
    const iv = setInterval(poll, 800);
    return () => { alive = false; clearInterval(iv); };
  }, [mode, roomId, player, refresh, pushSticker]);

  const join = async (at: number = stake) => {
    if (!player) { setErr("Profil yuklanmadi"); return; }
    if ((player.balance ?? 0) < at) { setErr(`Balans yetarli emas. Kerak: ${fmt(at)} UZS`); return; }
    setStake(at);
    setErr(""); doneOnce.current = false; chatSince.current = 0; setSt(null); setSubmittedRound(-1);
    try {
      const r = await api("/arena/queue", { telegramId: player.telegramId, name: player.firstName ?? "O'yinchi", game: gameKey, stake: at });
      if (r.status === "matched") { setRoomId(r.roomId); setMode("room"); }
      else { setWait(r); sfx.bet?.(); setMode("waiting"); }
    } catch (e) { setErr((e as Error).message); }
  };
  const cancel = async () => {
    if (player) await api("/arena/cancel", { telegramId: player.telegramId }).catch(() => {});
    setMode("lobby"); setWait(null);
  };
  const leave = async () => {
    if (player && roomId && st?.phase !== "done") await api("/arena/leave", { telegramId: player.telegramId, roomId }).catch(() => {});
    setMode("lobby"); setRoomId(null); setSt(null); refresh();
  };
  const submit = useCallback(async (value: number, picks?: number[]) => {
    if (!player || !roomId || !st) return;
    setSubmittedRound(st.round);
    sfx.click();
    await api("/arena/submit", { telegramId: player.telegramId, roomId, value, picks }).catch(() => {});
  }, [player, roomId, st]);
  const sendSticker = async (k: string) => {
    if (!player || !roomId) return;
    haptic();
    await api("/arena/chat", { telegramId: player.telegramId, roomId, text: k, sticker: true }).catch(() => {});
  };

  if (!def) {
    return (
      <div className="min-h-screen ar-page">
        <GameHeader title="ARENA" />
        <p className="text-center mt-20 font-bold ar-note">{err || "Yuklanmoqda..."}</p>
      </div>
    );
  }

  const meIdx = st ? st.players.findIndex((p) => p.seat === st.mySeat) : -1;
  const iDone = !!st && (submittedRound === st.round || !!st.players[meIdx]?.submitted);
  const gained = st?.phase === "reveal" && st.last ? st.last.scores : null;
  const iWon = st?.phase === "done" && st.winners?.includes(meIdx) && !st.refund;

  return (
    <div className="min-h-screen flex flex-col relative isolate ar-page" style={{ ["--c" as any]: def.color }}>
      <Ambient behind color={def.color} layer="stars" syms={["coin", "star"]} live={mode === "room" && st?.phase === "play"} />
      <SmartImage src={def.img} alt="" sizes="100vw" loading="eager" className="ar-bg" />
      <GameHeader title={def.title} subtitle={`${list?.min ?? 2}–${list?.max ?? 4} o'yinchi · ${def.rounds} raund`} />
      <StickerLayer items={fly} />

      <div className="flex-1 px-3 pb-28 pt-3 flex flex-col gap-3">
        {/* ── LOBBI ── */}
        {mode === "lobby" && (
          <>
            <div className="ar-hero">
              <SmartImage src={def.img} alt={def.title} sizes="100vw" loading="eager" className="ar-hero-img" />
              <span className="ar-hero-shade" />
              <div className="ar-hero-body">
                <span className="ar-kicker">LIVE ARENA · {def.sub.toUpperCase()}</span>
                <span className="ar-hero-title">{def.title}</span>
                <span className="ar-hero-sub">{def.live > 0 ? `${def.live} kishi hozir o'ynayapti` : "Birinchi bo'lib stol oching"}</span>
              </div>
              <span className="ar-live">LIVE</span>
            </div>
            <div className="ar-card">
              <p className="ar-card-title">QOIDA</p>
              <p className="ar-rule">{def.rule}</p>
              <p className="ar-rule mt-2">2–4 o'yinchi. Guruh oching yoki ochiq guruhga qo'shiling. Ikkinchi o'yinchi kelgach 30 soniyada (4 kishi bo'lsa darhol) boshlanadi; hech kim kelmasa guruh 5 daqiqadan keyin yopiladi. G'olib hammasini oladi, teng bo'lsa bo'linadi. Komissiya {Math.round((list?.rake ?? 0.08) * 100)}%.</p>
            </div>
            <div className="ar-card">
              <p className="ar-card-title">TIKISH</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(list?.stakes ?? [5000]).map((s) => (
                  <button key={s} type="button" className={`ar-stake ${stake === s ? "on" : ""}`} onClick={() => { sfx.select(); setStake(s); }}>
                    {s >= 1000 ? `${s / 1000}K` : s}
                  </button>
                ))}
              </div>
              <p className="ar-note mt-2">4 kishilik stolda yutuq: {fmt(Math.floor(stake * 4 * (1 - (list?.rake ?? 0.08))))} UZS gacha</p>
            </div>
            {err && <p className="ar-err">{err}</p>}
            <button type="button" className="ar-cta big" onClick={() => join()}>YANGI GURUH OCHISH · {fmt(stake)} UZS</button>
            <OpenGroups game={def.key} color={def.color} onJoin={(s) => join(s)} />
          </>
        )}

        {/* ── KUTISH ── */}
        {mode === "waiting" && (
          <div className="ar-card flex flex-col items-center gap-4 py-6">
            <p className="ar-card-title">O'YINCHILAR YIG'ILMOQDA</p>
            <div className="flex gap-3">
              {Array.from({ length: wait?.max ?? 4 }, (_, i) => {
                const n = wait?.names[i];
                return n
                  ? <div key={i} className="flex flex-col items-center gap-1 ar-pop"><Avatar name={n} seat={i} size={52} glow /><span className="ar-seat-name">{n}</span></div>
                  : <div key={i} className="flex flex-col items-center gap-1"><span className="ar-empty-seat" /><span className="ar-seat-name">bo'sh</span></div>;
              })}
            </div>
            <p className="ar-note">
              {(wait?.count ?? 1)}/{wait?.max ?? 4} o'yinchi
              {wait?.startsIn != null ? ` · ${Math.ceil(wait.startsIn / 1000)} s da boshlanadi` : " · kamida yana 1 kishi kerak"}
            </p>
            <p className="ar-note">
              {wait?.expiresIn != null ? `Guruhingiz ro'yxatda ko'rinib turibdi · ${mmss(wait.expiresIn)} qoldi` : "Raqib topildi"}
            </p>
            {err && <p className="ar-err">{err}</p>}
            <button type="button" className="ar-ghost" onClick={cancel}>BEKOR QILISH</button>
          </div>
        )}

        {/* ── XONA ── */}
        {mode === "room" && st && (
          <>
            <div className="ar-card py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="ar-kicker">{st.phase === "done" ? "O'YIN TUGADI" : `RAUND ${Math.min(st.round + 1, st.rounds)}/${st.rounds}`}</span>
                <span className="ar-kicker">BANK {fmt(st.prize)} UZS</span>
              </div>
              <Seats st={st} gained={gained} />
              {(st.phase === "play" || st.phase === "intro") && <div className="mt-2"><TimerBar ms={st.msLeft} total={st.phase === "intro" ? 3000 : st.timer} color={def.color} /></div>}
            </div>

            <StageFx result={st.phase === "done" ? (st.refund ? null : !!iWon) : null} active={st.phase === "play"} big
              pattern="burst" syms={["coin", "trophy"]} color={def.color}>
              <div className="ar-stage">
                {st.phase === "intro" && (
                  <div className="ar-intro">
                    <span className="ar-vs">{st.players.map((p) => p.name).join("  ·  ")}</span>
                    <span className="ar-count">{Math.max(1, Math.ceil(st.msLeft / 1000))}</span>
                  </div>
                )}
                {st.phase === "play" && (
                  <div key={st.round}>
                    {(def.key === "boxing" || def.key === "kurash") && <FightPanel kind={def.key as "boxing" | "kurash"} picks={def.picks ?? []} color={def.color} done={iDone} onSubmit={(v) => submit(v)} />}
                    {(def.key === "archery" || def.key === "dartsarena" || def.key === "basketball") && <AimPanel kind={def.key as "archery" | "dartsarena" | "basketball"} color={def.color} done={iDone} onSubmit={(v) => submit(v)} />}
                    {def.kind === "pick" && def.key !== "boxing" && def.key !== "kurash" && <PickPanel def={def} done={iDone} onSubmit={(v) => submit(v)} />}
                    {def.kind === "roll" && <RollPanel def={def} done={iDone} onSubmit={(v) => submit(v)} />}
                    {def.kind === "skill" && !["archery", "dartsarena", "basketball"].includes(def.key) && <SkillPanel def={def} done={iDone} onSubmit={(v) => submit(v)} />}
                    {def.kind === "tap" && <TapPanel def={def} done={iDone} onSubmit={(v) => submit(v)} />}
                    {def.kind === "reaction" && <ReactionPanel def={def} done={iDone} onSubmit={(v) => submit(v)} />}
                    {def.kind === "tiles" && <TilesPanel def={def} done={iDone} onSubmit={(v, p) => submit(v, p)} />}
                  </div>
                )}
                {st.phase === "reveal" && <Reveal def={def} st={st} />}
                {st.phase === "done" && (
                  <div className="ar-podium">
                    <p className={`ar-result ${st.refund ? "draw" : iWon ? "win" : "lose"}`}>
                      {st.refund ? "DURRANG — TIKIM QAYTDI" : iWon ? (st.winners && st.winners.length > 1 ? "G'ALABA — BO'LINDI" : "G'ALABA!") : "BU SAFAR OMAD KELMADI"}
                    </p>
                    {[...st.players.map((p, i) => ({ p, i }))].sort((a, b) => b.p.score - a.p.score).map(({ p, i }, place) => (
                      <div key={i} className={`ar-place p${place}`} style={{ ["--c" as any]: SEAT_COL[i % 4] }}>
                        <span className="ar-place-n">{place + 1}</span>
                        <Avatar name={p.name} seat={i} size={30} glow={st.winners?.includes(i)} />
                        <span className="ar-rev-name">{p.seat === st.mySeat ? "Siz" : p.name}</span>
                        <span className="ar-place-score">{p.score}</span>
                        {(st.payouts?.[i] ?? 0) > 0 && <span className="ar-payout">+{fmt(st.payouts![i]!)}</span>}
                      </div>
                    ))}
                    <div className="flex gap-2 w-full mt-2">
                      <button type="button" className="ar-cta flex-1" onClick={() => { setMode("lobby"); setRoomId(null); setSt(null); }}>YANA O'YNASH</button>
                      <button type="button" className="ar-ghost" onClick={() => nav("/live")}>LIVE</button>
                    </div>
                  </div>
                )}
              </div>
            </StageFx>

            {/* emotsiyalar */}
            <div className="ar-stickers">
              {STICKERS.map((k) => (
                <button key={k} type="button" aria-label={k} onClick={() => sendSticker(k)}><img src={`/stickers/${k}.png`} alt="" width={40} height={40} /></button>
              ))}
            </div>
            {st.phase !== "done" && <button type="button" className="ar-ghost self-center" onClick={leave}>O'YINDAN CHIQISH</button>}
          </>
        )}
      </div>
    </div>
  );
}
