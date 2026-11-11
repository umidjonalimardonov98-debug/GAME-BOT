/** Kichik global xabar (React'siz) — tikish rad etilganda va h.k. */
let el: HTMLDivElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function notify(text: string, kind: "error" | "info" = "error") {
  if (typeof document === "undefined") return;
  if (!el) {
    el = document.createElement("div");
    el.className = "casino-toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.dataset.kind = kind;
  el.dataset.show = "1";
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { if (el) el.dataset.show = "0"; }, 3200);
}
