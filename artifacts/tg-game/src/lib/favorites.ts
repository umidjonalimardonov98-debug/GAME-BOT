import { useCallback, useEffect, useState } from "react";

const KEY = "favGames";
const EVT = "favgames:change";
const MAX = 24;

/** Keep only known catalog keys, unique, newest first, capped. */
export function sanitizeFavorites(raw: unknown, known: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const k of raw) if (typeof k === "string" && known.has(k) && !out.includes(k)) out.push(k);
  return out.slice(0, MAX);
}
export function toggleFavorite(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter(k => k !== key) : [key, ...list].slice(0, MAX);
}
function read(): unknown { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }

export function useFavorites(knownKeys: string[]) {
  const [favs, setFavs] = useState<string[]>([]);
  const knownSig = knownKeys.join(",");
  useEffect(() => {
    const known = new Set(knownKeys);
    const sync = () => setFavs(sanitizeFavorites(read(), known));
    sync();
    window.addEventListener(EVT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownSig]);
  const toggle = useCallback((key: string) => {
    const next = toggleFavorite(sanitizeFavorites(read(), new Set(knownKeys)), key);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownSig]);
  return { favs, toggle, isFav: (k: string) => favs.includes(k) };
}
