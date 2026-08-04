import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Headphones, Mic, Square, Send, ExternalLink, ShieldCheck } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GAME_BG, GOLD, XGREEN } from "@/lib/theme-context";
import { haptic, hapticNotify, openBotChat } from "@/lib/telegram";
import { useU } from "@/lib/ui-i18n";
import { sfx } from "@/lib/sound";

type Status = "idle" | "pending" | "active";

export default function Support() {
  const u = useU();
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const { theme, ts } = useTheme();
  const [status, setStatus] = useState<Status>("idle");
  const [botUsername, setBotUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const prev = useRef<Status>("idle");
  type ChatMsg = { id: number; from: "user" | "admin" | "system"; text: string; at: number };
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const sinceRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ─── Ovozli xabar ───
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMessages() {
    if (!player) return;
    try {
      const res = await fetch(`/api/support/live-chat/${player.telegramId}/messages?since=${sinceRef.current}`);
      if (!res.ok) return;
      const d = await res.json();
      const arr: ChatMsg[] = d.messages || [];
      if (arr.length) {
        sinceRef.current = arr[arr.length - 1].id;
        setChat((c) => [...c, ...arr]);
        if (arr.some((m) => m.from === "admin")) { hapticNotify("success"); sfx.send(); }
      }
    } catch {}
  }

  async function sendChat() {
    const text = draft.trim();
    if (!player || !text || chatSending) return;
    haptic("light");
    sfx.send();
    setChatSending(true);
    try {
      const res = await fetch("/api/support/live-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: player.telegramId, text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || u("networkError")); hapticNotify("error"); sfx.error(); }
      else { setDraft(""); await loadMessages(); }
    } catch { setMsg(u("networkError")); }
    setChatSending(false);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function startRecording() {
    if (recording || status !== "active") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        await sendVoice(blob, rec.mimeType || "audio/webm");
      };
      rec.start();
      recRef.current = rec;
      setRecSecs(0);
      setRecording(true);
      haptic("medium");
      sfx.select();
      timerRef.current = setInterval(() => setRecSecs((v) => (v >= 59 ? (stopRecording(), v) : v + 1)), 1000);
    } catch {
      setMsg(u("micDenied"));
      hapticNotify("error");
      sfx.error();
    }
  }

  function stopRecording() {
    stopTimer();
    setRecording(false);
    haptic("light");
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
  }

  async function sendVoice(blob: Blob, mime: string) {
    if (!player || blob.size < 1200) return;
    setVoiceBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const res = await fetch("/api/support/live-chat/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: player.telegramId, audioBase64: b64, mime, seconds: recSecs }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || u("networkError")); hapticNotify("error"); sfx.error(); }
      else { setMsg(u("voiceSent")); hapticNotify("success"); sfx.cash(); await loadMessages(); }
    } catch { setMsg(u("networkError")); }
    setVoiceBusy(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function loadStatus() {
    if (!player) return;
    try {
      const res = await fetch(`/api/support/live-chat/${player.telegramId}`);
      if (!res.ok) return;
      const d = await res.json();
      setBotUsername(d.botUsername || "");
      setStatus((d.status as Status) || "idle");
    } catch {}
  }

  useEffect(() => {
    loadStatus();
    loadMessages();
    const i = setInterval(() => { loadStatus(); loadMessages(); }, 2500);
    return () => { clearInterval(i); stopTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.telegramId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.length]);

  useEffect(() => {
    if (prev.current !== "active" && status === "active") {
      hapticNotify("success");
      sfx.win(false);
      setMsg(u("chatActive"));
    }
    prev.current = status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function request() {
    if (!player || sending) return;
    haptic("medium");
    sfx.send();
    setSending(true);
    setMsg("");
    try {
      const res = await fetch("/api/support/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: player.telegramId,
          name: `${player.firstName}${player.lastName ? " " + player.lastName : ""}`,
          username: player.username || "",
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || u("networkError")); hapticNotify("error"); sfx.error(); }
      else {
        setStatus((d.status as Status) || "pending");
        setMsg(u("chatPending"));
        hapticNotify("success");
      }
    } catch {
      setMsg(u("networkError"));
    }
    setSending(false);
  }

  const badge =
    status === "active"
      ? { t: u("chatActive"), c: "#39c46f", dot: "#39c46f" }
      : status === "pending"
      ? { t: u("chatPending"), c: "#fbbf24", dot: "#fbbf24" }
      : { t: u("chatClosed"), c: ts.textSub, dot: "#8a8a8a" };

  const mmss = `${String(Math.floor(recSecs / 60)).padStart(2, "0")}:${String(recSecs % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen" style={{ background: pageBg(theme, GAME_BG.home), color: ts.text }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => { haptic(); nav("/"); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
          style={{ background: ts.btnSecondary, border: `1px solid ${ts.cardBorder}`, color: ts.text }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="font-black text-lg leading-none" style={{ color: GOLD.light }}>{u("liveChat")}</p>
          <p className="text-[11px] mt-1" style={{ color: ts.textSub }}>{u("liveChatSub")}</p>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-28">
        {/* status card */}
        <div className="rounded-3xl p-5 pro-sheen relative overflow-hidden"
          style={{ background: ts.card, border: `1px solid ${GOLD.border}`, boxShadow: "0 14px 34px rgba(0,0,0,0.42)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest flex items-center gap-1.5" style={{ color: badge.c }}>
              <span className="w-2 h-2 rounded-full" style={{ background: badge.dot, boxShadow: `0 0 10px ${badge.dot}` }} />
              {badge.t}
            </span>
            <span className="text-[11px]" style={{ color: ts.textSub }}>ID: {player?.telegramId}</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: GOLD.grad, boxShadow: `0 8px 22px ${GOLD.glow}` }}
            >
              <Headphones size={26} color="#1a1200" />
            </div>
            <div className="flex-1">
              <p className="font-black" style={{ color: ts.text }}>{u("chatWithAdmin")}</p>
              <p className="text-[12px] leading-snug mt-0.5" style={{ color: ts.textSub }}>{u("chatDesc")}</p>
            </div>
          </div>

          <button
            onClick={request}
            disabled={sending || status === "active"}
            className="w-full mt-4 py-4 rounded-2xl font-black active:scale-[0.98] transition pro-sheen flex items-center justify-center gap-2"
            style={{
              background: status === "active" ? XGREEN.grad : GOLD.grad,
              color: status === "active" ? "#fff" : "#1a1200",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: status === "active" ? XGREEN.shadow : `0 10px 26px ${GOLD.glow}`,
              opacity: sending ? 0.6 : 1,
            }}
          >
            {status === "active" ? <ShieldCheck size={18} /> : <Headphones size={18} />}
            {status === "active" ? u("chatActive") : sending ? u("sending") : u("callAdmin")}
          </button>

          {(status === "active" || status === "pending") && (
            <button
              onClick={() => { haptic(); openBotChat(botUsername); }}
              className="w-full mt-2 py-3.5 rounded-2xl font-black active:scale-[0.98] transition flex items-center justify-center gap-2"
              style={{ background: ts.btnSecondary, color: ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}` }}
            >
              <ExternalLink size={16} /> {u("openInBot")}
            </button>
          )}

          {msg && <p className="text-[12px] mt-3 text-center font-bold" style={{ color: ts.text }}>{msg}</p>}
        </div>

        {/* ilova ichidagi 2 kishilik chat */}
        {(status === "active" || chat.length > 0) && (
          <div className="rounded-3xl p-3" style={{ background: ts.card, border: `1px solid ${GOLD.border}` }}>
            <p className="text-[11px] font-black tracking-widest mb-2 px-1" style={{ color: ts.textSub }}>
              {u("chatConvo")}
            </p>
            <div ref={listRef} className="space-y-2 overflow-y-auto px-1" style={{ maxHeight: 320 }}>
              {chat.length === 0 && (
                <p className="text-[12px] text-center py-6" style={{ color: ts.textSub }}>{u("chatEmpty")}</p>
              )}
              {chat.map((m) =>
                m.from === "system" ? (
                  <p key={m.id} className="text-[11px] text-center py-1" style={{ color: ts.textSub }}>{m.text}</p>
                ) : (
                  <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[78%] px-3 py-2 rounded-2xl text-[13px] leading-snug"
                      style={
                        m.from === "user"
                          ? { background: GOLD.grad, color: "#1a1200", borderBottomRightRadius: 6 }
                          : { background: ts.btnSecondary, color: ts.text, border: `1px solid ${ts.cardBorder}`, borderBottomLeftRadius: 6 }
                      }
                    >
                      <span className="block text-[10px] font-black opacity-70 mb-0.5">
                        {m.from === "user" ? u("chatYou") : u("chatAdmin")}
                      </span>
                      {m.text}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* yozib olish indikatori */}
            {recording && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <span className="w-2.5 h-2.5 rounded-full rec-pulse" style={{ background: "#ef4444" }} />
                <span className="text-[12px] font-black" style={{ color: "#ef4444" }}>{u("recording")} · {mmss}</span>
                <div className="flex items-end gap-[3px] ml-auto h-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="vu-bar w-[3px] h-full rounded-full"
                      style={{ background: "#ef4444", animationDelay: `${i * 0.09}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder={status === "active" ? u("chatInput") : u("chatInactive")}
                disabled={status !== "active"}
                className="flex-1 min-w-0 px-3 py-3 rounded-2xl text-[13px] outline-none"
                style={{ background: ts.btnSecondary, color: ts.text, border: `1px solid ${ts.cardBorder}` }}
              />
              {/* Ovozli xabar */}
              <button
                onClick={() => (recording ? stopRecording() : startRecording())}
                disabled={status !== "active" || voiceBusy}
                aria-label={u("holdToRecord")}
                className="w-12 shrink-0 rounded-2xl flex items-center justify-center active:scale-95 transition disabled:opacity-45"
                style={{
                  background: recording ? "linear-gradient(180deg,#f87171,#dc2626)" : ts.btnSecondary,
                  color: recording ? "#fff" : ts.btnSecondaryText,
                  border: `1px solid ${recording ? "rgba(255,255,255,0.25)" : ts.cardBorder}`,
                }}
              >
                {recording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <button
                onClick={sendChat}
                disabled={status !== "active" || chatSending || !draft.trim()}
                aria-label="Yuborish"
                className="w-12 shrink-0 rounded-2xl flex items-center justify-center font-black active:scale-95 transition disabled:opacity-45"
                style={{ background: GOLD.grad, color: "#1a1200", border: `1px solid ${GOLD.border}` }}
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        )}

        {/* steps */}
        <div className="rounded-3xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-[11px] font-black tracking-widest mb-3" style={{ color: ts.textSub }}>{u("howItWorks")}</p>
          {[
            ["1", u("step1t"), u("step1s")],
            ["2", u("step2t"), u("step2s")],
            ["3", u("step3t"), u("step3s")],
            ["4", u("step4t"), u("step4s")],
          ].map(([n, title, sub]) => (
            <div key={n} className="flex gap-3 py-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0"
                style={{ background: GOLD.soft, color: GOLD.light, border: `1px solid ${GOLD.border}` }}
              >
                {n}
              </div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: ts.text }}>{title}</p>
                <p className="text-[11px]" style={{ color: ts.textSub }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-center" style={{ color: ts.textSub }}>{u("endChatHint")}</p>
      </div>
    </div>
  );
}
