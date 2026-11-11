/**
 * Kazino ovoz dvigateli (WebAudio).
 * - Haqiqiy kazino ovozlari (fishkalar, kartalar, zar, tangalar) — /public/sfx (Kenney, CC0).
 * - Har bir o'yin o'z ovoz profiliga ega (zar, karta, g'ildirak, slot, mina, aviator...).
 * - Fanfara va dvigatel ovozlari sintez qilinadi (fayl kerak emas).
 */

const LS_KEY = "sfx_on_v2";
const LS_VOL = "sfx_volume";

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

let enabled = (() => {
  try { return localStorage.getItem(LS_KEY) !== "0"; } catch { return true; }
})();

let volume = (() => {
  try {
    const v = Number(localStorage.getItem(LS_VOL));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.7;
  } catch { return 0.7; }
})();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    // yumshoq kompressor — ovozlar bir-birini "yorib" yubormasin
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isSoundEnabled() { return enabled; }

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem(LS_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  if (v) { ac(); void preload(); }
  listeners.forEach((l) => l(enabled));
}

export function toggleSound() { setSoundEnabled(!enabled); return enabled; }

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(LS_VOL, String(volume)); } catch { /* ignore */ }
  if (master) master.gain.value = volume;
}
export function getVolume() { return volume; }

export function subscribeSound(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/* ───────────── Namuna (sample) ovozlar ───────────── */

const SAMPLES = {
  chip: ["chip1", "chip2", "chip3"],
  stack: ["stack1", "stack2", "stack3"],
  coins: ["coins1", "coins2"],
  handle: ["handle"],
  card: ["card1", "card2"],
  slide: ["slide1", "slide2"],
  shuffle: ["shuffle"],
  fan: ["fan"],
  shake: ["shake"],
  throw: ["throw1", "throw2"],
  die: ["die"],
  click: ["click"],
  select: ["select"],
  back: ["back"],
  error: ["error"],
  confirm: ["confirm"],
  tick: ["tick"],
  scratch: ["scratch"],
  gem: ["gem"],
  drop: ["drop"],
  rise: ["rise"],
  boom: ["boom"],
  bell: ["bell"],
  coin: ["coin"],
  reel: ["reel"],
  glass: ["glass"],
  soft: ["soft"],
} as const;
type SampleName = keyof typeof SAMPLES;

const buffers = new Map<string, AudioBuffer>();
let preloading: Promise<void> | null = null;

function preload(): Promise<void> {
  if (preloading) return preloading;
  const c = ac();
  if (!c) return Promise.resolve();
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const files = Array.from(new Set(Object.values(SAMPLES).flat()));
  preloading = Promise.all(files.map(async (f) => {
    try {
      const res = await fetch(`${base}sfx/${f}.mp3`);
      if (!res.ok) return;
      const arr = await res.arrayBuffer();
      const buf = await new Promise<AudioBuffer>((ok, bad) => c.decodeAudioData(arr, ok, bad));
      buffers.set(f, buf);
    } catch { /* ovoz yuklanmasa — o'yin davom etadi */ }
  })).then(() => undefined);
  return preloading;
}

let lastAny = 0;
function play(name: SampleName, { gain = 0.8, rate = 1, delay = 0, vary = 0.06 }: { gain?: number; rate?: number; delay?: number; vary?: number } = {}) {
  if (!enabled) return;
  const c = ac();
  if (!c || !master) return;
  lastAny = Date.now();
  const list = SAMPLES[name];
  const file = list[Math.floor(Math.random() * list.length)];
  const buf = buffers.get(file);
  if (!buf) { void preload(); return; }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g); g.connect(master);
  src.start(c.currentTime + delay);
}

/* ───────────── Sintez ───────────── */

type ToneOpts = { freq: number; to?: number; dur?: number; type?: OscillatorType; gain?: number; delay?: number };

function tone({ freq, to, dur = 0.12, type = "sine", gain = 0.25, delay = 0 }: ToneOpts) {
  if (!enabled) return;
  const c = ac();
  if (!c || !master) return;
  lastAny = Date.now();
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur = 0.3, gain = 0.18, filterFrom = 900, filterTo = 180, delay = 0) {
  if (!enabled) return;
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(filterFrom, t0);
  bp.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Kazino yutuq fanfarasi */
function fanfare(big: boolean) {
  const notes = big ? [523, 659, 784, 1047, 1319, 1568] : [659, 784, 1047];
  notes.forEach((f, i) => {
    tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.13, delay: i * 0.07 });
    tone({ freq: f * 2, dur: 0.16, type: "sine", gain: 0.04, delay: i * 0.07 + 0.01 });
  });
  tone({ freq: 2093, to: 2637, dur: 0.35, type: "sine", gain: 0.05, delay: notes.length * 0.07 });
}

