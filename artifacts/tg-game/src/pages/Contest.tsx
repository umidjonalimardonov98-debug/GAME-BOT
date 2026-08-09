import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/lib/player-context";
import { ArrowLeft, Copy, Check, Share2, Trophy, Users, Clock, Crown } from "lucide-react";

type TopRow = { telegramId: string; username: string | null; name: string; photoUrl: string | null; count: number };

type ContestInfo = {
  active: boolean;
  title: string;
  desc: string;
  startAt: string | null;
  endAt: string | null;
  prizes: [number, number, number];
  top: TopRow[];
  me: { count: number; rank: number | null };
  botUsername: string;
  link: string;
};

const G = {
  light: "#ffe9a8",
  main: "#f7c948",
  deep: "#b45309",
  grad: "linear-gradient(180deg,#fff3c4 0%,#f7c948 34%,#d99a1f 66%,#8d5b0c 100%)",
  border: "rgba(255,214,102,0.42)",
  glow: "rgba(247,201,72,0.45)",
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n || 0));
const MEDAL = ["🥇", "🥈", "🥉"];

export default function Contest() {
  const [, nav] = useLocation();
  const { player } = usePlayer();
  const [info, setInfo] = useState<ContestInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const url = player?.telegramId ? `/api/contest/${player.telegramId}` : "/api/contest";
        const res = await fetch(url);
        if (!res.ok) return;
        const j = await res.json();
        if (alive) setInfo(j);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [player?.telegramId]);

  const coins = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({
      left: (i * 31) % 96,
      delay: (i % 8) * 0.8,
      dur: 6.5 + (i % 5) * 1.7,
      size: 9 + (i % 4) * 6,
    })),
    []
  );

  const link = info?.link ?? "";
  const top = info?.top ?? [];
  const prizes = info?.prizes ?? [0, 0, 0];

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const share = () => {
    const text = `🏆 KONKURS! 1X GAME PRO — do'st taklif qil va pul yut! Havolam:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
  };

  const dateStr = (v: string | null) =>
    v ? new Date(v).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#080503" }}>
      <style>{`
        @keyframes cnCoin { 0%{transform:translate3d(0,-12vh,0) rotate(0deg);opacity:0} 12%{opacity:.85} 100%{transform:translate3d(0,112vh,0) rotate(540deg);opacity:0} }
        @keyframes cnFloat { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-9px,0)} }
        @keyframes cnShine { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes cnPulse { 0%,100%{box-shadow:0 0 0 0 rgba(247,201,72,.5)} 70%{box-shadow:0 0 0 16px rgba(247,201,72,0)} }
        .cn-anim{will-change:transform;backface-visibility:hidden}
        .cn-shine{background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.5) 42%,transparent 62%);background-size:200% 100%;animation:cnShine 2.6s linear infinite}
        @media (prefers-reduced-motion: reduce){.cn-anim,.cn-shine{animation:none!important}}
      `}</style>

      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "url(/contest/hero.jpg)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.5,
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(120% 60% at 50% 0%, rgba(247,201,72,0.24), transparent 60%), linear-gradient(180deg, rgba(8,5,3,0.4), rgba(8,5,3,0.94))",
      }} />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {coins.map((c, i) => (
          <div key={i} className="cn-anim absolute rounded-full" style={{
            left: `${c.left}%`, width: c.size, height: c.size,
            background: "radial-gradient(circle at 32% 30%, #fff6cf, #f7c948 45%, #a16207 100%)",
            boxShadow: "0 0 10px rgba(247,201,72,.7)",
            animation: `cnCoin ${c.dur}s linear ${c.delay}s infinite`,
          }} />
        ))}
      </div>

      <div className="relative z-10 pb-28">
        {/* header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => nav("/referral")} className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${G.border}` }}>
            <ArrowLeft size={20} color={G.light} />
          </button>
          <p className="font-black text-lg flex-1 text-center pr-10" style={{ color: G.light, textShadow: "0 2px 12px rgba(247,201,72,.45)" }}>
            Konkurs
          </p>
        </div>

        {/* BANNER */}
        <div className="px-4">
          <div className="rounded-3xl overflow-hidden relative" style={{ border: `1px solid ${G.border}`, boxShadow: `0 18px 44px rgba(0,0,0,.6)` }}>
            <img src="/contest/banner.jpg" alt="Referal konkursi" width={1280} height={512}
              style={{ width: "100%", height: "auto", display: "block" }} />
            <div className="absolute inset-0 cn-shine pointer-events-none" style={{ mixBlendMode: "overlay" }} />
          </div>
        </div>

        {/* SARLAVHA */}
        <div className="px-4 mt-4 text-center">
          <h1 className="font-black leading-tight bg-clip-text" style={{
            fontSize: 26, backgroundImage: G.grad, WebkitBackgroundClip: "text", color: "transparent",
          }}>{info?.title ?? "REFERAL KONKURSI"}</h1>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black" style={{
            fontSize: 11,
            color: info?.active ? "#062b14" : "#fff",
            background: info?.active ? "linear-gradient(180deg,#b9f6c8,#1e9e52)" : "rgba(255,255,255,.12)",
            border: `1px solid ${G.border}`,
          }}>
            <Clock size={12} />
            {info?.active ? "KONKURS DAVOM ETMOQDA" : "KONKURS HOZIRCHA YO'Q"}
          </div>
          <p className="mt-1.5" style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
            Boshlangan: {dateStr(info?.startAt ?? null)}{info?.endAt ? ` · Tugadi: ${dateStr(info.endAt)}` : ""}
          </p>
        </div>

        {/* SOVRINLAR */}
        <div className="px-4 mt-4 grid grid-cols-3 gap-2">
          {prizes.map((p, i) => (
            <div key={i} className="rounded-2xl p-3 text-center" style={{
              background: "linear-gradient(160deg, rgba(38,25,6,.9), rgba(14,10,4,.92))",
              border: `1px solid ${i === 0 ? "rgba(255,214,102,.8)" : G.border}`,
              boxShadow: i === 0 ? `0 12px 30px ${G.glow}` : "0 10px 24px rgba(0,0,0,.5)",
            }}>
              <p style={{ fontSize: 22 }}>{MEDAL[i]}</p>
              <p className="font-black mt-1" style={{ fontSize: 13, color: G.light }}>{fmt(p)}</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,.55)" }}>UZS</p>
            </div>
          ))}
        </div>

        {/* MENING NATIJAM */}
        <div className="px-4 mt-4">
          <div className="rounded-3xl p-4 flex items-center gap-3" style={{
            background: "linear-gradient(160deg, rgba(38,25,6,.86), rgba(14,10,4,.9))",
            border: `1px solid ${G.border}`, boxShadow: `0 16px 40px rgba(0,0,0,.55)`,
          }}>
            <img src="/contest/trophy.png" alt="" width={64} height={64} loading="lazy"
              className="cn-anim shrink-0" style={{ width: 64, height: 64, objectFit: "contain", animation: "cnFloat 3.4s ease-in-out infinite" }} />
            <div className="flex-1 min-w-0">
              <p className="font-bold" style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>Sizning natijangiz</p>
              <p className="font-black" style={{ fontSize: 22, color: G.light }}>{info?.me?.count ?? 0} <span style={{ fontSize: 12 }}>ta do'st</span></p>
              <p className="font-bold" style={{ fontSize: 11, color: "#4ade80" }}>
                {info?.me?.rank ? `Reyting: ${info.me.rank}-o'rin` : "Hali reytingda yo'qsiz"}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl font-black shrink-0" style={{
              fontSize: 12, color: "#1a1204", background: G.grad, boxShadow: `0 6px 18px ${G.glow}`,
            }}>TOP 10</div>
          </div>
        </div>

        {/* HAVOLA */}
        <div className="px-4 mt-3 flex gap-2">
          <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black active:scale-95 transition-transform"
            style={{ background: G.grad, color: "#1a1204", boxShadow: `0 10px 26px ${G.glow}`, fontSize: 13, animation: "cnPulse 2.6s ease-out infinite" }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Nusxalandi" : "Havolani nusxalash"}
          </button>
          <button onClick={share} className="px-4 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,.08)", border: `1px solid ${G.border}` }}>
            <Share2 size={18} color={G.light} />
          </button>
        </div>

        {/* TOP 10 */}
        <div className="px-4 mt-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} color={G.main} />
            <p className="font-black" style={{ fontSize: 14, color: G.light }}>TOP 10 ishtirokchi</p>
          </div>
          <div className="rounded-3xl overflow-hidden" style={{
            background: "linear-gradient(160deg, rgba(38,25,6,.86), rgba(12,9,4,.92))",
            border: `1px solid ${G.border}`,
          }}>
            {top.length === 0 && (
              <p className="text-center py-6" style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>
                Hozircha ishtirokchi yo'q — birinchi bo'ling!
              </p>
            )}
            {top.map((r, i) => {
              const isMe = player?.telegramId && String(player.telegramId) === r.telegramId;
              return (
                <div key={r.telegramId} className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.06)",
                    background: isMe ? "rgba(247,201,72,.12)" : i < 3 ? "rgba(247,201,72,.05)" : "transparent",
                  }}>
                  <div className="w-8 text-center font-black" style={{ fontSize: i < 3 ? 18 : 13, color: G.light }}>
                    {MEDAL[i] ?? i + 1}
                  </div>
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" width={36} height={36} loading="lazy"
                      className="rounded-full shrink-0" style={{ width: 36, height: 36, objectFit: "cover", border: `1px solid ${G.border}` }} />
                  ) : (
                    <div className="rounded-full shrink-0 flex items-center justify-center" style={{ width: 36, height: 36, background: "rgba(255,255,255,.08)" }}>
                      <Users size={16} color={G.light} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ fontSize: 13, color: "#fff" }}>
                      {r.username ? `@${r.username}` : r.name}{isMe ? " (siz)" : ""}
                    </p>
                    {i < 3 && (
                      <p className="font-bold" style={{ fontSize: 10, color: G.main }}>Sovrin: {fmt(prizes[i] ?? 0)} UZS</p>
                    )}
                  </div>
                  <div className="px-2.5 py-1 rounded-lg font-black shrink-0" style={{
                    fontSize: 12, color: "#1a1204", background: G.grad,
                  }}>{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KONKURS HAQIDA */}
        <div className="px-4 mt-5">
          <div className="rounded-3xl p-4" style={{
            background: "linear-gradient(160deg, rgba(38,25,6,.86), rgba(12,9,4,.92))",
            border: `1px solid ${G.border}`,
          }}>
            <div className="flex items-center gap-2">
              <Crown size={16} color={G.main} />
              <p className="font-black" style={{ fontSize: 14, color: G.light }}>Konkurs haqida</p>
            </div>
            <p className="mt-2" style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(255,255,255,.82)", whiteSpace: "pre-line" }}>
              {info?.desc ?? ""}
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                "Faqat konkurs boshlangandan keyin qo'shilgan do'stlar hisoblanadi — eski referallar o'tmaydi.",
                "Do'st sizning havolangiz orqali botga kirsa, hisobingizga +1 qo'shiladi.",
                "Bloklangan hisoblar reytingdan chiqariladi.",
                "Konkurs tugagach TOP 3 g'olibga pul sovrini balansga tushiriladi.",
              ].map((t, i) => (
                <li key={i} className="flex gap-2" style={{ fontSize: 11.5, color: "rgba(255,255,255,.72)" }}>
                  <span style={{ color: G.main }}>◆</span><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
