import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTheme, pageBg } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";
import { sfx } from "@/lib/sound";
import { Users, ChevronRight, Radio } from "lucide-react";

type LiveGame = {
  path: string;
  title: string;
  sub: string;
  img: string;
  players: string;
  online: number;
  tables: number;
  id: string;
};

const TABLES: Omit<LiveGame, "online" | "tables">[] = [
  { path: "/pvp", img: "/games/pvpdurak.jpg", title: "DURAK", sub: "36 karta · kozir · to‘liq qoidalar", players: "2 kishilik", id: "DRK-01" },
  { path: "/pvp-blackjack", img: "/games/pvpblackjack.jpg", title: "BLACKJACK", sub: "21 ochko · haqiqiy raqib", players: "2 kishilik", id: "BJK-02" },
  { path: "/pvp-poker", img: "/games/pvppoker.jpg", title: "TEXAS POKER", sub: "Hold’em · umumiy bank", players: "2 kishilik", id: "PKR-03" },
];

async function getStats(path: string) {
  const response = await fetch(`/api${path}`);
  if (!response.ok) return { online: 0, tables: 0 };
  const data = await response.json();
  return { online: Number(data.online) || 0, tables: Number(data.tables) || 0 };
}

export default function PvpHub() {
  const [, nav] = useLocation();
  const { theme, ts } = useTheme();
  const [games, setGames] = useState<LiveGame[]>(TABLES.map((game) => ({ ...game, online: 0, tables: 0 })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const stats = await Promise.all([
        getStats("/pvp/config"),
        getStats("/pvp-bj/config"),
        getStats("/pvp-poker/config"),
      ]);
      if (active) {
        setGames(TABLES.map((game, index) => ({ ...game, ...stats[index] })));
        setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const totalOnline = games.reduce((sum, game) => sum + game.online, 0);
  const open = (path: string) => { sfx.select(); nav(path); };

  return (
    <div className="min-h-screen pb-8" style={{ background: pageBg(theme) }}>
      <GameHeader title="LIVE O‘YINLAR" subtitle="Haqiqiy odamlar bilan karta stollari" />

      <div className="mx-3 mb-3 flex items-center justify-between rounded-xl px-3 py-2.5"
        style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
        <div className="flex items-center gap-2">
          <Radio size={17} color="#22c55e" />
          <div>
            <p className="font-black" style={{ fontSize: 12, color: ts.text }}>JONLI STOLLAR</p>
            <p style={{ fontSize: 10, color: ts.textSub }}>Natijalar serverda hisoblanadi</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black" style={{ fontSize: 17, color: "#22c55e" }}>{loading ? "—" : totalOnline}</p>
          <p style={{ fontSize: 9, color: ts.textSub }}>ONLAYN</p>
        </div>
      </div>

      <div className="mx-3 flex flex-col gap-2.5">
        {games.map((game) => (
          <button key={game.path} onClick={() => open(game.path)}
            className="grid w-full grid-cols-[112px_1fr_30px] overflow-hidden rounded-xl text-left active:scale-[0.985]"
            style={{ minHeight: 112, background: ts.card, border: `1px solid ${ts.cardBorder}`, boxShadow: "0 6px 18px rgba(0,0,0,.24)" }}>
            <div className="relative h-full min-h-[112px] overflow-hidden">
              <img src={game.img} alt={`${game.title} live o‘yini`} className="absolute inset-0 h-full w-full object-cover" loading="eager" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,transparent 55%,rgba(0,0,0,.38))" }} />
              <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 font-black"
                style={{ fontSize: 9, color: "#fff", background: "#dc2626" }}>LIVE</span>
            </div>

            <div className="flex min-w-0 flex-col justify-center px-3 py-2">
              <div className="flex items-center gap-2">
                <p className="truncate font-black" style={{ fontSize: 15, color: ts.text }}>{game.title}</p>
                <span className="shrink-0 rounded px-1.5 py-0.5 font-black"
                  style={{ fontSize: 8, color: "#f7c948", background: "rgba(247,201,72,.12)", border: "1px solid rgba(247,201,72,.3)" }}>{game.id}</span>
              </div>
              <p className="mt-0.5 truncate font-semibold" style={{ fontSize: 10, color: ts.textSub }}>{game.sub}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1 font-black" style={{ fontSize: 10, color: ts.text }}>
                  <Users size={13} /> {game.players}
                </span>
                <span className="font-black" style={{ fontSize: 10, color: "#22c55e" }}>{game.online} o‘yinchi</span>
              </div>
              <p className="mt-1" style={{ fontSize: 9, color: ts.textSub }}>{game.tables} ta faol stol</p>
            </div>
            <div className="flex items-center justify-center"><ChevronRight size={23} color={ts.textSub} /></div>
          </button>
        ))}
      </div>

      <div className="mx-3 mt-4 rounded-xl px-3 py-3" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
        <p className="font-black" style={{ fontSize: 11, color: ts.text }}>O‘YIN TARTIBI</p>
        <p className="mt-1" style={{ fontSize: 10, lineHeight: 1.55, color: ts.textSub }}>
          Stolni tanlang, tikishni belgilang va haqiqiy raqib ulanishini kuting. Kartalar, navbat va natija server tomonidan boshqariladi.
        </p>
      </div>
    </div>
  );
}
