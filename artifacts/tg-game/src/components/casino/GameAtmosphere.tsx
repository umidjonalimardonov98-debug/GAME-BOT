import { memo } from "react";
import type { GameCfg } from "@/lib/new-games";

/**
 * Har bir o'yin uchun alohida jonli fon: nurlar, yulduzlar, neon to'r,
 * pufakchalar yoki tutun + o'yinning o'z 3D belgilari sekin suzib yuradi.
 * Faqat CSS animatsiya — telefonda yengil ishlaydi.
 */
export type Layer = GameCfg["layer"];

/** Umumiy jonli fon — istalgan o'yin sahifasiga: rang, fon turi va o'yinning o'z belgilari. */
export function Ambient({ color, layer, syms: symList, live, behind }: { color: string; layer: Layer; syms: string[]; live?: boolean; behind?: boolean }) {
  const cfg = { layer } as { layer: Layer };
  const syms = symList.length ? symList : ["coin"];
  return (
    <div aria-hidden className={`ga-root ga-${cfg.layer} ${live ? "ga-live" : ""}`}
      style={{ ["--ga" as any]: color, zIndex: behind ? -1 : 0 }}>
      {cfg.layer === "rays" && <div className="ga-rays" />}
      {cfg.layer === "grid" && <div className="ga-grid" />}
      {cfg.layer === "stars" && Array.from({ length: 26 }, (_, i) => (
        <span key={i} className="ga-star" style={{
          left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`,
          animationDelay: `${(i % 7) * 0.4}s`, width: 2 + (i % 3), height: 2 + (i % 3),
        }} />
      ))}
      {cfg.layer === "bubbles" && Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="ga-bubble" style={{
          left: `${(i * 29) % 100}%`, width: 8 + (i % 4) * 6, height: 8 + (i % 4) * 6,
          animationDuration: `${7 + (i % 5) * 1.6}s`, animationDelay: `${-(i * 1.3)}s`,
        }} />
      ))}
      {cfg.layer === "smoke" && Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="ga-smoke" style={{
          left: `${-20 + i * 25}%`, top: `${20 + (i % 3) * 22}%`,
          animationDuration: `${14 + i * 3}s`, animationDelay: `${-i * 2.5}s`,
        }} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <img key={`s${i}`} src={`/symbols/${syms[i % syms.length]}.png`} alt="" draggable={false}
          className="ga-float" loading="lazy" decoding="async"
          style={{
            left: `${6 + ((i * 17) % 84)}%`, top: `${10 + ((i * 31) % 78)}%`,
            width: 30 + (i % 3) * 12, animationDuration: `${9 + (i % 4) * 2.5}s`,
            animationDelay: `${-i * 1.7}s`,
          }} />
      ))}
      <div className="ga-vignette" />
    </div>
  );
}

function GameAtmosphere({ cfg, live }: { cfg: GameCfg; live?: boolean }) {
  return <Ambient color={cfg.c1} layer={cfg.layer} syms={cfg.syms} live={live} />;
}

export default memo(GameAtmosphere);
