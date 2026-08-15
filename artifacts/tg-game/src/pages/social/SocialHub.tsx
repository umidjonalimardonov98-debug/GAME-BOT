import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Heart, Flame, Brain, Users, Target, Sparkles, Gift, Trophy, BookOpen, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { s, SOCIAL_GAMES, GIFTS } from "@/lib/social-i18n";
import { useSocialStats } from "@/lib/social-xp";
import { SocialShell } from "@/components/social/SocialShell";

const ICONS: Record<string, typeof Heart> = {
  lovematch: Heart,
  lovequiz: Sparkles,
  truthordare: Flame,
  quizbattle: Brain,
  party: Users,
  challenge: Target,
};

export default function SocialHub() {
  const [, nav] = useLocation();
  const { lang } = useLang();
  const { stats, level } = useSocialStats();

  return (
    <SocialShell title={s("social", lang)} subtitle={s("socialSub", lang)} back="/">
      {/* Statistika */}
      <div className="grid grid-cols-4 gap-2 mx-4 mt-4">
        {[
          { label: s("level", lang), value: level },
          { label: s("xp", lang), value: stats.xp.toLocaleString() },
          { label: s("wins", lang), value: stats.wins },
          { label: s("matches", lang), value: stats.matches },
        ].map((it) => (
          <div key={it.label} className="rounded-2xl py-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="font-black text-white leading-none" style={{ fontSize: 15 }}>{it.value}</p>
            <p className="mt-1 leading-none truncate" style={{ fontSize: 8.5, color: "rgba(255,255,255,0.5)" }}>{it.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* O'yinlar */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
        {SOCIAL_GAMES.map((g, i) => {
          const Icon = ICONS[g.key] ?? Heart;
          return (
            <motion.button
              key={g.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 120, damping: 16 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => nav(g.path)}
              className="relative overflow-hidden rounded-3xl text-left p-3.5"
              style={{
                minHeight: 150,
                background: `linear-gradient(150deg,${g.c1} -10%,${g.c2} 85%)`,
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: `0 14px 32px ${g.c2}88`,
              }}
            >
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full"
                style={{ background: "radial-gradient(circle,rgba(255,255,255,0.22),transparent 70%)" }} />
              <span className="inline-block px-2 py-0.5 rounded-full font-black"
                style={{ fontSize: 8, letterSpacing: "0.14em", background: "rgba(0,0,0,0.35)", color: "#fff" }}>
                {g.tag[lang].toUpperCase()}
              </span>
              <div className="mt-3 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <Icon size={21} color="#fff" />
              </div>
              <p className="relative mt-3 font-black text-white leading-tight" style={{ fontSize: 15 }}>{g.name[lang]}</p>
              <p className="relative mt-1" style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.25 }}>{g.desc[lang]}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Sovg'alar */}
      <div className="mx-4 mt-5">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={15} color="#ffd76a" />
          <p className="font-black text-white" style={{ fontSize: 13 }}>{s("gifts", lang)}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {GIFTS.map((g) => (
            <div key={g.key} className="shrink-0 rounded-2xl px-3 py-2.5 text-center" style={{ minWidth: 92, background: `linear-gradient(150deg,${g.c1},${g.c2})`, border: "1px solid rgba(255,255,255,0.16)" }}>
              <p className="font-black text-white" style={{ fontSize: 11 }}>{g.name[lang]}</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.75)" }}>{g.cost} XP</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tezkor havolalar */}
      <div className="grid grid-cols-3 gap-2 mx-4 mt-4">
        <QuickLink icon={Trophy} label={s("leaderboard", lang)} onClick={() => nav("/leaderboard")} />
        <QuickLink icon={BookOpen} label={s("rules", lang)} onClick={() => nav("/rules")} />
        <QuickLink icon={ShieldCheck} label={s("report", lang)} onClick={() => nav("/support")} />
      </div>

      <p className="mx-4 mt-4 text-center" style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)" }}>{s("socialNote", lang)}</p>
    </SocialShell>
  );
}

function QuickLink({ icon: Icon, label, onClick }: { icon: typeof Trophy; label: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
      className="rounded-2xl py-3 flex flex-col items-center gap-1.5"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <Icon size={17} color="#ffd76a" />
      <span className="font-bold" style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>{label}</span>
    </motion.button>
  );
}
