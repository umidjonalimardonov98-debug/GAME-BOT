import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Radio, Users, Volume2, VolumeX } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, GOLD, XGREEN } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import { haptic, hapticNotify } from "@/lib/telegram";

type Member = { id: string; name: string; talking: boolean };
type Clip = { id: number; userId: string; name: string; seconds: number; at: number; mine: boolean };

const T = {
  title: { uz: "JONLI OVOZLI XONA", ru: "ЖИВАЯ ГОЛОСОВАЯ КОМНАТА", en: "LIVE VOICE ROOM" },
  sub: {
    uz: "Mikrofonni bosib turib gapiring — xonadagilar jonli eshitadi",
    ru: "Зажмите микрофон и говорите — все в комнате слышат вживую",
    en: "Hold the mic and talk — everyone in the room hears you live",
  },
  hold: { uz: "BOSIB TURIB GAPIRING", ru: "ЗАЖМИТЕ И ГОВОРИТЕ", en: "HOLD TO TALK" },
  talking: { uz: "GAPIRYAPSIZ...", ru: "ГОВОРИТЕ...", en: "TALKING..." },
  online: { uz: "onlayn", ru: "онлайн", en: "online" },
  live: { uz: "JONLI", ru: "ЖИВОЙ", en: "LIVE" },
  playing: { uz: "eshitilyapti", ru: "звучит", en: "playing" },
  empty: { uz: "Hozircha jim. Birinchi bo'lib gapiring!", ru: "Пока тихо. Заговорите первым!", en: "Quiet so far. Be the first to talk!" },
  micErr: {
    uz: "Mikrofonga ruxsat berilmadi. Telegram sozlamalaridan mikrofonni yoqing.",
    ru: "Нет доступа к микрофону. Разрешите микрофон в настройках Telegram.",
    en: "Microphone denied. Allow microphone access in Telegram settings.",
  },
  sendErr: { uz: "Ovoz yuborilmadi", ru: "Голос не отправлен", en: "Voice not sent" },
  you: { uz: "Siz", ru: "Вы", en: "You" },
};

