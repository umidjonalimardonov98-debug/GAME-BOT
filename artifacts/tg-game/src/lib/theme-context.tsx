import { createContext, useContext, useState, type ReactNode } from "react";

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
    bg: "linear-gradient(160deg, #0f0a1e 0%, #1a0f2e 50%, #0f0a1e 100%)",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.1)",
    text: "#ffffff",
    textSub: "rgba(255,255,255,0.45)",
    input: "rgba(255,255,255,0.08)",
    inputBorder: "rgba(255,255,255,0.15)",
    btnSecondary: "rgba(255,255,255,0.07)",
    btnSecondaryText: "#a5b4fc",
  },
  light: {
    bg: "linear-gradient(160deg, #f0f4ff 0%, #e8eeff 50%, #f0f4ff 100%)",
    card: "rgba(255,255,255,0.9)",
    cardBorder: "rgba(99,102,241,0.2)",
    text: "#1e1b4b",
    textSub: "rgba(30,27,75,0.55)",
    input: "rgba(99,102,241,0.06)",
    inputBorder: "rgba(99,102,241,0.25)",
    btnSecondary: "rgba(99,102,241,0.1)",
    btnSecondaryText: "#4338ca",
  },
  black: {
    bg: "linear-gradient(160deg, #000000 0%, #0a0a0a 50%, #000000 100%)",
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(255,255,255,0.07)",
    text: "#ffffff",
    textSub: "rgba(255,255,255,0.35)",
    input: "rgba(255,255,255,0.06)",
    inputBorder: "rgba(255,255,255,0.12)",
    btnSecondary: "rgba(255,255,255,0.05)",
    btnSecondaryText: "#9ca3af",
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
  light: "#f7e59b",
  deep: "#8a6b16",
  glow: "rgba(212,175,55,0.35)",
  border: "rgba(212,175,55,0.42)",
  /** oltin gradient — tugma va sarlavhalar uchun */
  grad: "linear-gradient(135deg,#8a6b16 0%,#d4af37 35%,#f7e59b 55%,#d4af37 75%,#8a6b16 100%)",
  soft: "linear-gradient(145deg,rgba(212,175,55,0.18),rgba(212,175,55,0.06))",
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

const OVERLAY: Record<Theme, string> = {
  dark: "linear-gradient(180deg, rgba(10,7,2,0.82) 0%, rgba(14,9,3,0.74) 45%, rgba(6,4,1,0.93) 100%)",
  black: "linear-gradient(180deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.84) 45%, rgba(0,0,0,0.96) 100%)",
  light: "linear-gradient(180deg, rgba(255,251,240,0.90) 0%, rgba(252,246,231,0.86) 45%, rgba(255,251,240,0.95) 100%)",
};

/** Sahifa foni: surat + tema overlay (matn o'qilishi saqlanadi) */
export function pageBg(theme: Theme, img?: string) {
  if (!img) return THEMES[theme].bg;
  return `${OVERLAY[theme]}, url('${img}') center / cover no-repeat fixed`;
}
