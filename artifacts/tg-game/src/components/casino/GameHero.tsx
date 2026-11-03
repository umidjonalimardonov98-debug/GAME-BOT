import SmartImage from "@/components/SmartImage";
import { coverOf, type GameCfg } from "@/lib/new-games";
import type { Lang } from "@/lib/i18n";

const ENGINE_LABEL: Record<string, Record<Lang, string>> = {
  mines: { uz: "MINA OVI", ru: "МИНЫ", en: "MINES" },
  crash: { uz: "KRESH", ru: "КРАШ", en: "CRASH" },
  sicbo: { uz: "ZARLAR", ru: "КОСТИ", en: "DICE" },
  roulette: { uz: "RULETKA", ru: "РУЛЕТКА", en: "ROULETTE" },
  hilo: { uz: "KARTA", ru: "КАРТЫ", en: "CARDS" },
  war: { uz: "KARTA JANGI", ru: "БИТВА КАРТ", en: "CARD WAR" },
  plinko: { uz: "PLINKO", ru: "ПЛИНКО", en: "PLINKO" },
  keno: { uz: "KENO", ru: "КЕНО", en: "KENO" },
  scratch: { uz: "QIRIB OCH", ru: "СКРЕТЧ", en: "SCRATCH" },
  match3: { uz: "KASKAD", ru: "КАСКАД", en: "CASCADE" },
  bingo: { uz: "BINGO", ru: "БИНГО", en: "BINGO" },
  lotto: { uz: "LOTEREYA", ru: "ЛОТО", en: "LOTTO" },
  memory: { uz: "XOTIRA", ru: "ПАМЯТЬ", en: "MEMORY" },
  fishing: { uz: "OV", ru: "ОХОТА", en: "HUNT" },
  wheel: { uz: "G'ILDIRAK", ru: "КОЛЕСО", en: "WHEEL" },
  reel: { uz: "SLOT", ru: "СЛОТ", en: "SLOT" },
  race: { uz: "POYGA", ru: "ГОНКА", en: "RACE" },
  climb: { uz: "MINORA", ru: "БАШНЯ", en: "TOWER" },
  board: { uz: "NARD", ru: "НАРДЫ", en: "BOARD" },
};

/** O'yin tepasidagi haqiqiy suratli banner: sekin zoom, yaltirash, x-koeffitsiyent. */
export default function GameHero({ cfg, lang, live }: { cfg: GameCfg; lang: Lang; live?: boolean }) {
  const cover = coverOf(cfg.key);
  return (
    <div className={`gh-hero w-full ${live ? "gh-live" : ""}`} style={{ ["--ga" as any]: cfg.c1 }}>
      {cover && (
        <SmartImage src={cover} alt={cfg.name[lang]} sizes="(max-width: 480px) 100vw, 480px"
          loading="eager" className="gh-img" />
      )}
      <span className="gh-shade" />
      <span className="gh-shine" />
      <div className="gh-body">
        <span className="gh-kind">{ENGINE_LABEL[cfg.engine]?.[lang] ?? cfg.engine.toUpperCase()}</span>
        <span className="gh-title">{cfg.name[lang]}</span>
      </div>
      <span className="gh-mult">
        <span className="gh-mult-label">MAX</span>x{cfg.mult}
      </span>
      {live && <span className="gh-live-dot">LIVE</span>}
    </div>
  );
}
