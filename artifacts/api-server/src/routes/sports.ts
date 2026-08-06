import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, playersTable, transactionsTable, sportsBetsTable, type SportsSelection } from "@workspace/db";
import { isAdminTelegramId, ADMIN_INFINITE_BALANCE } from "../bot";
import {
  OPTIC_ENABLED,
  OpticError,
  applyMargin,
  getSports,
  getLeagues,
  getActiveFixtures,
  getFixtureOdds,
  getResults,
  getPlayerResults,
  getHeadToHead,
  type OpticFixture,
  type OpticOdd,
} from "../lib/optic";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MIN_STAKE = 1000;
const MAX_STAKE = 5_000_000;
const MAX_SELECTIONS = 12;

/** Asosiy marketlar (o'yin oldi ekrani uchun) */
const MAIN_MARKETS = ["Moneyline", "Point Spread", "Total Points", "Total Goals", "Run Line", "Total Runs", "Spread", "Total", "Draw No Bet", "Both Teams To Score"];

function label(f: OpticFixture): string {
  const h = f.home_competitors?.[0]?.name ?? "?";
  const a = f.away_competitors?.[0]?.name ?? "?";
  return `${h} — ${a}`;
}

function slimFixture(f: OpticFixture) {
  return {
    id: f.id,
    startDate: f.start_date,
    status: f.status,
    isLive: f.is_live,
    sport: f.sport?.id,
    league: f.league?.name ?? f.league?.id,
    home: {
      name: f.home_competitors?.[0]?.name ?? "?",
      logo: f.home_competitors?.[0]?.logo ?? null,
    },
    away: {
      name: f.away_competitors?.[0]?.name ?? "?",
      logo: f.away_competitors?.[0]?.logo ?? null,
    },
  };
}

/** Bir marketning eng yaxshi (o'rtacha emas — eng past) narxini olamiz, so'ng marja qo'llaymiz */
function pickOdds(odds: OpticOdd[]) {
  const best = new Map<string, OpticOdd>();
  for (const o of odds) {
    if (typeof o.price !== "number" || o.price <= 1) continue;
    const k = `${o.market}|${o.name}`;
    const cur = best.get(k);
    if (!cur || o.price > cur.price) best.set(k, o);
  }
  return [...best.values()].map((o) => ({
    market: o.market,
    marketId: o.market_id,
    name: o.name,
    points: o.points ?? null,
    line: o.selection_line ?? null,
    isMain: o.is_main ?? false,
    price: applyMargin(o.price),
  }));
}

function guard(res: any): boolean {
  if (!OPTIC_ENABLED()) {
    res.status(503).json({ error: "sport_disabled", message: "Sport bo'limi hali yoqilmagan (API kalit kerak)" });
    return false;
  }
  return true;
}

function fail(res: any, err: unknown) {
  const e = err as OpticError;
  logger.error({ err }, "[sports] request failed");
  res.status(e?.status && e.status < 600 ? e.status : 502).json({
    error: "optic_error",
    message: e?.message ?? "Xatolik",
  });
}

