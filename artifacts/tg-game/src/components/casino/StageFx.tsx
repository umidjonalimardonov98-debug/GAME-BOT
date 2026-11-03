import { useEffect, useState, type ReactNode, type CSSProperties } from "react";

/**
 * O'yin maydoni effektlari — har qanday o'yin sahnasini o'raydi:
 * • active: o'yin paytida chetlari jonli nur bilan yonadi
 * • win: o'yinning O'Z 3D belgilari bilan, o'yinga xos harakat (yomg'ir, portlash,
 *   favvora, spiral, zarba yoki uchib o'tish) + chaqnash va uchqunlar
 * • lose: qizil vinyetka va sahna silkinishi
 * Emoji yo'q — faqat /symbols/*.png haqiqiy suratlar.
 */
export type FxPattern = "rain" | "burst" | "fountain" | "spiral" | "slam" | "sweep";

interface Props {
  children: ReactNode;
  result: boolean | null | undefined;
  active?: boolean;
  big?: boolean;
  className?: string;
  /** ichki konteyner uchun klasslar (masalan flex/gap saqlash uchun) */
  innerClassName?: string;
  /** yutuqda uchadigan belgilar (o'yinning o'zi) */
  syms?: string[];
  /** yutuq harakati turi — har o'yinda boshqacha */
  pattern?: FxPattern;
  /** chaqnash rangi */
  color?: string;
}

const KF = `
@keyframes sfx-shake{0%,100%{transform:translate(0)}20%{transform:translate(-7px,2px)}40%{transform:translate(6px,-2px)}60%{transform:translate(-4px,1px)}80%{transform:translate(3px,0)}}
@keyframes sfx-pop{0%{transform:scale(1)}40%{transform:scale(1.025)}100%{transform:scale(1)}}
@keyframes sfx-rim{0%{background-position:0% 50%}100%{background-position:300% 50%}}
@keyframes sfx-flash{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
@keyframes sfx-red{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
@keyframes sfx-rain{0%{transform:translateY(-40px) rotate(0) scale(.6);opacity:0}10%{opacity:1}100%{transform:translateY(var(--h)) rotate(var(--r)) scale(1);opacity:0}}
@keyframes sfx-burst{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}15%{opacity:1}100%{transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)) scale(1.1);opacity:0}}
@keyframes sfx-fountain{0%{transform:translate(-50%,0) scale(.5);opacity:0}10%{opacity:1}50%{transform:translate(calc(-50% + var(--x) * .6),calc(-1 * var(--h))) rotate(calc(var(--r) * .5)) scale(1)}100%{transform:translate(calc(-50% + var(--x)),20px) rotate(var(--r)) scale(.9);opacity:0}}
@keyframes sfx-spiral{0%{transform:translate(-50%,-50%) rotate(var(--a)) translateX(0) scale(.3);opacity:0}15%{opacity:1}100%{transform:translate(-50%,-50%) rotate(calc(var(--a) + 300deg)) translateX(var(--d)) scale(1);opacity:0}}
@keyframes sfx-slam{0%{transform:translate(-50%,-50%) scale(3.2) rotate(-18deg);opacity:0;filter:blur(6px)}35%{transform:translate(-50%,-50%) scale(.92) rotate(4deg);opacity:1;filter:none}50%{transform:translate(-50%,-50%) scale(1.08)}80%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-50%) scale(1.25);opacity:0}}
@keyframes sfx-ring{0%{transform:translate(-50%,-50%) scale(.2);opacity:.95}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}
@keyframes sfx-sweep{0%{transform:translateX(-30vw) translateY(0) rotate(-8deg);opacity:0}10%{opacity:1}50%{transform:translateX(40vw) translateY(var(--y)) rotate(6deg)}100%{transform:translateX(110vw) translateY(calc(var(--y) * -1)) rotate(-4deg);opacity:0}}
@keyframes sfx-star{0%{transform:rotate(var(--a)) translateX(0) scale(1);opacity:1}100%{transform:rotate(var(--a)) translateX(var(--d)) scale(.2);opacity:0}}
@media (prefers-reduced-motion: reduce){.sfx-anim{animation:none!important;opacity:0!important}}
`;

function piece(pattern: FxPattern, k: number, n: number): CSSProperties {
  const ang = (k / n) * 360;
  const rad = (ang * Math.PI) / 180;
  const dist = 70 + (k % 4) * 32;
  const dur = 1.1 + (k % 4) * 0.22;
  switch (pattern) {
    case "burst":
      return { left: "50%", top: "48%", ["--x" as any]: `${Math.cos(rad) * dist}px`, ["--y" as any]: `${Math.sin(rad) * dist}px`,
        ["--r" as any]: `${(k % 2 ? 1 : -1) * (180 + k * 15)}deg`, animation: `sfx-burst ${dur + 0.5}s cubic-bezier(.1,.8,.3,1) ${k * 0.02}s both` };
    case "fountain":
      return { left: "50%", bottom: 0, ["--x" as any]: `${(k % 2 ? 1 : -1) * (20 + ((k * 23) % 140))}px`, ["--h" as any]: `${180 + (k % 5) * 30}px`,
        ["--r" as any]: `${(k % 2 ? 1 : -1) * 360}deg`, animation: `sfx-fountain ${1.4 + (k % 3) * 0.25}s cubic-bezier(.3,.7,.5,1) ${k * 0.06}s both` };
    case "spiral":
      return { left: "50%", top: "50%", ["--a" as any]: `${ang}deg`, ["--d" as any]: `${dist + 20}px`,
        animation: `sfx-spiral ${dur + 0.3}s ease-out ${k * 0.03}s both` };
    case "sweep":
      return { left: 0, top: `${10 + ((k * 37) % 70)}%`, ["--y" as any]: `${(k % 2 ? 1 : -1) * (10 + (k % 3) * 12)}px`,
        animation: `sfx-sweep ${1.5 + (k % 3) * 0.3}s cubic-bezier(.4,.1,.5,1) ${k * 0.12}s both` };
    case "rain":
    default:
      return { left: `${(k * 37) % 94}%`, top: 0, ["--h" as any]: `${260 + (k % 5) * 40}px`,
        ["--r" as any]: `${(k % 2 ? 1 : -1) * (300 + k * 20)}deg`, animation: `sfx-rain ${1.2 + (k % 4) * 0.25}s cubic-bezier(.3,.6,.6,1) ${k * 0.05}s both` };
  }
}

