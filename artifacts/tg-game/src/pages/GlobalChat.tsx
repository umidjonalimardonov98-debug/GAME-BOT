import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GOLD } from "@/lib/theme-context";
import { ArrowLeft, Send, Users } from "lucide-react";

type Msg = {
  id: number;
  userId: string;
  name: string;
  username: string | null;
  text: string;
  admin: boolean;
  at: number;
  mine?: boolean;
};

const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

/** Ommaviy chat — hamma bir-birini ko'radi, xabarlar 1 soat turadi */
export default function GlobalChat() {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const { theme } = useTheme();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const lastId = useRef(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function poll() {
    try {
      const q = new URLSearchParams({
        since: String(lastId.current),
        telegramId: player?.telegramId ?? "",
      });
      const res = await fetch(`/api/chat/feed?${q}`);
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length) {
        lastId.current = data.lastId ?? lastId.current;
        setMsgs((prev) => [...prev, ...data.messages].slice(-120));
      }
    } catch { /* tarmoq — keyingi urinishda */ }
  }

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 2500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.telegramId]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    const body = text.trim();
    if (!body || !player || sending) return;
    setSending(true); setErr("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: player.telegramId,
          name: player.firstName,
          username: player.username ?? null,
          text: body,
        }),
      });
      const data = await res.json();
      if (data.error) setErr(data.error);
      else { setText(""); await poll(); }
    } catch { setErr("Tarmoq xatosi"); }
    setSending(false);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme) }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-20"
        style={{
          background: "linear-gradient(180deg,rgba(20,14,4,0.96),rgba(10,8,4,0.85))",
          borderBottom: `1px solid ${GOLD.border}`,
          backdropFilter: "blur(14px)",
        }}
      >
        <button onClick={() => nav("/")} className="p-2 rounded-xl active:scale-90 transition"
          style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}` }}>
          <ArrowLeft size={18} color="#f7c948" />
        </button>
        <div className="flex-1">
          <p className="font-black text-base" style={{ color: "#f7c948" }}>OMMAVIY CHAT</p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Xabarlar 1 soat saqlanadi
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
          style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}` }}>
          <Users size={14} color="#f7c948" />
          <span className="text-xs font-bold" style={{ color: "#f7c948" }}>{msgs.length}</span>
        </div>
      </div>

      {/* Xabarlar */}
      <div ref={boxRef} className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5">
        {msgs.length === 0 && (
          <div className="text-center mt-16 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Hozircha xabar yo'q — birinchi bo'lib yozing 👋
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-3 py-2"
              style={{
                background: m.admin
                  ? "linear-gradient(145deg,rgba(247,201,72,0.22),rgba(180,83,9,0.28))"
                  : m.mine
                    ? "linear-gradient(145deg,rgba(247,201,72,0.16),rgba(120,53,15,0.2))"
                    : "rgba(255,255,255,0.06)",
                border: `1px solid ${m.admin ? "rgba(247,201,72,0.55)" : m.mine ? GOLD.border : "rgba(255,255,255,0.10)"}`,
                boxShadow: m.admin ? "0 6px 22px rgba(247,201,72,0.18)" : "none",
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-black"
                  style={{ color: m.admin ? "#f7c948" : m.mine ? "#fcd34d" : "#7dd3fc" }}>
                  {m.admin ? "👑 ADMIN" : m.username ? `@${m.username}` : m.name}
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {hhmm(m.at)}
                </span>
              </div>
              <p className="text-sm leading-snug break-words" style={{ color: "#fff" }}>{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Yozish paneli */}
      <div className="px-3 pb-5 pt-2 sticky bottom-0"
        style={{ background: "linear-gradient(0deg,rgba(8,6,3,0.98),transparent)" }}>
        {err && <p className="text-xs mb-1.5 px-1" style={{ color: "#f87171" }}>{err}</p>}
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD.border}` }}>
          <input
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Xabar yozing..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#fff" }}
          />
          <button
            onClick={send}
            disabled={!player || sending || !text.trim()}
            className="p-2 rounded-xl active:scale-90 transition disabled:opacity-40"
            style={{ background: "linear-gradient(145deg,#f7c948,#b45309)" }}
          >
            <Send size={16} color="#1a1204" />
          </button>
        </div>
      </div>
    </div>
  );
}
