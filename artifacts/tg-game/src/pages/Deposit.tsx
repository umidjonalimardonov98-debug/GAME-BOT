import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, Check } from "lucide-react";

const CARD = "5614683518277611";
const HOLDER = "ALIMARDONOV UMIDJON";
const BONUS = 20;

const AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

export default function Deposit() {
  const [, nav] = useLocation();
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const copy = () => {
    navigator.clipboard.writeText(CARD).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatCard = (c: string) => c.replace(/(\d{4})/g, "$1 ").trim();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #090b14 0%, #0d1020 100%)" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-lg">➕ Hisob To'ldirish</h1>
      </div>

      <div className="px-4 flex-1">
        {/* Bonus banner */}
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "linear-gradient(135deg, #1a4d1a, #0d2b0d)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <p className="text-green-400 text-2xl font-black">🎁 +{BONUS}% BONUS</p>
          <p className="text-green-300/70 text-sm mt-1">Har qanday to'ldirish uchun!</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #1a1200, #2d1f00)", border: "1px solid rgba(245,200,66,0.3)" }}>
          <p className="text-yellow-400/60 text-xs uppercase tracking-widest mb-3">💳 To'lov Kartasi</p>

          {/* Card number - tap to copy */}
          <button onClick={copy} className="w-full flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 mb-3 active:scale-95 transition-transform border border-yellow-400/20">
            <span className="text-white font-mono text-lg font-bold tracking-wider">{formatCard(CARD)}</span>
            <div className={`ml-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${copied ? "bg-green-500" : "bg-yellow-400/20"}`}>
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-yellow-400" />}
            </div>
          </button>

          {copied && (
            <p className="text-green-400 text-xs text-center mb-2 font-semibold">✅ Nusxa olindi!</p>
          )}

          <p className="text-white/60 text-sm">👤 {HOLDER}</p>
        </div>

        {/* Amount selection */}
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Miqdor Tanlang</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {AMOUNTS.map((a) => {
            const bonus = Math.floor(a * BONUS / 100);
            const isSelected = selected === a;
            return (
              <button key={a} onClick={() => setSelected(a)}
                className={`rounded-xl p-3 text-left transition-all active:scale-95 ${isSelected ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5"} border`}>
                <p className={`font-black text-base ${isSelected ? "text-yellow-300" : "text-white"}`}>{a.toLocaleString()} UZS</p>
                <p className="text-green-400 text-xs mt-0.5">+{bonus.toLocaleString()} bonus</p>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="flex justify-between mb-1">
              <span className="text-white/60 text-sm">To'lov:</span>
              <span className="text-white font-bold">{selected.toLocaleString()} UZS</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-white/60 text-sm">Bonus (+{BONUS}%):</span>
              <span className="text-green-400 font-bold">+{Math.floor(selected * BONUS / 100).toLocaleString()} UZS</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-white/60 text-sm">Jami:</span>
              <span className="text-yellow-400 font-black">{(selected + Math.floor(selected * BONUS / 100)).toLocaleString()} UZS</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-indigo-300 font-bold text-sm mb-2">📋 Qanday qilish kerak?</p>
          <ol className="text-white/60 text-sm space-y-1.5">
            <li>1️⃣ Yuqoridagi kartaga pul o'tkaring</li>
            <li>2️⃣ Chek (screenshot) oling</li>
            <li>3️⃣ Bot orqali chekni yuboring</li>
            <li>4️⃣ Admin tasdiqlagach balans to'ldiriladi</li>
          </ol>
        </div>

        <a href="https://t.me/+BIxGcXiUhIc5MWJi"
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-transform mb-6"
          style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}>
          📨 Botga Chek Yuborish
        </a>
      </div>
    </div>
  );
}
