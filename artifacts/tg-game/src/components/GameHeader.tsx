import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, SlidersHorizontal, CircleHelp, Users } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { getGameConfig } from "@/lib/api";
import { GAMES, LIVE_GAMES } from "@/lib/game-catalog";
import { GAME_NAMES } from "@/lib/game-i18n";
import SoundToggle from "@/components/SoundToggle";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Odometer from "@/components/casino/Odometer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sfx } from "@/lib/sound";
import "@/game-navigation.css";

interface Props { title: string; icon?: string; subtitle?: string; hideTheme?: boolean; }
export default function GameHeader({ title, subtitle, hideTheme }: Props) {
  const [location, nav] = useLocation();
  const { player } = usePlayer();
  const { lang } = useLang();
  const [menu, setMenu] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const currentPath = location.split("?")[0];
  const isLive = currentPath === "/live" || currentPath.startsWith("/pvp") || currentPath.startsWith("/arena/");
  const isGame = isLive || GAMES.some(game => game.path === currentPath);
  useEffect(() => {
    document.body.dataset.gh = "1";
    getGameConfig().then(config => {
      if (config?.games) setEnabled(Object.fromEntries(Object.entries(config.games).map(([key, value]) => [key, (value as { enabled?: boolean }).enabled !== false])));
    }).catch(() => {});
    return () => { delete document.body.dataset.gh; };
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenu(false); setPendingPath(null); } };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);
  const go = (path: string) => {
    if (path === currentPath) return;
    // Never silently leave an in-progress round or a live room.
    if (isGame && currentPath !== "/live") { setPendingPath(path); return; }
    sfx.select(); nav(path);
  };
  useEffect(() => { const back = () => go(isLive && currentPath !== "/live" ? "/live" : "/"); window.addEventListener("game:back", back); return () => window.removeEventListener("game:back", back); }, [currentPath]);
  return (
    <header className="game-nav-header">
      <div className="game-nav-main">
        <Button variant="ghost" className="nav-icon" aria-label="back" title="Orqaga" onClick={() => go(isLive && currentPath !== "/live" ? "/live" : "/")}><ArrowLeft size={18} /></Button>
        <div className="game-nav-title"><strong>{title.trim()}</strong>{subtitle && <small>{subtitle}</small>}</div>
        <Button variant="ghost" className="game-nav-balance" title="Balans" onClick={() => go("/deposit")}><Odometer value={player?.balance ?? 0} compact /></Button>
        <Button variant="ghost" className="nav-icon" aria-label="AI yordamchi" title="Yordam" onClick={() => window.dispatchEvent(new Event("askai:open"))}><CircleHelp size={18} /></Button>
        <div ref={menuRef}>
          <Button variant="ghost" className="nav-icon" aria-label="settings" aria-expanded={menu} title="Sozlamalar" onClick={() => setMenu(value => !value)}><SlidersHorizontal size={17} /></Button>
          {menu && <div className="game-settings">{!hideTheme && <div><span>Mavzu</span><ThemeSwitcher compact /></div>}<div><span>Ovoz</span><SoundToggle /></div><div><span>Til</span><LangSwitcher /></div></div>}
        </div>
      </div>
      {isGame && <nav className="game-switcher" aria-label="O‘yinlar">
        <Button variant="ghost" onClick={() => go(isLive ? "/" : "/live")}><Users size={16} />{isLive ? "Barcha o‘yinlar" : "LIVE PvP"}</Button>
        {(isLive ? LIVE_GAMES : GAMES.filter(game => enabled[game.key] !== false)).map(game => <Button variant="ghost" key={game.path} aria-pressed={currentPath === game.path} onClick={() => go(game.path)}><img src={game.img} alt="" loading="lazy" />{"name" in game ? game.name : GAME_NAMES[game.key]?.[lang] ?? game.key}</Button>)}
      </nav>}
      <Dialog open={Boolean(pendingPath)} onOpenChange={open => { if (!open) setPendingPath(null); }}><DialogContent className="game-switch-dialog"><DialogTitle className="sr-only">O‘yindan chiqish</DialogTitle>
        <DialogDescription>{lang === "ru" ? "Перейти в другую игру? Текущий раунд может ещё продолжаться." : lang === "en" ? "Switch games? Your current round may still be in progress." : "Boshqa o‘yinga o‘tasizmi? Joriy raund hali davom etayotgan bo‘lishi mumkin."}</DialogDescription>
        <footer><Button variant="ghost" autoFocus onClick={() => setPendingPath(null)}>{lang === "ru" ? "Остаться" : lang === "en" ? "Stay" : "Qolish"}</Button><Button variant="ghost" onClick={() => { const path = pendingPath; if (!path) return; setPendingPath(null); sfx.back(); nav(path); }}>{lang === "ru" ? "Перейти" : lang === "en" ? "Switch" : "O‘tish"}</Button></footer>
      </DialogContent></Dialog>
    </header>
  );
}