/* ───────────── O'yin profillari ───────────── */

export type SoundKind = "dice" | "cards" | "wheel" | "slots" | "tiles" | "crash" | "coin" | "race" | "generic";

const KIND: Record<string, SoundKind> = {
  dice: "dice", parity: "dice", thimbles: "coin", hands: "coin",
  blackjack: "cards", baccarat: "cards", dragontiger: "cards", hilo: "cards", luckycard: "cards",
  "pvp-blackjack": "cards", "pvp-poker": "cards", pvp: "cards", pvpblackjack: "cards", pvppoker: "cards", pvpdurak: "cards", durak: "cards", poker: "cards",
  roulette: "wheel", moneywheel: "wheel", spin: "wheel", wheel: "wheel",
  slots: "slots", fruitblast: "slots",
  mines: "tiles", apple: "tiles", towers: "tiles", keno: "tiles", scratch: "tiles", case: "tiles",
  aviator: "crash", limbo: "crash", plinko: "crash", crash: "crash",
  coinflip: "coin", rps: "coin",
  derby: "race",
};

/** Joriy sahifa bo'yicha o'yin kaliti (/dice → dice, /arena/poker → poker) */
export function currentGameKey(): string {
  if (typeof location === "undefined") return "";
  const base = ((import.meta as any).env?.BASE_URL ?? "/").replace(/\/$/, "");
  let p = location.pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  const seg = p.split("/").filter(Boolean);
  if (seg[0] === "arena" || seg[0] === "duel") return seg[1] ?? "";
  return seg[0] ?? "";
}

export function soundKind(game?: string): SoundKind {
  const g = (game ?? currentGameKey()).toLowerCase();
  return KIND[g] ?? (/card|poker|jack|bacc|durak/.test(g) ? "cards" : /dice|zar/.test(g) ? "dice" : /wheel|roul/.test(g) ? "wheel" : /slot/.test(g) ? "slots" : "generic");
}

/** O'yin boshlanishi (asosiy "O'YNASH" tugmasi) */
function startFor(kind: SoundKind) {
  switch (kind) {
    case "dice": play("shake", { gain: 0.9 }); play("throw", { gain: 0.9, delay: 0.45 }); break;
    case "cards": play("shuffle", { gain: 0.7 }); play("slide", { gain: 0.8, delay: 0.35 }); break;
    case "wheel": play("handle", { gain: 0.7 }); noise(1.2, 0.05, 1800, 500, 0.1); break;
    case "slots": play("handle", { gain: 0.6 }); noise(0.9, 0.05, 2400, 900, 0.05); tone({ freq: 220, to: 330, dur: 0.6, type: "triangle", gain: 0.04 }); break;
    case "tiles": play("stack", { gain: 0.8 }); break;
    case "crash": play("stack", { gain: 0.7 }); noise(1.1, 0.05, 300, 1500, 0.15); tone({ freq: 140, to: 420, dur: 1.1, type: "sawtooth", gain: 0.025, delay: 0.15 }); break;
    case "coin": play("coin", { gain: 0.8, rate: 1.2 }); play("coin", { gain: 0.5, rate: 1.5, delay: 0.18 }); break;
    case "race": play("bell", { gain: 0.5, rate: 1.4 }); break;
    default: play("stack", { gain: 0.8 });
  }
}

function winFor(kind: SoundKind, big: boolean) {
  play("coins", { gain: 0.9 });
  play("stack", { gain: 0.7, delay: 0.12 });
  if (kind === "cards") play("chip", { gain: 0.7, delay: 0.25 });
  fanfare(big);
  if (big) {
    play("bell", { gain: 0.55, delay: 0.3 });
    for (let i = 0; i < 6; i++) play("coin", { gain: 0.45, rate: 1 + Math.random() * 0.6, delay: 0.35 + i * 0.09 });
  }
}

function loseFor(kind: SoundKind) {
  if (kind === "tiles" || kind === "crash") {
    play("boom", { gain: 0.9 });
    noise(0.6, 0.12, 500, 60);
    return;
  }
  play("soft", { gain: 0.7 });
  tone({ freq: 330, to: 300, dur: 0.22, type: "triangle", gain: 0.07, delay: 0.05 });
  tone({ freq: 247, to: 185, dur: 0.4, type: "triangle", gain: 0.07, delay: 0.22 });
}

let lastOutcome = 0;
/** bir natijaga bitta ovoz — takroriy chaqiruv o'tkazilmaydi */
function outcomeGate() {
  const now = Date.now();
  if (now - lastOutcome < 900) return false;
  lastOutcome = now;
  return true;
}

