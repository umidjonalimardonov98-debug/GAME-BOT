import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/lib/player-context";
import { getPlayerHistory } from "@/lib/api";
import { useTheme, pageBg, GAME_BG, GOLD } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";

type GameRow = { id: number; type: "win"|"loss"; amount: number; game: string | null; createdAt: string };
type WithdrawalRow = { id: number; amount: number; status: string; cardNumber: string; createdAt: string };
const GAME_NAMES: Record<string, string> = { apple: " Olma Omadi", dice: " Zar", aviator: " Aviator", spin: " Aylanadur", blackjack: " Blackjack", slots: " Slot", parity: " Toq-Juft", mines: " Mines", roulette: " Ruletka" };

export default function History() {
  const { player } = usePlayer();
  const { theme, ts } = useTheme();
  const [tab, setTab] = useState<"games"|"withdrawals">("games");
  const [filter, setFilter] = useState("all");
  const [games, setGames] = useState<GameRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() =>{
    if (!player) return;
    getPlayerHistory(player.telegramId).then(data =>{ setGames(data.games ?? []); setWithdrawals(data.withdrawals ?? []); }).finally(() => setLoading(false));
  }, [player]);
  const visibleGames = useMemo(() => filter === "all" ? games : games.filter(row => row.game === filter), [games, filter]);
  const gameFilters = useMemo(() => [...new Set(games.map(row => row.game).filter((g): g is string => Boolean(g)))], [games]);
  const date = (value: string) => new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  return <div className="min-h-screen" style={{ background: pageBg(theme, GAME_BG.home) }}>
    <GameHeader title=" TARIX" subtitle="O'yin yutuqlari va pul yechishlar" />
    <main className="px-4 pb-10">
      <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-2xl" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
        {([['games', " O'yinlar"], ['withdrawals', " Pul yechish"]] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className="py-3 rounded-xl text-sm font-black"style={{ background: tab === key ? GOLD.grad :"transparent", color: tab === key ? "#211604" : ts.textSub }}>{label}</button>)}
      </div>
      {tab === "games" && gameFilters.length > 0 && <div className="flex gap-2 overflow-x-auto pb-3 mb-1">{["all", ...gameFilters].map(game => <button key={game} onClick={() => setFilter(game)} className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold"style={{ background: filter === game ? GOLD.soft : ts.input, border: `1px solid ${filter === game ? GOLD.border : ts.inputBorder}`, color: filter === game ? GOLD.light : ts.textSub }}>{game ==="all"?"Hammasi" : GAME_NAMES[game] ?? game}</button>)}</div>}
      <div className="space-y-2">
        {loading && <p className="text-center py-12" style={{ color: ts.textSub }}>Yuklanmoqda...</p>}
        {!loading && tab === "games" && visibleGames.map(row => <div key={row.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}><div><p className="font-black text-sm"style={{ color: ts.text }}>{GAME_NAMES[row.game ??""] ?? "O'yin"}</p><p className="text-xs mt-1" style={{ color: ts.textSub }}>{date(row.createdAt)}</p></div><div className="text-right"><p className="font-black"style={{ color: row.type ==="win"?"#39c46f":"#f87171"}}>{row.type ==="win"?"+":"−"}{row.amount.toLocaleString()} UZS</p><p className="text-xs"style={{ color: ts.textSub }}>{row.type ==="win"?"Yutuq":"Yutqazish"}</p></div></div>)}
        {!loading && tab === "withdrawals" && withdrawals.map(row => <div key={row.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}><div><p className="font-black text-sm" style={{ color: ts.text }}>{row.cardNumber}</p><p className="text-xs mt-1" style={{ color: ts.textSub }}>{date(row.createdAt)}</p></div><div className="text-right"><p className="font-black" style={{ color: GOLD.light }}>{row.amount.toLocaleString()} UZS</p><p className="text-xs font-bold"style={{ color: row.status ==="approved"?"#39c46f": row.status ==="rejected"?"#f87171":"#fbbf24"}}>{row.status ==="approved"?"To'landi": row.status ==="rejected"?"Rad etildi":"Kutilmoqda"}</p></div></div>)}
        {!loading && ((tab === "games"&& visibleGames.length === 0) || (tab ==="withdrawals" && withdrawals.length === 0)) && <p className="text-center py-12" style={{ color: ts.textSub }}>Hozircha tarix mavjud emas</p>}
      </div>
    </main>
  </div>;
}