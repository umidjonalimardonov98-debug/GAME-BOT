import { useState } from "react";
import { useLocation } from "wouter";

// Lovable'da e'lon qilingan AI yordamchi manzili
const AI_URL = (import.meta as any).env?.VITE_AI_URL || "https://game-bot-ai.lovable.app/api/public/explain";
const HIDE = ["/", "/support", "/chat", "/deposit", "/withdraw", "/referral", "/history", "/leaderboard"];

export default function AskAI() {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [busy, setBusy] = useState(false);
  if (HIDE.includes(loc)) return null;
  const game = loc.replace(/^\//, "").replace(/[-/]/g, " ") || "o'yin";

  const ask = async (text = q) => {
    if (busy || text.trim().length < 2) return;
    setBusy(true); setA("");
    try {
      const last = (() => { try { return JSON.parse(sessionStorage.getItem("lastRound") || "null"); } catch { return null; } })();
      const r = await fetch(AI_URL, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, game, round: last }) });
      const d = await r.json().catch(() => ({}));
      setA(d.answer || d.error || "Javob olinmadi");
    } catch { setA("Internet bilan muammo. Qayta urinib ko'ring."); }
    setBusy(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="AI yordamchi"
        className="fixed z-40 right-3 top-[72px] w-11 h-11 rounded-full font-black text-lg ai-fab"
        style={{ background: "linear-gradient(145deg,#f7c948,#b45309)", color: "#1a1204", boxShadow: "0 6px 22px rgba(247,201,72,.5)" }}>?</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-3xl p-4 flex flex-col gap-3 ai-sheet"
            style={{ background: "linear-gradient(180deg,#141a2a,#06080f)", borderTop: "1px solid rgba(247,201,72,.5)" }}>
            <div className="flex items-center justify-between">
              <b style={{ color: "#f7c948" }}>🤖 AI yordamchi</b>
              <button onClick={() => setOpen(false)} className="text-white/70 text-xl">✕</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Bu o'yin qoidalari qanday?", "Oxirgi raundda nega yutqazdim?", "Koeffitsient qanday hisoblanadi?"].map((s) => (
                <button key={s} onClick={() => { setQ(s); ask(s); }} className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(247,201,72,.12)", color: "#f7c948", border: "1px solid rgba(247,201,72,.35)" }}>{s}</button>
              ))}
            </div>
            {(a || busy) && (
              <div className="text-sm leading-relaxed text-white/90 rounded-2xl p-3 max-h-[40vh] overflow-y-auto" style={{ background: "rgba(255,255,255,.05)" }}>
                {busy ? "O'ylayapti..." : a}
              </div>
            )}
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
                maxLength={500} placeholder="Savolingizni yozing..." className="flex-1 rounded-xl px-3 py-3 text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,.08)" }} />
              <button onClick={() => ask()} disabled={busy} className="px-4 rounded-xl font-black disabled:opacity-40"
                style={{ background: "linear-gradient(145deg,#22c55e,#15803d)", color: "#fff" }}>➤</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
