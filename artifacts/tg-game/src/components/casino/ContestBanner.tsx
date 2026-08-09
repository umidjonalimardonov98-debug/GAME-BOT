import { useLocation } from "wouter";
import { Trophy, ChevronRight } from "lucide-react";

/** Bosh sahifa / Referal sahifasidagi oltin konkurs banneri */
export default function ContestBanner({ className = "" }: { className?: string }) {
  const [, nav] = useLocation();

  return (
    <button
      onClick={() => nav("/contest")}
      className={`w-full relative rounded-3xl overflow-hidden active:scale-[0.98] transition-transform ${className}`}
      style={{
        border: "1px solid rgba(255,214,102,0.5)",
        boxShadow: "0 14px 34px rgba(0,0,0,.55), 0 0 26px rgba(247,201,72,.22)",
      }}
      aria-label="Referal konkursi bo'limiga o'tish"
    >
      <style>{`
        @keyframes cbShine{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .cb-shine{background:linear-gradient(100deg,transparent 22%,rgba(255,255,255,.45) 44%,transparent 64%);background-size:200% 100%;animation:cbShine 3s linear infinite;will-change:background-position}
        @media (prefers-reduced-motion: reduce){.cb-shine{animation:none}}
      `}</style>

      <img
        src="/contest/banner.jpg"
        alt="Referal konkursi — do'st taklif qil, pul yut"
        width={1280}
        height={512}
        loading="lazy"
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      <div className="absolute inset-0 cb-shine pointer-events-none" style={{ mixBlendMode: "overlay" }} />
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2"
        style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,.78))" }}
      >
        <Trophy size={16} color="#f7c948" />
        <span className="font-black" style={{ fontSize: 12.5, color: "#ffe9a8" }}>
          KONKURS — do'st taklif qil, pul yut!
        </span>
        <ChevronRight size={16} color="#ffe9a8" className="ml-auto" />
      </div>
    </button>
  );
}