/** Sportlar ro'yxati */
router.get("/sports/catalog", async (_req, res): Promise<void> => {
  if (!guard(res)) return;
  try {
    const [sports, leagues] = await Promise.all([getSports(), getLeagues()]);
    res.json({
      sports: (sports.data ?? []).map((s: any) => ({ id: s.id, name: s.name })),
      leagues: (leagues.data ?? []).map((l: any) => ({
        id: l.id,
        name: l.name,
        sport: l.sport?.id ?? l.sport,
        region: l.region ?? null,
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

/** Liga bo'yicha o'yinlar + asosiy koeffitsientlar */
router.get("/sports/fixtures", async (req, res): Promise<void> => {
  if (!guard(res)) return;
  const sport = req.query["sport"] ? String(req.query["sport"]) : undefined;
  const league = req.query["league"] ? String(req.query["league"]) : undefined;
  const live = String(req.query["live"] ?? "") === "true";
  if (!sport && !league) {
    res.status(400).json({ error: "sport yoki league kerak" });
    return;
  }
  try {
    const fx = await getActiveFixtures({ sport, league, ...(live ? { is_live: true } : {}) });
    const list = (fx.data ?? []).slice(0, 20);
    if (!list.length) {
      res.json({ fixtures: [] });
      return;
    }
    const odds = await getFixtureOdds({
      fixture_id: list.map((f) => f.id),
      market: MAIN_MARKETS,
      is_main: true,
    });
    const byId = new Map(odds.data?.map((o) => [o.id, o.odds ?? []]) ?? []);
    res.json({
      fixtures: list.map((f) => ({
        ...slimFixture(f),
        label: label(f),
        odds: pickOdds(byId.get(f.id) ?? []),
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

/** Bitta o'yin — barcha marketlar */
router.get("/sports/fixture/:id", async (req, res): Promise<void> => {
  if (!guard(res)) return;
  try {
    const odds = await getFixtureOdds({ fixture_id: [req.params.id] });
    const f = odds.data?.[0];
    if (!f) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const picked = pickOdds(f.odds ?? []);
    const groups: Record<string, typeof picked> = {};
    for (const o of picked) (groups[o.market] ||= []).push(o);
    res.json({
      fixture: { ...slimFixture(f as any), label: label(f as any) },
      markets: Object.entries(groups)
        .map(([market, selections]) => ({ market, selections }))
        .sort((a, b) => (MAIN_MARKETS.indexOf(a.market) + 99) - (MAIN_MARKETS.indexOf(b.market) + 99)),
    });
  } catch (err) {
    fail(res, err);
  }
});


/* ───────────────────────── STATISTIKA (OpticOdds Statistics API) ─────────────────────────
 * Docs: https://developer.opticodds.com/docs/statistics-api-guide
 * Manba: /fixtures/results (jamoa stats + events + market_stats)
 *        /fixtures/player-results (o'yinchi stats)
 *        /fixtures/results/head-to-head (oxirgi uchrashuvlar)
 */

/** Ekranda ko'rsatiladigan asosiy jamoa ko'rsatkichlari (tartib muhim) */
const TEAM_STAT_ROWS: { key: string; uz: string; ru: string; en: string; pct?: boolean }[] = [
  { key: "possession_percentage", uz: "Egallash", ru: "Владение", en: "Possession", pct: true },
  { key: "total_scoring_att", uz: "Zarbalar", ru: "Удары", en: "Shots" },
  { key: "ontarget_scoring_att", uz: "Darvoza ichiga", ru: "В створ", en: "On target" },
  { key: "shot_off_target", uz: "Nishondan tashqari", ru: "Мимо", en: "Off target" },
  { key: "blocked_scoring_att", uz: "To'silgan zarba", ru: "Заблокировано", en: "Blocked" },
  { key: "big_chance_created", uz: "Xatarli imkoniyat", ru: "Голевые моменты", en: "Big chances" },
  { key: "attempts_ibox", uz: "Jarima maydonidan", ru: "Из штрафной", en: "Shots in box" },
  { key: "total_pass", uz: "Uzatmalar", ru: "Передачи", en: "Passes" },
  { key: "accurate_pass", uz: "Aniq uzatma", ru: "Точные передачи", en: "Accurate passes" },
  { key: "final_third_entries", uz: "Oxirgi uchdan bir", ru: "Выходы в треть", en: "Final third entries" },
  { key: "total_cross", uz: "Navesslar", ru: "Навесы", en: "Crosses" },
  { key: "corner_taken", uz: "Burchaklar", ru: "Угловые", en: "Corners" },
  { key: "total_tackle", uz: "Otbor", ru: "Отборы", en: "Tackles" },
  { key: "interceptions", uz: "Perexvat", ru: "Перехваты", en: "Interceptions" },
  { key: "total_clearance", uz: "Chiqarib yuborish", ru: "Выносы", en: "Clearances" },
  { key: "duel_won", uz: "Yutilgan duel", ru: "Выигранные единоборства", en: "Duels won" },
  { key: "aerial_won", uz: "Havoda yutuq", ru: "Верховые дуэли", en: "Aerials won" },
  { key: "saves", uz: "To'xtatilgan zarba", ru: "Сейвы", en: "Saves" },
  { key: "fouls", uz: "Qoidabuzarlik", ru: "Фолы", en: "Fouls" },
  { key: "total_offside", uz: "Ofsayd", ru: "Офсайды", en: "Offsides" },
  { key: "total_yellow_card", uz: "Sariq kartochka", ru: "Жёлтые", en: "Yellow cards" },
  { key: "total_red_card", uz: "Qizil kartochka", ru: "Красные", en: "Red cards" },
  { key: "ppda", uz: "PPDA (pressing)", ru: "PPDA (прессинг)", en: "PPDA (pressing)" },
];

/** O'yinchi kartochkasi uchun market stats (betting-relevant) */
const PLAYER_STAT_ROWS: { key: string; uz: string; ru: string; en: string }[] = [
  { key: "player_goals", uz: "Gol", ru: "Голы", en: "Goals" },
  { key: "player_assists", uz: "Uzatma", ru: "Ассисты", en: "Assists" },
  { key: "player_shots", uz: "Zarba", ru: "Удары", en: "Shots" },
  { key: "player_shots_on_target", uz: "Darvozaga", ru: "В створ", en: "On target" },
  { key: "player_passes_completed", uz: "Aniq uzatma", ru: "Точные передачи", en: "Passes" },
  { key: "player_tackles", uz: "Otbor", ru: "Отборы", en: "Tackles" },
  { key: "player_interceptions", uz: "Perexvat", ru: "Перехваты", en: "Interceptions" },
  { key: "player_fouls", uz: "Fol", ru: "Фолы", en: "Fouls" },
  { key: "player_cards", uz: "Kartochka", ru: "Карточки", en: "Cards" },
  { key: "player_saves", uz: "To'xtatish", ru: "Сейвы", en: "Saves" },
];

type StatBucket = { period: string; stats: Record<string, number> };

function periodStats(list: StatBucket[] | undefined, period: string): Record<string, number> {
  if (!Array.isArray(list)) return {};
  return list.find((b) => b.period === period)?.stats ?? {};
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Bitta o'yin statistikasi: hisob, davrlar, voqealar, jamoa va o'yinchi ko'rsatkichlari */
router.get("/sports/stats/:id", async (req, res): Promise<void> => {
  if (!guard(res)) return;
  const id = String(req.params["id"] ?? "");
  const period = String(req.query["period"] ?? "all"); // all | period_1 | period_2 ...
  try {
    const [resultsRes, playersRes] = await Promise.all([
      getResults([id]),
      getPlayerResults([id]).catch(() => ({ data: [] as any[] })),
    ]);
    const r: any = resultsRes.data?.[0];
    if (!r) {
      res.status(404).json({ error: "not_found", message: "Bu o'yin uchun statistika hali yo'q" });
      return;
    }

    const fx = r.fixture ?? {};
    const homeName = fx.home_competitors?.[0]?.name ?? fx.home_team_display ?? "Home";
    const awayName = fx.away_competitors?.[0]?.name ?? fx.away_team_display ?? "Away";

    const homeStats = periodStats(r.stats?.home, period);
    const awayStats = periodStats(r.stats?.away, period);
    const hasAny = Object.keys(homeStats).length + Object.keys(awayStats).length > 0;

    const rows = TEAM_STAT_ROWS.filter((row) => row.key in homeStats || row.key in awayStats).map((row) => {
      const h = num(homeStats[row.key]);
      const a = num(awayStats[row.key]);
      const sum = h + a;
      return {
        key: row.key,
        label: { uz: row.uz, ru: row.ru, en: row.en },
        home: h,
        away: a,
        homePct: sum > 0 ? Math.round((h / sum) * 100) : 50,
        suffix: row.pct ? "%" : "",
      };
    });

    // voqealar tasmasi (gol, kartochka, almashtirish)
    const events = (r.events ?? [])
      .filter((e: any) => e?.event_type)
      .map((e: any) => ({
        type: String(e.event_type),
        period: e.period ?? null,
        clock: e.clock != null ? String(e.clock) : null,
        team: e.team === "home" ? "home" : e.team === "away" ? "away" : null,
        player: e.player?.name ?? null,
        secondary: e.secondary_player?.name ?? e.assist?.name ?? null,
      }))
      .sort((a: any, b: any) => Number(a.clock ?? 0) - Number(b.clock ?? 0));

    // o'yinchilar — market stats bo'yicha eng faollari
    const rawPlayers = playersRes.data?.[0]?.results ?? [];
    const players = rawPlayers
      .map((p: any) => {
        const ms: Record<string, number> = p.market_stats ?? {};
        const base = periodStats(p.stats, period);
        const minutes = num(base["minutes"]);
        const score =
          num(ms["player_goals"]) * 10 +
          num(ms["player_assists"]) * 7 +
          num(ms["player_shots_on_target"]) * 2 +
          num(ms["player_shots"]) +
          num(ms["player_saves"]) * 2 +
          minutes / 30;
        return {
          id: p.player?.id ?? null,
          name: p.player?.name ?? "?",
          position: p.player?.position ?? null,
          number: p.player?.number ?? null,
          team: p.team?.name === awayName ? "away" : "home",
          teamName: p.team?.name ?? null,
          isStarter: Boolean(p.is_starter),
          minutes,
          rating: Math.round(score * 10) / 10,
          stats: PLAYER_STAT_ROWS.filter((row) => row.key in ms).map((row) => ({
            key: row.key,
            label: { uz: row.uz, ru: row.ru, en: row.en },
            value: num(ms[row.key]),
          })),
        };
      })
      .sort((a: any, b: any) => b.rating - a.rating)
      .slice(0, 16);

    res.json({
      fixture: {
        id: fx.id ?? id,
        status: fx.status ?? null,
        startDate: fx.start_date ?? null,
        venue: fx.venue_name ?? null,
        venueLocation: fx.venue_location ?? null,
        league: r.league?.name ?? null,
        sport: r.sport?.id ?? null,
        isLive: Boolean(r.in_play),
        home: homeName,
        away: awayName,
      },
      scores: {
        home: num(r.scores?.home?.total),
        away: num(r.scores?.away?.total),
        periods: {
          home: r.scores?.home?.periods ?? {},
          away: r.scores?.away?.periods ?? {},
        },
      },
      periodsAvailable: [...new Set((r.stats?.home ?? []).map((b: StatBucket) => b.period))],
      period,
      hasStats: hasAny,
      teamStats: rows,
      marketStats: {
        home: r.market_stats?.home ?? {},
        away: r.market_stats?.away ?? {},
      },
      events,
      players,
    });
  } catch (err) {
    fail(res, err);
  }
});

/** Oxirgi uchrashuvlar (H2H) */
router.get("/sports/h2h", async (req, res): Promise<void> => {
  if (!guard(res)) return;
  const t1 = String(req.query["team1"] ?? "");
  const t2 = String(req.query["team2"] ?? "");
  if (!t1 || !t2) {
    res.status(400).json({ error: "team1 va team2 kerak" });
    return;
  }
  try {
    const r = await getHeadToHead(t1, t2);
    res.json({
      matches: (r.data ?? []).slice(0, 10).map((m: any) => ({
        id: m.fixture?.id ?? null,
        date: m.fixture?.start_date ?? null,
        league: m.league?.name ?? null,
        home: m.fixture?.home_competitors?.[0]?.name ?? "?",
        away: m.fixture?.away_competitors?.[0]?.name ?? "?",
        homeScore: num(m.scores?.home?.total),
        awayScore: num(m.scores?.away?.total),
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

/** Kupon: tikish */
router.post("/sports/bet", async (req, res): Promise<void> => {
  if (!guard(res)) return;
  const telegramId = String(req.body?.telegramId ?? "");
  const stake = Math.floor(Number(req.body?.stake ?? 0));
  const rawSel = Array.isArray(req.body?.selections) ? req.body.selections : [];

  if (!telegramId) { res.status(400).json({ error: "missing_id" }); return; }
  if (!rawSel.length || rawSel.length > MAX_SELECTIONS) { res.status(400).json({ error: "Kupon bo'sh yoki juda uzun" }); return; }
  if (!Number.isFinite(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    res.status(400).json({ error: `Tikim ${MIN_STAKE.toLocaleString()} — ${MAX_STAKE.toLocaleString()} oralig'ida bo'lishi kerak` });
    return;
  }

  const selections: SportsSelection[] = [];
  for (const s of rawSel) {
    const price = Number(s?.price);
    if (!s?.fixtureId || !s?.market || !s?.selection || !Number.isFinite(price) || price <= 1) {
      res.status(400).json({ error: "Kupon ma'lumoti noto'g'ri" });
      return;
    }
    selections.push({
      fixtureId: String(s.fixtureId),
      fixtureLabel: String(s.fixtureLabel ?? ""),
      league: String(s.league ?? ""),
      startDate: String(s.startDate ?? ""),
      market: String(s.market),
      selection: String(s.selection),
      price: Math.round(price * 100) / 100,
      status: "pending",
    });
  }
  // bir o'yindan bir nechta tanlov — ekspressda taqiqlanadi
  if (selections.length > 1) {
    const ids = new Set(selections.map((s) => s.fixtureId));
    if (ids.size !== selections.length) {
      res.status(400).json({ error: "Bitta o'yindan ekspressga faqat bitta tanlov qo'shiladi" });
      return;
    }
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
  if (!player) { res.status(404).json({ error: "not_found" }); return; }
  if (player.banned) { res.status(403).json({ error: "Ban qilingansiz" }); return; }

  const admin = isAdminTelegramId(telegramId);
  if (!admin && player.balance < stake) {
    res.status(400).json({ error: "Balansingiz yetarli emas" });
    return;
  }

  const totalOddsFloat = selections.reduce((a, s) => a * s.price, 1);
  const totalOdds = Math.round(totalOddsFloat * 100);
  const potentialWin = Math.floor((stake * totalOdds) / 100);

  const newBalance = admin ? ADMIN_INFINITE_BALANCE : player.balance - stake;
  const [updated] = await db.update(playersTable)
    .set({
      balance: newBalance,
      totalWagered: player.totalWagered + stake,
      gamesPlayed: player.gamesPlayed + 1,
      updatedAt: new Date(),
    })
    .where(eq(playersTable.telegramId, telegramId))
    .returning();

  const [bet] = await db.insert(sportsBetsTable).values({
    playerId: player.id,
    telegramId,
    betType: selections.length > 1 ? "parlay" : "single",
    stake,
    totalOdds,
    potentialWin,
    status: "pending",
    selections,
  }).returning();

  await db.insert(transactionsTable).values({
    playerId: player.id,
    type: "sport_bet",
    amount: stake,
    game: "sport",
  });

  res.json({ bet, balance: updated?.balance ?? newBalance });
});

/** Mening kuponlarim */
router.get("/sports/bets/:telegramId", async (req, res): Promise<void> => {
  const rows = await db.select().from(sportsBetsTable)
    .where(eq(sportsBetsTable.telegramId, req.params.telegramId))
    .orderBy(desc(sportsBetsTable.createdAt))
    .limit(50);
  res.json({ bets: rows });
});

/** Qo'lda settlement (admin/cron) */
router.post("/sports/settle", async (_req, res): Promise<void> => {
  if (!guard(res)) return;
  const n = await settlePendingBets();
  res.json({ settled: n });
});

export async function settlePendingBets(): Promise<number> {
  if (!OPTIC_ENABLED()) return 0;
  const { gradeBet } = await import("../lib/optic");
  const pending = await db.select().from(sportsBetsTable)
    .where(and(eq(sportsBetsTable.status, "pending")))
    .orderBy(desc(sportsBetsTable.createdAt))
    .limit(100);

  let settled = 0;
  for (const bet of pending) {
    const sels = (bet.selections as SportsSelection[]) ?? [];
    // o'yin boshlanganiga 1 soat bo'lmagan bo'lsa — hali kutamiz
    const notReady = sels.some((s) => {
      const t = Date.parse(s.startDate || "");
      return Number.isFinite(t) && Date.now() - t < 60 * 60_000;
    });
    if (notReady) continue;

    let allDone = true;
    let lost = false;
    let oddsAcc = 1;
    const next: SportsSelection[] = [];

    for (const s of sels) {
      if (s.status && s.status !== "pending") {
        if (s.status === "lost") lost = true;
        else if (s.status === "won") oddsAcc *= s.price;
        next.push(s);
        continue;
      }
      try {
        const g = await gradeBet({ fixture_id: s.fixtureId, market: s.market, name: s.selection });
        const r = String(g.data?.result ?? "Pending");
        if (r === "Won") { oddsAcc *= s.price; next.push({ ...s, status: "won" }); }
        else if (r === "Lost") { lost = true; next.push({ ...s, status: "lost" }); }
        else if (r === "Refunded") { next.push({ ...s, status: "refunded" }); }
        else if (r === "Half Won") { oddsAcc *= 1 + (s.price - 1) / 2; next.push({ ...s, status: "won" }); }
        else if (r === "Half Lost") { oddsAcc *= 1 - (1 - 1 / s.price); next.push({ ...s, status: "half_lost" }); }
        else { allDone = false; next.push(s); }
      } catch (err) {
        logger.warn({ err, fixture: s.fixtureId }, "[sports] grade failed");
        allDone = false;
        next.push(s);
      }
    }

    if (!lost && !allDone) {
      await db.update(sportsBetsTable).set({ selections: next }).where(eq(sportsBetsTable.id, bet.id));
      continue;
    }

    const status = lost ? "lost" : oddsAcc <= 1.0001 ? "refunded" : "won";
    const payout = lost ? 0 : Math.floor(bet.stake * oddsAcc);

    await db.update(sportsBetsTable).set({
      selections: next,
      status,
      payout,
      settledAt: new Date(),
    }).where(eq(sportsBetsTable.id, bet.id));

    if (payout > 0) {
      const [p] = await db.select().from(playersTable).where(eq(playersTable.id, bet.playerId));
      if (p) {
        const admin = isAdminTelegramId(p.telegramId);
        await db.update(playersTable).set({
          balance: admin ? ADMIN_INFINITE_BALANCE : p.balance + payout,
          totalWon: status === "won" ? p.totalWon + payout : p.totalWon,
          updatedAt: new Date(),
        }).where(eq(playersTable.id, p.id));
        await db.insert(transactionsTable).values({
          playerId: p.id,
          type: status === "won" ? "sport_win" : "sport_refund",
          amount: payout,
          game: "sport",
        });
      }
    } else {
      const [p] = await db.select().from(playersTable).where(eq(playersTable.id, bet.playerId));
      if (p) {
        await db.update(playersTable)
          .set({ totalLost: p.totalLost + bet.stake, updatedAt: new Date() })
          .where(eq(playersTable.id, p.id));
      }
    }
    settled++;
  }
  return settled;
}

/** Har 5 daqiqada avtomatik hisob-kitob */
export function startSportsSettlement() {
  if (!OPTIC_ENABLED()) {
    logger.warn("[sports] OPTICODDS_API_KEY yo'q — sport bo'limi o'chirilgan");
    return;
  }
  setInterval(() => {
    settlePendingBets()
      .then((n) => { if (n) logger.info({ n }, "[sports] settled bets"); })
      .catch((err) => logger.error({ err }, "[sports] settlement error"));
  }, 5 * 60_000);
}

export default router;
