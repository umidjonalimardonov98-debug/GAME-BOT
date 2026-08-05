/**
 * Haqiqiy kazino slot dvigateli — 5 baraban x 3 qator, 3..10 to'lov chizig'i.
 * 1win / 1xbet uslubidagi matematika: wild, scatter, chapdan-o'ngga kombinatsiyalar.
 */

export const REELS = 5;
export const ROWS = 3;

export const WILD = "crown";
export const SCATTER = "gem";

/** Barabandagi belgilar (og'irliklar bilan) */
const WEIGHTS: Record<string, number> = {
  cherry: 20, lemon: 18, orange: 16, grape: 14,
  melon: 12, star: 10, bell: 8, seven: 5,
  [WILD]: 3, [SCATTER]: 3,
};

export const SYMBOLS = Object.keys(WEIGHTS);

/** Chiziqli to'lovlar: belgi -> [3 ta, 4 ta, 5 ta] (bir chiziqdagi tikimga ko'paytiriladi) */
export const PAYTABLE: Record<string, [number, number, number]> = {
  [WILD]:   [20, 100, 500],
  seven:    [10, 50, 200],
  bell:     [6, 25, 90],
  star:     [4, 15, 60],
  melon:    [3, 10, 40],
  grape:    [2.5, 8, 30],
  orange:   [2, 6, 22],
  lemon:    [1.5, 5, 18],
  cherry:   [1, 4, 15],
};

/** Scatter (gem) — istalgan joyda: 3 ta x3, 4 ta x10, 5 ta x50 (umumiy tikimdan) */
export const SCATTER_PAYS: Record<number, number> = { 3: 3, 4: 10, 5: 50 };

/** 10 ta standart to'lov chizig'i — har ustundagi qator indeksi */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
];

export const LINE_COLORS = [
  "#ffd766", "#39c46f", "#5fb0ff", "#ff6b6b", "#c084fc",
  "#f97316", "#22d3ee", "#f472b6", "#a3e635", "#facc15",
];

/** Tanlash mumkin bo'lgan chiziqlar soni */
export const LINE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

function pickWeighted(exclude: string[] = []): string {
  const pool = SYMBOLS.filter((s) => !exclude.includes(s));
  const total = pool.reduce((a, s) => a + WEIGHTS[s], 0);
  let r = Math.random() * total;
  for (const s of pool) {
    r -= WEIGHTS[s];
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}

export type Grid = string[][]; // [col][row]

export interface LineWin {
  line: number;      // PAYLINES indeksi
  symbol: string;
  count: number;
  amount: number;
  cells: [number, number][]; // [col,row]
}

export interface SpinResult {
  grid: Grid;
  lineWins: LineWin[];
  scatterCount: number;
  scatterWin: number;
  totalWin: number;
}

function randomGrid(): Grid {
  return Array.from({ length: REELS }, () =>
    Array.from({ length: ROWS }, () => pickWeighted())
  );
}

/** Grid bo'yicha yutuqlarni hisoblash */
export function evaluate(grid: Grid, lines: number, betPerLine: number): SpinResult {
  const lineWins: LineWin[] = [];

  for (let l = 0; l < lines; l++) {
    const path = PAYLINES[l];
    const syms = path.map((row, col) => grid[col][row]);

    // Bazaviy belgi — birinchi wild bo'lmagan
    let base = syms[0];
    if (base === WILD) {
      base = syms.find((s) => s !== WILD && s !== SCATTER) ?? WILD;
    }
    if (base === SCATTER) continue;

    let count = 0;
    for (let c = 0; c < REELS; c++) {
      if (syms[c] === base || syms[c] === WILD) count++;
      else break;
    }
    if (count < 3) continue;

    const pay = PAYTABLE[base]?.[count - 3];
    if (!pay) continue;
    lineWins.push({
      line: l,
      symbol: base,
      count,
      amount: Math.floor(pay * betPerLine),
      cells: path.slice(0, count).map((row, col) => [col, row] as [number, number]),
    });
  }

  let scatterCount = 0;
  for (let c = 0; c < REELS; c++)
    for (let r = 0; r < ROWS; r++) if (grid[c][r] === SCATTER) scatterCount++;

  const totalBet = betPerLine * lines;
  const scatterWin = Math.floor((SCATTER_PAYS[scatterCount] ?? 0) * totalBet);

  const totalWin = lineWins.reduce((a, w) => a + w.amount, 0) + scatterWin;
  return { grid, lineWins, scatterCount, scatterWin, totalWin };
}

/** Yutuqsiz grid yaratish (uy foydasi uchun) */
function losingGrid(lines: number, betPerLine: number): Grid {
  for (let i = 0; i < 60; i++) {
    const g = randomGrid();
    const res = evaluate(g, lines, betPerLine);
    if (res.totalWin === 0) return g;
  }
  // kafolatlangan yutqaziq
  const g = randomGrid();
  for (let c = 0; c < REELS; c++)
    for (let r = 0; r < ROWS; r++)
      g[c][r] = [["cherry", "lemon", "orange"], ["grape", "melon", "star"], ["bell", "cherry", "lemon"], ["orange", "grape", "melon"], ["star", "bell", "cherry"]][c][r];
  return g;
}

/** Yutuqli grid: tanlangan chiziqqa kombinatsiya joylashtiriladi */
function winningGrid(lines: number, betPerLine: number): Grid {
  const g = losingGrid(lines, betPerLine);
  const l = Math.floor(Math.random() * lines);
  const path = PAYLINES[l];

  // Yutuq darajasi: ko'pincha kichik
  const r = Math.random();
  const count = r < 0.72 ? 3 : r < 0.94 ? 4 : 5;
  const tier = Math.random();
  const sym =
    tier < 0.55
      ? pickWeighted([WILD, SCATTER, "seven", "bell"])
      : tier < 0.9
        ? pickWeighted([WILD, SCATTER, "cherry", "lemon"])
        : "seven";

  for (let c = 0; c < count; c++) g[c][path[c]] = sym;
  // keyingi ustun boshqa belgi bo'lsin (kombinatsiya uzilsin)
  if (count < REELS) {
    let other = pickWeighted([sym, WILD]);
    if (other === sym) other = "cherry";
    g[count][path[count]] = other;
  }
  return g;
}

/**
 * Bitta spin. winRate — o'yinchining yutish ehtimoli.
 */
export function spin(lines: number, betPerLine: number, winRate: number): SpinResult {
  const win = Math.random() < winRate;
  const grid = win ? winningGrid(lines, betPerLine) : losingGrid(lines, betPerLine);
  return evaluate(grid, lines, betPerLine);
}
