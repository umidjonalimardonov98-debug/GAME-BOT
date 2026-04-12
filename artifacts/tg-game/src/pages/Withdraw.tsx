import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { withdraw } from "@/lib/api";

const AMOUNTS = [10000, 25000, 50000, 100000];

export default function Withdraw() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [selected, setSelected] = useState<number | null>(null);
  const [card, setCard] = useState("");
  const [holder, setHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const wagerLeft = player ? Math.max(0, player.wagerRequirement - player.totalWagered) : 0;
  const canWithdraw = wagerLeft === 0;

  const submit = async () => {
    if (!selected || !card || !holder || !player) return;
    setLoading(true); setErr("");
    try {
      await withdraw(player.telegramId, selected);
      await refresh();
      setDone(true);
    } catch (e: any) {
      setErr(e.message || "Xato yuz berdi");
    } finally { setLoading(false); }
  };

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #090b14 0%, #0d1020 100%)" }}>
      <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
      <h2 className="text-white font-black text-xl mb-2">So'rov Yuborildi!</h2>
      <p className="text-white/50 text-sm text-center mb-6">Admin tasdiqlashini kuting. Tez orada kartangizga o'tkaziladi.</p>
      <button onClick={() => nav("/")} className="px-8 py-3 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
        🏠 Bosh Sahifa
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #090b14 0%, #0d1020 100%)" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-lg">💸 Pul Yechish</h1>
      </div>

      <div className="px-4 flex-1">
        {/* Balance */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg, #1a1200, #2d1f00)", border: "1px solid rgba(245,200,66,0.3)" }}>
          <p className="text-yellow-400/60 text-xs uppercase tracking-widest">💰 Mavjud Balans</p>
          <p className="text-white font-black text-2xl mt-1">{(player?.balance ?? 0).toLocaleString()} <span className="text-yellow-400 text-lg">UZS</span></p>
        </div>

        {/* Wager check */}
        {!canWithdraw ? (
          <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-bold text-sm">Shart bajarilmagan!</p>
                <p className="text-white/50 text-xs mt-1">Chiqarish uchun depozit miqdorini 100% o'ynashingiz kerak.</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Depozit miqdori:</span>
                <span className="text-white font-bold">{(player?.totalDeposited ?? 0).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">O'ynaldi:</span>
                <span className="text-white font-bold">{(player?.totalWagered ?? 0).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-red-400">Qolgan:</span>
                <span className="text-red-400 font-black">{wagerLeft.toLocaleString()} UZS</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 bg-white/10 rounded-full h-2">
              <div className="bg-gradient-to-r from-red-500 to-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((player?.totalWagered ?? 0) / Math.max(1, player?.wagerRequirement ?? 1)) * 100)}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-3 mb-4 flex items-center gap-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-green-300 text-sm font-semibold">✅ Shart bajarildi! Pul yechi olasiz.</p>
            </div>

            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Miqdor</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[...AMOUNTS, player?.balance ?? 0].filter((a, i, arr) => arr.indexOf(a) === i && a <= (player?.balance ?? 0)).map((a) => (
                <button key={a} onClick={() => setSelected(a)}
                  className={`rounded-xl p-3 text-center transition-all active:scale-95 border ${selected === a ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5"}`}>
                  <p className={`font-black ${selected === a ? "text-yellow-300" : "text-white"}`}>{a.toLocaleString()}</p>
                  <p className="text-white/40 text-xs">UZS</p>
                </button>
              ))}
            </div>

            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Karta Ma'lumotlari</p>
            <div className="space-y-2 mb-4">
              <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="Karta raqami (8600...)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 font-mono text-sm focus:outline-none focus:border-yellow-400/50" />
              <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Karta egasi (Ism Familiya)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-yellow-400/50" />
            </div>

            {err && <p className="text-red-400 text-sm text-center mb-3">❌ {err}</p>}

            <button onClick={submit} disabled={!selected || !card || !holder || loading}
              className="w-full py-4 rounded-2xl font-black text-base mb-6 active:scale-95 transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}>
              {loading ? "Yuborilmoqda..." : "💸 So'rov Yuborish"}
            </button>
          </>
        )}

        {!canWithdraw && (
          <button onClick={() => nav("/")}
            className="w-full py-4 rounded-2xl font-bold text-base mb-6 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #1a6b2a, #145220)", border: "1px solid rgba(34,197,94,0.3)" }}>
            🎮 O'ynashni Davom Ettirish
          </button>
        )}
      </div>
    </div>
  );
}
