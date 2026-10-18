/**
 * AI qoidalar yordamchisi — o'yinchilarning o'yin qoidalari haqidagi savollariga
 * faqat botdagi AMALDAGI qoidalarga tayanib javob beradi.
 *
 * Model: openai/gpt-6-astra, Lovable AI Gateway /v1/responses (stream).
 * Hech qanday o'yin logikasi yoki moliyaviy operatsiya bu yerda o'zgartirilmaydi.
 */
import { eq } from "drizzle-orm";
import { db, appSettingsTable, gameSettingsTable } from "@workspace/db";
import { GAME_RULES_DATA, GAMES_WITHOUT_RULES } from "./rules-data";
import { RULE_PRESETS, getLiveSettings } from "../live-settings";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";
const BLOCK_KEY = "rules_ai_block";
const MAX_ANSWER = 1200;

export class RulesAiError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "credits" | "denied" | "rate" | "transient" | "terminal",
  ) {
    super(message);
  }
}

/** 402/403 da butun funksiyani pauza qilish — barcha kirish nuqtalari tekshiradi */
async function setBlocked(reason: string) {
  try {
    await db
      .insert(appSettingsTable)
      .values({ key: BLOCK_KEY, value: reason })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: reason, updatedAt: new Date() } });
  } catch {}
}

export async function getRulesAiBlock(): Promise<string | null> {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, BLOCK_KEY));
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Admin paneldan qayta yoqish uchun */
export async function clearRulesAiBlock() {
  try {
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, BLOCK_KEY));
  } catch {}
}

const GENERAL_RULES = [
  "Minimal tikish: 2 000 UZS (Olma o'yinida aniq ko'rsatilgan, boshqa o'yinlarda ham shunga o'xshash chegara bo'lishi mumkin).",
  "Yutuq to'lovi tikilgan pulni ham o'z ichiga oladi: sof foyda = to'lov - tikish.",
  "Spin: har 24 soatda 1 ta bepul aylantirish bor; bepul raundda balansdan pul yechilmaydi.",
  "Admin har bir o'yin uchun alohida sozlamalar qo'yishi mumkin: yutish foizi (winChance), pul qaytarish foizi (refundChance), qiyinlik darajasi, koeffitsiyent multiplikatori va maksimal yutuq (maxWin).",
  "maxWin chegarasi faqat admin tomonidan o'sha o'yin uchun belgilangan bo'lsa va o'yin kodi uni qo'llasa ishlaydi.",
  "Natijalar tasodifiy — hech kim keyingi natijani oldindan bila olmaydi yoki kafolatli yutuq va'da qila olmaydi.",
  "LIVE (odam vs odam) o'yinlari: g'olib bankning 92%ini oladi, durangda pul qaytariladi (klassik preset).",
];

const RULES_INSTRUCTIONS = `Siz "1X GAME CASINO" Telegram botining qoidalar yordamchisisiz. O'yinchilarning savollariga FAQAT quyida berilgan qoidalar ma'lumotlariga tayanib, o'zbek tilida, oddiy va tushunarli javob bering.

QATTIQ QOIDALAR:
- Faqat berilgan ma'lumotlarga tayanib javob bering. Ma'lumotda yo'q narsani o'ylab topmang.
- Agar savol qoidalar haqida bo'lmasa yoki ma'lumot yetarli bo'lmasa, buni ochiq ayting va "Admin yordami" tugmasini tavsiya qiling.
- Hech qachon yutuqni kafolatlamang, keyingi natijani bashorat qilmang, "strategiya" yoki "yutish usuli" bermang.
- HTML yoki Markdown teglarini ishlatmang — faqat oddiy matn.
- Javob ${MAX_ANSWER} belgidan oshmasin.
- Sozlamalar (yutish foizi, maxWin va h.k.) admin tomonidan o'zgarishi mumkinligini eslatib o'ting.`;

type SettingsLine = {
  game: string;
  enabled: boolean;
  winChance: number;
  refundChance: number;
  difficulty: string;
  multiplier: number;
  maxWin: number | null;
};

