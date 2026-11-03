import { useEffect, useState, type ReactNode } from "react";

/**
 * O'yin maydoni effektlari — har qanday o'yin sahnasini o'raydi:
 * • active: aylanish/o'yin paytida chetlari jonli oltin nur bilan yonadi
 * • win: oltin chaqnash, tushayotgan tangalar, yulduz uchqunlari, tebranish
 * • lose: qizil vinyetka va sahna silkinishi
 */
interface Props {
  children: ReactNode;
  result: boolean | null | undefined;
  active?: boolean;
  big?: boolean;
  className?: string;
  /** ichki konteyner uchun klasslar (masalan flex/gap saqlash uchun) */
  innerClassName?: string;
}

export default function StageFx({ children, result, active, big, className, innerClassName }: Props) {
  const [fx, setFx] = useState<null | "win" | "lose">(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (result === true || result === false) {
      setFx(result ? "win" : "lose");
      setKey((k) => k + 1);
      try {
        const h = (window as any).Telegram?.WebApp?.HapticFeedback;
        h?.notificationOccurred?.(result ? "success" : "error");
      } catch { /* ignore */ }
      const t = setTimeout(() => setFx(null), result ? 2600 : 900);
      return () => clearTimeout(t);
    }
    setFx(null);
    return undefined;
  }, [result]);

  const coins = big ? 22 : 14;

  return (
    <div className={`relative w-full ${className ?? ""}`}
      style={{ animation: fx === "lose" ? "sfx-shake .45s ease" : fx === "win" ? "sfx-pop .5s ease" : undefined }}>
      <style>{`
        @keyframes sfx-shake{0%,100%{transform:translate(0)}20%{transform:translate(-7px,2px)}40%{transform:translate(6px,-2px)}60%{transform:translate(-4px,1px)}80%{transform:translate(3px,0)}}
        @keyframes sfx-pop{0%{transform:scale(1)}40%{transform:scale(1.025)}100%{transform:scale(1)}}
        @keyframes sfx-rim{0%{background-position:0% 50%}100%{background-position:300% 50%}}
        @keyframes sfx-flash{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
        @keyframes sfx-red{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
        @keyframes sfx-coin{0%{transform:translateY(-30px) rotate(0) scale(.6);opacity:0}10%{opacity:1}100%{transform:translateY(var(--h)) rotate(var(--r)) scale(1);opacity:0}}
        @keyframes sfx-star{0%{transform:rotate(var(--a)) translateX(0) scale(1);opacity:1}100%{transform:rotate(var(--a)) translateX(var(--d)) scale(.2);opacity:0}}
        @media (prefers-reduced-motion: reduce){.sfx-anim{animation:none!important}}
      `}</style>

      {active && (
        <div className="sfx-anim absolute -inset-[3px] rounded-[28px] pointer-events-none" style={{
          zIndex: 0, filter: "blur(6px)", opacity: .85,
          background: "linear-gradient(90deg,#ffd54a,#ff8a3d,#fff3b0,#ffd54a,#ff8a3d,#fff3b0)", backgroundSize: "300% 100%",
          animation: "sfx-rim 1.6s linear infinite",
        }} />
      )}

      <div className={`relative ${innerClassName ?? ""}`} style={{ zIndex: 1 }}>{children}</div>

      {fx === "win" && (
        <div key={key} className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" style={{ zIndex: 5 }}>
          <div className="sfx-anim absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%,rgba(255,236,150,.75),rgba(255,200,60,.25) 40%,transparent 70%)", animation: "sfx-flash 1s ease-out both" }} />
          {Array.from({ length: coins }).map((_, k) => (
            <img key={k} src="/symbols/coin.png" alt="" className="sfx-anim absolute"
              style={{ width: 22 + (k % 3) * 6, left: `${(k * 37) % 96}%`, top: 0,
                ["--h" as any]: `${260 + (k % 5) * 40}px`, ["--r" as any]: `${(k % 2 ? 1 : -1) * (300 + k * 20)}deg`,
                animation: `sfx-coin ${1.2 + (k % 4) * .25}s cubic-bezier(.3,.6,.6,1) ${k * .05}s both`,
                filter: "drop-shadow(0 0 6px rgba(255,213,74,.8))" }} />
          ))}
          <div className="absolute left-1/2 top-1/2">
            {Array.from({ length: 12 }).map((_, k) => (
              <span key={k} className="sfx-anim absolute rounded-full" style={{ width: 7, height: 7, background: k % 2 ? "#fff3b0" : "#ffd54a",
                boxShadow: "0 0 10px #ffd54a", ["--a" as any]: `${k * 30}deg`, ["--d" as any]: `${110 + (k % 3) * 30}px`,
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
