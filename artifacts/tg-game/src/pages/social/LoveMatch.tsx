import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Flag, Ban } from "lucide-react";
import { useLocation } from "wouter";
import { useLang } from "@/lib/lang-context";
import { s, MATCH_PROFILES } from "@/lib/social-i18n";
import { useSocialStats } from "@/lib/social-xp";
import { SocialShell, PrimaryButton, GhostButton } from "@/components/social/SocialShell";

export default function LoveMatch() {
  const { lang } = useLang();
  const [, nav] = useLocation();
  const { addMatch, blockUser } = useSocialStats();
  const [i, setI] = useState(0);
  const [matched, setMatched] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const p = MATCH_PROFILES[i];

  function swipe(like: boolean) {
    if (!p) return;
    if (like && p.pct >= 70) { setMatched(p.name); addMatch(); }
    setI((v) => v + 1);
  }

  return (
    <SocialShell title="Love Match" subtitle={s("socialSub", lang)}>
      <div className="mx-4 mt-5">
        {!p ? (
          <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <p className="font-black text-white" style={{ fontSize: 15 }}>{s("noMoreCards", lang)}</p>
            <div className="mt-4"><PrimaryButton onClick={() => setI(0)}>{s("again", lang)}</PrimaryButton></div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 40, rotate: -3, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, x: -80, rotate: -8 }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
              className="relative overflow-hidden rounded-[28px] p-5"
              style={{ minHeight: 380, background: `linear-gradient(160deg,${p.c1},${p.c2})`, border: "1px solid rgba(255,255,255,0.16)", boxShadow: `0 18px 44px ${p.c2}aa` }}
            >
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle,rgba(255,255,255,0.25),transparent 70%)" }} />
              <div className="absolute right-4 top-4 px-3 py-1.5 rounded-2xl font-black" style={{ background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 12 }}>
                {p.pct}%
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="font-black text-white leading-none" style={{ fontSize: 28 }}>{p.name}, {p.age}</p>
                <p className="mt-1.5" style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{p.city[lang]}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.tags.map((tg) => (
                    <span key={tg[lang]} className="px-2.5 py-1 rounded-full font-bold" style={{ fontSize: 10, background: "rgba(0,0,0,0.32)", color: "#fff" }}>{tg[lang]}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {p && (
        <>
          <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
            <GhostButton onClick={() => swipe(false)}><span className="inline-flex items-center gap-2 justify-center"><X size={16} /> {s("skip", lang)}</span></GhostButton>
            <PrimaryButton onClick={() => swipe(true)}><span className="inline-flex items-center gap-2 justify-center"><Heart size={16} /> {s("like", lang)}</span></PrimaryButton>
          </div>
          <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
            <button onClick={() => { setNote(s("reported", lang)); setTimeout(() => setNote(""), 2000); }}
              className="py-2.5 rounded-2xl font-bold inline-flex items-center gap-2 justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
              <Flag size={13} /> {s("report", lang)}
            </button>
            <button onClick={() => { blockUser(p.name); setNote(s("blocked", lang)); setI((v) => v + 1); setTimeout(() => setNote(""), 2000); }}
              className="py-2.5 rounded-2xl font-bold inline-flex items-center gap-2 justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
              <Ban size={13} /> {s("block", lang)}
            </button>
          </div>
        </>
      )}

      {note && <p className="mx-4 mt-3 text-center font-bold" style={{ fontSize: 11, color: "#ffd76a" }}>{note}</p>}

      <AnimatePresence>
        {matched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(6,2,12,0.86)" }}>
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 150, damping: 14 }}
              className="w-full rounded-[28px] p-6 text-center"
              style={{ background: "linear-gradient(160deg,#ff5f8f,#5e0a37)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <p className="font-black text-white" style={{ fontSize: 22 }}>{s("itsMatch", lang)}</p>
              <p className="mt-1" style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{matched} · +50 XP</p>
              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <PrimaryButton c1="#a56bff" c2="#2c0d5e" onClick={() => nav("/chat")}>
                  <span className="inline-flex items-center gap-2 justify-center"><MessageCircle size={15} /> {s("chat", lang)}</span>
                </PrimaryButton>
                <GhostButton onClick={() => setMatched(null)}>{s("next", lang)}</GhostButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SocialShell>
  );
}