async function loadSettings(): Promise<SettingsLine[]> {
  try {
    const rows = await db.select().from(gameSettingsTable);
    const map = new Map(rows.map((r) => [r.game, r]));
    return GAME_RULES_DATA.map((g) => {
      const r = map.get(g.key);
      return {
        game: g.key,
        // Jadvalda yozuv bo'lmasa sxema standartlari amal qiladi
        enabled: r?.enabled ?? true,
        winChance: r?.winChance ?? 40,
        refundChance: r?.refundChance ?? 6,
        difficulty: r?.difficulty ?? "o'rta",
        multiplier: r?.multiplier ?? 100,
        maxWin: r?.maxWin ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function buildRulesContext(): Promise<string> {
  const [settings, live] = await Promise.all([loadSettings(), getLiveSettings().catch(() => null)]);
  const parts: string[] = [];
  parts.push("=== UMUMIY QOIDALAR ===\n" + GENERAL_RULES.map((r) => `- ${r}`).join("\n"));
  parts.push(
    "=== O'YINLAR QOIDALARI ===\n" +
      GAME_RULES_DATA.map(
        (g) => `• ${g.label} (${g.key}):\n` + g.rules.map((r) => `  - ${r}`).join("\n"),
      ).join("\n"),
  );
  if (GAMES_WITHOUT_RULES.length) {
    parts.push(
      "=== BATAFSIL QOIDA MATNI HALI KIRITILMAGAN O'YINLAR (faqat nomi ma'lum, ular haqida taxmin qilmang) ===\n" +
        GAMES_WITHOUT_RULES.map((g) => `- ${g.label}`).join("\n"),
    );
  }
  if (settings.length) {
    parts.push(
      "=== JORIY SOZLAMALAR (admin o'zgartirishi mumkin) ===\n" +
        settings
          .map(
            (s) =>
              `- ${s.game}: ${s.enabled ? "yoqilgan" : "O'CHIQ"}, yutish foizi ~${s.winChance}%, qaytarish ${s.refundChance}%, qiyinlik: ${s.difficulty}, koeff x${(s.multiplier / 100).toFixed(2)}${s.maxWin != null ? `, maxWin: ${s.maxWin} UZS` : ""}`,
          )
          .join("\n"),
    );
  }
  if (live) {
    parts.push(
      "=== LIVE (ODAM vs ODAM) QOIDALARI ===\n" +
        `Hozirgi: ${live.rules}\nPresetlar:\n` +
        RULE_PRESETS.map((p) => `- ${p.label}: ${p.text}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}

type SseResult = { text: string };

async function callGateway(context: string, question: string, signal?: AbortSignal): Promise<SseResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new RulesAiError("LOVABLE_API_KEY sozlanmagan", "config");

  const body = {
    model: MODEL,
    store: false,
    stream: true,
    reasoning: { effort: "low", summary: "auto" },
    include: ["reasoning.encrypted_content"],
    instructions: RULES_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: `${context}\n\n=== O'YINCHI SAVOLI ===\n${question}` }],
      },
    ],
  };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: { message?: string }; message?: string };
      msg = j.error?.message ?? j.message ?? msg;
    } catch {}
    if (res.status === 401) throw new RulesAiError("AI kaliti noto'g'ri yoki sozlanmagan", "config");
    if (res.status === 402) {
      await setBlocked(`402: ${msg}`);
      throw new RulesAiError(msg, "credits");
    }
    if (res.status === 403) {
      await setBlocked(`403: ${msg}`);
      throw new RulesAiError(msg, "denied");
    }
    if (res.status === 429) throw new RulesAiError(msg, "rate");
    if (res.status >= 500) throw new RulesAiError(msg, "transient");
    throw new RulesAiError(msg, "terminal");
  }

  // SSE oqimini o'qib, matn deltalarini yig'amiz
  const reader = res.body?.getReader();
  if (!reader) throw new RulesAiError("Bo'sh javob", "terminal");
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            error?: { message?: string };
          };
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
          if (ev.type === "response.failed") throw new RulesAiError(ev.error?.message ?? "Model xatosi", "terminal");
        } catch (e) {
          if (e instanceof RulesAiError) throw e;
          // yarim freym — keyingi o'qishda davom etadi
        }
      }
    }
  }
  return { text: text.trim() };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Savolga javob — 429/5xx da bitta cheklangan qayta urinish bilan */
export async function answerRulesQuestion(question: string, signal?: AbortSignal): Promise<string> {
  const blocked = await getRulesAiBlock();
  if (blocked) {
    throw new RulesAiError(
      "AI yordamchi vaqtincha to'xtatilgan. Iltimos, keyinroq urinib ko'ring yoki admin bilan bog'laning.",
      "credits",
    );
  }
  const context = await buildRulesContext();
  try {
    const { text } = await callGateway(context, question, signal);
    if (!text) throw new RulesAiError("Model javob qaytarmadi", "terminal");
    return text;
  } catch (e) {
    if (e instanceof RulesAiError && (e.kind === "rate" || e.kind === "transient")) {
      await sleep(e.kind === "rate" ? 5_000 : 2_000);
      const { text } = await callGateway(context, question, signal);
      if (!text) throw new RulesAiError("Model javob qaytarmadi", "terminal");
      return text;
    }
    throw e;
  }
}

/** Telegram 4096 belgi chegarasi uchun xavfsiz bo'laklash */
export function splitAnswer(text: string, limit = 3500): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < limit / 2) cut = rest.lastIndexOf(" ", limit);
    if (cut < limit / 2) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}