let lastClick = 0;

export const sfx = {
  click() {
    const now = Date.now();
    if (now - lastClick < 40) return;
    lastClick = now;
    play("click", { gain: 0.45 });
  },
  select() { play("select", { gain: 0.5 }); },
  spin() { startFor(soundKind()); },
  tick() { play("tick", { gain: 0.25, vary: 0.1 }); },
  reveal() {
    const k = soundKind();
    if (k === "cards") play("card", { gain: 0.8 });
    else if (k === "tiles") play("gem", { gain: 0.6 });
    else play("glass", { gain: 0.5 });
  },
  /** Yutuq — o'yinga mos */
  win(big = false, game?: string) {
    if (!outcomeGate()) return;
    winFor(soundKind(game), big);
  },
  /** Yutqazish — o'yinga mos */
  lose(game?: string) {
    if (!outcomeGate()) return;
    loseFor(soundKind(game));
  },
  /** Pul qaytarildi (x1) */
  refund() {
    if (!outcomeGate()) return;
    play("stack", { gain: 0.7 });
  },
  cash() { play("coins", { gain: 0.9 }); play("stack", { gain: 0.7, delay: 0.1 }); fanfare(false); },
  boom() { play("boom", { gain: 0.9 }); noise(0.5, 0.12, 500, 60); },
  back() { play("back", { gain: 0.45 }); },
  nav() { play("click", { gain: 0.4 }); },
  bet() { play("chip", { gain: 0.75 }); },
  dice() { play("shake", { gain: 0.9 }); play("throw", { gain: 0.9, delay: 0.4 }); },
  wheel() { play("handle", { gain: 0.6 }); noise(1.2, 0.05, 1800, 500, 0.1); },
  card() { play(Math.random() < 0.5 ? "card" : "slide", { gain: 0.8 }); },
  fly() { noise(1.1, 0.05, 300, 1500); tone({ freq: 140, to: 420, dur: 1.1, type: "sawtooth", gain: 0.025 }); },
  tile() { play("gem", { gain: 0.6 }); },
  reel() { play("reel", { gain: 0.6 }); },
  scratch() { play("scratch", { gain: 0.6 }); },
  deposit() { play("confirm", { gain: 0.6 }); play("coins", { gain: 0.7, delay: 0.1 }); },
  withdraw() { play("confirm", { gain: 0.6 }); },
  send() { play("drop", { gain: 0.5 }); },
  refresh() { play("select", { gain: 0.45 }); },
  error() { play("error", { gain: 0.45 }); },
};

/** Har bir tugma o'z ovozini chiqaradi (bir marta ulanadi) */
let installed = false;

export function installGlobalClickSound() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  // birinchi teginishda AudioContext ochiladi va ovozlar yuklanadi (iOS talabi)
  const unlock = () => { if (enabled) { ac(); void preload(); } };
  document.addEventListener("pointerdown", unlock, { passive: true, capture: true });

  // "click" — React ishlovchilaridan KEYIN ishlaydi: sahifa o'zi ovoz bergan bo'lsa, takrorlamaymiz
  document.addEventListener("click", (e) => {
    if (!enabled) return;
    if (Date.now() - lastAny < 80) return;
    const el = (e.target as HTMLElement | null)?.closest?.("button, [role='button'], a") as HTMLElement | null;
    if (!el || (el as HTMLButtonElement).disabled) return;
    const named = el.getAttribute("data-sfx");
    if (named === "none") return;
    if (named && named in sfx) { (sfx as any)[named](); return; }
    if (el.matches(".bp-chip, .bp-step, .bp-quick")) { sfx.bet(); return; }
    if (el.matches(".pro-btn")) { startFor(soundKind()); return; }
    const label = ((el.getAttribute("aria-label") || "") + " " + (el.textContent || "")).toLowerCase();
    if (/^\s*(←|back|orqaga|ortga)/.test(label)) { sfx.back(); return; }
    sfx.click();
  }, { passive: true });
}

/**
 * Harakat davomida "tiq-tiq" ovozi (ruletka, g'ildirak).
 * Qaytgan funksiyani chaqirib to'xtatiladi.
 */
export function startTicker(intervalMs = 60, slowdown = 1): () => void {
  if (typeof window === "undefined") return () => {};
  let stopped = false;
  let gap = Math.max(90, intervalMs * 1.3);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const step = () => {
    if (stopped) return;
    sfx.tick();
    gap = Math.min(gap * slowdown, 260);
    timer = setTimeout(step, gap);
  };
  step();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
