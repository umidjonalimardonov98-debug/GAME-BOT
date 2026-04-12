import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { Coins, TrendingUp, Trophy, Zap } from "lucide-react";

export default function Home() {
  const [, nav] = useLocation();
  const { player, loading } = usePlayer();

  const games = [
    { path: "/apple", emoji: "🍄", title: "Apple of Fortune", desc: "Mushroom toping, yuting!", color: "from-emerald-900/80 to-green-950", border: "border-emerald-500/40", glow: "hover:shadow-emerald-900/60" },
    { path: "/dice", emoji: "🎲", title: "Dice", desc: "Zar uloqtiring!", color: "from-amber-900/80 to-yellow-950", border: "border-amber-400/40", glow: "hover:shadow-amber-900/60" },
    { path: "/aviator", emoji: "✈️", title: "Aviator", desc: "Samolyot tushishidan oldin!", color: "from-blue-900/80 to-indigo-950", border: "border-blue-400/40", glow: "hover:shadow-blue-900/60" },
  ];

  const wagerLeft = player ? Math.max(0, player.wagerRequirement - player.totalWagered) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #090b14 0%, #0d1020 100%)" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            {loading ? (
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
            ) : (
              <p className="text-white font-bold text-base">👋 {player?.firstName ?? "O'yinchi"}</p>
            )}
            <p className="text-white/40 text-xs mt-0.5">Game Platformasi</p>
          </div>
          <button onClick={() => nav("/howtoplay")} className="text-xs bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-white/60">
            📖 Qoidalar
          </button>
        </div>

        {/* Balance card */}
        <div className="mt-4 rounded-2xl p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%)", border: "1px solid rgba(245,200,66,0.25)" }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #f5c842 0%, transparent 60%)" }} />
          <p className="text-yellow-400/70 text-xs uppercase tracking-widest font-semibold">💰 Balansingiz</p>
          <p className="text-3xl font-black text-white mt-1">
            {loading ? "..." : (player?.balance ?? 10000).toLocaleString()}
            <span className="text-yellow-400 text-lg ml-2">UZS</span>
          </p>
          {player && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-yellow-400/10">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-white/50">Yutgan: <span className="text-white">{player.totalWon.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-white/50">O'yinlar: <span className="text-white">{player.gamesPlayed}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Wager warning */}
        {wagerLeft > 0 && (
          <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">Chiqarish uchun yana <b>{wagerLeft.toLocaleString()} UZS</b> o'ynash kerak</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => nav("/deposit")}
            className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #1a6b2a, #145220)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Coins className="w-4 h-4 text-green-400" />
            <span className="text-green-300">➕ To'ldirish</span>
          </button>
          <button onClick={() => nav("/withdraw")}
            className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #1a1f6b, #111452)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <span className="text-indigo-300">💸 Yechish</span>
          </button>
        </div>
      </div>

      {/* Games */}
      <div className="px-4 pb-6">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3 mt-2">🎮 O'YINLAR</p>
        <div className="flex flex-col gap-3">
          {games.map((g) => (
            <button key={g.path} onClick={() => nav(g.path)}
              className={`relative overflow-hidden rounded-2xl border ${g.border} bg-gradient-to-br ${g.color} p-4 text-left active:scale-[0.98] transition-all hover:shadow-lg ${g.glow}`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl float-anim">{g.emoji}</span>
                <div className="flex-1">
                  <p className="text-white font-black text-lg leading-tight">{g.title}</p>
                  <p className="text-white/50 text-sm mt-0.5">{g.desc}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="text-white/40 text-lg">›</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pb-4 text-center">
        <p className="text-white/20 text-xs">⚡ Demo o'yin platformasi</p>
      </div>
    </div>
  );
}
