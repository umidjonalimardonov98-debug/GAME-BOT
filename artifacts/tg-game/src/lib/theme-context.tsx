import "@/game-navigation.css";
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

const NAV_THEME: ThemeStyle = {
  bg: "var(--nav-base)", card: "var(--nav-surface)", cardBorder: "var(--nav-line)",
  text: "var(--nav-text)", textSub: "var(--nav-muted)", input: "var(--nav-base)",
  inputBorder: "var(--nav-line)", btnSecondary: "var(--nav-raised)", btnSecondaryText: "var(--nav-blue)",
};
export const THEMES: Record<Theme, ThemeStyle> = { dark: NAV_THEME, light: { ...NAV_THEME }, black: { ...NAV_THEME } };

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
      // Foydalanuvchi o'zi tema tanlagan bo'lsa — server sozlamasi ustidan yozmaydi
      let userPicked = false;
      try { userPicked = !!localStorage.getItem("theme"); } catch {}
      const remoteTheme = config?.theme?.theme_mode as Theme | undefined;
      if (!userPicked && remoteTheme && ["dark", "light", "black"].includes(remoteTheme)) setThemeState(remoteTheme);
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
  // yangi o'yinlar
  thimbles: "/bg/luck.jpg",
  luckycard: "/bg/cards.jpg",
  hands: "/bg/luck.jpg",
  fruitblast: "/bg/slots.jpg",
  derby: "/bg/derby.jpg",
  moneywheel: "/bg/spin.jpg",
} as const;


let remoteBackgroundStyle: "gold" | "classic" = "gold";

const OVERLAY: Record<Theme, string> = {
  dark: "linear-gradient(var(--nav-base), color-mix(in oklch, var(--nav-base) 92%, transparent))",
  black: "linear-gradient(var(--nav-base), color-mix(in oklch, var(--nav-base) 96%, transparent))",
  light: "linear-gradient(var(--nav-base), color-mix(in oklch, var(--nav-base) 88%, transparent))",
};

/** Sahifa foni: surat + tema overlay (matn o'qilishi saqlanadi) */
export function pageBg(theme: Theme, img?: string) {
  if (remoteBackgroundStyle === "classic" || !img) return THEMES[theme].bg;
  // Har bir o'yin uchun o'z orqa foni + oltin overlay
  return `${OVERLAY[theme]}, url("${img}") center/cover no-repeat fixed`;
}
