import type { ReactNode, CSSProperties } from "react";
import { GOLD } from "@/lib/theme-context";

/** Har bir o'yin uchun 1XBET uslubidagi stol/ramka skini */
export type Skin =
  | "gold"      // slots
  | "blue"      // plinko, mines
  | "green"     // blackjack, roulette, baccarat
  | "night"     // aviator, limbo, crash
  | "forest"    // apple of fortune
  | "dragon";   // spin & win

const SKINS: Record<Skin, { inner: string; border: string; glow: string }> = {
  gold: {
    inner: "linear-gradient(180deg,#241703 0%,#140c02 45%,#0a0600 100%)",
    border: GOLD.frame,
    glow: "rgba(212,175,55,0.42)",
  },
  blue: {
    inner: "linear-gradient(180deg,#0b2a52 0%,#061c39 55%,#03101f 100%)",

    border: "linear-gradient(150deg,#bfe3ff 0%,#3d8fd6 20%,#0d4b8a 45%,#8fd0ff 62%,#0a3966 85%,#5fb0ec 100%)",
    glow: "rgba(61,143,214,0.38)",
  },
  green: {
    inner: "linear-gradient(180deg,#0d3b23 0%,#0a2c1a 50%,#04160d 100%)",
    border: GOLD.frame,
    glow: "rgba(212,175,55,0.35)",
  },
  night: {
    inner: "linear-gradient(180deg,#0a0a12 0%,#05050a 55%,#000 100%)",
    border: "linear-gradient(150deg,#ffd0d0 0%,#e0483f 22%,#7a120c 48%,#ffb3ab 64%,#5c0b06 88%,#e86b62 100%)",
    glow: "rgba(224,72,63,0.32)",
  },
  forest: {
    inner: "linear-gradient(180deg,#123320 0%,#0b2415 55%,#05110a 100%)",
    border: "linear-gradient(150deg,#fff3c4 0%,#c8e6a0 22%,#4f7a34 48%,#ffe9a8 66%,#37581f 88%,#a8d484 100%)",
    glow: "rgba(120,180,90,0.3)",
  },
  dragon: {
    inner: "linear-gradient(180deg,#3a0d0a 0%,#220605 50%,#0d0201 100%)",
    border: GOLD.frame,
    glow: "rgba(255,215,102,0.45)",
  },
};

interface Props {
  skin?: Skin;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** yuqoridagi lampalar qatori */
  bulbs?: boolean;
  bulbsActive?: boolean;
  title?: string;
}

export default function TableFrame({ skin = "gold", children, className = "", style, bulbs, bulbsActive, title }: Props) {
  const s = SKINS[skin];
  return (
    <div className={`w-full rounded-[24px] p-[3px] relative ${className}`}
      style={{ background: s.border, boxShadow: `0 14px 38px rgba(0,0,0,0.6), 0 0 34px ${s.glow}`, ...style }}>
      <div className="rounded-[21px] p-3 relative overflow-hidden"
        style={{ background: s.inner, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -28px 48px rgba(0,0,0,0.55)" }}>

        {bulbs && (
          <div className="flex justify-between px-1 mb-2">
            {Array.from({ length: 13 }).map((_, i) => (
              <span key={i} className={bulbsActive ? "bulb-run" : ""}
                style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 30%,#fffbe6,#ffd766 55%,#8d6512)",
                  boxShadow: "0 0 9px rgba(255,215,102,0.85)",
                  animationDelay: `${i * 0.07}s`,
                }} />
            ))}
          </div>
        )}

        {title && (
          <div className="mx-auto mb-3 px-5 py-1.5 rounded-full text-center w-fit"
            style={{ background: GOLD.grad, boxShadow: "0 4px 0 #6a4a0c, 0 8px 18px rgba(0,0,0,0.5)" }}>
            <span className="font-black tracking-[0.2em] text-[12px]" style={{ color: "#3a2705" }}>{title}</span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
