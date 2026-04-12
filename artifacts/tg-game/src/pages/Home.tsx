import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { TrendingUp, Trophy, Zap, Wallet } from "lucide-react";

export default function Home() {
  const [, nav] = useLocation();
  const { player, loading } = usePlayer();

  const games = [
    {
      path: "/apple", emoji: "🍎", title: "Apple of Fortune",
      desc: "Olma toping • 10x gacha",
      grad: "linear-gradient(135deg, #064e3b, #065f46, #047857)",
      border: "rgba(16,185,129,0.5)", glow: "rgba(16,185,129,0.2)",
      tag: "HOT", tagColor: "#10b981",
    },
    {
      path: "/dice", emoji: "🎲", title: "Dice",
      desc: "Zar uloqtiring • x5.8 gacha",
      grad: "linear-gradient(135deg, #78350f, #92400e, #b45309)",
      border: "rgba(251,191,36,0.5)", glow: "rgba(251,191,36,0.15)",
      tag: "x5.8", tagColor: "#fbbf24",
    },
    {
      path: "/aviator", emoji: "✈️", title: "Aviator",
      desc: "Uchishdan oldin ol • ∞x",
      grad: "linear-gradient(135deg, #1e1b4b, #312e81, #3730a3)",
      border: "rgba(129,140,248,0.5)", glow: "rgba(129,140,248,0.15)",
      tag: "∞x", tagColor: "#818cf8",
    },
  ];

  const wagerLeft = player ? Math.max(0, player.wagerRequirement - player.totalWagered) : 0;
  const wagerProgress = player?.wagerRequirement
    ? Math.min(100, ((player.totalWagered) / player.wagerRequirement) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #050816 0%, #0a0a20 50%, #050816 100%)" }}>
      {/* Stars bg */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + "px", height: Math.random() * 2 + 1 + "px",
              left: Math.random() * 100 + "%", top: Math.random() * 60 + "%",
              opacity: Math.random() * 0.5 + 0.1,
            }} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
                🎮
              </div>
              <div>
                <p className="text-white font-black text-sm leading-tight">
                  {loading ? "..." : player?.firstName ?? "O'yinchi"}
                </p>
                <p className="text-white/30 text-xs">Casino Platform</p>
              </div>
            </div>
            <button onClick={() => nav("/howtoplay")}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              📖 Qoidalar
            </button>
          </div>

          {/* Balance card */}
          <div className="rounded-2xl p-4 mb-3 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))", border: "1px solid rgba(124,58,237,0.4)", backdropFilter: "blur(20px)" }}>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)" }} />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)" }} />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="w-3.5 h-3.5" style={{ color: "rgba(167,139,250,0.7)" }} />
                <p className="text-xs font-semibold" style={{ color: "rgba(167,139,250,0.7)" }}>BALANSINGIZ</p>
              </div>
              <p className="text-white font-black leading-none" style={{ fontSize: 32 }}>
                {loading ? (
                  <span className="inline-block w-32 h-8 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.1)" }} />
                ) : (
                  <>{(player?.balance ?? 0).toLocaleString()} <span className="text-lg" style={{ color: "#a78bfa" }}>UZS</span></>
                )}
              </p>
              {player && (
                <div className="flex gap-4 mt-2.5 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" style={{ color: "#fbbf24" }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Yutgan: <span className="text-white font-bold">{player.totalWon.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" style={{ color: "#34d399" }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      O'yin: <span className="text-white font-bold">{player.gamesPlayed}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Wager progress */}
          {wagerLeft > 0 && (
            <div className="rounded-xl p-3 mb-3"
              style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-300">Chiqarish sharti</span>
                </div>
                <span className="text-xs text-yellow-400 font-black">{wagerProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${wagerProgress}%`, background: "linear-gradient(90deg, #eab308, #fbbf24)" }} />
              </div>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                Yana <b className="text-yellow-400">{wagerLeft.toLocaleString()} UZS</b> o'ynash kerak
              </p>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => nav("/leaderboard")}
              className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
              🏆 Reyting
            </button>
            <button onClick={() => nav("/withdraw")}
              className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>
              💸 Yechish
            </button>
          </div>
        </div>

        {/* Games */}
        <div className="px-4 pb-8">
          <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>🎮 O'YINLAR</p>
          <div className="flex flex-col gap-3">
            {games.map((g) => (
              <button key={g.path} onClick={() => nav(g.path)}
                className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all relative overflow-hidden"
                style={{ background: g.grad, border: `1px solid ${g.border}`, boxShadow: `0 8px 32px ${g.glow}` }}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                    style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)" }}>
                    {g.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-black text-base">{g.title}</p>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background: `${g.tagColor}22`, color: g.tagColor, border: `1px solid ${g.tagColor}44` }}>
                        {g.tag}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{g.desc}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.1)" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 18 }}>›</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
