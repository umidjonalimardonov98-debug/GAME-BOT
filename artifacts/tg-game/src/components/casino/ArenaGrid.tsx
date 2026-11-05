import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import SmartImage from "@/components/SmartImage";
import { sfx } from "@/lib/sound";
import { loadArenaList, type ArenaDef } from "@/pages/Arena";

/** LIVE bo'limidagi 2–4 kishilik ARENA o'yinlari ro'yxati — haqiqiy suratli kartochkalar */
export default function ArenaGrid() {
  const [, nav] = useLocation();
  const [games, setGames] = useState<ArenaDef[]>([]);
  const [online, setOnline] = useState(0);
  useEffect(() => {
    loadArenaList().then((l) => { setGames(l.games ?? []); setOnline(l.online ?? 0); }).catch(() => {});
  }, []);
  if (!games.length) return null;
  return (
    <section className="px-3 pt-2 pb-1">
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="ar-kicker">YANGI · 2–4 O'YINCHI</p>
          <p className="ar-section-title">LIVE ARENA</p>
        </div>
        <span className="ar-online"><span className="ar-online-dot" />{online} onlayn</span>
      </div>
      <div className="live-arena-grid">
        {games.map((g, i) => (
          <Button variant="ghost" key={g.key} type="button" className="ar-tile-card" style={{ ["--c" as any]: g.color, animationDelay: `${Math.min(i, 10) * 40}ms` }}
            onClick={() => { sfx.select(); nav(`/arena/${g.key}`); }}>
            <SmartImage src={g.img} alt={g.title} sizes="(max-width: 480px) 50vw, 240px" className="ar-tile-img" />
            <span className="ar-tile-shade" />
            <span className="ar-tile-players">2–4</span>
            {g.live > 0 && <span className="ar-tile-live">{g.live} o'ynayapti</span>}
            <span className="ar-tile-body">
              <span className="ar-tile-title">{g.title}</span>
              <span className="ar-tile-sub">{g.sub}</span>
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