export default function VoiceRoom() {
  const { player } = usePlayer();
  const { ts } = useTheme();
  const { lang } = useLang();
  const t = (k: keyof typeof T) => T[k][lang as "uz" | "ru" | "en"] ?? T[k].uz;

  const [joined, setJoined] = useState(false);
  const [online, setOnline] = useState<Member[]>([]);
  const [feed, setFeed] = useState<Clip[]>([]);
  const [talking, setTalking] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState("");
  const [secs, setSecs] = useState(0);

  const sinceRef = useRef(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<Clip[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const secsRef = useRef(0);

  const name = player ? `${player.firstName ?? "O'yinchi"}`.slice(0, 24) : "O'yinchi";

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const playNext = useCallback(() => {
    if (playingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) { setNowPlaying(""); return; }
    if (mutedRef.current) { playNext(); return; }
    playingRef.current = true;
    setNowPlaying(next.mine ? t("you") : next.name);
    const a = audioRef.current ?? new Audio();
    audioRef.current = a;
    a.src = `/api/voice-room/clip/${next.id}`;
    a.onended = a.onerror = () => { playingRef.current = false; playNext(); };
    a.play().catch(() => { playingRef.current = false; playNext(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // heartbeat + feed polling
  useEffect(() => {
    if (!player) return;
    let alive = true;
    async function beat() {
      try {
        await fetch("/api/voice-room/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId: player!.telegramId, name }),
        });
        if (alive) setJoined(true);
      } catch {}
    }
    async function poll() {
      try {
        const r = await fetch(`/api/voice-room/feed?since=${sinceRef.current}&telegramId=${player!.telegramId}`);
        if (!r.ok) return;
        const d = await r.json();
        setOnline(d.online || []);
        const arr: Clip[] = d.clips || [];
        if (arr.length) {
          sinceRef.current = arr[arr.length - 1].id;
          setFeed((f) => [...f, ...arr].slice(-25));
          for (const c of arr) if (!c.mine) queueRef.current.push(c);
          playNext();
        }
      } catch {}
    }
    beat();
    poll();
    const i1 = setInterval(beat, 8000);
    const i2 = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearInterval(i1);
      clearInterval(i2);
      try {
        navigator.sendBeacon?.(
          "/api/voice-room/leave",
          new Blob([JSON.stringify({ telegramId: player.telegramId })], { type: "application/json" }),
        );
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.telegramId]);

  function pickMime() {
    const list = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"];
    for (const m of list) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
    return "";
  }

  async function startTalk() {
    if (talking || !player) return;
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        await push(blob, type);
      };
      rec.start();
      recRef.current = rec;
      secsRef.current = 0;
      setSecs(0);
      setTalking(true);
      haptic("medium");
      timerRef.current = setInterval(() => {
        secsRef.current += 1;
        setSecs(secsRef.current);
        fetch("/api/voice-room/talking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId: player.telegramId }),
        }).catch(() => {});
        if (secsRef.current >= 60) stopTalk();
      }, 1000);
    } catch {
      setErr(t("micErr"));
      hapticNotify("error");
    }
  }

  function stopTalk() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTalking(false);
    haptic("light");
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    streamRef.current = null;
  }

  async function push(blob: Blob, mime: string) {
    if (!player || blob.size < 700) return;
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] || "");
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      const r = await fetch("/api/voice-room/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: player.telegramId, name, audioBase64: b64, mime, seconds: secsRef.current || 1 }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error || t("sendErr"));
      } else hapticNotify("success");
    } catch {
      setErr(t("sendErr"));
    }
    setTimeout(() => setErr(""), 3500);
  }

  return (
    <div className="rounded-3xl p-4" style={{ background: ts.card, border: `1px solid ${GOLD.border}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: XGREEN.grad, boxShadow: XGREEN.shadow }}
          >
            <Radio size={16} color="#fff" />
          </span>
          <div>
            <p className="text-[12px] font-black tracking-widest" style={{ color: GOLD.light }}>{t("title")}</p>
            <p className="text-[10px]" style={{ color: ts.textSub }}>{t("sub")}</p>
          </div>
        </div>
        <button
          onClick={() => { haptic(); setMuted((m) => !m); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
          style={{ background: ts.btnSecondary, border: `1px solid ${ts.cardBorder}`, color: ts.text }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* online */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: "rgba(57,196,111,0.15)", color: "#39c46f" }}>
          <span className="w-1.5 h-1.5 rounded-full rec-pulse" style={{ background: "#39c46f" }} />
          {t("live")}
        </span>
        <span className="text-[11px] flex items-center gap-1" style={{ color: ts.textSub }}>
          <Users size={12} /> {online.length} {t("online")}
        </span>
        {nowPlaying && (
          <span className="text-[11px] font-black ml-auto" style={{ color: GOLD.light }}>
            🔊 {nowPlaying} · {t("playing")}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {online.slice(0, 12).map((m) => (
          <span key={m.id} className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{
              background: m.talking ? "rgba(255,207,74,0.18)" : ts.btnSecondary,
              border: `1px solid ${m.talking ? GOLD.border : ts.cardBorder}`,
              color: m.talking ? GOLD.light : ts.textSub,
            }}>
            {m.talking ? "🎙 " : ""}{m.id === String(player?.telegramId) ? t("you") : m.name}
          </span>
        ))}
      </div>

      {/* feed */}
      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
        {feed.length === 0 && (
          <p className="text-[11px] text-center py-3" style={{ color: ts.textSub }}>{t("empty")}</p>
        )}
        {feed.slice(-8).map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-[11px]" style={{ color: ts.textSub }}>
            <Mic size={11} />
            <span className="font-black" style={{ color: c.mine ? GOLD.light : ts.text }}>
              {c.mine ? t("you") : c.name}
            </span>
            <span>· {c.seconds}s</span>
            <button
              className="ml-auto px-2 py-0.5 rounded-full"
              style={{ background: ts.btnSecondary, border: `1px solid ${ts.cardBorder}`, color: ts.text }}
              onClick={() => { const a = audioRef.current ?? new Audio(); audioRef.current = a; a.src = `/api/voice-room/clip/${c.id}`; a.play().catch(() => {}); }}
            >
              ▶
            </button>
          </div>
        ))}
      </div>

      {/* push to talk */}
      <button
        onMouseDown={startTalk}
        onMouseUp={stopTalk}
        onMouseLeave={() => talking && stopTalk()}
        onTouchStart={(e) => { e.preventDefault(); startTalk(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopTalk(); }}
        disabled={!joined && !player}
        className="w-full mt-3 py-4 rounded-2xl font-black active:scale-[0.98] transition flex items-center justify-center gap-2 select-none"
        style={{
          background: talking ? "linear-gradient(145deg,#ef4444,#b91c1c)" : GOLD.grad,
          color: talking ? "#fff" : "#1a1200",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: talking ? "0 10px 26px rgba(239,68,68,0.45)" : `0 10px 26px ${GOLD.glow}`,
        }}
      >
        <Mic size={18} />
        {talking ? `${t("talking")} ${secs}s` : t("hold")}
      </button>

      {err && <p className="text-[11px] mt-2 text-center font-bold" style={{ color: "#ef4444" }}>{err}</p>}
    </div>
  );
}
