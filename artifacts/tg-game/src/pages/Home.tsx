import { useEffect } from "react";
import { useLocation } from "wouter";
import { useBalance } from "@/lib/balance";
import { initTelegramApp, getTelegramUser } from "@/lib/telegram";
import { Coins } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { balance } = useBalance();
  const user = getTelegramUser();

  useEffect(() => {
    initTelegramApp();
  }, []);

  const games = [
    {
      id: "apple",
      title: "Apple of Fortune",
      emoji: "🍄",
      desc: "Katakchalardan mushroom toping!",
      gradient: "from-emerald-600 to-green-800",
      border: "border-emerald-500",
      path: "/apple",
    },
    {
      id: "dice",
      title: "Dice",
      emoji: "🎲",
      desc: "Zar uloqtiring, g'alaba qozoning!",
      gradient: "from-yellow-500 to-amber-700",
      border: "border-yellow-400",
      path: "/dice",
    },
    {
      id: "aviator",
      title: "Aviator",
      emoji: "✈️",
      desc: "Samolyot tushishidan oldin chiqing!",
      gradient: "from-blue-600 to-indigo-800",
      border: "border-blue-400",
      path: "/aviator",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white flex flex-col">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-sm">Xush kelibsiz</p>
            <h1 className="text-xl font-bold text-white">
              {user ? user.first_name : "O'yinchi"} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-gray-800 border border-yellow-500/40 px-3 py-2 rounded-xl">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">
              {balance.toLocaleString()} UZS
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-500/30 rounded-2xl p-4 mb-6">
          <p className="text-xs text-yellow-400 uppercase tracking-wider font-semibold mb-1">Balans</p>
          <p className="text-3xl font-black text-white">{balance.toLocaleString()} <span className="text-yellow-400 text-xl">UZS</span></p>
        </div>

        <h2 className="text-lg font-bold text-gray-200 mb-4">O'yinlar</h2>

        <div className="flex flex-col gap-4">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => navigate(game.path)}
              className={`relative overflow-hidden rounded-2xl border ${game.border}/40 bg-gradient-to-br ${game.gradient} p-5 text-left active:scale-95 transition-transform shadow-lg`}
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">{game.emoji}</span>
                <div>
                  <h3 className="text-xl font-black text-white">{game.title}</h3>
                  <p className="text-sm text-white/70 mt-0.5">{game.desc}</p>
                </div>
                <div className="ml-auto text-white/40 text-2xl">›</div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 pointer-events-none">
                {game.emoji}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto px-4 pb-6 pt-4 text-center">
        <p className="text-xs text-gray-600">Demo o'yin. Haqiqiy pul yo'q.</p>
      </div>
    </div>
  );
}
