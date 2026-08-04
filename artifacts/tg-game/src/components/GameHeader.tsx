import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, GOLD } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import SoundToggle from "@/components/SoundToggle";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LangSwitcher from "@/components/LangSwitcher";
import Odometer from "@/components/casino/Odometer";
import { sfx } from "@/lib/sound";

interface Props {
  title: string;
  subtitle?: string;
  hideTheme?: boolean;
}

export default function GameHeader({ title, subtitle, hideTheme }: Props) {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const { theme, ts } = useTheme();
  const { t } = useLang();

  const isLight = theme === "light";

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 relative z-50"
      style={{
        background: isLight ? "#ffffff" : "#0a1726",
        borderBottom: `1px solid ${ts.cardBorder}`,
      }}
    >
      {/* Ortga */}
      <button
        aria-label="back"
        onClick={() => {
          sfx.back();
          nav("/");
        }}
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-90 transition-transform tap-glow"
        style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}` }}
      >
        <ArrowLeft className="w-4 h-4" style={{ color: isLight ? "#0b3f8f" : "#ffffff" }} />
      </button>

      {/* Sarlavha */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-base leading-tight truncate" style={{ color: ts.text }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs truncate" style={{ color: ts.textSub }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Balans */}
      <div className="text-right shrink-0 mr-1">
        <p className="text-[9px] font-bold tracking-wider" style={{ color: ts.textSub }}>
          {t.balanceLabel.toUpperCase()}
        </p>
        <Odometer
          value={player?.balance ?? 0}
          className="font-black text-xs"
          style={{ color: "#ffcf4a" }}
        />
      </div>

      {/* Mavzu (kichik suratcha bilan) */}
      {!hideTheme && <ThemeSwitcher compact />}

      {/* Ovoz */}
      <SoundToggle light={isLight} />

      {/* Til */}
      <LangSwitcher />
    </div>
  );
}
