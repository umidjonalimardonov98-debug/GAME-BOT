import { useCallback, useEffect, useState } from "react";

export interface SocialStats {
  xp: number;
  wins: number;
  matches: number;
  gifts: number;
  blocked: string[];
}

const KEY = "social_stats_v1";
const EMPTY: SocialStats = { xp: 0, wins: 0, matches: 0, gifts: 0, blocked: [] };

function read(): SocialStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<SocialStats>) };
  } catch {
    return { ...EMPTY };
  }
}

function write(s: SocialStats) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("social-stats")); } catch { /* ignore */ }
}

export function levelOf(xp: number) {
  return Math.max(1, Math.min(50, Math.floor(xp / 500) + 1));
}
export function levelProgress(xp: number) {
  const lvl = levelOf(xp);
  if (lvl >= 50) return 1;
  return (xp - (lvl - 1) * 500) / 500;
}

export function useSocialStats() {
  const [stats, setStats] = useState<SocialStats>(() => (typeof window === "undefined" ? { ...EMPTY } : read()));

  useEffect(() => {
    const onChange = () => setStats(read());
    window.addEventListener("social-stats", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("social-stats", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const patch = useCallback((p: Partial<SocialStats>) => {
    const next = { ...read(), ...p };
    write(next);
    setStats(next);
  }, []);

  const addXp = useCallback((amount: number) => {
    const cur = read();
    patch({ xp: cur.xp + amount });
  }, [patch]);

  const addWin = useCallback(() => {
    const cur = read();
    patch({ wins: cur.wins + 1, xp: cur.xp + 100 });
  }, [patch]);

  const addMatch = useCallback(() => {
    const cur = read();
    patch({ matches: cur.matches + 1, xp: cur.xp + 50 });
  }, [patch]);

  const addGift = useCallback(() => {
    const cur = read();
    patch({ gifts: cur.gifts + 1, xp: cur.xp + 20 });
  }, [patch]);

  const blockUser = useCallback((name: string) => {
    const cur = read();
    if (cur.blocked.includes(name)) return;
    patch({ blocked: [...cur.blocked, name] });
  }, [patch]);

  return {
    stats,
    level: levelOf(stats.xp),
    progress: levelProgress(stats.xp),
    addXp, addWin, addMatch, addGift, blockUser,
  };
}
