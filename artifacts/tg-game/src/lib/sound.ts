/**
 * Ovoz effektlari dvigateli (WebAudio) — hech qanday audio fayl kerak emas,
 * shuning uchun yuklanish 0 ms va FPS ga ta'sir qilmaydi.
 */

const LS_KEY = "sfx_enabled";
const LS_VOL = "sfx_volume";

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

let enabled = (() => {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
})();

let volume = (() => {
  try {
    const v = Number(localStorage.getItem(LS_VOL));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.6;
  } catch { return 0.6; }
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
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isSoundEnabled() { return enabled; }

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem(LS_KEY, v ? "1" : "0"); } catch {}
  listeners.forEach((l) => l(enabled));
  if (v) sfx.click();
}

export function toggleSound() { setSoundEnabled(!enabled); return enabled; }

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(LS_VOL, String(volume)); } catch {}
  if (master) master.gain.value = volume;
}
export function getVolume() { return volume; }

export function subscribeSound(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({ freq, to, dur = 0.12, type = "sine", gain = 0.25, delay = 0 }: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
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

let lastClick = 0;

export const sfx = {
  /** Tugma bosilishi — qisqa, quruq "tak" */
  click() {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastClick < 40) return;
    lastClick = now;
    tone({ freq: 620, to: 320, dur: 0.06, type: "triangle", gain: 0.16 });
  },
  /** Tanlov / toggle */
  select() {
    if (!enabled) return;
    tone({ freq: 520, to: 780, dur: 0.09, type: "square", gain: 0.1 });
  },
  /** Spin / aylanish boshlanishi */
  spin() {
    if (!enabled) return;
    noise(0.55, 0.12, 1500, 300);
    tone({ freq: 200, to: 620, dur: 0.5, type: "sawtooth", gain: 0.08 });
  },
  /** G'ildirak/reel tiqillashi */
  tick() {
    if (!enabled) return;
    tone({ freq: 1400, to: 900, dur: 0.035, type: "square", gain: 0.07 });
  },
  /** Karta / plitka ochilishi */
  reveal() {
    if (!enabled) return;
    noise(0.12, 0.1, 2600, 800);
  },
  /** Yutuq — ko'tarilib boruvchi arpejio + tanga jarangi */
  win(big = false) {
    if (!enabled) return;
    const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.2, delay: i * 0.08 }));
    tone({ freq: 1760, to: 2400, dur: 0.18, type: "sine", gain: 0.12, delay: notes.length * 0.08 });
    if (big) noise(0.5, 0.1, 4000, 1200, 0.1);
  },
  /** Yutqazish — pastga tushuvchi ohang */
  lose() {
    if (!enabled) return;
    tone({ freq: 320, to: 150, dur: 0.35, type: "sawtooth", gain: 0.14 });
    tone({ freq: 220, to: 90, dur: 0.4, type: "sine", gain: 0.12, delay: 0.08 });
  },
  /** Cashout / pul olish */
  cash() {
    if (!enabled) return;
    [880, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.15, type: "sine", gain: 0.18, delay: i * 0.06 }));
  },
  /** Portlash (mina, crash) */
  boom() {
    if (!enabled) return;
    noise(0.5, 0.28, 500, 60);
    tone({ freq: 120, to: 40, dur: 0.45, type: "sawtooth", gain: 0.2 });
  },
};

/** Har qanday tugma bosilishida global "click" ovozi (bir marta ulanadi) */
let installed = false;
export function installGlobalClickSound() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.("button, [role='button'], a");
      if (!el || (el as HTMLButtonElement).disabled) return;
      const label = (el.textContent || "").toLowerCase();
      if (/spin|aylan|tashla|start|boshla|play|o'yna|oyna|deal|roll|bet|tik/.test(label)) sfx.spin();
      else sfx.click();
    },
    { passive: true, capture: true }
  );
}
