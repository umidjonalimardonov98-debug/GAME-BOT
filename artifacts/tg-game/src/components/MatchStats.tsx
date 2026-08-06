import { useEffect, useState } from "react";
import { GOLD } from "@/lib/theme-context";
import { useLang } from "@/lib/lang-context";
import { getSportStats, type MatchStats as MS, type StatLabel } from "@/lib/api";

const CARD = "linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))";
const BORDER = "rgba(255,255,255,0.09)";
const SUB = "rgba(255,255,255,0.56)";
const HOME_C = "#facc15";
const AWAY_C = "#60a5fa";

const T = {
  stats: { uz: "STATISTIKA", ru: "СТАТИСТИКА", en: "STATS" },
  events: { uz: "VOQEALAR", ru: "СОБЫТИЯ", en: "EVENTS" },
  players: { uz: "O'YINCHILAR", ru: "ИГРОКИ", en: "PLAYERS" },
  loading: { uz: "Yuklanmoqda…", ru: "Загрузка…", en: "Loading…" },
  none: {
    uz: "Bu o'yin uchun statistika hali yo'q",
    ru: "Статистика по этому матчу пока недоступна",
    en: "No statistics for this match yet",
  },
  all: { uz: "BUTUN O'YIN", ru: "ВЕСЬ МАТЧ", en: "FULL MATCH" },
  p1: { uz: "1-BO'LIM", ru: "1-Й ТАЙМ", en: "1ST HALF" },
  p2: { uz: "2-BO'LIM", ru: "2-Й ТАЙМ", en: "2ND HALF" },
  min: { uz: "daq", ru: "мин", en: "min" },
} satisfies Record<string, StatLabel>;

const EVENT_ICON: Record<string, string> = {
  goal: "⚽",
  own_goal: "🥅",
  penalty_goal: "⚽",
  penalty_miss: "❌",
  yellow_card: "🟨",
  second_yellow_card: "🟨🟥",
  red_card: "🟥",
  substitution: "🔁",
  var: "📺",
};

const PERIOD_LABEL: Record<string, StatLabel> = {
  all: T.all,
  period_1: T.p1,
  period_2: T.p2,
};

