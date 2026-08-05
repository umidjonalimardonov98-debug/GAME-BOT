/**
 * Ovoz effektlari dvigateli (WebAudio) — hech qanday audio fayl kerak emas,
 * shuning uchun yuklanish 0 ms va FPS ga ta'sir qilmaydi.
 */

const LS_KEY = "sfx_enabled";
const LS_VOL = "sfx_volume";

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

let enabled = (() =>{
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
})();

let volume = (() =>{
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
  try { localStorage.setItem(LS_KEY, v ? "1":"0"); } catch {}
  listeners.forEach((l) => l(enabled));

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
  return () =>{ listeners.delete(l); };
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
let lastOutcome = 0;
/** bir natijaga bitta ovoz — takroriy chaqiruv o'tkazilmaydi */
function outcomeGate() {
  const now = Date.now();
  if (now - lastOutcome < 1300) return false;
  lastOutcome = now;
  return true;
}

export const sfx = {
  /** Tugma bosilishi — qisqa, quruq "tak" */
  click() {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastClick < 40) return;
    lastClick = now;
    // 1XBET uslubidagi yumshoq "chip" bosilishi: past "tup" + yengil jaranglash
    tone({ freq: 210, to: 120, dur: 0.055, type: "sine", gain: 0.16 });
    tone({ freq: 1180, to: 1560, dur: 0.05, type: "sine", gain: 0.05, delay: 0.008 });
    noise(0.045, 0.035, 2600, 1100);
  },
  /** Tanlov / toggle */
  select() {
    if (!enabled) return;
    tone({ freq: 660, to: 990, dur: 0.07, type: "sine", gain: 0.11 });
    tone({ freq: 1320, dur: 0.05, type: "sine", gain: 0.045, delay: 0.045 });
  },
  /** Spin / aylanish boshlanishi */
  spin() {
    if (!enabled) return;
    noise(0.55, 0.12, 1500, 300);
    tone({ freq: 200, to: 620, dur: 0.5, type: "sawtooth", gain: 0.08 });
  },
  /** G'ildirak/reel tiqillashi */
  tick() {
    return; // bosish/tiq-tiq ovozlari o'chirilgan
    tone({ freq: 2100, to: 1500, dur: 0.018, type: "sine", gain: 0.028 });
  },
  /** Karta / plitka ochilishi */
  reveal() {
    if (!enabled) return;
    noise(0.12, 0.1, 2600, 800);
  },
  /** Yutuq — ko'tarilib boruvchi arpejio + tanga jarangi */
  win(big = false) {
    return; // yutuq ovozi o'chirilgan
    if (!enabled) return;
    if (!outcomeGate()) return;
    // 1XBET uslubi: tanga sharqirashi + bayramona fanfara + yorqin shimmer
    const notes = big ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      tone({ freq: f, dur: 0.26, type: "triangle", gain: 0.19, delay: i * 0.075 });
      tone({ freq: f * 2, dur: 0.2, type: "sine", gain: 0.07, delay: i * 0.075 + 0.01 });
    });
    // tangalar to'kilishi
    const coins = big ? 14 : 8;
    for (let i = 0; i < coins; i++) {
      const f = 1600 + Math.random() * 1700;
      tone({ freq: f, to: f * 0.55, dur: 0.09, type: "sine", gain: 0.055, delay: 0.16 + i * 0.055 });
    }
    // porlash
    tone({ freq: 1976, to: 2960, dur: 0.32, type: "sine", gain: 0.09, delay: notes.length * 0.075 });
    noise(big ? 0.7 : 0.4, 0.055, 5200, 1400, 0.12);
    if (big) {
      [1047, 1319, 1568, 2093].forEach((f, i) =>
        tone({ freq: f, dur: 0.5, type: "sine", gain: 0.1, delay: 0.62 + i * 0.02 }),
      );
    }
  },
  /** Yutqazish — pastga tushuvchi ohang */
  lose() {
    return; // yutqazish ovozi o'chirilgan
    if (!enabled) return;
    if (!outcomeGate()) return;
    // Yumshoq, "wah-wah" uslubidagi tushuvchi ohang (1XBET yutqazish signali)
    [392, 349, 294].forEach((f, i) =>
      tone({ freq: f, to: f * 0.94, dur: 0.26, type: "triangle", gain: 0.13, delay: i * 0.14 }),
    );
    tone({ freq: 196, to: 82, dur: 0.55, type: "sine", gain: 0.12, delay: 0.34 });
    noise(0.3, 0.04, 700, 160, 0.3);
  },
  /** Cashout / pul olish */
  cash() {
    return; // yutuq ovozi o'chirilgan
    if (!enabled) return;
    [880, 1175, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.16, type: "sine", gain: 0.17, delay: i * 0.055 }));
    for (let i = 0; i < 6; i++) {
      const f = 1700 + Math.random() * 1400;
      tone({ freq: f, to: f * 0.6, dur: 0.08, type: "sine", gain: 0.05, delay: 0.1 + i * 0.05 });
    }
  },
  /** Portlash (mina, crash) */
  boom() {
    return; // yutqazish ovozi o'chirilgan
    if (!enabled) return;
    noise(0.5, 0.28, 500, 60);
    tone({ freq: 120, to: 40, dur: 0.45, type: "sawtooth", gain: 0.2 });
  },
  /** Orqaga qaytish */
  back() {
    return; // bosish/tiq-tiq ovozlari o'chirilgan
    tone({ freq: 480, to: 240, dur: 0.11, type: "sine", gain: 0.14 });
  },
  /** Sahifaga o'tish / o'yin ochish */
  nav() {
    return; // bosish/tiq-tiq ovozlari o'chirilgan
    tone({ freq: 380, to: 720, dur: 0.13, type: "triangle", gain: 0.14 });
  },
  /** Tikish miqdorini o'zgartirish */
  bet() {
    return; // bosish/tiq-tiq ovozlari o'chirilgan
    tone({ freq: 900, to: 1250, dur: 0.07, type: "square", gain: 0.09 });
  },
  /** Zar tashlash */
  dice() {
    if (!enabled) return;
    noise(0.28, 0.16, 2200, 400);
    tone({ freq: 260, to: 160, dur: 0.22, type: "triangle", gain: 0.1, delay: 0.05 });
  },
  /** Charx / ruletka */
  wheel() {
    if (!enabled) return;
    noise(0.7, 0.1, 900, 200);
    tone({ freq: 520, to: 180, dur: 0.7, type: "sawtooth", gain: 0.07 });
  },
  /** Karta tarqatish */
  card() {
    if (!enabled) return;
    noise(0.14, 0.14, 3200, 900);
    tone({ freq: 1500, to: 700, dur: 0.06, type: "triangle", gain: 0.06, delay: 0.04 });
  },
  /** Samolyot (aviator) uchishi */
  fly() {
    if (!enabled) return;
    noise(0.9, 0.07, 400, 1600);
    tone({ freq: 160, to: 520, dur: 0.9, type: "sawtooth", gain: 0.07 });
  },
  /** Mina maydonida katak ochish */
  tile() {
    return; // bosish/tiq-tiq ovozlari o'chirilgan
    tone({ freq: 700, to: 1150, dur: 0.08, type: "sine", gain: 0.13 });
  },
  /** Depozit / to'ldirish */
  deposit() {
    if (!enabled) return;
    [660, 880, 1100].forEach((f, i) => tone({ freq: f, dur: 0.13, type: "triangle", gain: 0.16, delay: i * 0.07 }));
  },
  /** Pul chiqarish */
  withdraw() {
    if (!enabled) return;
    [1100, 820, 620].forEach((f, i) => tone({ freq: f, dur: 0.13, type: "sine", gain: 0.16, delay: i * 0.07 }));
  },
  /** Xabar yuborish */
  send() {
    if (!enabled) return;
    tone({ freq: 760, to: 1500, dur: 0.1, type: "sine", gain: 0.13 });
  },
  /** Yangilash / qayta boshlash */
  refresh() {
    if (!enabled) return;
    tone({ freq: 420, to: 900, dur: 0.09, type: "triangle", gain: 0.11 });
    tone({ freq: 900, to: 420, dur: 0.09, type: "triangle", gain: 0.09, delay: 0.09 });
  },
  /** Xatolik / bloklangan amal */
  error() {
    return; // bosish/tiq-tiq ovozlari o'chirilgan
    tone({ freq: 300, to: 200, dur: 0.1, type: "square", gain: 0.13 });
    tone({ freq: 200, to: 130, dur: 0.16, type: "square", gain: 0.12, delay: 0.1 });
  },
};

