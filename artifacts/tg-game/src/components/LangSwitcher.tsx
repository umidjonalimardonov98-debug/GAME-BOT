import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import type { Lang } from "@/lib/i18n";
import { sfx } from "@/lib/sound";

const LANGS: { code: Lang; flag: string; label: string; name: string }[] = [
  { code: "uz", flag: "uz", label: "UZ", name: "O'zbekcha" },
  { code: "ru", flag: "ru", label: "RU", name: "Русский" },
  { code: "en", flag: "en", label: "EN", name: "English" },
];

export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isLight = false;
  const cur = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative shrink-0">
      <button
        aria-label="Til / Язык / Language"
        onClick={() => {
          sfx.select();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 px-2 h-9 rounded-xl active:scale-90 transition-transform tap-glow"
        style={{
          background: isLight ? "rgba(22,104,227,0.1)" : "rgba(255,255,255,0.08)",
          border: `1px solid ${isLight ? "rgba(22,104,227,0.22)" : "rgba(255,255,255,0.14)"}`,
        }}
      >
        <Flag code={cur.flag} w={20} />
        <span
          className="font-black"
          style={{ fontSize: 11, color: isLight ? "#0b3f8f" : "#bcdcff" }}
        >
          {cur.label}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-11 z-50 rounded-2xl overflow-hidden pop-in"
            style={{
              background: isLight ? "#ffffff" : "#0d1b2c",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 20px 44px rgba(0,0,0,0.55)",
              minWidth: 150,
            }}
          >
            {LANGS.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    sfx.select();
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: active
                      ? isLight
                        ? "rgba(22,104,227,0.1)"
                        : "rgba(22,104,227,0.28)"
                      : "transparent",
                  }}
                >
                  <Flag code={l.flag} w={24} />
                  <span
                    className="text-[12px] font-black flex-1"
                    style={{
                      color: active
                        ? isLight
                          ? "#0b3f8f"
                          : "#bcdcff"
                        : isLight
                          ? "#334155"
                          : "rgba(255,255,255,0.68)",
                    }}
                  >
                    {l.name}
                  </span>
                  {active && (
                    <span style={{ color: "#39c46f", fontSize: 13, fontWeight: 900 }}>
                      {"\u2713"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Vektor bayroqlar — emoji o'rniga (hamma telefonda bir xil ko'rinadi) */
function Flag({ code, w }: { code: string; w: number }) {
  const h = Math.round(w * 0.68);
  const box = { display: "block", borderRadius: 3, overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,255,255,.25)" } as const;
  if (code === "uz") return (
    <svg width={w} height={h} viewBox="0 0 30 20" style={box} aria-hidden>
      <rect width="30" height="20" fill="#fff" /><rect width="30" height="6.4" fill="#0099b5" /><rect y="13.6" width="30" height="6.4" fill="#1eb53a" />
      <rect y="6.4" width="30" height="0.6" fill="#ce1126" /><rect y="13" width="30" height="0.6" fill="#ce1126" />
      <circle cx="5" cy="3.2" r="2.2" fill="#fff" /><circle cx="5.9" cy="3.2" r="2" fill="#0099b5" />
    </svg>
  );
  if (code === "ru") return (
    <svg width={w} height={h} viewBox="0 0 30 20" style={box} aria-hidden>
      <rect width="30" height="20" fill="#fff" /><rect y="6.67" width="30" height="6.67" fill="#0039a6" /><rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
    </svg>
  );
  return (
    <svg width={w} height={h} viewBox="0 0 30 20" style={box} aria-hidden>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" /><path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="3.4" />
    </svg>
  );
}
