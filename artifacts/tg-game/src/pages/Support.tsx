import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GAME_BG, GOLD } from "@/lib/theme-context";
import { haptic, hapticNotify, openBotChat } from "@/lib/telegram";

type Status = "idle"|"pending"|"active";

export default function Support() {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const { theme, ts } = useTheme();
  const [status, setStatus] = useState<Status>("idle");
  const [botUsername, setBotUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const prev = useRef<Status>("idle");
  type ChatMsg = { id: number; from: "user"|"admin"|"system"; text: string; at: number };
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const sinceRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);

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
        if (arr.some((m) => m.from === "admin")) hapticNotify("success");
      }
    } catch {}
  }

  async function sendChat() {
    const text = draft.trim();
    if (!player || !text || chatSending) return;
    haptic("light");
    setChatSending(true);
    try {
      const res = await fetch("/api/support/live-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: player.telegramId, text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(" "+ (d.error ||"Yuborilmadi")); hapticNotify("error"); }
      else { setDraft(""); await loadMessages(); }
    } catch { setMsg(" Tarmoq xatosi"); }
    setChatSending(false);
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

  useEffect(() =>{
    loadStatus();
    loadMessages();
    const i = setInterval(() =>{ loadStatus(); loadMessages(); }, 2500);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.telegramId]);

  useEffect(() =>{
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.length]);

  useEffect(() =>{
    if (prev.current !== "active"&& status ==="active") {
      hapticNotify("success");
      setMsg(" Admin suhbatni qabul qildi! Shu yerda yozishingiz mumkin.");
    }
    prev.current = status;
  }, [status]);

  async function request() {
    if (!player || sending) return;
    haptic("medium");
    setSending(true);
    setMsg("");
    try {
      const res = await fetch("/api/support/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: player.telegramId,
          name: `${player.firstName}${player.lastName ? " "+ player.lastName :""}`,
          username: player.username || "",
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(" "+ (d.error ||"So'rov yuborilmadi"));
        hapticNotify("error");
      } else {
        setStatus((d.status as Status) || "pending");
        setMsg(" So'rov adminlarga yuborildi. Tasdiqlashi bilan chat ochiladi.");
        hapticNotify("success");
      }
    } catch {
      setMsg(" Tarmoq xatosi");
    }
    setSending(false);
  }

  const badge =
    status === "active"
      ? { t: " SUHBAT FAOL", c: "#4ade80" }
      : status === "pending"
      ? { t: " ADMIN TASDIQLASHI KUTILMOQDA", c: "#fbbf24" }
      : { t: " SUHBAT YOPIQ", c: "rgba(255,255,255,0.6)" };

  return (
    <div className="min-h-screen" style={{ background: pageBg(theme, GAME_BG.home), color: ts.text }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() =>{ haptic(); nav("/"); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
          style={{ background: ts.btnSecondary, border: `1px solid ${ts.cardBorder}`, color: ts.text }}
        >
          ←
        </button>
        <div>
          <p className="font-black text-lg leading-none" style={{ color: GOLD.light }}>Jonli suhbat</p>
          <p className="text-[11px] mt-1" style={{ color: ts.textSub }}>Admin bilan to'g'ridan-to'g'ri</p>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-28">
        {/* status card */}
        <div className="rounded-3xl p-5" style={{ background: ts.card, border: `1px solid ${GOLD.border}`, boxShadow: `0 14px 34px rgba(0,0,0,0.45)` }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest" style={{ color: badge.c }}>{badge.t}</span>
            <span className="text-[11px]" style={{ color: ts.textSub }}>ID: {player?.telegramId}</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: GOLD.grad, boxShadow: `0 8px 22px ${GOLD.glow}`, fontSize: 26 }}
            >
              
            </div>
            <div className="flex-1">
              <p className="font-black" style={{ color: ts.text }}>Admin bilan jonli chat</p>
              <p className="text-[12px] leading-snug mt-0.5" style={{ color: ts.textSub }}>
                Tugmani bosing — adminlarga so'rov boradi. Tasdiqlangach xabarlaringiz avtomatik bot ichidagi
                chatga ulanadi: matn, rasm va <b>ovozli xabar</b>.
              </p>
            </div>
          </div>

          <button
            onClick={request}
            disabled={sending || status === "active"}
            className="w-full mt-4 py-4 rounded-2xl font-black active:scale-[0.98] transition"
            style={{
              background: status === "active"?"rgba(74,222,128,0.18)" : GOLD.grad,
              color: status === "active"?"#4ade80":"#1a1200",
              border: `1px solid ${GOLD.border}`,
              boxShadow: `0 10px 26px ${GOLD.glow}`,
              opacity: sending ? 0.6 : 1,
            }}
          >
            {status === "active"?"SUHBAT FAOL": sending ?"YUBORILMOQDA...":" ADMINNI CHAQIRISH"}
          </button>

          {(status === "active"|| status ==="pending") && (
            <button
              onClick={() =>{ haptic(); openBotChat(botUsername); }}
              className="w-full mt-2 py-3.5 rounded-2xl font-black active:scale-[0.98] transition"
              style={{ background: ts.btnSecondary, color: ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}` }}
            >
               Chatni ochish (bot)
            </button>
          )}

          {msg && (
            <p className="text-[12px] mt-3 text-center font-bold" style={{ color: ts.text }}>{msg}</p>
          )}
        </div>

        {/* ilova ichidagi 2 kishilik chat */}
        {(status === "active" || chat.length > 0) && (
          <div className="rounded-3xl p-3" style={{ background: ts.card, border: `1px solid ${GOLD.border}` }}>
            <p className="text-[11px] font-black tracking-widest mb-2 px-1" style={{ color: ts.textSub }}>
              SUHBAT — SIZ VA ADMIN
            </p>
            <div ref={listRef} className="space-y-2 overflow-y-auto px-1" style={{ maxHeight: 320 }}>
              {chat.length === 0 && (
                <p className="text-[12px] text-center py-6" style={{ color: ts.textSub }}>Hozircha xabar yo'q</p>
              )}
              {chat.map((m) =>
                m.from === "system" ? (
                  <p key={m.id} className="text-[11px] text-center py-1" style={{ color: ts.textSub }}>{m.text}</p>
                ) : (
                  <div key={m.id} className={`flex ${m.from === "user"?"justify-end":"justify-start"}`}>
                    <div
                      className="max-w-[78%] px-3 py-2 rounded-2xl text-[13px] leading-snug"
                      style={
                        m.from === "user"
                          ? { background: GOLD.grad, color: "#1a1200", borderBottomRightRadius: 6 }
                          : { background: ts.btnSecondary, color: ts.text, border: `1px solid ${ts.cardBorder}`, borderBottomLeftRadius: 6 }
                      }
                    >
                      <span className="block text-[10px] font-black opacity-70 mb-0.5">
                        {m.from === "user"?"Siz":"Admin"}
                      </span>
                      {m.text}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) =>{ if (e.key === "Enter") sendChat(); }}
                placeholder={status === "active"?"Xabar yozing...":"Suhbat faol emas"}
                disabled={status !== "active"}
                className="flex-1 px-3 py-3 rounded-2xl text-[13px] outline-none"
                style={{ background: ts.btnSecondary, color: ts.text, border: `1px solid ${ts.cardBorder}` }}
              />
              <button
                onClick={sendChat}
                disabled={status !== "active" || chatSending || !draft.trim()}
                aria-label="Yuborish"
                className="px-4 rounded-2xl font-black active:scale-95 transition disabled:opacity-45"
                style={{ background: GOLD.grad, color: "#1a1200", border: `1px solid ${GOLD.border}` }}
              >
                
              </button>
            </div>
          </div>
        )}

        {/* steps */}
        <div className="rounded-3xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-[11px] font-black tracking-widest mb-3" style={{ color: ts.textSub }}>QANDAY ISHLAYDI</p>
          {[
            ["1", "Adminni chaqirasiz", "So'rov barcha adminlarga bildirishnoma bo'lib boradi."],
            ["2", "Admin tasdiqlaydi", "«Chatga kirish» tugmasini bosadi."],
            ["3", "Chat shu yerda ochiladi", "Ilova ichida 2 kishilik jonli suhbat: siz va admin."],
            ["4", "Ovozli xabar", " tugmasi orqali jonli ovoz yuborishingiz mumkin."],
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

        <p className="text-[11px] text-center" style={{ color: ts.textSub }}>
          Suhbatni tugatish uchun botda <b>/end</b> yozing.
        </p>
      </div>
    </div>
  );
}
