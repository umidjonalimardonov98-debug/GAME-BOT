import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, GOLD } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import SoundToggle from "@/components/SoundToggle";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Odometer from "@/components/casino/Odometer";
import Sym from "@/components/casino/Sym";
import { sfx } from "@/lib/sound";

interface Props {
  title: string;
  /** sarlavha yonidagi rasmli belgi (emoji o'rniga) */
  icon?: string;
  subtitle?: string;
  hideTheme?: boolean;
}

export default function GameHeader({ title, icon, subtitle, hideTheme }: Props) {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const { theme, ts } = useTheme();
  const { t } = useLang();

  const isLight = false;

  // Sarlavhada yordam tugmasi bor — ekrandagi suzuvchi "?" yashiriladi (banner/maydon ustiga tushmasin)
  useEffect(() => {
    document.body.dataset.gh = "1";
    return () => { delete document.body.dataset.gh; };
  }, []);

  return (
    <div
      className="pro-header flex items-center gap-2 px-3 py-2.5 z-50"
    >
      {/* Ortga */}
      <button
        aria-label="back"
        onClick={() => {
          sfx.back();
          nav("/");
        }}
        className="pro-back w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ color: "#1a1204" }}
      >
        <ArrowLeft className="w-4 h-4 relative" strokeWidth={3} />
      </button>

      {/* Sarlavha */}
      {icon && <Sym n={icon} s={22} className="idle-float shrink-0 gh-icon" />}
      <div className="flex-1 min-w-0">
        <p className="font-black text-base leading-tight truncate" style={{ color: ts.text }}>
          {title.trim()}
        </p>
        {subtitle && (
          <p className="text-xs truncate" style={{ color: ts.textSub }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Balans */}
      <div className="text-right shrink-0 mr-1 max-w-[92px] overflow-hidden">
        <p className="text-[9px] font-bold tracking-wider" style={{ color: ts.textSub }}>
          {t.balanceLabel.toUpperCase()}
        </p>
        <Odometer
          value={player?.balance ?? 0}
          compact
          className="font-black text-xs whitespace-nowrap"
          style={{ color: "#ffcf4a" }}
        />
      </div>

      {/* Mavzu (kichik suratcha bilan) */}
      {!hideTheme && <ThemeSwitcher compact />}

      {/* Ovoz */}
      <button type="button" aria-label="AI yordamchi" onClick={() => window.dispatchEvent(new Event("askai:open"))}
        className="w-9 h-9 rounded-lg shrink-0 font-black text-base active:scale-90 transition-transform"
        style={{ background: "linear-gradient(145deg,#f7c948,#b45309)", color: "#1a1204", border: "1px solid rgba(255,243,176,.6)" }}>?</button>

      <SoundToggle light={isLight} />

      {/* Til */}
      <LangSwitcher />
    </div>
  );
}