export default function StageFx({ children, result, active, big, className, innerClassName, syms, pattern = "rain", color = "#ffd54a" }: Props) {
  const [fx, setFx] = useState<null | "win" | "lose">(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (result === true || result === false) {
      setFx(result ? "win" : "lose");
      setKey((k) => k + 1);
      try {
        const h = (window as any).Telegram?.WebApp?.HapticFeedback;
        h?.notificationOccurred?.(result ? "success" : "error");
        if (result && big) setTimeout(() => h?.impactOccurred?.("heavy"), 180);
      } catch { /* ignore */ }
      const t = setTimeout(() => setFx(null), result ? 2600 : 900);
      return () => clearTimeout(t);
    }
    setFx(null);
    return undefined;
  }, [result, big]);

  const list = syms && syms.length ? syms : ["coin"];
  const count = pattern === "slam" ? 1 : pattern === "sweep" ? (big ? 7 : 5) : big ? 22 : 14;

  return (
    <div className={`relative w-full ${className ?? ""}`}
      style={{ animation: fx === "lose" ? "sfx-shake .45s ease" : fx === "win" ? "sfx-pop .5s ease" : undefined }}>
      <style>{KF}</style>

      {active && (
        <div className="sfx-anim absolute -inset-[3px] rounded-[28px] pointer-events-none" style={{
          zIndex: 0, filter: "blur(6px)", opacity: .85,
          background: `linear-gradient(90deg,${color},#ff8a3d,#fff3b0,${color},#ff8a3d,#fff3b0)`, backgroundSize: "300% 100%",
          animation: "sfx-rim 1.6s linear infinite",
        }} />
      )}

      <div className={`relative ${innerClassName ?? ""}`} style={{ zIndex: 1 }}>{children}</div>

      {fx === "win" && (
        <div key={key} className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" style={{ zIndex: 5 }}>
          <div className="sfx-anim absolute inset-0" style={{ background: `radial-gradient(circle at 50% 45%,${color}cc,${color}40 40%,transparent 70%)`, animation: "sfx-flash 1s ease-out both" }} />
          {pattern === "slam" && (
            <>
              <span className="sfx-anim absolute rounded-full" style={{ left: "50%", top: "50%", width: 140, height: 140, border: `4px solid ${color}`, boxShadow: `0 0 30px ${color}`, animation: "sfx-ring .8s ease-out .3s both" }} />
              <span className="sfx-anim absolute rounded-full" style={{ left: "50%", top: "50%", width: 140, height: 140, border: "3px solid #fff3b0", animation: "sfx-ring .9s ease-out .45s both" }} />
            </>
          )}
          {Array.from({ length: count }).map((_, k) => {
            const sz = pattern === "slam" ? (big ? 150 : 120) : pattern === "sweep" ? 44 + (k % 2) * 14 : 22 + (k % 3) * 7;
            return (
              <img key={k} src={`/symbols/${list[k % list.length]}.png`} alt="" draggable={false} className="sfx-anim absolute"
                style={{ width: sz, height: sz, objectFit: "contain", filter: `drop-shadow(0 0 8px ${color})`,
                  ...(pattern === "slam"
                    ? { left: "50%", top: "50%", animation: `sfx-slam ${big ? 2.2 : 1.8}s cubic-bezier(.2,.9,.3,1) both` }
                    : piece(pattern, k, count)) }} />
            );
          })}
          <div className="absolute left-1/2 top-1/2">
            {Array.from({ length: 12 }).map((_, k) => (
              <span key={k} className="sfx-anim absolute rounded-full" style={{ width: 7, height: 7, background: k % 2 ? "#fff3b0" : color,
                boxShadow: `0 0 10px ${color}`, ["--a" as any]: `${k * 30}deg`, ["--d" as any]: `${110 + (k % 3) * 30}px`,
                animation: `sfx-star .9s ease-out ${k * .02}s both` }} />
            ))}
          </div>
        </div>
      )}

      {fx === "lose" && (
        <div key={key} className="sfx-anim absolute inset-0 pointer-events-none rounded-3xl" style={{ zIndex: 5,
          boxShadow: "inset 0 0 70px 10px rgba(239,68,68,.65)", animation: "sfx-red .9s ease-out both" }} />
      )}
    </div>
  );
}
