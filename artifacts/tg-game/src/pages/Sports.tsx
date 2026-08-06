import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, GOLD, XGREEN } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";
import Odometer from "@/components/casino/Odometer";
import { sfx } from "@/lib/sound";
import {
  getSportCatalog,
  getSportFixtures,
  getSportFixture,
  placeSportBet,
  getSportBets,
  type SportFixture,
  type SportOdd,
} from "@/lib/api";

type Pick = {
  fixtureId: string;
  fixtureLabel: string;
  league: string;
  startDate: string;
  market: string;
  selection: string;
  price: number;
};

const CARD = "linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))";
const BORDER = "rgba(255,255,255,0.09)";
const SUB = "rgba(255,255,255,0.56)";

/** Sport logolari — emoji emas, rasm (bor bo'lsa) */
const SPORT_IMG: Record<string, string> = {
  soccer: "/symbols/ball-soccer.png",
};

const SPORT_ICONS: Record<string, string> = {
  soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾", hockey: "🏒",
  tennis: "🎾", mma: "🥊", boxing: "🥊", volleyball: "🏐", esports: "🎮",
  cricket: "🏏", darts: "🎯", golf: "⛳", table_tennis: "🏓",
};

/** Futbolning top ligalari — birinchi bo'lib chiqadi */
const TOP_LEAGUES = [
  "england_-_premier_league",
  "spain_-_la_liga",
  "italy_-_serie_a",
  "germany_-_bundesliga",
  "france_-_ligue_1",
  "uefa_-_champions_league",
  "uefa_-_europa_league",
  "uzbekistan_-_super_league",
  "turkey_-_super_lig",
  "netherlands_-_eredivisie",
];

const STAKES = [5000, 10000, 25000, 50000, 100000];

