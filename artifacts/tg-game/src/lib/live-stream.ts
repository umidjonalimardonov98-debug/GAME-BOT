/**
 * LIVE PvP real-time oqim.
 * Avval SSE (EventSource) — server holatni o'zi yuboradi (taymer, raund, natija).
 * SSE ishlamasa yoki uzilsa — avtomatik polling'ga qaytadi. Ikkisi bir vaqtda ishlamaydi.
 */

export type DuelStreamHandlers<T> = {
  onState: (state: T) => void;
  onClosed?: (reason: string) => void;
  onError?: (message: string) => void;
  onTransport?: (t: "sse" | "poll") => void;
};

export type DuelStreamOpts = {
  roomId: string;
  telegramId: string;
  pollMs?: number;
};

export function subscribeDuelState<T extends { chatLast?: number; winner?: unknown }>(
  { roomId, telegramId, pollMs = 1000 }: DuelStreamOpts,
  h: DuelStreamHandlers<T>,
): () => void {
  let stopped = false;
  let es: EventSource | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let chatSince = 0;

  const url = (path: string) =>
    `/api/duel/${path}?telegramId=${encodeURIComponent(telegramId)}&roomId=${encodeURIComponent(roomId)}&chatSince=${chatSince}`;

  const handle = (state: T) => {
    if (stopped) return;
    if (typeof state.chatLast === "number") chatSince = state.chatLast;
    h.onState(state);
  };

  const startPolling = () => {
    if (stopped || timer) return;
    h.onTransport?.("poll");
    const once = async () => {
      try {
        const r = await fetch(url("state"));
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          h.onError?.((j as { error?: string }).error || "Aloqa uzildi");
          return;
        }
        handle(j as T);
      } catch {
        h.onError?.("Internet aloqasi yo'q — qayta urinilmoqda");
      }
    };
    void once();
    timer = setInterval(once, pollMs);
  };

  const stopPolling = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const startSse = () => {
    if (stopped || typeof EventSource === "undefined") return startPolling();
    try {
      es = new EventSource(url("stream"));
    } catch {
      return startPolling();
    }
    es.addEventListener("open", () => {
      stopPolling();
      h.onTransport?.("sse");
    });
    es.addEventListener("state", (e) => {
      try {
        handle(JSON.parse((e as MessageEvent).data) as T);
      } catch { /* buzilgan kadr — e'tiborsiz */ }
    });
    es.addEventListener("closed", (e) => {
      let reason = "Xona yopildi";
      try { reason = (JSON.parse((e as MessageEvent).data) as { reason?: string }).reason || reason; } catch { /* ignore */ }
      h.onClosed?.(reason);
      close();
    });
    es.addEventListener("error", () => {
      // SSE uzildi — proxy yoki tarmoq. Polling zaxira sifatida yoqiladi.
      es?.close();
      es = null;
      if (!stopped) startPolling();
    });
  };

  function close() {
    stopped = true;
    stopPolling();
    es?.close();
    es = null;
  }

  startSse();
  return close;
}
