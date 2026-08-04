import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "black";

export interface ThemeStyle {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textSub: string;
  input: string;
  inputBorder: string;
  btnSecondary: string;
  btnSecondaryText: string;
}

export const THEMES: Record<Theme, ThemeStyle> = {
  dark: {
    bg: "linear-gradient(180deg, #0b1a2b 0%, #0e2136 50%, #0a1626 100%)",
    card: "#122a42",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#ffffff",
    textSub: "rgba(255,255,255,0.58)",
    input: "#0e2135",
    inputBorder: "rgba(255,255,255,0.12)",
    btnSecondary: "#193a59",
    btnSecondaryText: "#9fc5ef",
  },
  light: {
    // Yorug' mavzu — issiq fil suyagi + oltin urg'u (1XBET "day" uslubi)
    bg: "linear-gradient(180deg, #fffdf7 0%, #f7f1e2 55%, #f2ead6 100%)",
    card: "#ffffff",
    cardBorder: "rgba(122,90,16,0.18)",
    text: "#171208",
    textSub: "rgba(23,18,8,0.66)",
    input: "#fbf7ec",
    inputBorder: "rgba(122,90,16,0.22)",
    btnSecondary: "#f6edd8",
    btnSecondaryText: "#7a5a10",
  },
  black: {
    bg: "linear-gradient(180deg, #05080c 0%, #070c12 100%)",
    card: "#0d141c",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#ffffff",
    textSub: "rgba(255,255,255,0.55)",
    input: "#0a1017",
    inputBorder: "rgba(255,255,255,0.1)",
    btnSecondary: "#131c26",
    btnSecondaryText: "#8fb6d8",
  },
};

interface ThemeCtx { theme: Theme; ts: ThemeStyle; setTheme: (t: Theme) => void; }
const ThemeContext = createContext<ThemeCtx>({ theme: "dark", ts: THEMES.dark, setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try { return (localStorage.getItem("theme") as Theme) || "dark"; } catch { return "dark"; }
  });
  function setTheme(t: Theme) {
    setThemeState(t);
    try { localStorage.setItem("theme", t); } catch {}
  }
  useEffect(() => {
    fetch("/api/game/config").then(res => res.ok ? res.json() : null).then(config => {
      const remoteTheme = config?.theme?.theme_mode as Theme | undefined;
      if (remoteTheme && ["dark", "light", "black"].includes(remoteTheme)) setThemeState(remoteTheme);
      remoteBackgroundStyle = config?.theme?.background_style === "classic" ? "classic" : "gold";
    }).catch(() => {});
  }, []);
  return (
    <ThemeContext.Provider value={{ theme, ts: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() { return useContext(ThemeContext); }

/* ─────────────────────────────────────────────
   PRO GOLD LAYER
   Har bir o'yin uchun orqa fon surati + oltin ranglar.
   ───────────────────────────────────────────── */

export const GOLD = {
  main: "#d4af37",
  light: "#ffe9a8",
  deep: "#7a5a10",
  glow: "rgba(212,175,55,0.42)",
  border: "rgba(255,214,102,0.35)",
  /** Oltin gradient — tugma va ramkalar uchun */
  grad: "linear-gradient(180deg,#ffe9a8 0%,#e8c257 32%,#c99a25 62%,#8d6512 100%)",
  soft: "linear-gradient(180deg,rgba(212,175,55,0.26),rgba(212,175,55,0.08))",
  frame: "linear-gradient(150deg,#fff3c4 0%,#e3bb52 18%,#a97c1c 42%,#f2d888 60%,#8a6314 82%,#e0c063 100%)",
};

/** 1XBET yashil (asosiy CTA) */
export const XGREEN = {
  main: "#25a55a",
  grad: "linear-gradient(180deg,#39c46f 0%,#25a55a 55%,#1a7d43 100%)",
  shadow: "0 6px 0 #14653a, 0 10px 24px rgba(37,165,90,0.35)",
};

export const GAME_BG = {
  home: "/bg/home.jpg",
  apple: "/bg/apple.jpg",
  dice: "/bg/dice.jpg",
  aviator: "/bg/aviator.jpg",
  spin: "/bg/spin.jpg",
  blackjack: "/bg/blackjack.jpg",
  slots: "/bg/slots.jpg",
  parity: "/bg/parity.jpg",
  mines: "/bg/mines.jpg",
  roulette: "/bg/roulette.jpg",
  plinko: "/bg/plinko.jpg",
  // karta o'yinlari
  baccarat: "/bg/cards.jpg",
  dragontiger: "/bg/cards.jpg",
  hilo: "/bg/cards.jpg",
  // crash / raqamli
  limbo: "/bg/crash.jpg",
  towers: "/bg/crash.jpg",
  // omad o'yinlari
  keno: "/bg/luck.jpg",
  scratch: "/bg/luck.jpg",
  caseopen: "/bg/luck.jpg",
  coinflip: "/bg/luck.jpg",
  rps: "/bg/luck.jpg",
} as const;


let remoteBackgroundStyle: "gold" | "classic" = "gold";

const OVERLAY: Record<Theme, string> = {
  dark: "linear-gradient(180deg, rgba(14,10,4,0.80) 0%, rgba(20,13,4,0.72) 45%, rgba(8,6,2,0.88) 100%)",
  black: "linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(6,4,0,0.84) 45%, rgba(0,0,0,0.93) 100%)",
  light: "linear-gradient(180deg, rgba(255,253,247,0.94) 0%, rgba(250,243,227,0.90) 45%, rgba(246,236,214,0.95) 100%)",
};


/** Sahifa foni: surat + tema overlay (matn o'qilishi saqlanadi) */
export function pageBg(theme: Theme, img?: string) {
  if (remoteBackgroundStyle === "classic" || !img) return THEMES[theme].bg;
  // Har bir o'yin uchun o'z orqa foni + oltin overlay
  return `${OVERLAY[theme]}, url("${img}") center/cover no-repeat fixed`;
}
