import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { getPlayerHistory } from "@/lib/api";
import { GAMES, LIVE_GAMES } from "@/lib/game-catalog";
import { GAME_NAMES } from "@/lib/game-i18n";
import { computeStats, type StatRow } from "@/lib/player-stats";
import GameHeader from "@/components/GameHeader";
import { Button } from "@/components/ui/button";
import "@/game-navigation.css";

const CATALOG = [...GAMES, ...LIVE_GAMES] as { key: string; path: string; img?: string; name?: string }[];
const L = {
  uz: { title: "Statistika", sub: "Oxirgi 100 ta raund", rounds: "Raundlar", wins: "G‘alabalar", rate: "G‘alaba %", net: "Sof natija", top: "Eng ko‘p o‘ynalgan", empty: "Hali raund yo‘q. Birinchi o‘yinni boshlang.", play: "O‘ynash", load: "Yuklanmoqda…", err: "Statistikani yuklab bo‘lmadi" },
  ru: { title: "Статистика", sub: "Последние 100 раундов", rounds: "Раунды", wins: "Победы", rate: "Победы %", net: "Итог", top: "Самые популярные", empty: "Пока нет раундов. Начните первую игру.", play: "Играть", load: "Загрузка…", err: "Не удалось загрузить" },
  en: { title: "Statistics", sub: "Last 100 rounds", rounds: "Rounds", wins: "Wins", rate: "Win rate", net: "Net result", top: "Most played", empty: "No rounds yet. Start your first game.", play: "Play", load: "Loading…", err: "Could not load stats" },
};

export default function Stats() {
  const { player } = usePlayer();
  const { lang } = useLang();
  const t = L[lang as keyof typeof L] ?? L.uz;
  const [, nav] = useLocation();
  const [rows, setRows] = useState<StatRow[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!player?.telegramId) return;
    let live = true;
    getPlayerHistory(player.telegramId).then(d => { if (live) setRows(d.games ?? []); }).catch(() => { if (live) setErr(true); });
    return () => { live = false; };
  }, [player?.telegramId]);
  const s = rows ? computeStats(rows) : null;
  const max = s?.games[0]?.rounds || 1;
  return (
    <div className="stats-page">
      <GameHeader title={t.title} subtitle={t.sub} />
      <main>
        {err ? <p className="stats-note">{t.err}</p> : !s ? <p className="stats-note">{t.load}</p> : <>
          <section className="stats-grid">
            <div><span>{t.rounds}</span><strong>{s.rounds}</strong></div>
            <div><span>{t.wins}</span><strong>{s.wins}</strong></div>
            <div><span>{t.rate}</span><strong>{s.winRate}%</strong></div>
            <div><span>{t.net}</span><strong data-neg={s.net < 0 ? "1" : "0"}>{s.net > 0 ? "+" : ""}{s.net.toLocaleString()}</strong></div>
          </section>
          <h2 className="stats-h">{t.top}</h2>
          {!s.games.length ? <p className="stats-note">{t.empty}</p> : <ol className="stats-list">
            {s.games.slice(0, 10).map((g, i) => {
              const item = CATALOG.find(c => c.key === g.key);
              const name = GAME_NAMES[g.key]?.[lang] ?? item?.name ?? g.key;
              return <li key={g.key} style={{ animationDelay: `${i * 40}ms` }}>
                <b>{i + 1}</b>
                {item?.img ? <img src={item.img} alt="" width={40} height={40} loading="lazy" /> : <i />}
                <div><strong>{name}</strong><small>{g.rounds} · {g.wins} {t.wins.toLowerCase()}</small><em style={{ width: `${(g.rounds / max) * 100}%` }} /></div>
                {item && <Button variant="ghost" onClick={() => nav(item.path)}>{t.play}</Button>}
              </li>;
            })}
          </ol>}
        </>}
      </main>
    </div>
  );
}
