import { useEffect, useState } from "react";

/** LIVE zona konfiguratsiyasi — admin paneldan boshqariladi (server: /api/live/config) */

export type LiveConfig = {
  enabled: boolean;
  timerMs: number;
  rules: string;
  bannerTitle: string;
  bannerSub: string;
  rake: number;
  stakes: number[];
};

const FALLBACK: LiveConfig = {
  enabled: true,
  timerMs: 0,
  rules: "Ikki o'yinchi teng pul tikadi. G'olib bankning 92%ini oladi, durangda pul qaytariladi.",
  bannerTitle: "ODAM vs ODAM",
  bannerSub: "Tezkor matchmaking · o'yin ichida chat · g'olib bankni oladi",
  rake: 0.08,
  stakes: [5000, 10000, 25000, 50000, 100000],
};

export function useLiveConfig(): { cfg: LiveConfig; loading: boolean } {
  const [cfg, setCfg] = useState<LiveConfig>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/live/config")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
        .then((d: LiveConfig) => { if (alive) setCfg({ ...FALLBACK, ...d }); })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    load();
    const iv = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  return { cfg, loading };
}

export { FALLBACK as LIVE_CONFIG_FALLBACK };
