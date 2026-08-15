import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/lang-context";
import {
  s, LOVE_QUESTIONS, QUIZ_QUESTIONS, TRUTHS, DARES, CHALLENGES, RULE_SECTIONS,
} from "@/lib/social-i18n";
import { useSocialStats } from "@/lib/social-xp";
import { SocialShell, PrimaryButton, GhostButton } from "@/components/social/SocialShell";

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)] as T;

/* ─────────────── LOVE QUIZ ─────────────── */
export function LoveQuiz() {
  const { lang } = useLang();
  const { addXp } = useSocialStats();
  const [i, setI] = useState(0);
  const [mine, setMine] = useState<number[]>([]);
  const [done, setDone] = useState<number | null>(null);

  function answer(v: number) {
    const next = [...mine, v];
    if (next.length >= LOVE_QUESTIONS.length) {
      const rival = next.map(() => 1 + Math.floor(Math.random() * 4));
      const same = next.filter((x, k) => x === rival[k]).length;
      const pct = Math.min(99, 45 + same * 6 + Math.floor(Math.random() * 10));
      setDone(pct); addXp(100);
    } else { setMine(next); setI(i + 1); }
  }

  const q = LOVE_QUESTIONS[i];
  return (
    <SocialShell title="Love Quiz" subtitle={`${s("question", lang)} ${Math.min(i + 1, 10)}/10`} accent="#ff7ab8">
      {done === null ? (
        <div className="mx-4 mt-5">
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl p-5" style={{ background: "linear-gradient(160deg,#ff7ab8,#5a1046)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <p className="font-black text-white" style={{ fontSize: 19 }}>{q?.q[lang]}</p>
          </motion.div>
          <div className="grid gap-2.5 mt-4">
            {q?.opts.map((o) => (
              <motion.button key={o.text[lang]} whileTap={{ scale: 0.97 }} onClick={() => answer(o.v)}
                className="py-3.5 rounded-2xl font-bold text-left px-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)", color: "#fff", fontSize: 14 }}>
                {o.text[lang]}
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <ResultCard title={s("compatibility", lang)} big={`${done}%`} xp={100} onAgain={() => { setI(0); setMine([]); setDone(null); }} />
      )}
    </SocialShell>
  );
}

/* ─────────────── TRUTH OR DARE ─────────────── */
export function TruthOrDare() {
  const { lang } = useLang();
  const { addXp } = useSocialStats();
  const [mode, setMode] = useState<"truth" | "dare" | null>(null);
  const [text, setText] = useState("");

  function choose(m: "truth" | "dare") {
    setMode(m);
    setText(m === "truth" ? pick(TRUTHS)[lang] : pick(DARES)[lang]);
  }

  return (
    <SocialShell title="Truth or Dare" subtitle={s("yourTurn", lang)} accent="#ff9f43">
      <div className="mx-4 mt-6">
        <AnimatePresence mode="wait">
          {mode && (
            <motion.div key={text} initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-3xl p-6 mb-4"
              style={{
                background: mode === "truth" ? "linear-gradient(160deg,#2dd4a8,#05412f)" : "linear-gradient(160deg,#ff9f43,#7a3200)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}>
              <p className="font-black" style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.7)" }}>
                {(mode === "truth" ? s("truth", lang) : s("dare", lang)).toUpperCase()}
              </p>
              <p className="mt-2 font-black text-white" style={{ fontSize: 19, lineHeight: 1.3 }}>{text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          <PrimaryButton c1="#2dd4a8" c2="#05412f" onClick={() => choose("truth")}>{s("truth", lang)}</PrimaryButton>
          <PrimaryButton c1="#ff9f43" c2="#7a3200" onClick={() => choose("dare")}>{s("dare", lang)}</PrimaryButton>
        </div>
        {mode && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <GhostButton onClick={() => choose(mode)}>{s("pass", lang)}</GhostButton>
            <PrimaryButton onClick={() => { addXp(60); choose(mode); }}>{s("done", lang)}</PrimaryButton>
          </div>
        )}
      </div>
    </SocialShell>
  );
}

/* ─────────────── QUIZ BATTLE ─────────────── */
export function QuizBattle() {
  const { lang } = useLang();
  const { addWin, addXp } = useSocialStats();
  const [i, setI] = useState(0);
  const [me, setMe] = useState(0);
  const [rival, setRival] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(15);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (over || picked !== null) return;
    if (left <= 0) { next(-1); return; }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, picked, over]);

  const q = QUIZ_QUESTIONS[i];

  function next(choice: number) {
    if (picked !== null) return;
    setPicked(choice);
    const ok = q && choice === q.a;
    if (ok) setMe((v) => v + 1);
    if (Math.random() < 0.55) setRival((v) => v + 1);
    setTimeout(() => {
      if (i + 1 >= QUIZ_QUESTIONS.length) {
        setOver(true);
        if (ok ? me + 1 > rival : me > rival) { addWin(); } else { addXp(30); }
      } else { setI(i + 1); setPicked(null); setLeft(15); }
    }, 900);
  }

  if (over) {
    const won = me > rival;
    return (
      <SocialShell title="Quiz Battle" accent="#5aa2f0">
        <ResultCard
          title={won ? s("win", lang) : me === rival ? s("draw", lang) : s("lose", lang)}
          big={`${me} : ${rival}`} xp={won ? 100 : 30}
          onAgain={() => { setI(0); setMe(0); setRival(0); setPicked(null); setLeft(15); setOver(false); }}
        />
      </SocialShell>
    );
  }

  return (
    <SocialShell title="Quiz Battle" subtitle={`${s("question", lang)} ${i + 1}/${QUIZ_QUESTIONS.length}`} accent="#5aa2f0">
      <div className="mx-4 mt-4 flex items-center justify-between rounded-2xl px-4 py-2.5"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <span className="font-black text-white" style={{ fontSize: 12 }}>{s("you", lang)} {me}</span>
        <span className="font-black" style={{ fontSize: 12, color: left <= 5 ? "#ff6b6b" : "#ffd76a" }}>{left}s</span>
        <span className="font-black text-white" style={{ fontSize: 12 }}>{rival} {s("rival", lang)}</span>
      </div>

      <motion.div key={i} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 rounded-3xl p-5" style={{ background: "linear-gradient(160deg,#5aa2f0,#0b2c63)", border: "1px solid rgba(255,255,255,0.16)" }}>
        <p className="font-black text-white" style={{ fontSize: 18 }}>{q?.q[lang]}</p>
      </motion.div>

      <div className="grid gap-2.5 mx-4 mt-4">
        {q?.opts.map((o, k) => {
          const state = picked === null ? "idle" : k === q.a ? "ok" : k === picked ? "bad" : "idle";
          return (
            <motion.button key={o[lang]} whileTap={{ scale: 0.97 }} onClick={() => next(k)}
              className="py-3.5 rounded-2xl font-bold text-left px-4"
              style={{
                background: state === "ok" ? "linear-gradient(135deg,#2dd4a8,#05412f)" : state === "bad" ? "linear-gradient(135deg,#ff4d4d,#5e0a0a)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.13)", color: "#fff", fontSize: 14,
              }}>
              {o[lang]}
            </motion.button>
          );
        })}
      </div>
    </SocialShell>
  );
}

/* ─────────────── PARTY ROOM ─────────────── */
export function PartyRoom() {
  const { lang } = useLang();
  const { addXp } = useSocialStats();
  const [room, setRoom] = useState<number | null>(null);
  const rooms = [
    { id: 7284, game: "Quiz Battle", players: 4 },
    { id: 5120, game: "Truth or Dare", players: 7 },
    { id: 9931, game: "Love Quiz", players: 3 },
  ];
  const members = ["Malika", "Umid", "Sevara", "Aziz", "Nigora"];

  return (
    <SocialShell title="Party Room" subtitle={s("players", lang)} accent="#a56bff">
      {room === null ? (
        <div className="mx-4 mt-5 grid gap-3">
          <PrimaryButton c1="#a56bff" c2="#2c0d5e" onClick={() => setRoom(Math.floor(1000 + Math.random() * 8999))}>{s("createRoom", lang)}</PrimaryButton>
          <p className="font-black text-white mt-2" style={{ fontSize: 13 }}>{s("trendRooms", lang)}</p>
          {rooms.map((r) => (
            <motion.button key={r.id} whileTap={{ scale: 0.97 }} onClick={() => setRoom(r.id)}
              className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="text-left">
                <p className="font-black text-white" style={{ fontSize: 14 }}>PARTY #{r.id}</p>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)" }}>{r.game}</p>
              </div>
              <span className="font-black" style={{ fontSize: 11, color: "#ffd76a" }}>{r.players}/10</span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="mx-4 mt-5">
          <div className="rounded-3xl p-5" style={{ background: "linear-gradient(160deg,#a56bff,#2c0d5e)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <p className="font-black text-white" style={{ fontSize: 20 }}>PARTY #{room}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{s("host", lang)}: Umid</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {members.map((m) => (
                <div key={m} className="rounded-2xl px-3 py-2 font-bold text-white" style={{ background: "rgba(0,0,0,0.28)", fontSize: 12 }}>{m}</div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <PrimaryButton c1="#2dd4a8" c2="#05412f" onClick={() => addXp(80)}>{s("startGame", lang)}</PrimaryButton>
            <GhostButton onClick={() => setRoom(null)}>{s("leave", lang)}</GhostButton>
          </div>
        </div>
      )}
    </SocialShell>
  );
}

/* ─────────────── CHALLENGE ─────────────── */
export function Challenge() {
  const { lang } = useLang();
  const { addXp } = useSocialStats();
  const [claimed, setClaimed] = useState<string[]>([]);

  return (
    <SocialShell title={s("challengeTitle", lang)} subtitle={s("challengeSub", lang)} accent="#2dd4a8">
      <div className="mx-4 mt-5 grid gap-2.5">
        {CHALLENGES.map((c) => {
          const got = claimed.includes(c.title[lang]);
          return (
            <motion.button key={c.title[lang]} whileTap={{ scale: 0.97 }}
              onClick={() => { if (!got) { setClaimed([...claimed, c.title[lang]]); addXp(c.xp); } }}
              className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
              style={{
                background: got ? "linear-gradient(135deg,#2dd4a8,#05412f)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}>
              <span className="font-bold text-white text-left" style={{ fontSize: 13 }}>{c.title[lang]}</span>
              <span className="font-black" style={{ fontSize: 11, color: got ? "#fff" : "#ffd76a" }}>+{c.xp} XP</span>
            </motion.button>
          );
        })}
      </div>
    </SocialShell>
  );
}

/* ─────────────── QOIDALAR ─────────────── */
export function RulesPage() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SocialShell title={s("rules", lang)} back="/" accent="#ffd76a">
      <div className="mx-4 mt-5 grid gap-2.5 pb-6">
        {RULE_SECTIONS.map((sec, k) => (
          <div key={k} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <button onClick={() => setOpen(open === k ? null : k)} className="w-full px-4 py-3.5 flex items-center justify-between">
              <span className="font-black text-white text-left" style={{ fontSize: 13.5 }}>{k + 1}. {sec.title[lang]}</span>
              <span className="font-black" style={{ fontSize: 16, color: "#ffd76a" }}>{open === k ? "−" : "+"}</span>
            </button>
            <AnimatePresence initial={false}>
              {open === k && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}>
                  <div className="px-4 pb-4 grid gap-2">
                    {sec.items.map((it, n) => (
                      <p key={n} style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.72)" }}>— {it[lang]}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </SocialShell>
  );
}

/* ─────────────── umumiy natija kartasi ─────────────── */
function ResultCard({ title, big, xp, onAgain }: { title: string; big: string; xp: number; onAgain: () => void }) {
  const { lang } = useLang();
  return (
    <div className="mx-4 mt-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 15 }}
        className="rounded-3xl p-7 text-center" style={{ background: "linear-gradient(160deg,#ff5f8f,#2c0d5e)", border: "1px solid rgba(255,255,255,0.18)" }}>
        <p className="font-black" style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.7)" }}>{title.toUpperCase()}</p>
        <p className="font-black text-white mt-2" style={{ fontSize: 40 }}>{big}</p>
        <p className="mt-1 font-bold" style={{ fontSize: 12, color: "#ffd76a" }}>+{xp} XP</p>
      </motion.div>
      <div className="mt-4"><PrimaryButton onClick={onAgain}>{s("again", lang)}</PrimaryButton></div>
    </div>
  );
}
