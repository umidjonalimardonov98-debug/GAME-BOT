import { useState } from "react";
import { useTheme, THEMES, type Theme } from "@/lib/theme-context";
import { useU } from "@/lib/ui-i18n";
import { sfx } from "@/lib/sound";

/**
 * Mavzu tanlagich — har bir variant KICHIK SURATCHA (mini preview) ko'rinishida:
 * fon gradienti + karta + tugma chizig'i ko'rinadi, shuning uchun bosishdan
 * oldin qanday bo'lishini ko'rish mumkin.
 */

const ORDER: Theme[] = ["dark", "light", "black"];

function MiniPreview({ th, size = 34 }: { th: Theme; size?: number }) {
  const s = THEMES[th];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: s.bg,
      }}
    >
      {/* mini header */}
      <div
        style={{
          position: "absolute",
          top: size * 0.12,
          left: size * 0.12,
          right: size * 0.12,
          height: size * 0.16,
          borderRadius: 99,
          background: s.text,
          opacity: 0.75,
        }}
      />
      {/* mini karta */}
      <div
        style={{
          position: "absolute",
          top: size * 0.38,
          left: size * 0.12,
          right: size * 0.12,
          height: size * 0.24,
          borderRadius: size * 0.1,
          background: s.card,
          border: `1px solid ${s.cardBorder}`,
        }}
      />
      {/* mini tugma (aksent) */}
      <div
        style={{
          position: "absolute",
          bottom: size * 0.12,
          left: size * 0.12,
          right: size * 0.12,
          height: size * 0.18,
          borderRadius: 99,
          background: "linear-gradient(180deg,#2f8fff,#1668e3)",
        }}
      />
    </div>
  );
}

export default function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const u = useU();
  const [open, setOpen] = useState(false);

  const size = compact ? 26 : 30;

  return (
    <div className="relative shrink-0">
      <button
        aria-label={u("theme")}
        onClick={() => {
          sfx.select();
          setOpen((v) => !v);
        }}
        className="rounded-xl p-[2px] active:scale-90 transition-transform tap-glow"
        style={{
          background: "linear-gradient(135deg,#f5d67b,#c89b3c)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        <MiniPreview th={theme} size={size} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-11 z-50 rounded-2xl p-2 pop-in"
            style={{
              background: false ? "#ffffff" : "#0d1b2c",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 20px 44px rgba(0,0,0,0.55)",
              minWidth: 168,
            }}
          >
            <p
              className="text-[10px] font-black tracking-[0.18em] mb-2 px-1"
              style={{ color: false ? "#64748b" : "rgba(255,255,255,0.5)" }}
            >
              {u("theme").toUpperCase()}
            </p>
            <div className="flex flex-col gap-1.5">
              {ORDER.map((th) => {
                const active = theme === th;
                return (
                  <button
                    key={th}
                    onClick={() => {
                      setTheme(th);
                      sfx.select();
                      setOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-xl p-1.5 pr-3 active:scale-[0.97] transition-all"
                    style={{
                      background: active
                        ? "linear-gradient(135deg,rgba(47,143,255,0.28),rgba(22,104,227,0.16))"
                        : "transparent",
                      border: `1px solid ${active ? "rgba(47,143,255,0.55)" : "transparent"}`,
                    }}
                  >
                    <MiniPreview th={th} size={32} />
                    <span
                      className="text-[12px] font-black"
                      style={{
                        color: active
                          ? "#7fbaff"
                          : false
                            ? "#334155"
                            : "rgba(255,255,255,0.72)",
                      }}
                    >
                      {u(`theme_${th}` as never)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
