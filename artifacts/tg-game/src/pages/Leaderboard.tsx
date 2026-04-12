import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { getLeaderboard } from "@/lib/api";

type Entry = { rank: number; firstName: string; username: string | null; amount: number; gamesPlayed?: number };

const medals = ["🥇", "🥈", "🥉"];

function getName(e: Entry) {
  return e.username ? `@${e.username}` : e.firstName;
}

function List({ data, field }: { data: Entry[]; field: "deposit" | "win" }) {
  if (!data.length) return <p className="text-white/30 text-center py-8 text-sm">Ma'lumot yo'q</p>;
  return (
    <div className="flex flex-col gap-2">
      {data.map((e) => (
        <div key={e.rank} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{
            background: e.rank <= 3 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
            border: e.rank === 1 ? "1px solid rgba(250,204,21,0.3)" : e.rank === 2 ? "1px solid rgba(148,163,184,0.2)" : e.rank === 3 ? "1px solid rgba(180,120,60,0.2)" : "1px solid rgba(255,255,255,0.05)"
          }}>
          <span className="text-xl w-7 text-center shrink-0">
            {e.rank <= 3 ? medals[e.rank - 1] : <span className="text-white/30 text-sm font-bold">#{e.rank}</span>}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{getName(e)}</p>
            {field === "win" && e.gamesPlayed !== undefined && (
              <p className="text-white/30 text-xs">{e.gamesPlayed} o'yin</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`font-black text-sm ${field === "deposit" ? "text-green-400" : "text-yellow-400"}`}>
              {e.amount.toLocaleString()}
            </p>
            <p className="text-white/30 text-xs">UZS</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState<"win" | "deposit">("win");
  const [data, setData] = useState<{ topWinners: Entry[]; topDepositors: Entry[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #090b14 0%, #0d1020 100%)" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-lg">🏆 Reyting</h1>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => setTab("win")}
            className={`py-2.5 rounded-lg font-bold text-sm transition-all ${tab === "win" ? "text-yellow-400" : "text-white/40"}`}
            style={tab === "win" ? { background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.2)" } : {}}>
            🏆 Ko'p Yutganlar
          </button>
          <button onClick={() => setTab("deposit")}
            className={`py-2.5 rounded-lg font-bold text-sm transition-all ${tab === "deposit" ? "text-green-400" : "text-white/40"}`}
            style={tab === "deposit" ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" } : {}}>
            💰 Ko'p Tashlaganlar
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : (
          <List
            data={tab === "win" ? (data?.topWinners ?? []) : (data?.topDepositors ?? [])}
            field={tab}
          />
        )}
      </div>
    </div>
  );
}
