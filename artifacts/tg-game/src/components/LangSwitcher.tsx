import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import type { Lang } from "@/lib/i18n";
import { sfx } from "@/lib/sound";

const LANGS: { code: Lang; flag: string; label: string; name: string }[] = [
  { code: "uz", flag: "\u{1F1FA}\u{1F1FF}", label: "UZ", name: "O'zbekcha" },
  { code: "ru", flag: "\u{1F1F7}\u{1F1FA}", label: "RU", name: "Русский" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "EN", name: "English" },
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
        <span style={{ fontSize: 16, lineHeight: 1 }}>{cur.flag}</span>
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
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{l.flag}</span>
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
