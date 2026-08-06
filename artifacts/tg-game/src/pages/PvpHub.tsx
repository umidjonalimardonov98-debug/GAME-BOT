import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTheme, pageBg, GOLD } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";
import { sfx } from "@/lib/sound";

/** LIVE ZONA — barcha haqiqiy odamlar bilan o'ynaladigan o'yinlar shu yerda */

type G = { key: string; title: string; sub: string; img: string; emoji: string; live: number };

const CLASSIC = [
  { path: "/pvp", img: "/games/pvpblackjack.jpg", title: "DURAK", sub: "36 karta · suzish · 1x1", emoji: "🃏" },
  { path: "/pvp-blackjack", img: "/games/pvpblackjack.jpg", title: "BLACKJACK", sub: "1x1 · 21 ochko", emoji: "♠️" },
  { path: "/pvp-poker", img: "/games/pvppoker.jpg", title: "POKER", sub: "Texas Hold'em", emoji: "👑" },
];

export default function PvpHub() {
  const [, nav] = useLocation();
  const { theme, ts } = useTheme();
  const [games, setGames] = useState<G[]>([]);
  const [online, setOnline] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/api/duel/list")
        .then((r) => r.json())
        .then((d) => { setGames(d.games ?? []); setOnline(d.online ?? 0); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const go = (p: string) => { sfx.select(); nav(p); };

  return (
    <div className="min-h-screen pb-10" style={{ background: pageBg(theme) }}>
      <GameHeader title="LIVE PVP ARENA" subtitle="Haqiqiy odamlar bilan pul tikib o'ynang" />

      {/* Banner */}
      <div className="mx-4 mt-3 mb-4 rounded-3xl p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(120deg,#0a3b26,#126b46)", border: `1px solid ${GOLD.border}`, boxShadow: "0 8px 28px rgba(10,59,38,0.45)" }}>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-black"
          style={{ fontSize: 9, background: "rgba(239,68,68,0.9)", color: "#fff", letterSpacing: "0.12em" }}>
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: 99, background: "#fff" }} /> LIVE
        </span>
        <p className="font-black mt-1.5" style={{ fontSize: 20, color: "#fff" }}>
          ODAM <span className="gold-text">vs</span> ODAM
        </p>
        <p className="font-bold" style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>
          Tezkor matchmaking · o'yin ichida chat · g'olib bankni oladi
        </p>
        <p className="font-black mt-2" style={{ fontSize: 11, color: "#7CFFB2" }}>
          🟢 Hozir arenada: {online} o'yinchi
        </p>
      </div>

      {/* Karta o'yinlari */}
      <p className="mx-4 mb-2 font-black" style={{ fontSize: 12, color: GOLD.text, letterSpacing: "0.1em" }}>KARTA STOLLARI</p>
      <div className="grid grid-cols-3 gap-2 mx-4 mb-5">
        {CLASSIC.map((g) => (
          <button key={g.path} onClick={() => go(g.path)}
            className="relative overflow-hidden rounded-2xl text-left active:scale-[0.97] transition-transform"
            style={{ border: `1px solid ${GOLD.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.28)" }}>
            <img src={g.img} alt={g.title} loading="lazy" decoding="async" className="w-full h-20 object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.8))" }} />
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
              <p className="font-black truncate" style={{ fontSize: 11, color: "#fff" }}>{g.emoji} {g.title}</p>
              <p className="font-bold truncate" style={{ fontSize: 8, color: "rgba(255,255,255,0.72)" }}>{g.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Duel o'yinlari */}
      <p className="mx-4 mb-2 font-black" style={{ fontSize: 12, color: GOLD.text, letterSpacing: "0.1em" }}>1x1 DUELLAR</p>
      <div className="grid grid-cols-2 gap-2.5 mx-4">
        {games.map((g) => (
          <button key={g.key} onClick={() => go(`/duel/${g.key}`)}
            className="relative overflow-hidden rounded-2xl text-left active:scale-[0.97] transition-transform"
            style={{ border: `1px solid ${GOLD.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.28)" }}>
            <img src={g.img} alt={g.title} loading="lazy" decoding="async" className="w-full h-24 object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.82))" }} />
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full font-black"
              style={{ fontSize: 8, background: "rgba(239,68,68,0.92)", color: "#fff" }}>1x1</span>
            {g.live > 0 && (
              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full font-black"
                style={{ fontSize: 8, background: "rgba(16,185,129,0.92)", color: "#fff" }}>{g.live} 🟢</span>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="font-black truncate" style={{ fontSize: 12, color: "#fff" }}>{g.emoji} {g.title}</p>
              <p className="font-bold truncate" style={{ fontSize: 9, color: "rgba(255,255,255,0.75)" }}>{g.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center mt-6 text-[10px] font-bold" style={{ color: ts.textSub }}>
        G'olib bankning 92% ini oladi · durang bo'lsa pul qaytariladi
      </p>
    </div>
  );
}
