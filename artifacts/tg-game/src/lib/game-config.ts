/**
 * Backenddagi /game/config end-pointidan admin tomonidan sozlangan
 * o'yin parametrlarini (win%, refund%, qiyinlik, koeffitsiyent, maxWin, fon)
 * bir marta yuklab, keshlab beradi. Tarmoq xatosi bo'lsa — standart
 * qiymatlar bilan o'yinlar baribir ishlayveradi.
 */
import { useEffect, useState } from "react";
import { getGameConfig as fetchGameConfig } from "@/lib/api";

export type GameConfig = {
  enabled: boolean;
  winChance: number; // 0..100
  refundChance: number; // 0..100
  difficulty: string;
  multiplier: number; // basis points, 100 = x1.00
  maxWin: number | null;
  backgroundUrl: string | null;
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  enabled: true,
  winChance: 31,
  refundChance: 6,
  difficulty: "o'rta",
  multiplier: 100,
  maxWin: null,
  backgroundUrl: null,
};

type ConfigResponse = { games?: Record<string, Partial<GameConfig>>; theme?: Record<string, string> };

let cache: Record<string, GameConfig> | null = null;
let inflight: Promise<Record<string, GameConfig>> | null = null;
const listeners = new Set<() => void>();

function normalize(raw: ConfigResponse | null | undefined): Record<string, GameConfig> {
  const out: Record<string, GameConfig> = {};
  const games = raw?.games ?? {};
  for (const key of Object.keys(games)) {
    out[key] = { ...DEFAULT_GAME_CONFIG, ...games[key] };
  }
  return out;
}

/** Konfiguratsiyani (agar hali yuklanmagan bo'lsa) serverdan bir marta oladi. */
export function loadGameConfig(): Promise<Record<string, GameConfig>> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetchGameConfig()
    .then((data) => {
      cache = normalize(data);
      inflight = null;
      listeners.forEach((l) => l());
      return cache;
    })
    .catch(() => {
      cache = {};
      inflight = null;
      return cache;
    });
  return inflight;
}

// Ilova ishga tushganda darhol yuklashni boshlaymiz.
loadGameConfig();

/** Sinxron getter — hali yuklanmagan bo'lsa standart qiymatlarni qaytaradi. */
export function getGameConfig(key: string): GameConfig {
  return cache?.[key] ?? DEFAULT_GAME_CONFIG;
}

/** React hook: konfiguratsiya yuklangach komponentni qayta render qiladi. */
export function useGameConfig(key: string): GameConfig {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (cache) return;
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    loadGameConfig();
    return () => { listeners.delete(l); };
  }, []);
  return getGameConfig(key);
}