export default function MatchStats({ fixtureId, live }: { fixtureId: string; live?: boolean }) {
  const { lang } = useLang();
  const t = (l: StatLabel) => l[lang] ?? l.uz;

  const [tab, setTab] = useState<"stats" | "events" | "players">("stats");
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState<MS | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openPlayer, setOpenPlayer] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    const load = () =>
      getSportStats(fixtureId, period)
        .then((d) => { if (alive) setData(d); })
        .catch((e) => { if (alive) { setErr(e.message); setData(null); } })
        .finally(() => { if (alive) setLoading(false); });
    load();
    if (!live) return () => { alive = false; };
    const iv = setInterval(load, 25000);
    return () => { alive = false; clearInterval(iv); };
  }, [fixtureId, period, live]);

  if (loading && !data) {
    return <p className="text-[10px] py-4 text-center" style={{ color: SUB }}>{t(T.loading)}</p>;
  }
  if (err || !data) {
    return <p className="text-[10px] py-4 text-center" style={{ color: SUB }}>{t(T.none)}</p>;
  }

  const periods = ["all", ...data.periodsAvailable.filter((p) => p !== "all")];

  return (
    <div className="pt-2">
      {/* hisob */}
      <div className="rounded-2xl px-3 py-2.5 mb-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold truncate flex-1" style={{ color: HOME_C }}>{data.fixture.home}</span>
          <span className="text-[18px] font-black shrink-0" style={{ color: "#fff" }}>
            {data.scores.home} : {data.scores.away}
          </span>
          <span className="text-[11px] font-bold truncate flex-1 text-right" style={{ color: AWAY_C }}>{data.fixture.away}</span>
        </div>
        {(data.fixture.venue || data.fixture.league) && (
          <p className="text-[9px] mt-1 text-center truncate" style={{ color: SUB }}>
            {[data.fixture.league, data.fixture.venue].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* tablar */}
      <div className="flex gap-1.5 mb-2">
        {([["stats", T.stats], ["events", T.events], ["players", T.players]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-black active:scale-95 transition-all"
            style={{
              background: tab === k ? GOLD.grad : "rgba(255,255,255,0.05)",
              color: tab === k ? "#1a1204" : SUB,
              border: `1px solid ${tab === k ? "rgba(255,246,207,0.6)" : BORDER}`,
            }}>
            {t(l)}
          </button>
        ))}
      </div>

      {/* davrlar */}
      {tab !== "events" && periods.length > 1 && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
          {periods.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold"
              style={{
                background: period === p ? GOLD.soft : "rgba(255,255,255,0.04)",
                color: period === p ? GOLD.light : SUB,
                border: `1px solid ${period === p ? GOLD.border : BORDER}`,
              }}>
              {PERIOD_LABEL[p] ? t(PERIOD_LABEL[p]!) : p.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* JAMOA STATISTIKASI */}
      {tab === "stats" && (
        !data.teamStats.length ? (
          <p className="text-[10px] py-4 text-center" style={{ color: SUB }}>{t(T.none)}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.teamStats.map((r) => (
              <div key={r.key}>
                <div className="flex items-center justify-between text-[10px] font-black mb-0.5">
                  <span style={{ color: HOME_C }}>{r.home}{r.suffix}</span>
                  <span style={{ color: SUB }}>{t(r.label)}</span>
                  <span style={{ color: AWAY_C }}>{r.away}{r.suffix}</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div style={{ width: `${r.homePct}%`, background: HOME_C, transition: "width .4s" }} />
                  <div style={{ width: `${100 - r.homePct}%`, background: AWAY_C, transition: "width .4s" }} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* VOQEALAR */}
      {tab === "events" && (
        !data.events.length ? (
          <p className="text-[10px] py-4 text-center" style={{ color: SUB }}>{t(T.none)}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.events.map((e, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                  flexDirection: e.team === "away" ? "row-reverse" : "row", textAlign: e.team === "away" ? "right" : "left" }}>
                <span className="text-[11px] shrink-0">{EVENT_ICON[e.type] ?? "•"}</span>
                <span className="text-[9px] font-black shrink-0" style={{ color: GOLD.light }}>
                  {e.clock ? `${e.clock}'` : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold truncate" style={{ color: "#fff" }}>{e.player ?? "—"}</p>
                  {e.secondary && <p className="text-[9px] truncate" style={{ color: SUB }}>{e.secondary}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* O'YINCHILAR */}
      {tab === "players" && (
        !data.players.length ? (
          <p className="text-[10px] py-4 text-center" style={{ color: SUB }}>{t(T.none)}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.players.map((p) => (
              <div key={(p.id ?? p.name) + p.team} className="rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                <button onClick={() => setOpenPlayer(openPlayer === (p.id ?? p.name) ? null : (p.id ?? p.name))}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 active:opacity-80">
                  <span className="w-1 h-6 rounded-full shrink-0" style={{ background: p.team === "home" ? HOME_C : AWAY_C }} />
                  <span className="text-[9px] font-black w-5 shrink-0" style={{ color: SUB }}>{p.number ?? "-"}</span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[10.5px] font-bold truncate" style={{ color: "#fff" }}>{p.name}</p>
                    <p className="text-[9px] truncate" style={{ color: SUB }}>
                      {[p.position, `${p.minutes} ${t(T.min)}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-[11px] font-black shrink-0" style={{ color: GOLD.light }}>{p.rating.toFixed(1)}</span>
                </button>
                {openPlayer === (p.id ?? p.name) && (
                  <div className="grid grid-cols-2 gap-1 px-2.5 pb-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                    {p.stats.map((s) => (
                      <div key={s.key} className="flex items-center justify-between pt-1.5">
                        <span className="text-[9px] truncate" style={{ color: SUB }}>{t(s.label)}</span>
                        <span className="text-[10px] font-black" style={{ color: "#fff" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
