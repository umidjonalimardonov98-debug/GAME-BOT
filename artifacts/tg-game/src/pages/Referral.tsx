import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { ArrowLeft, Copy, Check, Share2, Gift, ClipboardList, Lock, User } from "lucide-react";

type RefInfo = {
  count: number;
  target: number;
  link: string;
  bonus: number;
  botUsername: string;
  completed: boolean;
};

const G = {
  light: "#ffe9a8",
  main: "#f7c948",
  deep: "#b45309",
  grad: "linear-gradient(180deg,#fff3c4 0%,#f7c948 34%,#d99a1f 66%,#8d5b0c 100%)",
  border: "rgba(255,214,102,0.42)",
  glow: "rgba(247,201,72,0.45)",
};

export default function Referral() {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const [info, setInfo] = useState<RefInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!player?.telegramId) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/players/${player.telegramId}/referral`);
        if (!res.ok) return;
        const j = await res.json();
        if (alive) setInfo(j);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [player?.telegramId]);

  const count = info?.count ?? 0;
  const target = info?.target ?? 5;
  const link = info?.link ?? "";
  const pct = Math.min(100, (count / target) * 100);

  const coins = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      left: (i * 37) % 96,
      delay: (i % 7) * 0.9,
      dur: 7 + (i % 5) * 1.6,
      size: 10 + (i % 4) * 6,
    })),
    []
  );

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const share = () => {
    const text = `🎁 1X GAME PRO — o'yna va yut! Mening havolam orqali kir:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#090604" }}>
      <style>{`
        @keyframes refCoinFall { 0%{transform:translate3d(0,-12vh,0) rotate(0deg);opacity:0} 12%{opacity:.85} 100%{transform:translate3d(0,112vh,0) rotate(540deg);opacity:0} }
        @keyframes refFloat { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-10px,0)} }
        @keyframes refShine { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes refPulse { 0%,100%{box-shadow:0 0 0 0 rgba(247,201,72,.55)} 70%{box-shadow:0 0 0 14px rgba(247,201,72,0)} }
        @keyframes refGlowRay { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
        .ref-anim{will-change:transform;backface-visibility:hidden}
        .ref-shine{background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.45) 42%,transparent 62%);background-size:200% 100%;animation:refShine 2.8s linear infinite}
        @media (prefers-reduced-motion: reduce){.ref-anim,.ref-shine{animation:none!important}}
      `}</style>

      {/* orqa fon surati */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "url(/ref/bg.jpg)", backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.55,
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(120% 60% at 50% 0%, rgba(247,201,72,0.22), transparent 60%), linear-gradient(180deg, rgba(9,6,4,0.35), rgba(9,6,4,0.92))",
      }} />
      {/* tushayotgan tangalar */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {coins.map((c, i) => (
          <div key={i} className="ref-anim absolute rounded-full" style={{
            left: `${c.left}%`, width: c.size, height: c.size,
            background: "radial-gradient(circle at 32% 30%, #fff6cf, #f7c948 45%, #a16207 100%)",
            boxShadow: "0 0 10px rgba(247,201,72,.7)",
            animation: `refCoinFall ${c.dur}s linear ${c.delay}s infinite`,
          }} />
        ))}
      </div>

      <div className="relative z-10 pb-28">
        {/* header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => nav("/")} className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${G.border}` }}>
            <ArrowLeft size={20} color={G.light} />
          </button>
          <p className="font-black text-lg flex-1 text-center pr-10" style={{ color: G.light, textShadow: "0 2px 12px rgba(247,201,72,.45)" }}>
            Do'st taklif qilish
          </p>
        </div>

        {/* HERO */}
        <div className="px-4 pt-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="font-black leading-tight" style={{ fontSize: 24, color: "#fff", textShadow: "0 3px 14px rgba(0,0,0,.8)" }}>
              DO'STLARINGIZNI
            </h1>
            <h1 className="font-black leading-tight ref-shine bg-clip-text" style={{
              fontSize: 26,
              backgroundImage: G.grad,
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}>
              TAKLIF QILING
            </h1>
            <p className="mt-2 font-bold" style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)" }}>
              {target} ta do'st taklif qiling va<br />
              <span style={{ color: G.main }}>NOMALUM</span> summali promokod oling!
            </p>
          </div>
          <img src="/ref/gift.png" alt="Promokod sovg'asi" width={150} height={150}
            className="ref-anim shrink-0" style={{ width: 150, height: 150, objectFit: "contain", animation: "refFloat 3.4s ease-in-out infinite", filter: "drop-shadow(0 12px 30px rgba(247,201,72,.5))" }} />
        </div>

        {/* PROGRESS */}
        <div className="px-4 mt-4">
          <div className="rounded-3xl p-4" style={{
            background: "linear-gradient(160deg, rgba(38,25,6,.86), rgba(14,10,4,.9))",
            border: `1px solid ${G.border}`, boxShadow: `0 16px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,235,170,.18)`,
            backdropFilter: "blur(6px)",
          }}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold" style={{ fontSize: 14, color: "rgba(255,255,255,.9)" }}>Taklif qilingan do'stlar</p>
              <div className="px-3 py-1.5 rounded-xl font-black shrink-0" style={{
                fontSize: 15, color: "#1a1204", background: G.grad, boxShadow: `0 6px 18px ${G.glow}`,
              }}>{count} / {target}</div>
            </div>

            {/* steps */}
            <div className="relative mt-5">
              <div className="absolute left-[10%] right-[10%] rounded-full" style={{ top: 21, height: 3, background: "rgba(255,255,255,.14)" }} />
              <div className="absolute left-[10%] rounded-full ref-anim" style={{
                top: 21, height: 3, width: `${(80 * pct) / 100}%`,
                background: G.grad, boxShadow: `0 0 12px ${G.glow}`, transition: "width .6s cubic-bezier(.22,1,.36,1)",
              }} />
              <div className="grid grid-cols-5 relative">
                {Array.from({ length: target }, (_, i) => {
                  const done = i < count;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="rounded-full flex items-center justify-center ref-anim"
                        style={{
                          width: 44, height: 44,
                          background: done ? G.grad : "rgba(255,255,255,.08)",
                          border: `1px solid ${done ? "rgba(255,240,190,.8)" : "rgba(255,255,255,.14)"}`,
                          boxShadow: done ? `0 8px 20px ${G.glow}` : "none",
                          animation: done && i === count - 1 ? "refPulse 1.8s ease-out infinite" : undefined,
                        }}>
                        {done ? <User size={20} color="#1a1204" /> : <Lock size={17} color="rgba(255,255,255,.45)" />}
                      </div>
                      <span className="font-bold" style={{ fontSize: 10, color: done ? G.main : "rgba(255,255,255,.42)" }}>
                        {i + 1} do'st
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-2xl p-3 flex items-center gap-3" style={{
              background: "rgba(247,201,72,.09)", border: `1px solid ${G.border}`,
            }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ref-anim"
                style={{ background: G.grad, boxShadow: `0 6px 18px ${G.glow}`, animation: "refGlowRay 2.4s ease-in-out infinite" }}>
                <Gift size={20} color="#1a1204" />
              </div>
              <p className="font-bold leading-snug" style={{ fontSize: 12, color: "rgba(255,255,255,.9)" }}>
                {info?.completed
                  ? <>✅ {target} ta do'st to'ldi! Admin sizga <span style={{ color: G.main }}>promokod</span> yuboradi.</>
                  : <>{target} ta do'st taklif qiling va <span style={{ color: G.main }}>NOMALUM</span> summali promokod oling!</>}
              </p>
            </div>

            {info?.bonus ? (
              <p className="mt-2 text-center font-bold" style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
                Har bir do'st uchun: <span style={{ color: G.main }}>+{info.bonus.toLocaleString("uz-UZ")} UZS</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* LINK */}
        <div className="px-4 mt-3">
          <div className="rounded-3xl p-4" style={{
            background: "linear-gradient(160deg, rgba(38,25,6,.86), rgba(14,10,4,.9))",
            border: `1px solid ${G.border}`, boxShadow: "0 16px 40px rgba(0,0,0,.5)",
          }}>
            <p className="font-bold mb-2" style={{ fontSize: 13.5, color: "rgba(255,255,255,.9)" }}>Sizning taklif havolangiz</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-xl px-3 py-3 truncate" style={{
                background: "rgba(0,0,0,.45)", border: "1px solid rgba(255,255,255,.12)",
                fontSize: 12, color: "rgba(255,255,255,.75)",
              }}>{link || "Yuklanmoqda..."}</div>
              <button onClick={copy} className="shrink-0 px-3.5 py-3 rounded-xl font-black flex items-center gap-1.5 active:scale-95 transition-transform"
                style={{ background: G.grad, color: "#1a1204", boxShadow: `0 8px 20px ${G.glow}`, fontSize: 11 }}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "OK" : "NUSXA"}
              </button>
            </div>
            <button onClick={share} className="mt-3 w-full py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: G.grad, color: "#1a1204", boxShadow: `0 12px 28px ${G.glow}`, fontSize: 14 }}>
              <Share2 size={18} /> DO'STLARGA ULASHISH
            </button>
          </div>
        </div>

        {/* RULES */}
        <div className="px-4 mt-3">
          <div className="rounded-3xl p-4 flex gap-3" style={{
            background: "linear-gradient(160deg, rgba(38,25,6,.8), rgba(14,10,4,.9))",
            border: `1px solid ${G.border}`,
          }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: G.grad, boxShadow: `0 8px 20px ${G.glow}` }}>
              <ClipboardList size={20} color="#1a1204" />
            </div>
            <div className="min-w-0">
              <p className="font-black" style={{ fontSize: 14, color: "#fff" }}>Qoidalar</p>
              <ul className="mt-2 space-y-1.5">
                {[
                  "Do'stingiz botga sizning havolangiz orqali kirishi kerak.",
                  "Har bir haqiqiy do'st hisobga olinadi.",
                  `${target} ta do'st taklif qilganingizdan so'ng, admin promokod yuboradi.`,
                  "Promokod summasi nomalum bo'ladi.",
                ].map((r, i) => (
                  <li key={i} className="flex gap-2" style={{ fontSize: 11.5, color: "rgba(255,255,255,.82)" }}>
                    <span style={{ color: "#39c46f" }}>✅</span><span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
