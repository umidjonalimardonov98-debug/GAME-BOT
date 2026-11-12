import "@/game-navigation.css";
import "@/pro-design.css";
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
  /* Yorqin kazino: oltin-sariq + olovli to'q sariq (Mostbet uslubi) */
  main: "#ffc61a",
  light: "#ffe27a",
  deep: "#c25400",
  glow: "rgba(255,170,0,0.5)",
  border: "rgba(255,198,26,0.5)",
  /** Sariq-to'q sariq gradient — tugma va ramkalar uchun */
  grad: "linear-gradient(180deg,#ffe066 0%,#ffb81a 38%,#ff8a00 72%,#f26a00 100%)",
  soft: "linear-gradient(180deg,rgba(255,170,0,0.28),rgba(255,170,0,0.08))",
  frame: "linear-gradient(150deg,#fff1a8 0%,#ffc21a 22%,#ff7a00 48%,#ffd84d 70%,#ff8a00 100%)",
};

/** Asosiy CTA — olovli to'q sariq (O'YNASH / BOSHLASH) */
export const XGREEN = {
  main: "#ff7a00",
  grad: "linear-gradient(180deg,#ffb23d 0%,#ff7a00 50%,#e85d00 100%)",
  shadow: "inset 0 0 0 1.5px rgba(255,236,170,0.6), inset 0 1px 0 rgba(255,255,255,0.45), 0 5px 0 #9c3a00, 0 12px 28px rgba(255,122,0,0.45)",
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
  dark: "linear-gradient(180deg, color-mix(in oklch, var(--nav-base) 78%, transparent), color-mix(in oklch, var(--nav-base) 90%, transparent))",
  black: "linear-gradient(180deg, color-mix(in oklch, var(--nav-base) 84%, transparent), color-mix(in oklch, var(--nav-base) 94%, transparent))",
  light: "linear-gradient(180deg, color-mix(in oklch, var(--nav-base) 70%, transparent), color-mix(in oklch, var(--nav-base) 86%, transparent))",
};

/** Sahifa foni: surat + tema overlay (matn o'qilishi saqlanadi) */
export function pageBg(theme: Theme, img?: string) {
  if (remoteBackgroundStyle === "classic" || !img) return THEMES[theme].bg;
  // Har bir o'yin uchun o'z orqa foni + oltin overlay
  return `${OVERLAY[theme]}, url("${img}") center/cover no-repeat fixed`;
}
