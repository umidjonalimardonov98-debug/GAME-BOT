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
    bg: "linear-gradient(180deg, #f2f5f9 0%, #e9eef5 100%)",
    card: "#ffffff",
    cardBorder: "rgba(14,33,53,0.12)",
    text: "#0b1a2b",
    textSub: "rgba(11,26,43,0.6)",
    input: "#f2f5f9",
    inputBorder: "rgba(14,33,53,0.14)",
    btnSecondary: "#e6edf6",
    btnSecondaryText: "#12558f",
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
  main: "#1668e3",
  light: "#e8f2ff",
  deep: "#0b3f8f",
  glow: "rgba(22,104,227,0.35)",
  border: "rgba(255,255,255,0.10)",
  /** 1XBET ko'k gradient — tugma va sarlavhalar uchun */
  grad: "linear-gradient(180deg,#2f8fff 0%,#1668e3 55%,#0d4fb0 100%)",
  soft: "linear-gradient(180deg,rgba(22,104,227,0.22),rgba(22,104,227,0.10))",
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
} as const;

let remoteBackgroundStyle: "gold" | "classic" = "gold";

const OVERLAY: Record<Theme, string> = {
  dark: "linear-gradient(180deg, rgba(8,5,18,0.86) 0%, rgba(12,8,26,0.82) 45%, rgba(5,3,12,0.92) 100%)",
  black: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.86) 45%, rgba(0,0,0,0.94) 100%)",
  light: "linear-gradient(180deg, rgba(255,252,246,0.93) 0%, rgba(250,247,240,0.9) 45%, rgba(255,252,246,0.95) 100%)",
};


/** Sahifa foni: surat + tema overlay (matn o'qilishi saqlanadi) */
export function pageBg(theme: Theme, _img?: string) {
  // 1XBET uslubi: barcha sahifalarda bir xil tekis fon
  return THEMES[theme].bg;
}
