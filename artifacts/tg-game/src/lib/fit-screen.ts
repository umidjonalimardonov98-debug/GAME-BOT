/**
 * O'yin ekranini telefon ekraniga to'liq sig'diradi: sarlavhadan pastdagi
 * hamma narsa (o'yin maydoni + tikish paneli) scroll qilmasdan ko'rinsin.
 * Kontent sig'masa, u CSS `zoom` bilan kichraytiriladi, kontent yoki ekran
 * o'zgarsa qaytadan hisoblanadi. Juda kichik bo'lib ketmasligi
 * uchun pastki chegara bor — undan keyin oddiy scroll qoladi.
 */
const MIN_ZOOM = 0.45;

export function fitGameToScreen(header: HTMLElement): () => void {
  const root = document.getElementById("root");
  let page: HTMLElement | null = header;
  while (page && !page.parentElement?.classList.contains("page-enter")) page = page.parentElement;
  if (!root || !page) return () => {};
  const pageEl = page;
  let headerBox: HTMLElement = header;
  while (headerBox.parentElement && headerBox.parentElement !== pageEl) headerBox = headerBox.parentElement;

  document.body.dataset.fit = "1";
  let zoom = 1;

  const parts = () => {
    const kids = Array.from(pageEl.children) as HTMLElement[];
    const start = kids.indexOf(headerBox) + 1;
    return kids.slice(start).filter(el => {
      const cs = getComputedStyle(el);
      return cs.position !== "fixed" && cs.position !== "absolute" && cs.display !== "none";
    });
  };
  // zoom matnni kichraytiradi; kenglikni ham biroz toraytiramiz, aks holda
  // ekran kengligidagi kvadrat maydonlar (Mines, Keno...) kichraymaydi.
  const apply = () => {
    const w = pageEl.clientWidth;
    for (const el of parts()) {
      if (zoom === 1) { el.style.zoom = ""; el.style.width = ""; el.style.alignSelf = ""; el.style.marginInline = ""; continue; }
      el.style.zoom = String(zoom);
      el.style.width = `${Math.floor(w / Math.sqrt(zoom))}px`;
      el.style.alignSelf = "center";
      el.style.marginInline = "auto";
    }
  };
  // Sahifa balandligi faqat oqimdagi kontentdan o'sadi (bezak qatlamlari hisobga kirmaydi)
  const fits = () => pageEl.offsetHeight <= root.clientHeight + 1;

  // Sig'adigan eng katta zoom'ni (MIN..1) ikkiga bo'lib qidiramiz — sinxron,
  // shuning uchun ekranda miltillash bo'lmaydi.
  const fit = () => {
    const prev = zoom;
    zoom = 1; apply();
    if (fits()) return;
    zoom = MIN_ZOOM; apply();
    if (!fits()) return;
    let lo = MIN_ZOOM, hi = 1;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      zoom = mid; apply();
      if (fits()) lo = mid; else hi = mid;
    }
    // Mayda tebranishlarga javob bermaymiz
    zoom = Math.abs(prev - lo) < 0.02 && prev <= lo ? prev : Math.floor(lo * 1000) / 1000;
    apply();
  };

  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
  // Kontent o'zgarsa (natija chiqdi/yo'qoldi) — ko'pi bilan 0.5s da bir marta qayta hisoblaymiz
  let last = 0, pending = 0 as unknown as ReturnType<typeof setTimeout>;
  const throttled = () => {
    const wait = 500 - (Date.now() - last);
    clearTimeout(pending);
    pending = setTimeout(() => { last = Date.now(); schedule(); }, Math.max(0, wait));
  };

  const ro = new ResizeObserver(schedule);
  ro.observe(pageEl);
  ro.observe(root);
  const mo = new MutationObserver(throttled);
  mo.observe(pageEl, { childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  // Rasmlar/shriftlar yuklanib bo'lgach ham qayta tekshiramiz
  const late = [setTimeout(schedule, 300), setTimeout(schedule, 1200)];
  schedule();

  return () => {
    cancelAnimationFrame(raf);
    late.forEach(clearTimeout);
    clearTimeout(pending);
    ro.disconnect();
    mo.disconnect();
    window.removeEventListener("resize", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    for (const el of Array.from(pageEl.children) as HTMLElement[]) { el.style.zoom = ""; el.style.width = ""; el.style.alignSelf = ""; el.style.marginInline = ""; }
    delete document.body.dataset.fit;
  };
}
