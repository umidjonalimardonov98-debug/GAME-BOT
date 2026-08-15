import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { s } from "@/lib/social-i18n";
import { useSocialStats } from "@/lib/social-xp";

export const SOCIAL_BG = "linear-gradient(180deg,#160718 0%,#1d0a2b 45%,#0c0413 100%)";

export function SocialShell({
  title,
  subtitle,
  back = "/social",
  children,
  accent = "#ff5f8f",
}: {
  title: string;
  subtitle?: string;
  back?: string;
  children: ReactNode;
  accent?: string;
}) {
  const [, nav] = useLocation();
  const { lang } = useLang();
  const { stats, level, progress } = useSocialStats();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: SOCIAL_BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div
        className="absolute inset-x-0 top-0 h-72 pointer-events-none"
        style={{ background: `radial-gradient(120% 70% at 50% 0%, ${accent}33 0%, transparent 70%)` }}
      />

      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => nav(back)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-black text-white leading-tight truncate" style={{ fontSize: 17 }}>{title}</p>
          {subtitle && <p className="truncate" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{subtitle}</p>}
        </div>
        <div
          className="px-3 py-1.5 rounded-2xl text-right"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}55` }}
        >
          <p className="font-black leading-none" style={{ fontSize: 12, color: "#fff" }}>
            {s("level", lang)} {level}
          </p>
          <p className="leading-none mt-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>
            {stats.xp.toLocaleString()} XP
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-4 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          style={{ height: "100%", background: `linear-gradient(90deg,${accent},#ffd76a)` }}
        />
      </div>

      <div className="relative z-10 flex-1 pb-10">{children}</div>
    </div>
  );
}

export function XpToast({ amount, show }: { amount: number; show: boolean }) {
  const { lang } = useLang();
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed left-1/2 bottom-8 z-50 -translate-x-1/2 px-4 py-2.5 rounded-2xl flex items-center gap-2"
      style={{ background: "linear-gradient(135deg,#ff5f8f,#a56bff)", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
    >
      <Sparkles size={15} color="#fff" />
      <span className="font-black text-white" style={{ fontSize: 12 }}>
        {s("earnedXp", lang)} +{amount} XP
      </span>
    </motion.div>
  );
}

export function PrimaryButton({
  children, onClick, c1 = "#ff5f8f", c2 = "#a56bff", disabled, full = true,
}: {
  children: ReactNode; onClick?: () => void; c1?: string; c2?: string; disabled?: boolean; full?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full" : ""} py-3.5 rounded-2xl font-black text-white disabled:opacity-50`}
      style={{
        background: `linear-gradient(135deg,${c1},${c2})`,
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: `0 12px 28px ${c1}55`,
        fontSize: 14,
      }}
    >
      {children}
    </motion.button>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="w-full py-3.5 rounded-2xl font-black"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.85)",
        fontSize: 14,
      }}
    >
      {children}
    </motion.button>
  );
}
