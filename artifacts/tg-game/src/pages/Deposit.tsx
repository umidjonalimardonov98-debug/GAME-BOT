import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { createDepositRequest } from "@/lib/api";

const CARD = "9860606756773093";
const HOLDER = "Xojanov Shavkat";
const BONUS = 20;

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

export default function Deposit() {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const activeAmount = customAmount ? Number(customAmount) : selected;
  const bonus = activeAmount ? Math.floor(activeAmount * BONUS / 100) : 0;
  const total = activeAmount ? activeAmount + bonus : 0;

  const copy = () => {
    navigator.clipboard.writeText(CARD).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatCard = (c: string) => c.replace(/(\d{4})/g, "$1 ").trim();

  const handleGoToBot = async () => {
    if (!player) { setError("Foydalanuvchi topilmadi"); return; }
    if (!activeAmount || activeAmount < 1000) {
      setError("Miqdorni tanlang (kamida 1 000 UZS)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await createDepositRequest(player.telegramId, activeAmount);
      setSent(true);
      setTimeout(() => {
        try {
          const tg = (window as any).Telegram?.WebApp;
          if (tg) { tg.close(); } else { window.history.back(); }
        } catch { window.history.back(); }
      }, 1200);
    } catch {
      setError("Xato yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #090b14 0%, #0d1020 100%)" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-lg">➕ Hisob To'ldirish</h1>
      </div>

      <div className="px-4 flex-1">
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "linear-gradient(135deg, #1a4d1a, #0d2b0d)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <p className="text-green-400 text-2xl font-black">🎁 +{BONUS}% BONUS</p>
          <p className="text-green-300/70 text-sm mt-1">Har qanday to'ldirish uchun!</p>
        </div>

        <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #1a1200, #2d1f00)", border: "1px solid rgba(245,200,66,0.3)" }}>
          <p className="text-yellow-400/60 text-xs uppercase tracking-widest mb-3">💳 To'lov Kartasi</p>
          <button onClick={copy} className="w-full flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 mb-3 active:scale-95 transition-transform border border-yellow-400/20">
            <span className="text-white font-mono text-lg font-bold tracking-wider">{formatCard(CARD)}</span>
            <div className={`ml-3 w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0 ${copied ? "bg-green-500" : "bg-yellow-400/20"}`}>
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-yellow-400" />}
            </div>
          </button>
          {copied && <p className="text-green-400 text-xs text-center mb-2 font-semibold">✅ Karta raqami nusxa olindi!</p>}
          <p className="text-white/60 text-sm">👤 {HOLDER}</p>
        </div>

        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Miqdor Kiriting</p>
        <input
          type="number"
          placeholder="Miqdorni o'zing kiriting..."
          value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setSelected(null); setError(""); }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-yellow-400 font-black text-lg placeholder-white/20 focus:outline-none focus:border-yellow-400/50 mb-3"
        />

        <p className="text-white/30 text-xs mb-2">yoki tanlang:</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESET_AMOUNTS.map((a) => {
            const b = Math.floor(a * BONUS / 100);
            const isSel = !customAmount && selected === a;
            return (
              <button key={a} onClick={() => { setSelected(a); setCustomAmount(""); setError(""); }}
                className={`rounded-xl p-2.5 text-left transition-all active:scale-95 border ${isSel ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5"}`}>
                <p className={`font-black text-sm ${isSel ? "text-yellow-300" : "text-white"}`}>{(a/1000).toFixed(0)}K</p>
                <p className="text-green-400 text-xs">+{(b/1000).toFixed(0)}K</p>
              </button>
            );
          })}
        </div>

        {activeAmount && activeAmount > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="flex justify-between mb-1">
              <span className="text-white/60 text-sm">To'lov:</span>
              <span className="text-white font-bold">{activeAmount.toLocaleString()} UZS</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-white/60 text-sm">Bonus (+{BONUS}%):</span>
              <span className="text-green-400 font-bold">+{bonus.toLocaleString()} UZS</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-white/60 text-sm">Jami:</span>
              <span className="text-yellow-400 font-black">{total.toLocaleString()} UZS</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-indigo-300 font-bold text-sm mb-2">📋 Qanday qilish kerak?</p>
          <ol className="text-white/60 text-sm space-y-1.5">
            <li>1️⃣ Yuqoridagi kartaga pul o'tkaring</li>
            <li>2️⃣ To'lov cheki (screenshot) oling</li>
            <li>3️⃣ Pastdagi tugmani bosib botga o'ting</li>
            <li>4️⃣ Chek rasmini botga yuboring</li>
            <li>5️⃣ Admin tasdiqlagach balans to'ldiriladi</li>
          </ol>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 mb-3 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-red-400 text-sm font-semibold">{error}</p>
          </div>
        )}

        {sent ? (
          <div className="rounded-2xl py-4 mb-6 text-center" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
            <p className="text-green-400 font-black text-lg">✅ So'rov yuborildi!</p>
            <p className="text-white/50 text-sm mt-1">Botga o'tyapsiz...</p>
          </div>
        ) : (
          <button
            onClick={handleGoToBot}
            disabled={loading || !activeAmount || activeAmount < 1000}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-transform mb-6 text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}>
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Yuklanmoqda...</>
              : "🤖 Botga O'tish va Chek Yuborish"}
          </button>
        )}
      </div>
    </div>
  );
}
