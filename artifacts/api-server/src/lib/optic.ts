/**
 * OpticOdds API klienti (v3).
 * Docs: https://developer.opticodds.com/reference/getting-started
 *
 * Kerakli env:
 *   OPTICODDS_API_KEY   — litsenziya kaliti (X-Api-Key)
 *   OPTIC_SPORTSBOOKS   — vergul bilan: "bet365,Pinnacle" (max 5)
 *   OPTIC_MARGIN        — kazino marjasi, % (default 6)
 */

const BASE = "https://api.opticodds.com/api/v3";

/**
 * Litsenziya kaliti. Railway env (OPTICODDS_API_KEY / OPTIC_API_KEY) birinchi,
 * bo'lmasa loyihaning o'z kaliti ishlatiladi — sport bo'limi hamma joyda ishlashi uchun.
 */
const FALLBACK_KEY = "68024782-ed09-4ddf-8a2f-4c424df09272";
export const OPTIC_KEY = (): string =>
  process.env["OPTICODDS_API_KEY"] || process.env["OPTIC_API_KEY"] || FALLBACK_KEY;

export const OPTIC_ENABLED = () => Boolean(OPTIC_KEY());

export const SPORTSBOOKS = (): string[] =>
  (process.env["OPTIC_SPORTSBOOKS"] || "bet365,Pinnacle,DraftKings")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

export const MARGIN = (): number => {
  const v = Number(process.env["OPTIC_MARGIN"]);
  return Number.isFinite(v) && v >= 0 && v < 40 ? v : 6;
};

/** Kazino marjasi qo'llangan koeffitsient (decimal) */
export function applyMargin(decimal: number): number {
  const m = MARGIN() / 100;
  const out = 1 + (decimal - 1) * (1 - m);
  return Math.max(1.01, Math.round(out * 100) / 100);
}

// ── oddiy xotira keshi ─────────────────────────────────────────────
type Entry = { at: number; ttl: number; data: unknown };
const cache = new Map<string, Entry>();

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > e.ttl) {
    cache.delete(key);
    return null;
  }
  return e.data as T;
}

export class OpticError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export async function opticGet<T = any>(
  path: string,
  params: Record<string, string | number | boolean | string[] | undefined> = {},
  ttlMs = 15_000,
): Promise<T> {
  const key = OPTIC_KEY();
  if (!key) throw new OpticError("OPTICODDS_API_KEY sozlanmagan", 503);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
    else qs.append(k, String(v));
  }

  const url = `${BASE}${path}?${qs.toString()}`;
  const ck = `GET:${url}`;
  if (ttlMs > 0) {
    const hit = getCached<T>(ck);
    if (hit) return hit;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new OpticError(`OpticOdds ${res.status}: ${text.slice(0, 300)}`, res.status);
    }
    const json = JSON.parse(text) as T;
    if (ttlMs > 0) cache.set(ck, { at: Date.now(), ttl: ttlMs, data: json });
    return json;
  } catch (err) {
    if (err instanceof OpticError) throw err;
    throw new OpticError(`OpticOdds so'rov xatosi: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

// ── Tiplar (kerakli qismi) ─────────────────────────────────────────
export type OpticCompetitor = { id: string; name: string; abbreviation?: string; logo?: string };
export type OpticFixture = {
  id: string;
  start_date: string;
  status: string;
  is_live: boolean;
  home_competitors: OpticCompetitor[];
  away_competitors: OpticCompetitor[];
  sport: { id: string; name: string };
  league: { id: string; name: string };
  has_odds?: boolean;
  result?: unknown;
};
export type OpticOdd = {
  id: string;
  sportsbook: string;
  market: string;
  market_id: string;
  name: string;
  selection?: string;
  selection_line?: string | null;
  is_main?: boolean;
  price: number;
  points?: number | null;
  grouping_key?: string;
  player_id?: string | null;
  team_id?: string | null;
};
export type OpticFixtureOdds = OpticFixture & { odds: OpticOdd[] };

/** Sportlar + asosiy marketlar */
export function getSports() {
  return opticGet<{ data: any[] }>("/sports", {}, 60 * 60_000);
}

/** Liga ro'yxati */
export function getLeagues(sport?: string) {
  return opticGet<{ data: any[] }>("/leagues/active", { sport }, 30 * 60_000);
}

/** Aktiv o'yinlar (odds bo'lganlari) */
export function getActiveFixtures(p: { sport?: string; league?: string; is_live?: boolean }) {
  return opticGet<{ data: OpticFixture[] }>("/fixtures/active", p, 30_000);
}

/** ID larni bo'laklarga bo'lish (OpticOdds: bitta so'rovda maks 5 ta id) */
const MAX_IDS = 5;
function chunk<T>(arr: T[], size = MAX_IDS): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Koeffitsientlar (decimal formatda) — 5 tadan bo'lib so'raladi */
export async function getFixtureOdds(p: {
  fixture_id: string[];
  market?: string[];
  is_main?: boolean;
}): Promise<{ data: OpticFixtureOdds[] }> {
  const ids = [...new Set(p.fixture_id.filter(Boolean))];
  if (!ids.length) return { data: [] };

  const batches = await Promise.all(
    chunk(ids).map((part) =>
      opticGet<{ data: OpticFixtureOdds[] }>(
        "/fixtures/odds",
        {
          fixture_id: part,
          sportsbook: SPORTSBOOKS(),
          market: p.market,
          is_main: p.is_main,
          odds_format: "DECIMAL",
        },
        10_000,
      ).catch(() => ({ data: [] as OpticFixtureOdds[] })),
    ),
  );
  return { data: batches.flatMap((b) => b.data ?? []) };
}

/** Bet hisob-kitobi (settlement) */
export function gradeBet(p: { fixture_id: string; market: string; name: string }) {
  return opticGet<{ data: { result: string; status: string; home_score?: number; away_score?: number } }>(
    "/grader/odds",
    p,
    0,
  );
}

/** Natijalar (jonli hisob) — 5 tadan bo'lib so'raladi */
export async function getResults(fixture_id: string[]): Promise<{ data: any[] }> {
  const ids = [...new Set(fixture_id.filter(Boolean))];
  if (!ids.length) return { data: [] };
  const batches = await Promise.all(
    chunk(ids).map((part) =>
      opticGet<{ data: any[] }>("/fixtures/results", { fixture_id: part }, 15_000).catch(() => ({
        data: [] as any[],
      })),
    ),
  );
  return { data: batches.flatMap((b) => b.data ?? []) };
}

/** O'yinchilar statistikasi (Statistics API) — 5 tadan bo'lib */
export async function getPlayerResults(fixture_id: string[]): Promise<{ data: any[] }> {
  const ids = [...new Set(fixture_id.filter(Boolean))];
  if (!ids.length) return { data: [] };
  const batches = await Promise.all(
    chunk(ids).map((part) =>
      opticGet<{ data: any[] }>("/fixtures/player-results", { fixture_id: part }, 20_000).catch(() => ({
        data: [] as any[],
      })),
    ),
  );
  return { data: batches.flatMap((b) => b.data ?? []) };
}

/** Ikki jamoa o'rtasidagi oxirgi uchrashuvlar */
export function getHeadToHead(team1_id: string, team2_id: string) {
  return opticGet<{ data: any[] }>(
    "/fixtures/results/head-to-head",
    { team1_id, team2_id },
    5 * 60_000,
  );
}