/** Har bir tugma o'z ovozini chiqaradi (bir marta ulanadi) */
let installed = false;

const SOUND_RULES: Array<[RegExp, () => void]> = [
  [/^(←||back|orqaga)/, () => sfx.back()],
  [/zar|dice|tashla/, () => sfx.dice()],
  [/charx|ruletka|roulette|wheel|aylantir/, () => sfx.wheel()],
  [/blackjack|karta|card|deal|hit|stand/, () => sfx.card()],
  [/aviator|samolyot|uchir|fly/, () => sfx.fly()],
  [/mina|mines|olma|apple/, () => sfx.tile()],
  [/slot|spin|aylan/, () => sfx.spin()],
  [/cashout|olish|yech/, () => sfx.cash()],
  [/chiqar|withdraw/, () => sfx.withdraw()],
  [/depozit|deposit|to'ldir|toldir|hisob to/, () => sfx.deposit()],
  [/yubor|send|so'rov|sorov|chaqir/, () => sfx.send()],
  [/yangila|qayta|refresh|/, () => sfx.refresh()],
  [/min\b|max\b|x2|x\/2|1\/2|\+|tikish/, () => sfx.bet()],
  [/boshla|start|play|o'yna|oyna|bet|tik/, () => sfx.spin()],
  [/tanla|select|toggle|til|mode|rejim/, () => sfx.select()],
];

export function installGlobalClickSound() {
  // Tugma bosilish ovozlari butunlay o'chirilgan (foydalanuvchi so'roviga ko'ra)
  if (true) return;
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "pointerdown",
    (e) =>{
      const el = (e.target as HTMLElement | null)?.closest?.("button, [role='button'], a");
      if (!el) return;
      if ((el as HTMLButtonElement).disabled) { sfx.error(); return; }
      const label = ((el.getAttribute("aria-label") || "") + " "+ (el.textContent ||"")).toLowerCase().trim();
      const href = (el as HTMLAnchorElement).getAttribute?.("href") || "";
      const rule = SOUND_RULES.find(([re]) => re.test(label));
      if (rule) rule[1]();
      else if (href && href !== "#") sfx.nav();
      else sfx.click();
    },
    { passive: true, capture: true }
  );
}

/**
 * Harakat davomida bir xil "tiq-tiq" ovozi.
 * Bosilganda emas — animatsiya davomida ishlaydi.
 * Qaytgan funksiyani chaqirib to'xtatiladi.
 */
export function startTicker(_intervalMs = 60, _slowdown = 1): () => void {
  // "tiq-tiq" ovozi o'chirilgan
  return () =>{};
  // eslint-disable-next-line no-unreachable
  const intervalMs = _intervalMs, slowdown = _slowdown;
  if (typeof window === "undefined") return () =>{};
  let stopped = false;
  let gap = Math.max(45, intervalMs * 0.6);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const step = () =>{
    if (stopped) return;
    sfx.tick();
    gap = Math.min(gap * slowdown, 180);
    timer = setTimeout(step, gap);
  };
  step();
  return () =>{
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
