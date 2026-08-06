export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: TelegramUser;
        };
        expand?: () => void;
        openTelegramLink?: (url: string) => void;
        close?: () => void;
        ready?: () => void;
        disableVerticalSwipes?: () => void;
        enableClosingConfirmation?: () => void;
        setHeaderColor?: (c: string) => void;
        viewportStableHeight?: number;
        viewportHeight?: number;
        isExpanded?: boolean;
        onEvent?: (ev: string, cb: () => void) => void;
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
        };
      };
    };
  }
}

export function getTelegramUser(): TelegramUser | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotify(type: "error" | "success" | "warning") {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

export function openBotChat(username?: string) {
  const url = `https://t.me/${username || "SUPPORT"}`;
  if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
  else window.open(url, "_blank");
}

function applyViewportHeight() {
  const wa = window.Telegram?.WebApp;
  const cand = [
    wa?.viewportStableHeight,
    wa?.viewportHeight,
    window.visualViewport?.height,
    window.innerHeight,
  ].filter((v): v is number => typeof v === "number" && v > 200);
  const h = cand.length ? Math.min(...cand) : window.innerHeight;
  document.documentElement.style.setProperty("--app-vh", `${Math.round(h)}px`);
}

export function initTelegramApp() {
  const wa = window.Telegram?.WebApp;
  wa?.ready?.();
  // To'liq (fullscreen) emas — oddiy kengaytirilgan holat
  wa?.expand?.();
  // Pastga/tepaga surganda mini app yopilib/qimirlab ketmasin
  wa?.disableVerticalSwipes?.();
  applyViewportHeight();
  wa?.onEvent?.("viewportChanged", applyViewportHeight);
  window.addEventListener("resize", applyViewportHeight);
  window.addEventListener("orientationchange", applyViewportHeight);
}