const fmt = (n: number) => n.toLocaleString("ru-RU");

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** 1 / X / 2 tanlovlarini ajratib olamiz */
function mainRow(fx: SportFixture): { key: string; label: string; odd: SportOdd | null }[] {
  const ml = fx.odds.filter((o) => /moneyline|1x2|match winner/i.test(o.market));
  const find = (pred: (o: SportOdd) => boolean) => ml.find(pred) ?? null;
  return [
    { key: "1", label: "1", odd: find((o) => o.name === fx.home.name) },
    { key: "X", label: "X", odd: find((o) => /^draw$/i.test(o.name)) },
    { key: "2", label: "2", odd: find((o) => o.name === fx.away.name) },
  ];
}

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
  const [bad, setBad] = useState(false);
  if (!logo || bad) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black"
        style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}`, fontSize: 10, color: GOLD.light }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={logo} alt="" width={28} height={28} onError={() => setBad(true)}
      className="w-7 h-7 object-contain shrink-0"
      style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }} />
  );
}

export default function Sports() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const { ts } = useTheme();

  const [tab, setTab] = useState<"line" | "live" | "bets">("line");
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [leagues, setLeagues] = useState<{ id: string; name: string; sport: string }[]>([]);
  const [sport, setSport] = useState("soccer");
  const [league, setLeague] = useState<string>("");
  const [fixtures, setFixtures] = useState<SportFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [openFixture, setOpenFixture] = useState<string | null>(null);
  const [markets, setMarkets] = useState<{ market: string; selections: SportOdd[] }[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);

  const [slip, setSlip] = useState<Pick[]>([]);
  const [stake, setStake] = useState(5000);
  const [slipOpen, setSlipOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [bets, setBets] = useState<any[]>([]);

  // katalog
  useEffect(() => {
    getSportCatalog()
      .then((c) => {
        const list = c.sports ?? [];
        // futbol birinchi
        list.sort((a, b) => (a.id === "soccer" ? -1 : b.id === "soccer" ? 1 : 0));
        setSports(list);
        setLeagues(c.leagues ?? []);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const sportLeagues = useMemo(() => {
    const list = leagues.filter((l) => l.sport === sport);
    const rank = (id: string) => {
      const i = TOP_LEAGUES.indexOf(id);
      return i === -1 ? 99 : i;
    };
    return list.sort((a, b) => rank(a.id) - rank(b.id)).slice(0, 40);
  }, [leagues, sport]);

  // o'yinlar
  useEffect(() => {
    if (tab === "bets") return;
    let alive = true;
    setLoading(true);
    setErr(null);
    const load = () =>
      getSportFixtures({ sport, league: league || undefined, live: tab === "live" })
        .then((r) => { if (alive) setFixtures(r.fixtures ?? []); })
        .catch((e) => { if (alive) { setErr(e.message); setFixtures([]); } })
        .finally(() => { if (alive) setLoading(false); });
    load();
    const t = setInterval(load, tab === "live" ? 20000 : 60000);
    return () => { alive = false; clearInterval(t); };
  }, [sport, league, tab]);

  // kuponlar
  useEffect(() => {
    if (tab !== "bets" || !player?.telegramId) return;
    getSportBets(String(player.telegramId)).then((r) => setBets(r.bets ?? [])).catch(() => {});
  }, [tab, player?.telegramId]);

  const openMarkets = (id: string) => {
    sfx.click?.();
    if (openFixture === id) { setOpenFixture(null); return; }
    setOpenFixture(id);
    setMarketsLoading(true);
    setMarkets([]);
    getSportFixture(id)
      .then((r) => setMarkets(r.markets ?? []))
      .catch(() => setMarkets([]))
      .finally(() => setMarketsLoading(false));
  };

  const inSlip = (f: string, m: string, n: string) =>
    slip.some((s) => s.fixtureId === f && s.market === m && s.selection === n);

  const toggle = (fx: SportFixture, o: SportOdd) => {
    sfx.select?.();
    setSlip((prev) => {
      const found = prev.find((s) => s.fixtureId === fx.id && s.market === o.market && s.selection === o.name);
      if (found) return prev.filter((s) => s !== found);
      const others = prev.filter((s) => s.fixtureId !== fx.id);
      return [...others, {
        fixtureId: fx.id,
        fixtureLabel: fx.label,
        league: fx.league,
        startDate: fx.startDate,
        market: o.market,
        selection: o.name,
        price: o.price,
      }];
    });
    setSlipOpen(true);
  };

  const totalOdds = slip.reduce((a, s) => a * s.price, 1);
  const potential = Math.floor(stake * totalOdds);

  const submit = async () => {
    if (!player?.telegramId || !slip.length || placing) return;
    setPlacing(true);
    setMsg(null);
    try {
      await placeSportBet(String(player.telegramId), stake, slip);
      sfx.win?.();
      setSlip([]);
      setSlipOpen(false);
      setMsg("✅ Kupon qabul qilindi!");
      await refresh();
    } catch (e: any) {
      sfx.lose?.();
      setMsg(`❌ ${e.message}`);
    } finally {
      setPlacing(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const goldBtn = (active: boolean) => ({
    background: active ? GOLD.grad : CARD,
    color: active ? "#1a1204" : SUB,
    border: `1px solid ${active ? "rgba(255,246,207,0.65)" : BORDER}`,
    boxShadow: active ? `0 8px 22px ${GOLD.glow}` : "none",
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: ts.bg }}>
      <GameHeader title="SPORT" subtitle="Jonli koeffitsientlar · OpticOdds" />

      {/* ─── 2 BO'LIM: O'YINLAR / SPORT ─── */}
      <div className="flex gap-2 px-3 pt-3">
        <button onClick={() => { sfx.click?.(); nav("/"); }}
          className="flex-1 py-2.5 rounded-2xl font-black text-xs active:scale-95 transition-all"
          style={goldBtn(false)}>
          🎰 O'YINLAR
        </button>
        <button
          className="flex-1 py-2.5 rounded-2xl font-black text-xs pro-sheen"
          style={goldBtn(true)}>
          ⚽ SPORT
        </button>
      </div>

      {/* tablar */}
      <div className="flex gap-2 px-3 py-2.5">
        {([["line", "LINIYA"], ["live", "LIVE"], ["bets", "KUPONLARIM"]] as const).map(([k, t]) => (
          <button key={k} onClick={() => { sfx.click?.(); setTab(k); }}
            className="flex-1 py-2 rounded-xl text-[11px] font-black active:scale-95 transition-all"
            style={{
              background: tab === k ? XGREEN.grad : CARD,
              color: tab === k ? "#fff" : SUB,
              border: `1px solid ${tab === k ? "rgba(255,255,255,0.2)" : BORDER}`,
            }}>
            {k === "live" && <span style={{ color: tab === k ? "#fff" : "#ef4444" }}>● </span>}{t}
          </button>
        ))}
      </div>

      {tab !== "bets" && (
        <>
          {/* sportlar */}
          <div className="flex gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
            {(sports.length ? sports : [{ id: "soccer", name: "Futbol" }]).map((s) => (
              <button key={s.id} onClick={() => { sfx.click?.(); setSport(s.id); setLeague(""); }}
                className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 flex items-center gap-1"
                style={goldBtn(sport === s.id)}>
                {SPORT_IMG[s.id]
                  ? <img src={SPORT_IMG[s.id]} alt="" width={14} height={14} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <span>{SPORT_ICONS[s.id] ?? "🏆"}</span>}
                {s.id === "soccer" ? "FUTBOL" : s.name}
              </button>
            ))}
          </div>

          {/* ligalar */}
          {sportLeagues.length > 0 && (
            <div className="flex gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
              <button onClick={() => setLeague("")}
                className="shrink-0 px-3 py-1 rounded-lg text-[10px] font-bold"
                style={{ background: !league ? GOLD.soft : CARD, color: !league ? GOLD.light : SUB, border: `1px solid ${!league ? GOLD.border : BORDER}` }}>
                BARCHASI
              </button>
              {sportLeagues.map((l) => (
                <button key={l.id} onClick={() => setLeague(l.id)}
                  className="shrink-0 px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
                  style={{ background: league === l.id ? GOLD.soft : CARD, color: league === l.id ? GOLD.light : SUB, border: `1px solid ${league === l.id ? GOLD.border : BORDER}` }}>
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex-1 px-3 pb-44">
        {tab === "bets" ? (
          <div className="flex flex-col gap-2 pt-1">
            {!bets.length && <p className="text-center text-xs py-10" style={{ color: SUB }}>Hozircha kupon yo'q</p>}
            {bets.map((b) => (
              <div key={b.id} className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black" style={{ color: SUB }}>
                    {b.betType === "parlay" ? "EKSPRESS" : "ORDINAR"} · {timeLabel(b.createdAt)}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                    style={{
                      background: b.status === "won" ? "rgba(52,211,153,0.18)" : b.status === "lost" ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.08)",
                      color: b.status === "won" ? "#34d399" : b.status === "lost" ? "#ef4444" : SUB,
                    }}>
                    {b.status === "won" ? "YUTDINGIZ" : b.status === "lost" ? "YUTQAZDINGIZ" : b.status === "refunded" ? "QAYTARILDI" : "KUTILMOQDA"}
                  </span>
                </div>
                {(b.selections ?? []).map((s: Pick, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-bold truncate" style={{ color: "#fff" }}>{s.selection}</p>
                      <p className="text-[9px] truncate" style={{ color: SUB }}>{s.market} · {s.fixtureLabel}</p>
                    </div>
                    <span className="text-[11px] font-black" style={{ color: GOLD.light }}>{s.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <span className="text-[10px] font-bold" style={{ color: SUB }}>Tikim: {fmt(b.stake)} · Kf: {(b.totalOdds / 100).toFixed(2)}</span>
                  <span className="text-[12px] font-black" style={{ color: b.status === "won" ? "#34d399" : GOLD.light }}>
                    {b.status === "won" ? `+${fmt(b.payout ?? 0)}` : fmt(b.potentialWin)} UZS
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 pt-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : err ? (
          <div className="rounded-2xl p-4 text-center mt-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xs font-bold" style={{ color: "#f87171" }}>{err}</p>
            <p className="text-[10px] mt-1" style={{ color: SUB }}>Keyinroq qayta urinib ko'ring</p>
          </div>
        ) : !fixtures.length ? (
          <p className="text-center text-xs py-10" style={{ color: SUB }}>
            {tab === "live" ? "Hozir jonli o'yin yo'q" : "Bu ligada o'yin topilmadi"}
          </p>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            {fixtures.map((fx) => {
              const row = mainRow(fx);
              const extra = Math.max(0, fx.odds.length - row.filter((r) => r.odd).length);
              return (
                <div key={fx.id} className="rounded-2xl overflow-hidden"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
                  {/* liga + vaqt */}
                  <div className="flex items-center justify-between px-3 pt-2.5">
                    <span className="text-[9px] font-black truncate max-w-[62%]" style={{ color: GOLD.light, letterSpacing: "0.08em" }}>
                      {fx.league?.toUpperCase()}
                    </span>
                    {fx.isLive ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md live-pulse"
                        style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>● LIVE</span>
                    ) : (
                      <span className="text-[9px] font-bold" style={{ color: SUB }}>{timeLabel(fx.startDate)}</span>
                    )}
                  </div>

                  {/* jamoalar */}
                  <button onClick={() => openMarkets(fx.id)} className="w-full px-3 py-2 text-left active:opacity-80">
                    <div className="flex items-center gap-2 mb-1">
                      <TeamLogo logo={fx.home.logo} name={fx.home.name} />
                      <span className="text-[12px] font-bold truncate" style={{ color: "#fff" }}>{fx.home.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TeamLogo logo={fx.away.logo} name={fx.away.name} />
                      <span className="text-[12px] font-bold truncate" style={{ color: "#fff" }}>{fx.away.name}</span>
                    </div>
                  </button>

                  {/* 1 X 2 */}
                  <div className="flex gap-1.5 px-3 pb-2.5">
                    {row.map((r) => {
                      const active = r.odd ? inSlip(fx.id, r.odd.market, r.odd.name) : false;
                      return (
                        <button key={r.key}
                          disabled={!r.odd}
                          onClick={() => r.odd && toggle(fx, r.odd)}
                          className="flex-1 py-2 rounded-xl active:scale-95 transition-all"
                          style={{
                            background: active ? GOLD.grad : "rgba(255,255,255,0.05)",
                            border: `1px solid ${active ? "rgba(255,246,207,0.65)" : BORDER}`,
                            opacity: r.odd ? 1 : 0.4,
                            boxShadow: active ? `0 6px 18px ${GOLD.glow}` : "none",
                          }}>
                          <p className="text-[9px] font-black" style={{ color: active ? "rgba(26,18,4,0.7)" : SUB }}>{r.label}</p>
                          <p className="text-[13px] font-black" style={{ color: active ? "#1a1204" : GOLD.light }}>
                            {r.odd ? r.odd.price.toFixed(2) : "—"}
                          </p>
                        </button>
                      );
                    })}
                    <button onClick={() => openMarkets(fx.id)}
                      className="px-3 rounded-xl active:scale-95"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
                      <p className="text-[11px] font-black" style={{ color: GOLD.light }}>
                        {openFixture === fx.id ? "−" : `+${extra || ""}`}
                      </p>
                    </button>
                  </div>

                  {/* barcha marketlar */}
                  {openFixture === fx.id && (
                    <div className="px-3 pb-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                      {marketsLoading ? (
                        <p className="text-[10px] py-3 text-center" style={{ color: SUB }}>Yuklanmoqda…</p>
                      ) : !markets.length ? (
                        <p className="text-[10px] py-3 text-center" style={{ color: SUB }}>Market topilmadi</p>
                      ) : (
                        markets.map((g) => (
                          <div key={g.market} className="pt-2.5">
                            <p className="text-[9px] font-black mb-1.5" style={{ color: GOLD.light, letterSpacing: "0.08em" }}>
                              {g.market.toUpperCase()}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {g.selections.map((o, i) => {
                                const active = inSlip(fx.id, o.market, o.name);
                                return (
                                  <button key={`${o.name}-${i}`} onClick={() => toggle(fx, o)}
                                    className="flex items-center justify-between px-2.5 py-2 rounded-xl active:scale-95 transition-all"
                                    style={{
                                      background: active ? GOLD.grad : "rgba(255,255,255,0.05)",
                                      border: `1px solid ${active ? "rgba(255,246,207,0.65)" : BORDER}`,
                                    }}>
                                    <span className="text-[10px] font-bold truncate pr-1" style={{ color: active ? "#1a1204" : "rgba(255,255,255,0.8)" }}>
                                      {o.name}
                                    </span>
                                    <span className="text-[11px] font-black" style={{ color: active ? "#1a1204" : GOLD.light }}>
                                      {o.price.toFixed(2)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── KUPON (bet slip) ─── */}
      {slip.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: "linear-gradient(180deg,rgba(6,10,18,0.96),rgba(3,6,12,0.99))",
            borderTop: `1px solid ${GOLD.border}`,
            boxShadow: `0 -14px 40px rgba(0,0,0,0.6)`,
          }}>
          <button onClick={() => setSlipOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] font-black" style={{ color: GOLD.light }}>
              KUPON · {slip.length} {slip.length > 1 ? "(EKSPRESS)" : "(ORDINAR)"}
            </span>
            <span className="text-[11px] font-black" style={{ color: "#fff" }}>
              Kf {totalOdds.toFixed(2)} · {slipOpen ? "▾" : "▴"}
            </span>
          </button>

          {slipOpen && (
            <div className="px-4 pb-4">
              <div className="max-h-40 overflow-y-auto no-scrollbar mb-2">
                {slip.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-bold truncate" style={{ color: "#fff" }}>{s.selection}</p>
                      <p className="text-[9px] truncate" style={{ color: SUB }}>{s.market} · {s.fixtureLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-black" style={{ color: GOLD.light }}>{s.price.toFixed(2)}</span>
                      <button onClick={() => setSlip((p) => p.filter((x) => x !== s))}
                        className="w-6 h-6 rounded-lg font-black text-[11px]"
                        style={{ background: "rgba(239,68,68,0.18)", color: "#f87171" }}>×</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
                {STAKES.map((v) => (
                  <button key={v} onClick={() => { sfx.click?.(); setStake(v); }}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black active:scale-95"
                    style={goldBtn(stake === v)}>
                    {fmt(v)}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold" style={{ color: SUB }}>Mumkin yutuq</span>
                <span className="text-[15px] font-black" style={{ color: GOLD.light }}>
                  <Odometer value={potential} /> UZS
                </span>
              </div>

              {msg && <p className="text-[11px] font-bold text-center mb-2" style={{ color: msg.startsWith("✅") ? "#34d399" : "#f87171" }}>{msg}</p>}

              <div className="flex gap-2">
                <button onClick={() => { setSlip([]); setSlipOpen(false); }}
                  className="px-4 py-3 rounded-2xl text-[11px] font-black active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", color: SUB, border: `1px solid ${BORDER}` }}>
                  TOZALASH
                </button>
                <button onClick={submit} disabled={placing}
                  className="flex-1 py-3 rounded-2xl text-[12px] font-black active:scale-95 pro-sheen"
                  style={{
                    background: GOLD.grad,
                    color: "#1a1204",
                    border: "1px solid rgba(255,246,207,0.7)",
                    boxShadow: `0 10px 28px ${GOLD.glow}`,
                    opacity: placing ? 0.6 : 1,
                  }}>
                  {placing ? "YUBORILMOQDA…" : `TIKISH · ${fmt(stake)} UZS`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
