import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { useTheme, GOLD, XGREEN } from "@/lib/theme-context";
import GameHeader from "@/components/GameHeader";
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

const CARD = "rgba(255,255,255,0.045)";
const BORDER = "rgba(255,255,255,0.10)";
const SUB = "rgba(255,255,255,0.55)";

const SPORT_ICONS: Record<string, string> = {
  soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾", hockey: "🏒",
  tennis: "🎾", mma: "🥊", boxing: "🥊", volleyball: "🏐", esports: "🎮",
  cricket: "🏏", darts: "🎯", golf: "⛳", table_tennis: "🏓",
};

const fmt = (n: number) => n.toLocaleString("ru-RU");

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
        setSports(c.sports ?? []);
        setLeagues(c.leagues ?? []);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const sportLeagues = useMemo(
    () => leagues.filter((l) => l.sport === sport).slice(0, 40),
    [leagues, sport],
  );

  // o'yinlar
  useEffect(() => {
    if (tab === "bets") return;
    let alive = true;
    setLoading(true);
    setErr(null);
    getSportFixtures({ sport, league: league || undefined, live: tab === "live" })
      .then((r) => { if (alive) setFixtures(r.fixtures ?? []); })
      .catch((e) => { if (alive) { setErr(e.message); setFixtures([]); } })
      .finally(() => { if (alive) setLoading(false); });
    const t = setInterval(() => {
      getSportFixtures({ sport, league: league || undefined, live: tab === "live" })
        .then((r) => { if (alive) setFixtures(r.fixtures ?? []); })
        .catch(() => {});
    }, tab === "live" ? 20000 : 60000);
    return () => { alive = false; clearInterval(t); };
  }, [sport, league, tab]);

  // kuponlar
  useEffect(() => {
    if (tab !== "bets" || !player?.telegramId) return;
    getSportBets(String(player.telegramId)).then((r) => setBets(r.bets ?? [])).catch(() => {});
  }, [tab, player?.telegramId]);

  const openMarkets = (id: string) => {
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: ts.bg }}>
      <GameHeader title="SPORT" subtitle="Jonli koeffitsientlar" />

      {/* tablar */}
      <div className="flex gap-2 px-3 py-2.5">
        {([["line", "LINIYA"], ["live", "LIVE"], ["bets", "KUPONLARIM"]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)}
            className="flex-1 py-2 rounded-xl text-xs font-black active:scale-95 transition-all"
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
            {(sports.length ? sports : [{ id: "soccer", name: "Soccer" }]).map((s) => (
              <button key={s.id} onClick={() => { setSport(s.id); setLeague(""); }}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95"
                style={{
                  background: sport === s.id ? GOLD.grad ?? "linear-gradient(145deg,#f7c948,#b45309)" : CARD,
                  color: sport === s.id ? "#1a1204" : SUB,
                  border: `1px solid ${sport === s.id ? "rgba(255,246,207,0.6)" : BORDER}`,
                }}>
                {SPORT_ICONS[s.id] ?? "🏆"} {s.name}
              </button>
            ))}
          </div>

          {/* ligalar */}
          {sportLeagues.length > 0 && (
            <div className="flex gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
              <button onClick={() => setLeague("")}
                className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: !league ? "rgba(22,104,227,0.25)" : CARD, color: !league ? "#fff" : SUB, border: `1px solid ${BORDER}` }}>
                Barchasi
              </button>
              {sportLeagues.map((l) => (
                <button key={l.id} onClick={() => setLeague(l.id)}
                  className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background: league === l.id ? "rgba(22,104,227,0.25)" : CARD, color: league === l.id ? "#fff" : SUB, border: `1px solid ${BORDER}` }}>
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex-1 px-3 pb-40">
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
                  <span className="text-[11px]" style={{ color: SUB }}>Tikim: <b style={{ color: "#fff" }}>{fmt(b.stake)}</b></span>
                  <span className="text-[11px]" style={{ color: SUB }}>
                    {b.status === "won" ? "Yutuq" : "Mumkin"}: <b style={{ color: GOLD.light }}>{fmt(b.status === "won" ? b.payout : b.potentialWin)}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : err ? (
          <div className="rounded-2xl p-4 mt-4 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#fff" }}>Sport bo'limi hozircha mavjud emas</p>
            <p className="text-[11px]" style={{ color: SUB }}>{err}</p>
          </div>
        ) : !fixtures.length ? (
          <p className="text-center text-xs py-10" style={{ color: SUB }}>Bu ligada hozircha o'yin yo'q</p>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            {fixtures.map((f) => {
              const main = f.odds.filter((o) => o.market === "Moneyline").slice(0, 3);
              const shown = main.length ? main : f.odds.slice(0, 3);
              return (
                <div key={f.id} className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold" style={{ color: SUB }}>{f.league}</span>
                    <span className="text-[10px] font-black" style={{ color: f.isLive ? "#ef4444" : SUB }}>
                      {f.isLive ? "● LIVE" : timeLabel(f.startDate)}
                    </span>
                  </div>
                  <button onClick={() => openMarkets(f.id)} className="w-full text-left">
                    <p className="text-sm font-black leading-tight" style={{ color: "#fff" }}>{f.home.name}</p>
                    <p className="text-sm font-black leading-tight" style={{ color: "#fff" }}>{f.away.name}</p>
                  </button>

                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    {shown.map((o) => {
                      const on = inSlip(f.id, o.market, o.name);
                      return (
                        <button key={o.name} onClick={() => toggle(f, o)}
                          className="py-2 rounded-xl active:scale-95 transition-all"
                          style={{
                            background: on ? XGREEN.grad : "rgba(255,255,255,0.06)",
                            border: `1px solid ${on ? "rgba(255,255,255,0.25)" : BORDER}`,
                          }}>
                          <p className="text-[9px] truncate px-1" style={{ color: on ? "rgba(255,255,255,0.8)" : SUB }}>{o.name}</p>
                          <p className="text-sm font-black" style={{ color: on ? "#fff" : GOLD.light }}>{o.price.toFixed(2)}</p>
                        </button>
                      );
                    })}
                    {!shown.length && <p className="col-span-3 text-[11px] text-center py-2" style={{ color: SUB }}>Koeffitsient yo'q</p>}
                  </div>

                  <button onClick={() => openMarkets(f.id)}
                    className="w-full mt-2 text-[10px] font-bold py-1.5 rounded-lg"
                    style={{ color: GOLD.light, background: "rgba(247,201,72,0.08)" }}>
                    {openFixture === f.id ? "YOPISH" : "BARCHA MARKETLAR →"}
                  </button>

                  {openFixture === f.id && (
                    <div className="mt-2 flex flex-col gap-2">
                      {marketsLoading && <p className="text-[11px] text-center py-2" style={{ color: SUB }}>Yuklanmoqda…</p>}
                      {markets.map((m) => (
                        <div key={m.market}>
                          <p className="text-[10px] font-black mb-1" style={{ color: SUB }}>{m.market.toUpperCase()}</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {m.selections.slice(0, 12).map((o) => {
                              const on = inSlip(f.id, o.market, o.name);
                              return (
                                <button key={o.name} onClick={() => toggle(f, o)}
                                  className="flex items-center justify-between px-2 py-1.5 rounded-lg active:scale-95"
                                  style={{
                                    background: on ? XGREEN.grad : "rgba(255,255,255,0.05)",
                                    border: `1px solid ${on ? "rgba(255,255,255,0.25)" : BORDER}`,
                                  }}>
                                  <span className="text-[10px] truncate pr-1" style={{ color: on ? "#fff" : SUB }}>{o.name}</span>
                                  <span className="text-[11px] font-black" style={{ color: on ? "#fff" : GOLD.light }}>{o.price.toFixed(2)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {msg && (
        <div className="fixed left-3 right-3 bottom-28 z-[60] rounded-2xl px-4 py-3 text-center text-xs font-black"
          style={{ background: "rgba(10,23,38,0.97)", border: `1px solid ${BORDER}`, color: "#fff" }}>
          {msg}
        </div>
      )}

      {/* KUPON */}
      {slip.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50"
          style={{
            background: "rgba(10,23,38,0.98)",
            borderTop: `1px solid ${GOLD.border ?? "rgba(247,201,72,0.4)"}`,
            paddingBottom: "env(safe-area-inset-bottom,0px)",
            backdropFilter: "blur(18px)",
          }}>
          <button onClick={() => setSlipOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-black" style={{ color: GOLD.light }}>
              KUPON · {slip.length} ta · {totalOdds.toFixed(2)}
            </span>
            <span className="text-xs font-black" style={{ color: "#fff" }}>{slipOpen ? "▼" : "▲"}</span>
          </button>

          {slipOpen && (
            <div className="px-4 pb-3 max-h-[46vh] overflow-y-auto">
              {slip.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold truncate" style={{ color: "#fff" }}>{s.selection}</p>
                    <p className="text-[9px] truncate" style={{ color: SUB }}>{s.market} · {s.fixtureLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black" style={{ color: GOLD.light }}>{s.price.toFixed(2)}</span>
                    <button onClick={() => setSlip((p) => p.filter((x) => x !== s))}
                      className="text-[11px] font-black px-1.5" style={{ color: "#ef4444" }}>✕</button>
                  </div>
                </div>
              ))}

              <div className="flex gap-1.5 mt-2.5">
                {[5000, 10000, 25000, 50000].map((v) => (
                  <button key={v} onClick={() => setStake(v)}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-black"
                    style={{ background: stake === v ? "rgba(247,201,72,0.2)" : "rgba(255,255,255,0.06)", color: stake === v ? GOLD.light : SUB, border: `1px solid ${BORDER}` }}>
                    {fmt(v)}
                  </button>
                ))}
              </div>

              <input
                type="number"
                inputMode="numeric"
                value={stake}
                onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2.5 rounded-xl text-sm font-black outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color: "#fff" }}
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px]" style={{ color: SUB }}>Umumiy koef: <b style={{ color: "#fff" }}>{totalOdds.toFixed(2)}</b></span>
                <span className="text-[11px]" style={{ color: SUB }}>Mumkin yutuq: <b style={{ color: GOLD.light }}>{fmt(potential)}</b></span>
              </div>

              <div className="flex gap-2 mt-2.5">
                <button onClick={() => { setSlip([]); setSlipOpen(false); }}
                  className="px-4 py-3 rounded-2xl text-xs font-black"
                  style={{ background: "rgba(255,255,255,0.06)", color: SUB, border: `1px solid ${BORDER}` }}>
                  TOZALASH
                </button>
                <button onClick={submit} disabled={placing || stake < 1000}
                  className="flex-1 py-3 rounded-2xl text-sm font-black active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: XGREEN.grad, color: "#fff", boxShadow: XGREEN.shadow }}>
                  {placing ? "YUBORILMOQDA…" : `TIKISH · ${fmt(stake)}`}
                </button>
              </div>
              <p className="text-[9px] text-center mt-2" style={{ color: SUB }}>
                Balans: {fmt(player?.balance ?? 0)} · min 1 000
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
