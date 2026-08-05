import TelegramBot from "node-telegram-bot-api";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { db, playersTable, transactionsTable, depositRequestsTable, withdrawRequestsTable, promoCodesTable, promoUsesTable, gameSettingsTable, appSettingsTable } from "@workspace/db";
import { logger } from "./lib/logger";
import { ALL_GAMES, GAME_LABELS, DIFFICULTIES, DIFFICULTY_WIN_SUGGEST, nextDifficulty, type Difficulty } from "./lib/games-catalog";
import {
  canSync, isAdminSync, getRoleSync, permForCallback, addAdmin, removeAdmin,
  listAdmins, isRole, ROLE_LABEL, startAdminCacheRefresh, type AdminRole,
} from "./lib/admins";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
// Majburiy obuna kanali
const CHANNEL_USERNAME = "soqqa_channel_org";
const CHANNEL_INVITE = `https://t.me/${CHANNEL_USERNAME}`;
const CHANNEL_ID = process.env.CHANNEL_ID || `@${CHANNEL_USERNAME}`;
const ADMIN_ID = Number(process.env.ADMIN_TELEGRAM_ID || process.env.ADMIN_ID || "8787603995");
const ADMIN_IDS = new Set(
  [process.env.ADMIN_TELEGRAM_ID, process.env.ADMIN_ID, "8787603995"]
    .map(v => Number(v || 0))
    .filter(v => Number.isFinite(v) && v > 0)
);
// Dynamic admins added at runtime via /addadmin command
const DYNAMIC_ADMIN_IDS = new Set<number>();
const CARD_NUMBER = process.env.CARD_NUMBER || process.env.PAYMENT_CARD || "5614680577167758";
const CARD_HOLDER = process.env.CARD_HOLDER || process.env.PAYMENT_NAME || "Alimardonov Umidjon";
const DOMAINS = process.env.REPLIT_DOMAINS || "";
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "";
const RAILWAY_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL || "";
// Hardcoded Railway URL as final fallback so webhook always works
const RAILWAY_FALLBACK = "https://tg-game-bot-production-f44e.up.railway.app";
const APP_URL =
  process.env.APP_URL ||
  RENDER_URL ||
  (RAILWAY_DOMAIN ? `https://${RAILWAY_DOMAIN}` : "") ||
  (DOMAINS ? `https://${DOMAINS.split(",")[0]}` : "") ||
  RAILWAY_FALLBACK;
const BONUS_PERCENT = 20;
const MIN_WITHDRAW_AMOUNT = 20000;
const MIN_DEPOSIT_AMOUNT = 25000;
const DEFAULT_REFERRAL_BONUS = 1000;

/** Referal bonusi — admin panelidan o'zgartiriladi (app_settings.referral_bonus) */
async function getReferralBonus(): Promise<number> {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "referral_bonus"));
    const n = Number(row?.value ?? DEFAULT_REFERRAL_BONUS);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_REFERRAL_BONUS;
  } catch { return DEFAULT_REFERRAL_BONUS; }
}

let cachedBotUsername: string | null = null;
export async function getBotUsername(): Promise<string> {
  if (cachedBotUsername) return cachedBotUsername;
  try {
    const me = await bot!.getMe();
    cachedBotUsername = me.username ?? "";
    return cachedBotUsername;
  } catch { return ""; }
}

export async function getReferralBonusPublic() { return getReferralBonus(); }

export const REFERRAL_GOAL = 5;

/** 5 ta referal to'lganda — adminlarga avtomatik so'rov (promokod berish uchun) */
export async function notifyAdminsReferralGoal(referrerId: string) {
  if (!bot) return;
  try {
    const key = `ref_goal_notified_${referrerId}`;
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, referrerId));
    const count = p?.referralCount ?? 0;
    const reached = Math.floor(count / REFERRAL_GOAL);
    if (reached < 1) return;
    if (Number(row?.value ?? 0) >= reached) return;
    await db.insert(appSettingsTable).values({ key, value: String(reached) })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: String(reached), updatedAt: new Date() } });

    await notifyPromoAdminsText(
      `\u{1F3AB} <b>REFERAL SOVRINI SO'ROVI</b>\n\n` +
      `\u{1F464} ${p?.firstName ?? "Foydalanuvchi"} (@${p?.username ?? "\u2014"})\n` +
      `\u{1F194} <code>${referrerId}</code>\n` +
      `\u{1F91D} Taklif qilganlar: <b>${count} ta</b>\n\n` +
      `Ushbu foydalanuvchi <b>${REFERRAL_GOAL} ta do'st</b> taklif qildi \u2014 unga <b>promokod</b> berish kerak.`,
      [
        [{ text: "\u{1F3AB} Shaxsiy promokod berish", callback_data: `admin_promo_ref_${referrerId}` }],
        [{ text: "\u2709\uFE0F Foydalanuvchiga yozish", callback_data: `refmsg_${referrerId}` }],
      ]
    );
    try {
      await bot.sendMessage(Number(referrerId),
        `\u{1F389} <b>Tabriklaymiz!</b>\n\nSiz <b>${REFERRAL_GOAL} ta do'st</b> taklif qildingiz!\n\u{1F3AB} So'rovingiz adminga yuborildi \u2014 tez orada <b>promokod</b> olasiz.`,
        { parse_mode: "HTML" });
    } catch {}
  } catch (err) {
    logger.error({ err }, "notifyAdminsReferralGoal xato");
  }
}

let bot: TelegramBot | null = null;
let processGuardsInstalled = false;

function isAdminId(id?: number) {
  return !!id && (ADMIN_IDS.has(id) || DYNAMIC_ADMIN_IDS.has(id) || isAdminSync(id));
}

/** Adminlar uchun cheksiz balans (API route'lar shu qiymatni ushlab turadi) */
export const ADMIN_INFINITE_BALANCE = 1_000_000_000;

/** Telegram ID admin (bosh yoki qo'shilgan) bo'lsa true — cheksiz balans uchun */
export function isAdminTelegramId(telegramId: string | number): boolean {
  const id = Number(telegramId);
  return isAdminId(Number.isFinite(id) ? id : undefined);
}

/** Muayyan ruxsat bormi? (bosh admin — hammasi) */
function hasPerm(id: number | undefined, perm: Parameters<typeof canSync>[1]) {
  if (!id) return false;
  if (ADMIN_IDS.has(id)) return true;
  return canSync(id, perm);
}

function isBlockedByUserError(err: any) {
  const description = String(err?.response?.body?.description || err?.message || "");
  return err?.code === 403 || description.includes("bot was blocked by the user");
}

function installProcessGuards() {
  if (processGuardsInstalled) return;
  processGuardsInstalled = true;
  process.on("unhandledRejection", (err) => {
    if (isBlockedByUserError(err)) {
      logger.warn({ err }, "Telegram user blocked bot; ignored");
      return;
    }
    logger.error({ err }, "Unhandled promise rejection");
  });
}

function patchBotRequest(b: TelegramBot) {
  (b as any)._request = async function(path: string, options: any = {}) {
    const token = TOKEN;
    const url = `https://api.telegram.org/bot${token}/${path}`;
    const form = options?.form || options?.qs || options?.formData || {};
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data: any = await resp.json();
    if (!data.ok) {
      const err: any = new Error(data.description || `Telegram API error: ${path}`);
      err.code = data.error_code;
      err.response = { body: data };
      throw err;
    }
    return data.result;
  };

  // Rasmli (photo) menyularda editMessageText ishlamaydi — avtomatik editMessageCaption ga o'tamiz
  const origEditText = b.editMessageText.bind(b);
  (b as any).editMessageText = async (text: string, opts: any = {}) => {
    try {
      return await origEditText(text as any, opts);
    } catch (err: any) {
      const d = String(err?.message ?? "");
      if (!/no text in the message|MESSAGE_CAPTION|caption/i.test(d)) throw err;
      if (String(text).length <= 1000) {
        return await b.editMessageCaption(text, opts);
      }
      try { await b.deleteMessage(opts.chat_id, opts.message_id); } catch {}
      return await b.sendMessage(opts.chat_id, text, {
        parse_mode: opts.parse_mode, reply_markup: opts.reply_markup,
      } as any);
    }
  };
}
type TextHandler = { re: RegExp; fn: (msg: any, match: RegExpExecArray | null) => Promise<void> };
const _textHandlers: TextHandler[] = [];
let _cbHandler: ((q: any) => Promise<void>) | null = null;
let _msgHandler: ((msg: any) => Promise<void>) | null = null;
const waitingForCheck = new Map<number, number>();             // userId -> depositRequestId
const waitingForAmount = new Set<number>();                    // userId waiting to type deposit amount
const waitingForWithdrawAmount = new Set<number>();            // userId waiting to type withdraw amount
const pendingWithdraw = new Map<number, { amount: number }>(); // userId -> withdraw info
const waitingForHelp = new Set<number>();                      // userId waiting to type help question
const adminReplyTarget = new Map<number, number>();            // adminId -> targetUserId (for admin replies)

// ===== JONLI SUHBAT (admin <-> foydalanuvchi) =====
type LiveChatReq = { userId: number; name: string; username: string; at: number };
const liveChatQueue = new Map<number, LiveChatReq>();          // userId -> so'rov
const liveChatUserToAdmin = new Map<number, number>();         // userId -> adminId
const liveChatAdminToUser = new Map<number, number>();         // adminId -> userId
const liveChatNotified = new Map<number, number[]>();          // userId -> [adminId] xabar yuborilganlar

// Har bir foydalanuvchi uchun ALOHIDA suhbat tarixi (Mini App ichidagi chat oynasi uchun)
export type LiveChatMsg = { id: number; from: "user" | "admin" | "system"; text: string; at: number };
const liveChatLog = new Map<number, LiveChatMsg[]>();          // userId -> xabarlar
const liveChatCleared = new Map<number, number>();             // userId -> oxirgi tozalash tokeni
let liveChatSeq = 1;

function pushLiveChatMsg(userId: number, from: LiveChatMsg["from"], text: string) {
  if (!Number.isFinite(userId) || userId <= 0) return;
  const arr = liveChatLog.get(userId) ?? [];
  arr.push({ id: liveChatSeq++, from, text, at: Date.now() });
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  liveChatLog.set(userId, arr);
}

function escHtml(t: string) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function allAdminIds(): Promise<number[]> {
  const ids = new Set<number>([...ADMIN_IDS, ...DYNAMIC_ADMIN_IDS]);
  try {
    for (const r of await listAdmins()) if (r.active) ids.add(Number(r.telegramId));
  } catch {}
  return [...ids].filter((v) => Number.isFinite(v) && v > 0);
}

const LIVE_CHAT_END_KB = { inline_keyboard: [[{ text: "🔚 Suhbatni tugatish", callback_data: "lc_end" }]] };

function inLiveChat(id: number) {
  return liveChatUserToAdmin.has(id) || liveChatAdminToUser.has(id);
}

async function endLiveChat(id: number, byWho: "user" | "admin" | "system" = "system") {
  const isAdminSide = liveChatAdminToUser.has(id);
  const adminId = isAdminSide ? id : liveChatUserToAdmin.get(id);
  const userId = isAdminSide ? liveChatAdminToUser.get(id) : id;
  if (adminId) liveChatAdminToUser.delete(adminId);
  if (userId) { liveChatUserToAdmin.delete(userId); liveChatQueue.delete(userId); liveChatNotified.delete(userId); }
  // Suhbat yakunlangach yozishmalar saqlanmaydi — butunlay o'chiriladi
  if (userId) { liveChatLog.delete(userId); liveChatCleared.set(userId, Date.now()); }
  const note = byWho === "admin" ? "Admin suhbatni yakunladi." : byWho === "user" ? "Foydalanuvchi suhbatni yakunladi." : "Suhbat yakunlandi.";
  for (const target of [adminId, userId]) {
    if (!target) continue;
    try {
      await bot!.sendMessage(target, `🔚 <b>Jonli suhbat tugadi</b>\n\n${note}`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }]] },
      });
    } catch {}
  }
}

/** Foydalanuvchi jonli suhbat so'rovi yuboradi — barcha adminlarga bildirishnoma boradi */
async function requestLiveChat(userId: number, name: string, username: string) {
  liveChatQueue.set(userId, { userId, name, username, at: Date.now() });
  const admins = await allAdminIds();
  const notified: number[] = [];
  for (const adminId of admins) {
    try {
      const sent = await bot!.sendMessage(adminId,
        `💬 <b>JONLI SUHBAT SO'ROVI</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 <b>${escHtml(name)}</b> ${username ? `(${escHtml(username)})` : ""}\n` +
        `🆔 <code>${userId}</code>\n\n` +
        `⚡️ Foydalanuvchi siz bilan bevosita suhbatlashmoqchi.\n` +
        `Qabul qilsangiz — xabarlar bot ichida to'g'ridan-to'g'ri yetkaziladi.`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
          { text: "✅ Chatga kirish", callback_data: `lc_accept_${userId}` },
          { text: "❌ Rad etish", callback_data: `lc_reject_${userId}` },
        ]]}}
      );
      notified.push(adminId);
      void sent;
    } catch {}
  }
  liveChatNotified.set(userId, notified);
  return notified.length;
}

/** Jonli suhbatda ovozli xabar / media / stikerlarni peer'ga uzatish */
async function relayLiveChatMedia(msg: any): Promise<boolean> {
  const id = msg.from.id;
  const isAdminSide = liveChatAdminToUser.has(id);
  const peerId = isAdminSide ? liveChatAdminToUser.get(id)! : liveChatUserToAdmin.get(id)!;
  if (!peerId) return false;
  const who = isAdminSide ? "\u{1F468}\u200D\u{1F4BC} Admin" : "\u{1F464} Foydalanuvchi";
  try {
    if (msg.voice) {
      await bot!.sendVoice(peerId, msg.voice.file_id, { caption: `${who} \u{1F3A4} ovozli xabar`, reply_markup: LIVE_CHAT_END_KB });
    } else if (msg.video_note) {
      await bot!.sendVideoNote(peerId, msg.video_note.file_id, { reply_markup: LIVE_CHAT_END_KB } as any);
    } else if (msg.audio) {
      await bot!.sendAudio(peerId, msg.audio.file_id, { caption: who, reply_markup: LIVE_CHAT_END_KB });
    } else if (msg.photo) {
      const fid = msg.photo[msg.photo.length - 1].file_id;
      await bot!.sendPhoto(peerId, fid, { caption: msg.caption ? `${who}\n${escHtml(msg.caption)}` : who, parse_mode: "HTML", reply_markup: LIVE_CHAT_END_KB });
    } else if (msg.video) {
      await bot!.sendVideo(peerId, msg.video.file_id, { caption: who, reply_markup: LIVE_CHAT_END_KB });
    } else if (msg.document) {
      await bot!.sendDocument(peerId, msg.document.file_id, { caption: who, reply_markup: LIVE_CHAT_END_KB });
    } else if (msg.sticker) {
      await bot!.sendSticker(peerId, msg.sticker.file_id);
    } else {
      return false;
    }
    pushLiveChatMsg(isAdminSide ? peerId : id, isAdminSide ? "admin" : "user",
      msg.voice ? "\u{1F3A4} Ovozli xabar" : msg.photo ? "\u{1F5BC} Rasm" : msg.video || msg.video_note ? "\u{1F3A5} Video" : msg.sticker ? "\u{1F60A} Stiker" : "\u{1F4CE} Fayl");
    try { await bot!.sendMessage(msg.chat.id, "\u2705", { parse_mode: "HTML" }); } catch {}
    return true;
  } catch {
    try { await bot!.sendMessage(msg.chat.id, "\u274C Yuborilmadi."); } catch {}
    return true;
  }
}

/** Mini App ichidan jonli suhbat so'rovi */
export async function requestLiveChatFromApp(opts: { telegramId: string; name?: string; username?: string }) {
  const uid = Number(opts.telegramId);
  if (!Number.isFinite(uid) || uid <= 0) return { ok: false, error: "Noto'g'ri foydalanuvchi" };
  if (!bot) return { ok: false, error: "Bot ishga tushmagan" };
  if (inLiveChat(uid)) return { ok: true, status: "active" as const, admins: 0 };
  const name = opts.name || "O'yinchi";
  const username = opts.username ? (opts.username.startsWith("@") ? opts.username : "@" + opts.username) : "";
  try {
    await bot.sendMessage(uid,
      "\u{1F4AC} <b>Jonli suhbat so'rovi yuborildi</b>\n\nAdmin tasdiqlashi bilan shu yerda \u2014 bot ichidagi chatda \u2014 yozishma boshlanadi. Ovozli xabar ham yuborsangiz bo'ladi.",
      { parse_mode: "HTML" });
  } catch {}
  const cnt = await requestLiveChat(uid, name, username);
  return { ok: cnt > 0, status: "pending" as const, admins: cnt, error: cnt > 0 ? undefined : "Hozir admin mavjud emas" };
}

/** Mini App uchun suhbat holati */
export function getLiveChatStatus(telegramId: string) {
  const uid = Number(telegramId);
  if (liveChatUserToAdmin.has(uid)) return { status: "active" as const };
  if (liveChatQueue.has(uid)) return { status: "pending" as const };
  return { status: "idle" as const };
}

/** Mini App: shu foydalanuvchining suhbat tarixi (faqat o'zi va admin) */
export function getLiveChatMessages(telegramId: string, since = 0) {
  const uid = Number(telegramId);
  const all = liveChatLog.get(uid) ?? [];
  return { messages: all.filter((m) => m.id > since), clearToken: liveChatCleared.get(uid) ?? 0 };
}

/** Mini App ichidan xabar yuborish — adminga yetkaziladi */
export async function sendLiveChatMessageFromApp(opts: { telegramId: string; text: string }) {
  const uid = Number(opts.telegramId);
  const text = String(opts.text ?? "").trim().slice(0, 2000);
  if (!Number.isFinite(uid) || uid <= 0) return { ok: false, error: "Noto'g'ri foydalanuvchi" };
  if (!text) return { ok: false, error: "Xabar bo'sh" };
  if (!bot) return { ok: false, error: "Bot ishga tushmagan" };
  const adminId = liveChatUserToAdmin.get(uid);
  if (!adminId) return { ok: false, error: "Suhbat hali faol emas" };
  try {
    await bot.sendMessage(adminId,
      `\u{1F464} <b>Foydalanuvchi</b> (<code>${uid}</code>)\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n${escHtml(text)}`,
      { parse_mode: "HTML", reply_markup: LIVE_CHAT_END_KB });
  } catch {
    return { ok: false, error: "Adminga yetkazilmadi" };
  }
  pushLiveChatMsg(uid, "user", text);
  return { ok: true };
}
/** Mini App ichidan ovozli xabar (base64 audio) yuborish */
export async function sendLiveChatVoiceFromApp(opts: { telegramId: string; audioBase64: string; mime?: string; seconds?: number }) {
  const uid = Number(opts.telegramId);
  if (!Number.isFinite(uid) || uid <= 0) return { ok: false, error: "Noto'g'ri foydalanuvchi" };
  if (!bot) return { ok: false, error: "Bot ishga tushmagan" };

  // Kimlarga yuboramiz: suhbatdagi admin, bo'lmasa barcha adminlar
  let targets: number[] = [];
  const paired = liveChatUserToAdmin.get(uid);
  if (paired) targets = [paired];
  else {
    try { targets = await financeAdminIds(); } catch { targets = []; }
    if (!targets.length) return { ok: false, error: "Hozir admin mavjud emas" };
    try { await requestLiveChat(uid, "O'yinchi", ""); } catch {}
  }

  const raw = String(opts.audioBase64 || "").replace(/^data:[^,]+,/, "");
  if (!raw) return { ok: false, error: "Ovoz bo'sh" };
  let buf: Buffer;
  try { buf = Buffer.from(raw, "base64"); } catch { return { ok: false, error: "Ovoz o'qilmadi" }; }
  if (!buf.length || buf.length > 12 * 1024 * 1024) return { ok: false, error: "Ovoz hajmi mos emas" };

  const secs = Math.max(1, Math.round(opts.seconds || 0));
  const mime = (opts.mime || "audio/webm").toLowerCase();
  const isOgg = mime.includes("ogg") || mime.includes("opus");
  const caption = `\u{1F464} Foydalanuvchi (${uid}) \u{1F3A4} ovozli xabar \u00B7 ${secs}s`;

  let delivered = 0;
  let lastErr = "";
  for (const adminId of targets) {
    // 1) voice, 2) audio, 3) document — biri ishlashi shart
    const attempts: Array<() => Promise<any>> = isOgg
      ? [
          () => bot!.sendVoice(adminId, buf, { caption, reply_markup: LIVE_CHAT_END_KB }, { filename: "voice.ogg", contentType: "audio/ogg" }),
          () => bot!.sendAudio(adminId, buf, { caption, reply_markup: LIVE_CHAT_END_KB }, { filename: "voice.ogg", contentType: "audio/ogg" }),
          () => bot!.sendDocument(adminId, buf, { caption, reply_markup: LIVE_CHAT_END_KB }, { filename: "voice.ogg", contentType: "audio/ogg" }),
        ]
      : [
          () => bot!.sendAudio(adminId, buf, { caption, reply_markup: LIVE_CHAT_END_KB }, { filename: "voice.webm", contentType: mime || "audio/webm" }),
          () => bot!.sendVoice(adminId, buf, { caption, reply_markup: LIVE_CHAT_END_KB }, { filename: "voice.ogg", contentType: "audio/ogg" }),
          () => bot!.sendDocument(adminId, buf, { caption, reply_markup: LIVE_CHAT_END_KB }, { filename: "voice.webm", contentType: mime || "audio/webm" }),
        ];
    let sent = false;
    for (const run of attempts) {
      try { await run(); sent = true; break; }
      catch (e: any) { lastErr = e?.response?.body?.description || e?.message || String(e); }
    }
    if (sent) delivered++;
  }

  if (!delivered) {
    console.error("[live-chat voice] yuborilmadi:", lastErr);
    return { ok: false, error: `Adminga yetkazilmadi: ${lastErr || "noma'lum xato"}` };
  }

  pushLiveChatMsg(uid, "user", `\u{1F3A4} Ovozli xabar (${secs}s)`);
  return { ok: true, delivered };
}
const waitingForRefPrice = new Set<number>();                  // admin waiting to type new referral bonus
const waitingForBroadcast = new Set<number>();                  // adminId waiting to type broadcast message
const waitingForSendId = new Set<number>();                    // admin waiting to type target userId
const waitingForSendMsg = new Map<number, string>();           // admin -> targetId (waiting for message text)
const waitingForAddbalId = new Set<number>();                  // admin waiting to type userId for balance
const waitingForAddbalAmount = new Map<number, string>();      // admin -> targetId (waiting for amount)
const waitingForBanId = new Set<number>();                     // admin waiting to type userId for ban/unban
const waitingForPromoCode = new Set<number>();
const waitingForPromoPersonalId = new Set<number>();          // admin waiting to type target id for personal promo
const waitingForPromoTarget = new Map<number, string>();      // admin -> shaxsiy promokod egasining telegram_id                 // admin waiting to type promo code name
const waitingForPromoAmount = new Map<number, string>();       // admin -> code (waiting for amount)
const waitingForPromoMaxUses = new Map<number, { code: string; amount: number }>(); // admin -> {code,amount}
const waitingForNewAdminId = new Set<number>();                  // owner waiting to type new admin telegram id
const waitingForMaxWin = new Map<number, string>();              // admin -> game key (waiting for max win amount)

/** Moliya bilan shug'ullanadigan barcha adminlar (owner + finance) */
const MAX_EXTRA_ADMINS = 2;
async function financeAdminIds(): Promise<number[]> {
  const ids = new Set<number>([...ADMIN_IDS]);
  try {
    const rows = await listAdmins();
    for (const r of rows) {
      if (!r.active) continue;
      if (r.role === "finance" || r.role === "owner") {
        const n = Number(r.telegramId);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      }
    }
  } catch (err) {
    logger.error({ err }, "financeAdminIds xato");
  }
  return [...ids];
}

async function notifyFinanceText(text: string, kb?: any[][]) {
  const ids = await financeAdminIds();
  for (const id of ids) {
    try {
      await bot!.sendMessage(id, text, { parse_mode: "HTML", ...(kb ? { reply_markup: { inline_keyboard: kb } } : {}) });
    } catch (err) {
      logger.error({ err, adminId: id }, "Moliya adminiga xabar yuborilmadi");
    }
  }
}

async function notifyFinancePhoto(fileId: string, caption: string, kb?: any[][]) {
  const ids = await financeAdminIds();
  for (const id of ids) {
    try {
      await bot!.sendPhoto(id, fileId, { caption, parse_mode: "HTML", ...(kb ? { reply_markup: { inline_keyboard: kb } } : {}) });
    } catch (err) {
      logger.error({ err, adminId: id }, "Moliya adminiga rasm yuborilmadi");
    }
  }
}

export async function notifyAdminWithdraw(opts: {
  reqId: number; telegramId: string; firstName: string; username: string | null;
  amount: number; cardNumber: string; cardHolder: string;
}) {
  if (!bot) return;
  try {
    await notifyFinanceText(
      `💸 <b>PUL YECHISH SO'ROVI (WEB)</b>\n\n` +
      `👤 ${opts.firstName} (@${opts.username ?? "—"})\n` +
      `🆔 <code>${opts.telegramId}</code>\n` +
      `💵 Miqdor: <b>${fmt(opts.amount)} UZS</b>\n` +
      `💳 Karta: <code>${opts.cardNumber}</code>\n` +
      `👤 Egasi: ${opts.cardHolder}`,
      [[
        { text: "✅ To'landi", callback_data: `wd_ok_${opts.reqId}` },
        { text: "❌ Rad", callback_data: `wd_no_${opts.reqId}` },
      ]]
    );
  } catch (err) {
    logger.error({ err }, "notifyAdminWithdraw xato");
  }
}

function fmt(n: number) { return n.toLocaleString("uz-UZ"); }

/** Promokod bera oladigan adminlar (bosh admin / owner) */
async function promoAdminIds(): Promise<number[]> {
  const ids = new Set<number>([...ADMIN_IDS]);
  try {
    const rows = await listAdmins();
    for (const r of rows) {
      if (!r.active) continue;
      if (r.role === "owner") {
        const n = Number(r.telegramId);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      }
    }
  } catch (err) {
    logger.error({ err }, "promoAdminIds xato");
  }
  return [...ids];
}

async function notifyPromoAdminsText(text: string, kb?: any[][]) {
  const ids = await promoAdminIds();
  for (const id of ids) {
    try {
      await bot!.sendMessage(id, text, { parse_mode: "HTML", ...(kb ? { reply_markup: { inline_keyboard: kb } } : {}) });
    } catch (err) {
      logger.error({ err, adminId: id }, "Bosh adminga xabar yuborilmadi");
    }
  }
}

/** Promokodni yaratish (shaxsiy yoki ommaviy) va tegishli foydalanuvchilarga yuborish */
async function createAndAnnouncePromo(opts: {
  adminChatId: number;
  adminId: number;
  code: string;
  amount: number;
  maxUses: number;
  assignedTo?: string | null;
  note?: string | null;
}) {
  const { adminChatId, adminId, code, amount } = opts;
  const assignedTo = opts.assignedTo ? String(opts.assignedTo) : null;
  const maxUses = assignedTo ? 1 : opts.maxUses;

  await db.insert(promoCodesTable).values({
    code, amount, maxUses,
    assignedTo,
    createdBy: String(adminId),
    note: opts.note ?? null,
  });

  const backKb = { inline_keyboard: [
    [{ text: "🎫 Promo Kodlar", callback_data: "admin_promo" }],
    [{ text: "🔙 Admin panel", callback_data: "admin_panel" }],
  ]};

  if (assignedTo) {
    // Shaxsiy promokod — faqat egasiga yuboriladi
    let ok = true;
    try {
      await bot!.sendMessage(Number(assignedTo),
        `🎁 <b>SIZGA SHAXSIY PROMOKOD!</b>\n\n` +
        `🎫 Kod: <code>${code}</code>\n` +
        `💰 Sovrin: <b>${fmt(amount)} UZS</b>\n` +
        (opts.note ? `📝 ${opts.note}\n` : "") +
        `\n🔒 Bu kod <b>faqat siz</b> uchun — boshqa hech kim ishlatolmaydi.\n` +
        `⚡️ O'yin ichidagi "Promo" bo'limiga kiriting.`,
        { parse_mode: "HTML" });
    } catch { ok = false; }
    await bot!.sendMessage(adminChatId,
      `✅ <b>Shaxsiy promokod yaratildi</b>\n\n🎫 <code>${code}</code>\n💰 ${fmt(amount)} UZS\n👤 Egasi: <code>${assignedTo}</code>\n` +
      (ok ? `📤 Foydalanuvchiga yuborildi.` : `⚠️ Foydalanuvchiga yuborilmadi (botni bloklagan bo'lishi mumkin).`),
      { parse_mode: "HTML", reply_markup: backKb });
    return;
  }

  await bot!.sendMessage(adminChatId,
    `✅ <b>Promo Kod Yaratildi!</b>\n\n🎫 Kod: <code>${code}</code>\n💰 Miqdor: <b>${fmt(amount)} UZS</b>\n📊 Limit: <b>${maxUses}</b> marta\n\n📢 Hamma foydalanuvchilarga yuborilmoqda...`,
    { parse_mode: "HTML" });

  const allPlayers = await db.select({ telegramId: playersTable.telegramId }).from(playersTable);
  const promoText =
    `🎉 <b>YANGI PROMO KOD!</b>\n\n` +
    `🎫 Kod: <code>${code}</code>\n` +
    `💰 Sovrin: <b>${fmt(amount)} UZS</b>\n` +
    `👥 Faqat dastlabki <b>${maxUses} ta</b> foydalanuvchiga!\n\n` +
    `⚡️ Ulgurib qoling — kodni o'yin ichida "Promo" bo'limidan kiriting!`;
  let sent = 0, failed = 0;
  for (const pl of allPlayers) {
    try { await bot!.sendMessage(Number(pl.telegramId), promoText, { parse_mode: "HTML" }); sent++; }
    catch { failed++; }
    await new Promise((r) => setTimeout(r, 35));
  }
  await bot!.sendMessage(adminChatId,
    `✅ <b>Yuborish tugadi!</b>\n\n📤 Yuborildi: <b>${sent}</b>\n❌ Yuborilmadi: <b>${failed}</b>`,
    { parse_mode: "HTML", reply_markup: backKb });
}

async function checkSub(userId: number): Promise<boolean> {
  if (!bot || !CHANNEL_ID) return true;
  try {
    const m = await bot.getChatMember(CHANNEL_ID, userId);
    return ["member","administrator","creator"].includes(m.status);
  } catch { return true; }
}

async function getOrCreatePlayer(tgUser: TelegramBot.User) {
  const [p] = await db.insert(playersTable)
    .values({
      telegramId: String(tgUser.id),
      username: tgUser.username ?? null,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name ?? null,
      balance: 0,
    })
    .onConflictDoUpdate({
      target: playersTable.telegramId,
      set: { username: tgUser.username ?? null, firstName: tgUser.first_name, updatedAt: new Date() },
    })
    .returning();
  return p;
}

const MENU_IMAGE = process.env.MENU_IMAGE_URL || (APP_URL ? `${APP_URL.replace(/\/$/, "")}/banner-main.jpg` : "");
const ADMIN_IMAGE = process.env.ADMIN_IMAGE_URL || (APP_URL ? `${APP_URL.replace(/\/$/, "")}/banner-admin.jpg` : "");

const DEPOSIT_URL = APP_URL.endsWith("/") ? `${APP_URL}deposit` : `${APP_URL}/deposit`;

// Track last main menu message ID per user so /start edits it instead of sending new
const userMenuMsgId = new Map<number, number>();

function mainMenuKeyboard(isAdmin: boolean): any[][] {
  const kb: any[][] = [
    [{ text: "🎰  O'YINNI BOSHLASH  🎰", web_app: { url: APP_URL } }],
    [{ text: "💰 Balansim", callback_data: "balance" }],
    [{ text: "💳 Hisob To'ldirish", callback_data: "deposit_menu" }, { text: "💸 Pul Yechish", callback_data: "withdraw_menu" }],
    [{ text: "🤝 Referal", callback_data: "referral_menu" }, { text: "🆘 Yordam", callback_data: "help_menu" }],
    [{ text: "💬  ADMIN BILAN JONLI SUHBAT  💬", callback_data: "live_chat" }],
  ];
  if (isAdmin) kb.push([{ text: "⚙️  ADMIN PANEL  ⚙️", callback_data: "admin_panel" }]);
  return kb;
}

function mainMenuText(name: string, balance: number): string {
  return (
    `🎰 <b>1X GAME CASINO</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>${name}</b>\n` +
    `💵 Balans: <b>${fmt(balance)} UZS</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎮 O'yin boshlash uchun tugmani bosing 👇`
  );
}

async function saveMenuMsgId(telegramId: string, msgId: number, chatId: number) {
  userMenuMsgId.set(chatId, msgId);
  try {
    await db.update(playersTable)
      .set({ lastMenuMsgId: msgId })
      .where(eq(playersTable.telegramId, telegramId));
  } catch {}
}

async function sendNewMenu(chatId: number, name: string, balance: number, isAdmin: boolean, telegramId?: string) {
  let sent: any;
  if (MENU_IMAGE) {
    try {
      sent = await bot!.sendPhoto(chatId, MENU_IMAGE, {
        caption: mainMenuText(name, balance),
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: mainMenuKeyboard(isAdmin) },
      } as any);
    } catch (err) {
      logger.warn({ err }, "Menyu rasmi yuborilmadi — matnli menyu");
    }
  }
  if (!sent) sent = await bot!.sendMessage(chatId, mainMenuText(name, balance),
    { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenuKeyboard(isAdmin) }}
  );
  if (telegramId) await saveMenuMsgId(telegramId, sent.message_id, chatId);
  else userMenuMsgId.set(chatId, sent.message_id);
}

async function mainMenu(chatId: number, name: string, balance: number, isAdmin = false, telegramId?: string, oldMsgId?: number) {
  // Delete old menu silently, then send fresh — always visible to user
  if (oldMsgId) {
    try { await bot!.deleteMessage(chatId, oldMsgId); } catch {}
  }
  await sendNewMenu(chatId, name, balance, isAdmin, telegramId);
}

async function editToMainMenu(chatId: number, msgId: number, name: string, balance: number, isAdmin = false, telegramId?: string) {
  try {
    await bot!.editMessageText(mainMenuText(name, balance), {
      chat_id: chatId, message_id: msgId,
      parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenuKeyboard(isAdmin) }
    });
    userMenuMsgId.set(chatId, msgId);
    if (telegramId) await saveMenuMsgId(telegramId, msgId, chatId);
    return;
  } catch (err: any) {
    const msg = err?.message ?? "";
    if (msg.includes("message is not modified")) {
      userMenuMsgId.set(chatId, msgId);
      return;
    }
  }
  // Edit failed — delete sub-menu then send fresh main menu
  try { await bot!.deleteMessage(chatId, msgId); } catch {}
  await sendNewMenu(chatId, name, balance, isAdmin, telegramId);
}

export async function notifyUserDepositCreated(telegramId: string, amount: number, bonus: number) {
  if (!bot) return;
  try {
    await bot.sendMessage(Number(telegramId),
      `✅ <b>Depozit so'rovi qabul qilindi!</b>\n\n` +
      `💵 Miqdor: <b>${fmt(amount)} UZS</b>\n` +
      `🎁 Bonus: <b>+${fmt(bonus)} UZS</b>\n` +
      `💰 Jami: <b>${fmt(amount + bonus)} UZS</b>\n\n` +
      `📸 <b>Endi to'lov cheki (screenshot) rasmini shu yerga yuboring.</b>\n` +
      `Admin tasdiqlashini kuting.`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    logger.error({ err }, "notifyUserDepositCreated xato");
  }
}

async function sendDepositCard(chatId: number, amount: number, userId: number) {
  const rows = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(userId)));
  if (!rows.length) return;
  const p = rows[0];
  const bonus = Math.floor(amount * BONUS_PERCENT / 100);
  const [req] = await db.insert(depositRequestsTable).values({
    playerId: p.id, telegramId: String(userId), amount, bonusAmount: bonus,
  }).returning();
  waitingForCheck.set(userId, req.id);

  await bot!.sendMessage(chatId,
    `💳 <b>To'lov Ma'lumotlari</b>\n\n` +
    `💵 To'lash miqdori: <b>${fmt(amount)} UZS</b>\n` +
    `🎁 Bonus: <b>+${fmt(bonus)} UZS</b>\n` +
    `💰 Hisobga tushadi: <b>${fmt(amount + bonus)} UZS</b>\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `💳 Karta: <code>${CARD_NUMBER}</code>\n` +
    `👤 ${CARD_HOLDER}\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `✅ Pul o'tkazganingizdan so'ng, <b>chek rasmini</b> shu yerga yuboring!`,
    { parse_mode: "HTML" }
  );
}

export function getBotStatus() {
  return {
    botExists: !!bot,
    textHandlers: _textHandlers.length,
    hasCbHandler: !!_cbHandler,
    hasMsgHandler: !!_msgHandler,
    appUrl: APP_URL,
  };
}

export async function handleWebhookUpdate(body: any) {
  if (!body) return;
  logger.info({ updateId: body.update_id, hasMsg: !!body.message, hasCb: !!body.callback_query, handlers: _textHandlers.length, hasCbH: !!_cbHandler, hasMsgH: !!_msgHandler }, "webhook update");

  if (body.message) {
    const msg = body.message;
    if (msg.photo && _msgHandler) {
      try { await _msgHandler(msg); } catch (e) { logger.error({ err: e }, "photo handler error"); }
      return;
    }
    if (msg.text) {
      for (const h of _textHandlers) {
        const m = h.re.exec(msg.text);
        if (m) {
          try {
            await h.fn(msg, m);
          } catch (e) {
            logger.error({ err: e }, "text handler error");
          }
          return;
        }
      }
      if (_msgHandler) {
        try { await _msgHandler(msg); } catch (e) { logger.error({ err: e }, "msg handler error"); }
      }
    }
  }
  if (body.callback_query && _cbHandler) {
    try { await _cbHandler(body.callback_query); } catch (e) { logger.error({ err: e }, "cb handler error"); }
  }
}


export async function startBot() {
  if (!TOKEN) { logger.warn("No BOT TOKEN"); return; }
  installProcessGuards();

  bot = new TelegramBot(TOKEN, { polling: false });
  patchBotRequest(bot);
  startAdminCacheRefresh();

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && APP_URL) {
    const webhookUrl = `${APP_URL}/api/bot-webhook`;
    try {
      await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl })
      });
    } catch (e) { logger.error({ err: e }, "setWebhook error"); }
    logger.info({ webhookUrl }, "Bot started (webhook mode)");
  } else {
    try { await bot.deleteWebHook(); } catch {}
    await bot.startPolling();
    logger.info("Bot started (polling mode — development)");
  }

  // Set bot commands (shows in command list when user types /)
  try {
    await bot.setMyCommands([
      { command: "start", description: "🎮 Botni ishga tushirish" },
      { command: "menu",  description: "📋 Asosiy menyu" },
      { command: "help",  description: "❓ Yordam" },
      { command: "cancel", description: "❌ Amalni bekor qilish" },
    ]);
  } catch {}

  // Set persistent menu button (bottom-left button in chat — opens mini app directly)
  if (APP_URL) {
    try {
      await fetch(`https://api.telegram.org/bot${TOKEN}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_button: { type: "web_app", text: "🎮 O'YIN", web_app: { url: APP_URL } }
        }),
      });
    } catch {}
  }

  function regText(re: RegExp, fn: (msg: any, match: RegExpExecArray | null) => Promise<void>) {
    _textHandlers.push({ re, fn });
    bot!.onText(re, fn);
  }

  // /start command (with referral support)
  regText(/\/start(.*)/, async (msg, match) => {
    try {
    const user = msg.from; if (!user) return;
    // Delete the user's "/start" command message so the chat stays clean
    try { await bot!.deleteMessage(msg.chat.id, msg.message_id); } catch {}
    const isNew = !(await db.select().from(playersTable).where(eq(playersTable.telegramId, String(user.id)))).length;
    const player = await getOrCreatePlayer(user);

    const param = (match?.[1] || "").trim();
    if (isNew && param.startsWith("ref_")) {
      const referrerId = param.replace("ref_", "");
      if (referrerId !== String(user.id)) {
        const [referrer] = await db.select().from(playersTable).where(eq(playersTable.telegramId, referrerId));
        if (referrer) {
          await db.update(playersTable).set({ referredBy: referrerId, updatedAt: new Date() }).where(eq(playersTable.telegramId, String(user.id)));
          const refBonus = await getReferralBonus();
          await db.update(playersTable).set({ balance: referrer.balance + refBonus, referralCount: referrer.referralCount + 1, updatedAt: new Date() }).where(eq(playersTable.telegramId, referrerId));
          try { await notifyAdminsReferralGoal(referrerId); } catch {}
          try {
            await bot!.sendMessage(Number(referrerId),
              `🎉 <b>Referal bonus!</b>\n\n👤 ${user.first_name} siz orqali ro'yxatdan o'tdi!\n💰 <b>+${fmt(refBonus)} UZS</b> balansingizga qo'shildi!`,
              { parse_mode: "HTML" }
            );
          } catch {}
        }
      }
    }

    const [freshPlayer] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(user.id)));
    if (!freshPlayer?.channelVerified) {
      await bot!.sendMessage(msg.chat.id,
        `🎮 <b>1X GAME Botga Xush Kelibsiz!</b>\n\n📢 O'yin o'ynash uchun avval bizning kanalga a'zo bo'ling:\n\n👇 Quyidagi tugmani bosib a'zo bo'ling, so'ng <b>✅ A'zo Bo'ldim</b> tugmasini bosing.`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: "📢 Kanalga A'zo Bo'lish", url: CHANNEL_INVITE }],
          [{ text: "✅ A'zo Bo'ldim", callback_data: "check_sub" }],
        ]}}
      );
      return;
    }
    const isAdminUser = isAdminId(user.id);
    const oldMsgId = freshPlayer.lastMenuMsgId ?? userMenuMsgId.get(msg.chat.id) ?? undefined;
    await mainMenu(msg.chat.id, user.first_name, freshPlayer.balance, isAdminUser, String(user.id), oldMsgId);
    } catch (err) { logger.error({ err, chatId: msg.chat.id }, "/start handler error"); }
  });

  // Admin panel helper
  async function sendAdminMenu(chatId: number, adminId?: number) {
    try {
      const uid = adminId ?? chatId;
      const role = ADMIN_IDS.has(uid) ? "owner" : getRoleSync(uid);
      if (!role) { await bot!.sendMessage(chatId, "❌ Sizda admin huquqi yo'q."); return; }
      const p = (perm: Parameters<typeof canSync>[1]) => hasPerm(uid, perm);

      const depRes = await db.execute(sql`SELECT count(*)::int as cnt FROM deposit_requests WHERE status='pending'`);
      const wdRes = await db.execute(sql`SELECT count(*)::int as cnt FROM withdraw_requests WHERE status='pending'`);
      const playersRes = await db.execute(sql`SELECT count(*)::int as cnt FROM players`);
      const depCount = Number((depRes.rows?.[0] as any)?.cnt ?? (depRes as any)[0]?.cnt ?? 0);
      const wdCount = Number((wdRes.rows?.[0] as any)?.cnt ?? (wdRes as any)[0]?.cnt ?? 0);
      const totalPlayers = Number((playersRes.rows?.[0] as any)?.cnt ?? (playersRes as any)[0]?.cnt ?? 0);

      const rows: any[][] = [];
      const push = (btns: any[]) => { if (btns.length) rows.push(btns); };

      if (p("broadcast")) push([
        { text: "📢 Barchaga xabar", callback_data: "admin_broadcast" },
        { text: "💌 Bitta kishiga", callback_data: "admin_send_user" },
      ]);
      push([
        ...(p("finance") ? [{ text: "💰 Bonus/Balans qo'sh", callback_data: "admin_addbal" }] : []),
        ...(p("stats") ? [{ text: "📊 Statistika", callback_data: "admin_stat" }] : []),
      ]);
      push([
        ...(p("stats") ? [{ text: "👥 Foydalanuvchilar", callback_data: "admin_users" }] : []),
        ...(p("finance") ? [{ text: "⏳ Kutilayotganlar", callback_data: "admin_pending" }] : []),
      ]);
      if (p("stats")) push([
        { text: "🎮 O'yin statistikasi", callback_data: "admin_gamestat" },
        { text: "🏆 TOP o'yinchilar", callback_data: "admin_top" },
      ]);
      if (p("finance")) push([
        { text: "💸 Kutilayotgan yechimlar", callback_data: "admin_withdrawals" },
        { text: "📋 Barcha yechimlar", callback_data: "admin_all_withdrawals" },
      ]);
      if (p("finance")) push([
        { text: "✅ Tasdiqlangan depozitlar", callback_data: "admin_approved_deposits" },
        { text: "✅ To'langan yechimlar", callback_data: "admin_approved_withdrawals" },
      ]);
      push([
        ...(p("moderation") ? [{ text: "🚫 Ban / Unban", callback_data: "admin_ban" }] : []),
        ...(p("promo") ? [{ text: "🎫 Promo Kodlar", callback_data: "admin_promo" }] : []),
      ]);
      if (p("admins")) push([{ text: "🎮 O'yin va tema sozlamalari", callback_data: "admin_game_settings" }]);
      if (p("finance") || p("admins")) push([{ text: "🤝 Referal narxi", callback_data: "admin_ref_price" }]);
      // Faqat egasi (owner) adminlarni boshqaradi
      if (p("admins")) push([{ text: "👑 Adminlar", callback_data: "admin_admins" }]);
      rows.push([{ text: "🔙 Asosiy menyu", callback_data: "main_menu" }]);

      const roleLine = ROLE_LABEL[(role as AdminRole)] ?? role;
      const adminCaption =
        `🔧 <b>ADMIN PANEL</b>\n` +
        `🎖 Rolingiz: <b>${roleLine}</b>\n\n` +
        (p("stats") ? `👥 Jami o'yinchilar: <b>${totalPlayers}</b>\n` : "") +
        (p("finance") ? `⏳ Kutilayotgan depozit: <b>${depCount} ta</b>\n⏳ Kutilayotgan yechim: <b>${wdCount} ta</b>` : "");
      if (ADMIN_IMAGE) {
        try {
          await bot!.sendPhoto(chatId, ADMIN_IMAGE, {
            caption: adminCaption, parse_mode: "HTML",
            reply_markup: { inline_keyboard: rows },
          } as any);
          return;
        } catch (err) {
          logger.warn({ err }, "Admin panel rasmi yuborilmadi");
        }
      }
      await bot!.sendMessage(chatId,
        `🔧 <b>ADMIN PANEL</b>\n` +
        `🎖 Rolingiz: <b>${roleLine}</b>\n\n` +
        (p("stats") ? `👥 Jami o'yinchilar: <b>${totalPlayers}</b>\n` : "") +
        (p("finance") ? `⏳ Kutilayotgan depozit: <b>${depCount} ta</b>\n⏳ Kutilayotgan yechim: <b>${wdCount} ta</b>` : ""),
        { parse_mode: "HTML", reply_markup: { inline_keyboard: rows } }
      );
    } catch (err) {
      logger.error({ err }, "sendAdminMenu xato");
      try {
        await bot!.sendMessage(chatId, `❌ Admin panel xatosi: ${err instanceof Error ? err.message : String(err)}`);
      } catch {}
    }
  }

  // /menu command — show main menu
  regText(/\/menu/, async (msg) => {
    if (!msg.from) return;
    const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(msg.from.id)));
    if (!p) { await bot!.sendMessage(msg.chat.id, "Botni ishga tushirish uchun /start yuboring."); return; }
    const isAdminUser = isAdminId(msg.from.id);
    await mainMenu(msg.chat.id, msg.from.first_name, p.balance, isAdminUser);
  });

  // /help command
  regText(/\/help/, async (msg) => {
    if (!msg.from) return;
    await bot!.sendMessage(msg.chat.id,
      `❓ <b>Yordam</b>\n\nSavolingizni yozing, admin tez orada javob beradi:`,
      { parse_mode: "HTML" }
    );
  });

  // /admin command — admin panel
  regText(/\/admin/, async (msg) => {
    if (!msg.from) return;
    if (!isAdminId(msg.from.id)) return;
    await sendAdminMenu(msg.chat.id, msg.from.id);
  });

  // /addadmin <id> <role> — faqat bosh admin (owner) yangi admin qo'sha oladi
  regText(/\/addadmin(?:\s+(\d+))?(?:\s+(\w+))?/, async (msg, match) => {
    if (!msg.from) return;
    if (!hasPerm(msg.from.id, "admins")) {
      await bot!.sendMessage(msg.chat.id, "❌ Bu buyruq faqat bosh admin uchun.");
      return;
    }
    const newId = Number(match?.[1]);
    const roleRaw = (match?.[2] || "finance").toLowerCase();
    if (!newId || !isRole(roleRaw)) {
      await bot!.sendMessage(msg.chat.id,
        `❌ Format: <code>/addadmin &lt;telegram_id&gt; &lt;rol&gt;</code>\n\n` +
        `<b>Rollar:</b>\n` +
        `• <code>finance</code> — ${ROLE_LABEL.finance}\n` +
        `• <code>support</code> — ${ROLE_LABEL.support}\n` +
        `• <code>owner</code> — ${ROLE_LABEL.owner}\n\n` +
        `Misol: <code>/addadmin 123456789 finance</code>`,
        { parse_mode: "HTML" });
      return;
    }
    const role = roleRaw as AdminRole;
    try {
      await addAdmin(String(newId), role, String(msg.from.id));
    } catch (err) {
      logger.error({ err }, "addAdmin xato");
      await bot!.sendMessage(msg.chat.id, "❌ Bazaga yozishda xato.");
      return;
    }
    await bot!.sendMessage(msg.chat.id,
      `✅ <b>Admin qo'shildi!</b>\n\nID: <code>${newId}</code>\nRol: <b>${ROLE_LABEL[role]}</b>\n\n` +
      `<i>Bu ruxsat bazada saqlanadi — bot qayta ishga tushsa ham yo'qolmaydi.</i>`,
      { parse_mode: "HTML" }
    );
    try {
      await bot!.sendMessage(newId,
        `🎉 Sizga admin huquqi berildi!\n\nRol: <b>${ROLE_LABEL[role]}</b>\n\n/admin buyrug'ini bosing.`,
        { parse_mode: "HTML" }
      );
    } catch { /* user may not have started bot */ }
  });

  // /removeadmin <id>
  regText(/\/removeadmin(?:\s+(\d+))?/, async (msg, match) => {
    if (!msg.from) return;
    if (!hasPerm(msg.from.id, "admins")) {
      await bot!.sendMessage(msg.chat.id, "❌ Bu buyruq faqat bosh admin uchun.");
      return;
    }
    const rmId = Number(match?.[1]);
    if (!rmId) {
      await bot!.sendMessage(msg.chat.id, "❌ Format: /removeadmin <telegram_id>");
      return;
    }
    if (ADMIN_IDS.has(rmId)) {
      await bot!.sendMessage(msg.chat.id, "❌ Asosiy adminni o'chirib bo'lmaydi.");
      return;
    }
    DYNAMIC_ADMIN_IDS.delete(rmId);
    try { await removeAdmin(String(rmId)); } catch (err) { logger.error({ err }, "removeAdmin xato"); }
    await bot!.sendMessage(msg.chat.id, `✅ Admin o'chirildi: <code>${rmId}</code>`, { parse_mode: "HTML" });
  });

  // /admins — ro'yxat
  regText(/\/admins/, async (msg) => {
    if (!msg.from) return;
    if (!isAdminId(msg.from.id)) return;
    const rows = await listAdmins();
    const lines = rows
      .filter(r => r.active)
      .map(r => `• <code>${r.telegramId}</code> — ${ROLE_LABEL[(r.role as AdminRole)] ?? r.role}`);
    await bot!.sendMessage(msg.chat.id,
      `👑 <b>Adminlar ro'yxati</b>\n\n` +
      `🔒 Bosh admin: <code>${[...ADMIN_IDS].join(", ")}</code>\n\n` +
      (lines.length ? lines.join("\n") : "<i>Qo'shimcha admin yo'q</i>") +
      `\n\n<i>Qo'shish: /addadmin &lt;id&gt; &lt;finance|support|owner&gt;</i>`,
      { parse_mode: "HTML" }
    );
  });

  // /broadcast command — admin only
  regText(/\/broadcast/, async (msg) => {
    if (!hasPerm(msg.from?.id, "broadcast")) return;
    waitingForBroadcast.add(msg.from.id);
    await bot!.sendMessage(msg.chat.id,
      `📢 <b>Xabar Yuborish</b>\n\nBarcha o'yinchilarga yuboriladigan xabarni yozing:\n\n<i>Bekor qilish uchun /cancel yozing</i>`,
      { parse_mode: "HTML" }
    );
  });

  // /stat command — admin only
  regText(/\/stat/, async (msg) => {
    if (!hasPerm(msg.from?.id, "stats")) return;
    const chatId = msg.chat.id;
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [totalPlayers] = await db.select({ count: sql<number>`count(*)::int` }).from(playersTable);
      const [newToday] = await db.select({ count: sql<number>`count(*)::int` }).from(playersTable).where(sql`created_at >= ${today}`);
      const [depToday] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int`, cnt: sql<number>`count(*)::int` }).from(depositRequestsTable).where(sql`created_at >= ${today} and status = 'approved'`);
      const [wdToday] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int`, cnt: sql<number>`count(*)::int` }).from(withdrawRequestsTable).where(sql`created_at >= ${today} and status = 'approved'`);
      const [totalBal] = await db.select({ total: sql<number>`coalesce(sum(balance),0)::int` }).from(playersTable);
      const pendingDeps = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.status, "pending"));
      const pendingWds = await db.select().from(withdrawRequestsTable).where(eq(withdrawRequestsTable.status, "pending"));

      await bot!.sendMessage(chatId,
        `📊 <b>KUNLIK STATISTIKA</b>\n\n` +
        `👥 Jami o'yinchilar: <b>${totalPlayers.count}</b>\n` +
        `🆕 Bugun yangi: <b>${newToday.count}</b>\n\n` +
        `💰 Bugun depozit: <b>${fmt(depToday.total)} UZS</b> (${depToday.cnt} ta)\n` +
        `💸 Bugun yechim: <b>${fmt(wdToday.total)} UZS</b> (${wdToday.cnt} ta)\n\n` +
        `🏦 Jami balanslar: <b>${fmt(totalBal.total)} UZS</b>\n\n` +
        `⏳ Kutilayotgan:\n• Depozit: <b>${pendingDeps.length} ta</b>\n• Yechim: <b>${pendingWds.length} ta</b>`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      logger.error({ err }, "stat xato");
      await bot!.sendMessage(chatId, "❌ Statistika yuklanmadi.");
    }
  });

  // /send <telegramId> <message> — admin only
  regText(/\/send (.+)/, async (msg, match) => {
    if (!hasPerm(msg.from?.id, "broadcast")) return;
    const parts = (match?.[1] || "").trim().split(" ");
    const targetId = parts[0];
    const text = parts.slice(1).join(" ");
    if (!targetId || !text) {
      await bot!.sendMessage(msg.chat.id, "❌ Format: /send <telegramId> <xabar matni>");
      return;
    }
    try {
      await bot!.sendMessage(Number(targetId),
        `📩 <b>Admin xabari:</b>\n\n${text}`,
        { parse_mode: "HTML" }
      );
      await bot!.sendMessage(msg.chat.id, `✅ Xabar <b>${targetId}</b> ga yuborildi.`, { parse_mode: "HTML" });
    } catch {
      await bot!.sendMessage(msg.chat.id, `❌ Xabar yuborib bo'lmadi. ID: <b>${targetId}</b>`, { parse_mode: "HTML" });
    }
  });

  // /users — list all players (admin only)
  regText(/\/users/, async (msg) => {
    if (!hasPerm(msg.from?.id, "stats")) return;
    const all = await db.select({
      telegramId: playersTable.telegramId,
      firstName: playersTable.firstName,
      username: playersTable.username,
      balance: playersTable.balance,
    }).from(playersTable).orderBy(playersTable.createdAt);

    const lines = all
      .filter(p => p.telegramId !== "demo_user")
      .map(p => {
        const name = p.username ? `@${p.username}` : p.firstName;
        return `👤 ${name}\n🆔 <code>${p.telegramId}</code>\n💰 ${fmt(p.balance)} UZS`;
      }).join("\n\n");

    await bot!.sendMessage(msg.chat.id,
      `👥 <b>FOYDALANUVCHILAR (${all.length - 1} ta)</b>\n\n${lines || "Hali hech kim yo'q"}`,
      { parse_mode: "HTML" }
    );
  });

  // /addbal <telegramId> <amount> — admin only
  regText(/\/addbal (.+)/, async (msg, match) => {
    if (!hasPerm(msg.from?.id, "finance")) return;
    const parts = (match?.[1] || "").trim().split(" ");
    const targetId = parts[0];
    const amount = Number(parts[1]);
    if (!targetId || !amount || isNaN(amount) || amount <= 0) {
      await bot!.sendMessage(msg.chat.id, "❌ Format: /addbal <telegramId> <miqdor>\nMasalan: /addbal 123456789 50000");
      return;
    }
    const [player] = await db.select().from(playersTable).where(eq(playersTable.telegramId, targetId));
    if (!player) {
      await bot!.sendMessage(msg.chat.id, `❌ Foydalanuvchi topilmadi: <b>${targetId}</b>`, { parse_mode: "HTML" });
      return;
    }
    const newBal = player.balance + amount;
    await db.update(playersTable).set({ balance: newBal, updatedAt: new Date() }).where(eq(playersTable.telegramId, targetId));
    const name = player.username ? `@${player.username}` : player.firstName;
    await bot!.sendMessage(msg.chat.id,
      `✅ <b>Balans qo'shildi!</b>\n\n👤 Foydalanuvchi: ${name}\n💰 Qo'shildi: <b>+${fmt(amount)} UZS</b>\n💵 Yangi balans: <b>${fmt(newBal)} UZS</b>`,
      { parse_mode: "HTML" }
    );
    try {
      await bot!.sendMessage(Number(targetId),
        `🎁 <b>Balansingizga pul qo'shildi!</b>\n\n💰 <b>+${fmt(amount)} UZS</b>\n💵 Yangi balans: <b>${fmt(newBal)} UZS</b>`,
        { parse_mode: "HTML" }
      );
    } catch {}
  });

  // Photo handler — deposit receipt
  const photoHandler = async (msg: any) => {
    const userId = msg.from?.id; if (!userId) return;
    const fileId = msg.photo![msg.photo!.length - 1].file_id;
    const chatId = msg.chat.id;

    if (waitingForSendMsg.has(userId)) {
      const targetId = waitingForSendMsg.get(userId)!;
      waitingForSendMsg.delete(userId);
      const caption = msg.caption?.trim();
      try {
        await bot!.sendPhoto(Number(targetId), fileId, {
          caption: caption ? `📩 <b>Admin xabari:</b>\n\n${caption}` : `📩 <b>Admin xabari</b>`,
          parse_mode: "HTML",
        });
        await bot!.sendMessage(chatId, `✅ <b>Rasm yuborildi!</b>\n🆔 <code>${targetId}</code>`, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] }
        });
      } catch {
        await bot!.sendMessage(chatId, `❌ Rasm yuborib bo'lmadi. ID noto'g'ri yoki foydalanuvchi botni bloklagan.`);
      }
      return;
    }

    // First try in-memory map; fallback to DB lookup (handles server restarts)
    let reqId = waitingForCheck.get(userId);
    if (!reqId) {
      const pending = await db.select().from(depositRequestsTable)
        .where(and(
          eq(depositRequestsTable.telegramId, String(userId)),
          eq(depositRequestsTable.status, "pending"),
          isNull(depositRequestsTable.telegramFileId),
        ))
        .orderBy(depositRequestsTable.createdAt)
        .limit(1);
      if (!pending.length) return;
      reqId = pending[0].id;
    }

    await db.update(depositRequestsTable).set({ telegramFileId: fileId }).where(eq(depositRequestsTable.id, reqId));
    waitingForCheck.delete(userId);

    const [req] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, reqId));
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, req.playerId));

    await bot!.sendMessage(msg.chat.id, `✅ <b>Chekingiz qabul qilindi!</b>\n\n⏳ Admin tekshirib, ${BONUS_PERCENT}% bonus bilan balansingizni to'ldiradi.`, { parse_mode: "HTML" });

    {
      try {
        await notifyFinancePhoto(fileId,
            `💳 <b>YANGI DEPOZIT SO'ROVI</b>\n\n` +
            `👤 ${player.firstName} (@${player.username ?? "—"})\n` +
            `🆔 <code>${player.telegramId}</code>\n` +
            `💵 Miqdor: <b>${fmt(req.amount)} UZS</b>\n` +
            `🎁 Bonus (+${BONUS_PERCENT}%): <b>${fmt(req.bonusAmount)} UZS</b>\n` +
            `💰 Jami: <b>${fmt(req.amount + req.bonusAmount)} UZS</b>`,
          [[
            { text: "✅ Tasdiqlash", callback_data: `dep_ok_${reqId}` },
            { text: "❌ Rad etish", callback_data: `dep_no_${reqId}` },
          ]]
        );
      } catch (err) {
        logger.error({ err }, "Adminlarga depozit xabari yuborishda xato");
      }
    }
  };
  bot.on("photo", photoHandler);

  // Text handler
  const textMsgHandler = async (msg: any) => {
    if (!msg.text || !msg.from) return;
    // /cancel dan tashqari boshqa buyruqlar regText handlerlarida ishlanadi
    if (msg.text.startsWith("/") && msg.text.trim().split(/\s|@/)[0] !== "/cancel") return;
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Ban check (skip for admins)
    const isAdminForBanCheck = isAdminId(userId);
    if (!isAdminForBanCheck) {
      const [checkBan] = await db.select({ banned: playersTable.banned }).from(playersTable).where(eq(playersTable.telegramId, String(userId)));
      if (checkBan?.banned) {
        await bot!.sendMessage(chatId, "🚫 Hisobingiz bloklangan. Yordam uchun admin bilan bog'laning.");
        return;
      }
    }

    // /cancel — clears all waiting states
    if (text === "/cancel") {
      waitingForBroadcast.delete(userId);
      waitingForHelp.delete(userId);
      adminReplyTarget.delete(userId);
      waitingForSendId.delete(userId);
      waitingForSendMsg.delete(userId);
      waitingForAddbalId.delete(userId);
      waitingForAddbalAmount.delete(userId);
      waitingForBanId.delete(userId);
      waitingForPromoCode.delete(userId);
      waitingForPromoAmount.delete(userId);
      waitingForPromoMaxUses.delete(userId);
      waitingForPromoPersonalId.delete(userId);
      waitingForPromoTarget.delete(userId);
      waitingForNewAdminId.delete(userId);
      waitingForMaxWin.delete(userId);
      await bot!.sendMessage(chatId, "❌ Bekor qilindi.", { parse_mode: "HTML" });
      return;
    }

    // ===== JONLI SUHBAT: xabarlarni ikki tomonga uzatish =====
    if (inLiveChat(userId)) {
      if (text === "/end" || text === "/stop") {
        await endLiveChat(userId, liveChatAdminToUser.has(userId) ? "admin" : "user");
        return;
      }
      const isAdminSide = liveChatAdminToUser.has(userId);
      const peerId = isAdminSide ? liveChatAdminToUser.get(userId)! : liveChatUserToAdmin.get(userId)!;
      try {
        await bot!.sendMessage(peerId,
          `${isAdminSide ? "👨‍💼 <b>Admin</b>" : "👤 <b>Foydalanuvchi</b>"}\n━━━━━━━━━━━━\n${escHtml(text)}`,
          { parse_mode: "HTML", reply_markup: LIVE_CHAT_END_KB }
        );
        pushLiveChatMsg(isAdminSide ? peerId : userId, isAdminSide ? "admin" : "user", text);
        try { await bot!.sendMessage(chatId, "✅", { parse_mode: "HTML" }); } catch {}
      } catch {
        await bot!.sendMessage(chatId, "❌ Xabar yetkazilmadi. Suhbat tugatildi.", { parse_mode: "HTML" });
        await endLiveChat(userId, "system");
      }
      return;
    }

    // Admin: send to specific user — step 1: got user ID
    if (waitingForSendId.has(userId)) {
      const targetId = text.trim();
      if (!/^\d+$/.test(targetId)) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri format. Faqat raqam kiriting.\nMasalan: <code>123456789</code>", { parse_mode: "HTML" });
        return;
      }
      const [pl] = await db.select().from(playersTable).where(eq(playersTable.telegramId, targetId));
      const name = pl ? (pl.username ? `@${pl.username}` : pl.firstName) : `ID: ${targetId}`;
      waitingForSendId.delete(userId);
      waitingForSendMsg.set(userId, targetId);
      await bot!.sendMessage(chatId,
        `💌 <b>Xabar matni</b>\n\nKimga: <b>${name}</b>\n🆔 <code>${targetId}</code>\n\nYubormoqchi bo'lgan xabarni yozing:\n\n<i>Bekor qilish uchun /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: send to specific user — step 2: got message text
    if (waitingForSendMsg.has(userId)) {
      const targetId = waitingForSendMsg.get(userId)!;
      waitingForSendMsg.delete(userId);
      try {
        await bot!.sendMessage(Number(targetId), `📩 <b>Admin xabari:</b>\n\n${text}`, { parse_mode: "HTML" });
        await bot!.sendMessage(chatId, `✅ <b>Xabar yuborildi!</b>\n🆔 <code>${targetId}</code>`, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] }
        });
      } catch {
        await bot!.sendMessage(chatId, `❌ Xabar yuborib bo'lmadi. ID noto'g'ri yoki foydalanuvchi botni bloklagan.`);
      }
      return;
    }

    // Admin: add balance — step 1: got user ID
    if (waitingForAddbalId.has(userId)) {
      const targetId = text.trim();
      if (!/^\d+$/.test(targetId)) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri format. Faqat raqam kiriting.", { parse_mode: "HTML" });
        return;
      }
      const [pl] = await db.select().from(playersTable).where(eq(playersTable.telegramId, targetId));
      if (!pl) {
        await bot!.sendMessage(chatId, `❌ Foydalanuvchi topilmadi: <code>${targetId}</code>\n\nID to'g'riligini tekshiring.`, { parse_mode: "HTML" });
        return;
      }
      const name = pl.username ? `@${pl.username}` : pl.firstName;
      waitingForAddbalId.delete(userId);
      waitingForAddbalAmount.set(userId, targetId);
      await bot!.sendMessage(chatId,
        `💰 <b>Balans Qo'shish</b>\n\n👤 Foydalanuvchi: <b>${name}</b>\n🆔 <code>${targetId}</code>\n💵 Joriy balans: <b>${fmt(pl.balance)} UZS</b>\n\nQancha qo'shish kerak? (UZS):\n\n<i>Bekor qilish uchun /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: add balance — step 2: got amount
    if (waitingForAddbalAmount.has(userId)) {
      const targetId = waitingForAddbalAmount.get(userId)!;
      const amount = Number(text.replace(/\s/g, ""));
      if (!amount || isNaN(amount) || amount <= 0) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri miqdor. Faqat musbat raqam kiriting.\nMasalan: <code>50000</code>", { parse_mode: "HTML" });
        return;
      }
      waitingForAddbalAmount.delete(userId);
      const [pl] = await db.select().from(playersTable).where(eq(playersTable.telegramId, targetId));
      if (!pl) { await bot!.sendMessage(chatId, "❌ Foydalanuvchi topilmadi."); return; }
      const newBal = pl.balance + amount;
      await db.update(playersTable).set({ balance: newBal, updatedAt: new Date() }).where(eq(playersTable.telegramId, targetId));
      const name = pl.username ? `@${pl.username}` : pl.firstName;
      // Notify user
      try {
        await bot!.sendMessage(Number(targetId),
          `🎁 <b>Hisobingizga bonus qo'shildi!</b>\n\n💰 Qo'shildi: <b>+${fmt(amount)} UZS</b>\n💵 Yangi balans: <b>${fmt(newBal)} UZS</b>\n\nO'yiningiz omadli bo'lsin! 🎮`,
          { parse_mode: "HTML" }
        );
      } catch {}
      await bot!.sendMessage(chatId,
        `✅ <b>Balans qo'shildi!</b>\n\n👤 ${name}\n🆔 <code>${targetId}</code>\n➕ Qo'shildi: <b>${fmt(amount)} UZS</b>\n💵 Yangi balans: <b>${fmt(newBal)} UZS</b>`,
        { parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] }
        }
      );
      return;
    }

    // Admin: max-win miqdorini kiritish
    if (waitingForMaxWin.has(userId)) {
      const game = waitingForMaxWin.get(userId)!;
      waitingForMaxWin.delete(userId);
      const raw = text.replace(/\s/g, "").toLowerCase();
      const maxWin = raw === "0" || raw === "yoq" || raw === "cheklanmagan" ? null : Number(raw);
      if (raw !== "0" && raw !== "yoq" && raw !== "cheklanmagan" && (!maxWin || isNaN(maxWin) || maxWin <= 0)) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri miqdor. Raqam kiriting yoki cheklovni olib tashlash uchun 0 yozing.", { parse_mode: "HTML" });
        return;
      }
      await db.insert(gameSettingsTable).values({ game, maxWin }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { maxWin, updatedAt: new Date() } });
      await bot!.sendMessage(chatId, `✅ Maksimal yutuq yangilandi: <b>${maxWin ? fmt(maxWin) + " UZS" : "cheklanmagan"}</b>`, { parse_mode: "HTML" });
      await sendGameEditor(chatId, game);
      return;
    }

    // Owner: yangi moliya admini qo'shish — ID kutilmoqda
    if (waitingForNewAdminId.has(userId)) {
      const newId = Number(text.replace(/\s/g, ""));
      if (!/^\d+$/.test(text.replace(/\s/g, "")) || !newId) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri ID. Faqat raqam kiriting.\n<i>Bekor qilish: /cancel</i>", { parse_mode: "HTML" });
        return;
      }
      if (!hasPerm(userId, "admins")) { waitingForNewAdminId.delete(userId); return; }
      const existing = (await listAdmins()).filter(r => r.active && !ADMIN_IDS.has(Number(r.telegramId)));
      if (existing.length >= MAX_EXTRA_ADMINS && !existing.some(r => Number(r.telegramId) === newId)) {
        waitingForNewAdminId.delete(userId);
        await bot!.sendMessage(chatId, `❌ Maksimal <b>${MAX_EXTRA_ADMINS}</b> ta qo'shimcha admin qo'shish mumkin. Avval birini o'chiring.`, { parse_mode: "HTML" });
        return;
      }
      if (ADMIN_IDS.has(newId)) {
        waitingForNewAdminId.delete(userId);
        await bot!.sendMessage(chatId, "ℹ️ Bu foydalanuvchi allaqachon bosh admin.");
        return;
      }
      waitingForNewAdminId.delete(userId);
      try {
        await addAdmin(String(newId), "finance", String(userId));
        DYNAMIC_ADMIN_IDS.add(newId);
      } catch (err) {
        logger.error({ err }, "admin_addadmin xato");
        await bot!.sendMessage(chatId, "❌ Bazaga yozishda xato.");
        return;
      }
      await bot!.sendMessage(chatId,
        `✅ <b>Moliya admini qo'shildi!</b>\n\n🆔 <code>${newId}</code>\n🎖 Rol: <b>${ROLE_LABEL.finance}</b>\n\n` +
        `<i>U faqat pul kirim/chiqim so'rovlarini ko'radi va tasdiqlaydi. O'chirish yoki boshqa bo'limlarga ruxsati yo'q.</i>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👑 Adminlar", callback_data: "admin_admins" }]] } }
      );
      try {
        await bot!.sendMessage(newId,
          `🎉 Sizga <b>moliya admini</b> huquqi berildi!\n\nPul kirim/chiqim so'rovlari sizga ham keladi.\n/admin buyrug'ini bosing.`,
          { parse_mode: "HTML" });
      } catch {}
      return;
    }

    // Admin: ban/unban — got user ID
    if (waitingForBanId.has(userId)) {
      const targetId = text.replace(/\s/g, "");
      if (!/^\d+$/.test(targetId)) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri ID. Faqat raqam kiriting:\n<i>Bekor qilish: /cancel</i>", { parse_mode: "HTML" });
        return;
      }
      waitingForBanId.delete(userId);
      const [pl] = await db.select().from(playersTable).where(eq(playersTable.telegramId, targetId));
      if (!pl) { await bot!.sendMessage(chatId, "❌ Foydalanuvchi topilmadi."); return; }
      const newBanned = !pl.banned;
      await db.update(playersTable).set({ banned: newBanned, updatedAt: new Date() }).where(eq(playersTable.telegramId, targetId));
      const name = pl.username ? `@${pl.username}` : pl.firstName;
      const statusText = newBanned ? "🚫 <b>BAN QILINDI</b>" : "✅ <b>BAN OLIB TASHLANDI</b>";
      await bot!.sendMessage(chatId,
        `${statusText}\n\n👤 ${name}\n🆔 <code>${targetId}</code>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } }
      );
      try {
        const notifyText = newBanned
          ? "🚫 Hisobingiz admin tomonidan bloklandi. Yordam uchun murojaat qiling."
          : "✅ Hisobingiz admin tomonidan tiklandi. Yana o'yin o'ynashingiz mumkin!";
        await bot!.sendMessage(Number(targetId), notifyText);
      } catch {}
      return;
    }

    // Admin: shaxsiy promokod — foydalanuvchi ID si
    if (waitingForPromoPersonalId.has(userId)) {
      const targetId = text.replace(/\s/g, "");
      if (!/^\d+$/.test(targetId)) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri ID. Faqat raqam kiriting:\n<i>Bekor qilish: /cancel</i>", { parse_mode: "HTML" });
        return;
      }
      waitingForPromoPersonalId.delete(userId);
      waitingForPromoTarget.set(userId, targetId);
      waitingForPromoCode.add(userId);
      await bot!.sendMessage(chatId,
        `🎁 Egasi: <code>${targetId}</code>\n\nKod nomini yuboring (A-Z, 0-9):\n\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: promo creation — step 1: got code name
    if (waitingForPromoCode.has(userId)) {
      const code = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 3) {
        await bot!.sendMessage(chatId, "❌ Kod kamida 3 ta belgi bo'lishi kerak (A-Z, 0-9).\n<i>Bekor qilish: /cancel</i>", { parse_mode: "HTML" });
        return;
      }
      waitingForPromoCode.delete(userId);
      waitingForPromoAmount.set(userId, code);
      await bot!.sendMessage(chatId,
        `✅ Kod: <code>${code}</code>\n\nBu kodni ishlatganda qancha UZS berilsin?`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: promo creation — step 2: got amount
    if (waitingForPromoAmount.has(userId)) {
      const code = waitingForPromoAmount.get(userId)!;
      const amount = Number(text.replace(/\s/g, ""));
      if (!amount || isNaN(amount) || amount <= 0) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri miqdor. Masalan: <code>10000</code>\n<i>Bekor qilish: /cancel</i>", { parse_mode: "HTML" });
        return;
      }
      waitingForPromoAmount.delete(userId);
      const personalTarget = waitingForPromoTarget.get(userId);
      if (personalTarget) {
        waitingForPromoTarget.delete(userId);
        try {
          await createAndAnnouncePromo({
            adminChatId: chatId, adminId: userId, code, amount, maxUses: 1,
            assignedTo: personalTarget, note: `${REFERRAL_GOAL} ta referal sovrini`,
          });
        } catch {
          await bot!.sendMessage(chatId, "❌ Xato: Bu kod allaqachon mavjud yoki boshqa xatolik yuz berdi.");
        }
        return;
      }
      waitingForPromoMaxUses.set(userId, { code, amount });
      await bot!.sendMessage(chatId,
        `✅ Miqdor: <b>${fmt(amount)} UZS</b>\n\nBu kodni necha marta ishlatish mumkin? (raqam kiriting)`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: promo creation — step 3: got maxUses
    if (waitingForPromoMaxUses.has(userId)) {
      const { code, amount } = waitingForPromoMaxUses.get(userId)!;
      const maxUses = Number(text.replace(/\s/g, ""));
      if (!maxUses || isNaN(maxUses) || maxUses <= 0) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri son. Masalan: <code>10</code>\n<i>Bekor qilish: /cancel</i>", { parse_mode: "HTML" });
        return;
      }
      waitingForPromoMaxUses.delete(userId);
      try {
        await createAndAnnouncePromo({ adminChatId: chatId, adminId: userId, code, amount, maxUses });
      } catch {
        await bot!.sendMessage(chatId, `❌ Xato: Bu kod allaqachon mavjud yoki boshqa xatolik yuz berdi.`);
      }
      return;
    }

    // Admin: referal narxini o'zgartirish + barchaga xabar
    if (waitingForRefPrice.has(userId)) {
      const amount = parseInt(text.replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
        await bot!.sendMessage(chatId, "❌ Noto'g'ri miqdor. Masalan: <code>2000</code>", { parse_mode: "HTML" });
        return;
      }
      waitingForRefPrice.delete(userId);
      await db.insert(appSettingsTable).values({ key: "referral_bonus", value: String(amount) })
        .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: String(amount), updatedAt: new Date() } });
      await bot!.sendMessage(chatId, `✅ Referal narxi <b>${fmt(amount)} UZS</b> qilib belgilandi.\n📢 Barchaga xabar yuborilmoqda...`, { parse_mode: "HTML" });
      const allPlayers = await db.select({ telegramId: playersTable.telegramId }).from(playersTable);
      let sent = 0, failed = 0;
      for (const pl of allPlayers) {
        try {
          await bot!.sendMessage(Number(pl.telegramId),
            `🤝 <b>Referal bonusi yangilandi!</b>\n\nHar bir taklif qilgan do'stingiz uchun endi <b>${fmt(amount)} UZS</b> olasiz.\n\n👥 Havolangizni olish uchun menyudagi <b>Referal</b> bo'limiga kiring.`,
            { parse_mode: "HTML" });
          sent++;
          await new Promise(r => setTimeout(r, 50));
        } catch { failed++; }
      }
      await bot!.sendMessage(chatId,
        `✅ <b>Xabar yuborildi!</b>\n✅ Muvaffaqiyatli: <b>${sent} ta</b>\n❌ Yuborilmadi: <b>${failed} ta</b>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } }
      );
      return;
    }

    // Admin broadcast message
    if (waitingForBroadcast.has(userId)) {
      waitingForBroadcast.delete(userId);
      const allPlayers = await db.select({ telegramId: playersTable.telegramId }).from(playersTable);
      await bot!.sendMessage(chatId, `📢 <b>${allPlayers.length} ta foydalanuvchiga yuborilmoqda...</b>`, { parse_mode: "HTML" });
      let sent = 0, failed = 0;
      for (const pl of allPlayers) {
        try {
          await bot!.sendMessage(Number(pl.telegramId),
            `📢 <b>Admin xabari:</b>\n\n${text}`,
            { parse_mode: "HTML" }
          );
          sent++;
          await new Promise(r => setTimeout(r, 50)); // rate limit
        } catch { failed++; }
      }
      await bot!.sendMessage(chatId,
        `✅ <b>Yuborildi!</b>\n✅ Muvaffaqiyatli: <b>${sent} ta</b>\n❌ Yuborilmadi: <b>${failed} ta</b>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } }
      );
      return;
    }

    // Admin reply to user help question
    if (adminReplyTarget.has(userId)) {
      const targetId = adminReplyTarget.get(userId)!;
      adminReplyTarget.delete(userId);
      try {
        await bot!.sendMessage(targetId,
          `📩 <b>Admin javobi:</b>\n\n${text}`,
          { parse_mode: "HTML" }
        );
        await bot!.sendMessage(chatId, "✅ Javob yuborildi!", { parse_mode: "HTML" });
      } catch {
        await bot!.sendMessage(chatId, "❌ Foydalanuvchiga xabar yuborib bo'lmadi.", { parse_mode: "HTML" });
      }
      return;
    }

    // Help question from user
    if (waitingForHelp.has(userId)) {
      waitingForHelp.delete(userId);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(userId)));
      const name = p?.firstName ?? "Noma'lum";
      const username = p?.username ? `@${p.username}` : "—";
      if (ADMIN_ID) {
        adminReplyTarget.set(ADMIN_ID, userId);
        await bot!.sendMessage(ADMIN_ID,
          `❓ <b>YORDAM SO'ROVI</b>\n\n` +
          `👤 ${name} (${username})\n` +
          `🆔 <code>${userId}</code>\n\n` +
          `💬 <b>Savol:</b>\n${text}`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
            { text: "📩 Javob berish", callback_data: `reply_help_${userId}` },
          ]]}}
        );
      }
      await bot!.sendMessage(chatId,
        `✅ <b>Savolingiz adminga yuborildi!</b>\n\n⏳ Tez orada javob beriladi.`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Custom deposit amount
    if (waitingForAmount.has(userId)) {
      const amount = Number(text.replace(/\s+/g, "").replace(/,/g, ""));
      if (isNaN(amount) || amount < MIN_DEPOSIT_AMOUNT) {
        await bot!.sendMessage(chatId, `❌ Noto'g'ri miqdor. Kamida <b>25,000 UZS</b> kiriting:`, { parse_mode: "HTML" });
        return;
      }
      if (amount > 50000000) {
        await bot!.sendMessage(chatId, `❌ Miqdor juda katta. Maksimal: <b>50,000,000 UZS</b>`, { parse_mode: "HTML" });
        return;
      }
      waitingForAmount.delete(userId);
      await sendDepositCard(chatId, amount, userId);
      return;
    }

    // Custom withdraw amount
    if (waitingForWithdrawAmount.has(userId)) {
      const amount = Number(text.replace(/\s+/g, "").replace(/,/g, ""));
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(userId)));
      if (!p) return;
      if (p.totalDeposited <= 0) {
        waitingForWithdrawAmount.delete(userId);
        await bot!.sendMessage(chatId, `❌ Pul yechish uchun avval kamida bitta depozit qilishingiz kerak.`, { parse_mode: "HTML" });
        return;
      }
      if (isNaN(amount) || amount < MIN_WITHDRAW_AMOUNT) {
        await bot!.sendMessage(chatId, `❌ Noto'g'ri miqdor yoki mablag' yetarli emas. Kamida <b>${fmt(MIN_WITHDRAW_AMOUNT)} UZS</b> kiriting:`, { parse_mode: "HTML" });
        return;
      }
      if (amount > p.balance) {
        await bot!.sendMessage(chatId, `❌ Balans yetarli emas! Sizda <b>${fmt(p.balance)} UZS</b> bor.`, { parse_mode: "HTML" });
        return;
      }
      waitingForWithdrawAmount.delete(userId);
      pendingWithdraw.set(userId, { amount });
      await bot!.sendMessage(chatId,
        `💸 <b>Karta ma'lumotlarini yuboring:</b>\n\n<code>KARTA: 8600123456789012\nEGASI: Ismingiz Familiyangiz</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Withdraw card info
    const pw = pendingWithdraw.get(userId);
    if (pw) {
      const cardMatch = text.match(/KARTA:\s*(\d[\d\s]+\d)/i);
      const holderMatch = text.match(/EGASI:\s*(.+)/i);
      if (!cardMatch || !holderMatch) {
        await bot!.sendMessage(chatId, "❌ Format noto'g'ri. Qaytadan yuboring:\n<code>KARTA: 8600123456789012\nEGASI: Ismingiz Familiyangiz</code>", { parse_mode: "HTML" });
        return;
      }
      const cardNumber = cardMatch[1].replace(/\s+/g, "");
      const cardHolder = holderMatch[1].trim();
      pendingWithdraw.delete(userId);

      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(userId)));
      if (!p || p.balance < pw.amount) { await bot!.sendMessage(chatId, "❌ Balans yetarli emas!"); return; }
      if (p.totalDeposited <= 0) { await bot!.sendMessage(chatId, "❌ Pul yechish uchun avval depozit qilishingiz kerak."); return; }
      if (pw.amount < MIN_WITHDRAW_AMOUNT) { await bot!.sendMessage(chatId, `❌ Balansingizda mablag' yetarli emas. Minimal yechish miqdori <b>${fmt(MIN_WITHDRAW_AMOUNT)} UZS</b>.`, { parse_mode: "HTML" }); return; }

      await db.update(playersTable).set({ balance: p.balance - pw.amount, updatedAt: new Date() }).where(eq(playersTable.telegramId, String(userId)));
      const [req] = await db.insert(withdrawRequestsTable).values({
        playerId: p.id, telegramId: String(userId), amount: pw.amount, cardNumber, cardHolder,
      }).returning();

      await bot!.sendMessage(chatId, `⏳ <b>So'rovingiz adminga yuborildi!</b>`, { parse_mode: "HTML" });

      try {
        await notifyFinanceText(
          `💸 <b>PUL YECHISH SO'ROVI</b>\n\n👤 ${p.firstName} (@${p.username ?? "—"})\n🆔 <code>${p.telegramId}</code>\n💵 Miqdor: <b>${fmt(pw.amount)} UZS</b>\n💳 Karta: <code>${cardNumber}</code>\n👤 Egasi: ${cardHolder}`,
          [[
            { text: "✅ To'landi", callback_data: `wd_ok_${req.id}` },
            { text: "❌ Rad", callback_data: `wd_no_${req.id}` },
          ]]
        );
      } catch (err) {
        logger.error({ err }, "Adminlarga yechish so'rovi yuborishda xato");
      }
    }
  };
  bot.on("message", textMsgHandler);

  _msgHandler = async (msg: any) => {
    // Jonli suhbat: ovozli xabar / media ham ikki tomonga uzatiladi
    if (msg.from && inLiveChat(msg.from.id) && !msg.text) {
      const handled = await relayLiveChatMedia(msg);
      if (handled) return;
    }
    if (msg.photo) {
      await photoHandler(msg);
    } else {
      await textMsgHandler(msg);
    }
  };

  // Callback handler
  
async function getGameRow(game: string) {
  const [row] = await db.select().from(gameSettingsTable).where(eq(gameSettingsTable.game, game));
  return {
    enabled: row?.enabled ?? true,
    winChance: row?.winChance ?? 40,
    refundChance: row?.refundChance ?? 6,
    difficulty: (row?.difficulty as Difficulty) ?? "o'rta",
    multiplier: row?.multiplier ?? 100,
    maxWin: row?.maxWin ?? null,
  };
}

async function sendGameList(chatId: number, page: number, editMessageId?: number) {
  const PAGE_SIZE = 8;
  const configured = await db.select().from(gameSettingsTable);
  const status = new Map(configured.map((r) => [r.game, r.enabled]));
  const totalPages = Math.max(1, Math.ceil(ALL_GAMES.length / PAGE_SIZE));
  const p = Math.min(Math.max(page, 0), totalPages - 1);
  const slice = ALL_GAMES.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
  const keyboard: any[] = slice.map((g) => [{
    text: `${status.get(g.key) === false ? "🔴" : "🟢"} ${g.label}`,
    callback_data: `admin_gm_open_${g.key}`,
  }]);
  const nav: any[] = [];
  if (p > 0) nav.push({ text: "⬅️ Oldingi", callback_data: `admin_gm_list_${p - 1}` });
  nav.push({ text: `${p + 1}/${totalPages}`, callback_data: `admin_gm_list_${p}` });
  if (p < totalPages - 1) nav.push({ text: "Keyingi ➡️", callback_data: `admin_gm_list_${p + 1}` });
  keyboard.push(nav);
  keyboard.push([{ text: "🛠 Hammasiga qo'llash", callback_data: "admin_gm_all" }]);
  keyboard.push([{ text: "🔙 O'yin va dizayn sozlamalari", callback_data: "admin_game_settings" }]);
  const text = `🎮 <b>O'YINLAR RO'YXATI</b> (${p + 1}/${totalPages})\n\nTahrirlash uchun o'yinni tanlang.`;
  const opts = { chat_id: chatId, message_id: editMessageId, parse_mode: "HTML" as const, reply_markup: { inline_keyboard: keyboard } };
  if (editMessageId) {
    try { await bot!.editMessageText(text, opts); return; } catch {}
  }
  await bot!.sendMessage(chatId, text, { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } });
}

async function sendGameEditor(chatId: number, game: string, editMessageId?: number) {
  const label = GAME_LABELS[game] ?? game;
  const cfg = await getGameRow(game);
  const keyboard: any[] = [
    [{ text: cfg.enabled ? "🟢 Yoqilgan (o'chirish)" : "🔴 O'chirilgan (yoqish)", callback_data: `admin_gm_toggle_${game}` }],
    [
      { text: "−5%", callback_data: `admin_gm_win_${game}_-5` },
      { text: "−1%", callback_data: `admin_gm_win_${game}_-1` },
      { text: `🎯 ${cfg.winChance}%`, callback_data: `admin_gm_noop` },
      { text: "+1%", callback_data: `admin_gm_win_${game}_1` },
      { text: "+5%", callback_data: `admin_gm_win_${game}_5` },
    ],
    [{ text: `⚙️ Qiyinlik: ${cfg.difficulty}`, callback_data: `admin_gm_diff_${game}` }],
    [
      { text: "−10%", callback_data: `admin_gm_mult_${game}_-10` },
      { text: "−1%", callback_data: `admin_gm_mult_${game}_-1` },
      { text: `✖️ x${(cfg.multiplier / 100).toFixed(2)}`, callback_data: `admin_gm_noop` },
      { text: "+1%", callback_data: `admin_gm_mult_${game}_1` },
      { text: "+10%", callback_data: `admin_gm_mult_${game}_10` },
    ],
    [{ text: `💰 Max yutuq: ${cfg.maxWin ? fmt(cfg.maxWin) + " UZS" : "cheklanmagan"} (o'zgartirish)`, callback_data: `admin_gm_maxwin_${game}` }],
    [{ text: "🔙 O'yinlar ro'yxati", callback_data: "admin_gm_list_0" }],
  ];
  const text = `🎮 <b>${label}</b>\n\nO'yin: <code>${game}</code>\nYutish ehtimoli, qiyinlik, koeffitsiyent va maksimal yutuqni shu yerdan boshqaring.`;
  if (editMessageId) {
    try { await bot!.editMessageText(text, { chat_id: chatId, message_id: editMessageId, parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } }); return; } catch {}
  }
  await bot!.sendMessage(chatId, text, { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } });
}

const cbQueryHandler = async (q: any) => {
    if (!q.message || !q.from) return;
    const chatId = q.message.chat.id;
    const data = q.data || "";

    try {

    // ── RUXSAT NAZORATI: admin/moliya/yordam tugmalari ──
    const needPerm = permForCallback(data);
    if (needPerm) {
      if (!isAdminId(q.from.id)) {
        await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" });
        return;
      }
      if (!hasPerm(q.from.id, needPerm)) {
        await bot!.answerCallbackQuery(q.id, { text: "❌ Sizda bu bo'limga ruxsat yo'q", show_alert: true });
        return;
      }
    }

    // Subscription check
    if (data === "check_sub") {
      await bot!.answerCallbackQuery(q.id, { text: "✅ Rahmat! Xush kelibsiz!" });
      const p = await getOrCreatePlayer(q.from);
      // Mark as channel verified — won't be asked again
      await db.update(playersTable)
        .set({ channelVerified: true, updatedAt: new Date() })
        .where(eq(playersTable.telegramId, String(q.from.id)));
      const isAdminUser = isAdminId(q.from.id);
      await mainMenu(chatId, q.from.first_name, p.balance, isAdminUser, String(q.from.id));
      return;
    }

    // ◀️ Back to main menu — delete sub-menu, send fresh menu
    if (data === "main_menu") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      const isAdminUser = isAdminId(q.from.id);
      await editToMainMenu(chatId, q.message.message_id, q.from.first_name, p?.balance ?? 0, isAdminUser, String(q.from.id));
      return;
    }

    // Balance
    if (data === "balance") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      const wagerLeft = Math.max(0, (p?.wagerRequirement ?? 0) - (p?.totalWagered ?? 0));
      try { await bot!.editMessageText(
        `💰 <b>Hisobingiz</b>\n\n💵 Balans: <b>${fmt(p?.balance ?? 0)} UZS</b>\n🎮 O'yinlar: <b>${p?.gamesPlayed ?? 0}</b>\n🏆 Yutgan: <b>${fmt(p?.totalWon ?? 0)} UZS</b>\n📈 O'ynaldi: <b>${fmt(p?.totalWagered ?? 0)} UZS</b>\n` +
        (wagerLeft > 0 ? `\n⚠️ Chiqarish uchun yana <b>${fmt(wagerLeft)} UZS</b> o'ynash kerak` : `\n✅ Chiqarishga ruxsat bor`),
        { chat_id: chatId, message_id: q.message.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "◀️ Ortga", callback_data: "main_menu" }]] } }
      ); } catch {}
      return;
    }

    // How to
    if (data === "howto") {
      await bot!.answerCallbackQuery(q.id);
      try { await bot!.editMessageText(
        `📖 <b>BARCHA O'YINLAR QOIDALARI</b>\n\n` +
        `🍎 <b>Olma Omadi</b>\n  └ Har qatorda olmalarni toping, bomba topmasdan yuqoriga chiqing\n\n` +
        `🎲 <b>Zar (Dice)</b>\n  └ 7 dan KO'P x2.3 | TENG 7 x5.8 | 7 dan KAM x2.3\n\n` +
        `✈️ <b>Aviator</b>\n  └ Samolyot uchayotganida o'z vaqtida oling, qulagach yutqazasiz!\n\n` +
        `🎡 <b>Spin</b>\n  └ Bepul spin 24 soatda 1 ta\n  └ 🍒 1 000 | ⭐ 2 000 | 💎 5 000 UZS\n\n` +
        `🃏 <b>Blackjack</b>\n  └ 21 ga yaqin qoling | Blackjack=x2.5 | G'alaba=x2\n\n` +
        `🎰 <b>Slot</b>\n  └ 777=x10 | 3 bir xil=x3 | 2 bir xil=x1.5\n\n` +
        `💣 <b>Mines</b>\n  └ 5x5 katak, olmoslarni top, bombadan qoch — istagan payt olib chiq\n\n` +
        `🎡 <b>Ruletka</b>\n  └ Qizil/Qora x2 | Dyujina x3 | Zero x36\n\n` +
        `🔢 <b>Toq-Juft (Parity)</b>\n  └ 1-90 son | JUFT/TOQ/KICHIK/KATTA = x2\n\n` +
        `💡 <b>Depozit:</b> +20% bonus | <b>Yechish:</b> 100% wager kerak`,
        { chat_id: chatId, message_id: q.message.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "◀️ Ortga", callback_data: "main_menu" }]] } }
      ); } catch {}
      return;
    }

    // Deposit menu
    if (data === "deposit_menu") {
      await bot!.answerCallbackQuery(q.id);
      try { await bot!.editMessageText(
        `➕ <b>Hisob To'ldirish</b>\n\n🎁 Har qanday miqdorga <b>+${BONUS_PERCENT}% bonus</b>!\n\n💳 Karta: <code>${CARD_NUMBER}</code>\n👤 ${CARD_HOLDER}\n\n⚠️ Minimal depozit: <b>25 000 UZS</b>

Miqdorni tanlang yoki o'zingiz kiriting:`,
        { chat_id: chatId, message_id: q.message.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: "💵 25,000 UZS", callback_data: "dep_25000" }, { text: "💵 35,000 UZS", callback_data: "dep_35000" }],
          [{ text: "💵 50,000 UZS", callback_data: "dep_50000" }, { text: "💵 100,000 UZS", callback_data: "dep_100000" }],
          [{ text: "💵 250,000 UZS", callback_data: "dep_250000" }, { text: "💵 500,000 UZS", callback_data: "dep_500000" }],
          [{ text: "✍️ O'zim yozaman", callback_data: "dep_custom" }],
          [{ text: "◀️ Ortga", callback_data: "main_menu" }],
        ]}}
      ); } catch {}
      return;
    }

    // Custom deposit amount
    if (data === "dep_custom") {
      await bot!.answerCallbackQuery(q.id);
      waitingForAmount.add(q.from.id);
      await bot!.sendMessage(chatId,
        `✍️ <b>Miqdorni kiriting:</b>\n\nFaqat raqam yuboring (UZS)\n⚠️ Minimal: <b>25 000</b>\nMasalan: <code>75000</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Preset deposit amounts
    if (data.startsWith("dep_") && !data.startsWith("dep_ok") && !data.startsWith("dep_no") && data !== "dep_custom") {
      const amount = Number(data.split("_")[1]);
      if (!amount) return;
      await bot!.answerCallbackQuery(q.id);
      await sendDepositCard(chatId, amount, q.from.id);
      return;
    }

    // Admin: approve deposit
    if (data.startsWith("dep_ok_")) {
      logger.info({ fromId: q.from.id, adminId: ADMIN_ID }, "dep_ok clicked");
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, reqId));
      if (!req || req.status !== "pending") { await bot!.answerCallbackQuery(q.id, { text: "Allaqachon qayta ishlangan" }); return; }
      await db.update(depositRequestsTable).set({ status: "approved" }).where(eq(depositRequestsTable.id, reqId));
      const [p] = await db.select().from(playersTable).where(eq(playersTable.id, req.playerId));
      const total = req.amount + req.bonusAmount;
      await db.update(playersTable).set({
        balance: p.balance + total,
        totalDeposited: p.totalDeposited + req.amount,
        wagerRequirement: p.wagerRequirement + req.amount,
        updatedAt: new Date(),
      }).where(eq(playersTable.id, req.playerId));
      await bot!.answerCallbackQuery(q.id, { text: "✅ Tasdiqlandi!" });
      try { await bot!.editMessageCaption(`✅ TASDIQLANDI — ${fmt(req.amount)} UZS + ${fmt(req.bonusAmount)} bonus`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      try {
        await bot!.sendMessage(Number(req.telegramId),
          `🎉 <b>Depozitingiz tasdiqlandi!</b>\n\n💵 Miqdor: <b>${fmt(req.amount)} UZS</b>\n🎁 Bonus: <b>+${fmt(req.bonusAmount)} UZS</b>\n💰 Jami: <b>${fmt(total)} UZS</b>\n\nO'yiningiz omadli bo'lsin! 🎮`,
          { parse_mode: "HTML" }
        );
      } catch (err) { logger.warn({ err, telegramId: req.telegramId }, "deposit approved notification failed"); }
      return;
    }

    // Admin: reject deposit
    if (data.startsWith("dep_no_")) {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, reqId));
      if (!req) return;
      await db.update(depositRequestsTable).set({ status: "rejected" }).where(eq(depositRequestsTable.id, reqId));
      await bot!.answerCallbackQuery(q.id, { text: "❌ Rad etildi" });
      try { await bot!.editMessageCaption(`❌ RAD ETILDI`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      try {
        await bot!.sendMessage(Number(req.telegramId), `❌ <b>Depozitingiz rad etildi.</b>\nMuammo bo'lsa admin bilan bog'laning.`, { parse_mode: "HTML" });
      } catch (err) { logger.warn({ err, telegramId: req.telegramId }, "deposit rejected notification failed"); }
      return;
    }

    // Withdraw menu
    if (data === "withdraw_menu") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      if (!p) return;
      const wagerLeft = Math.max(0, p.wagerRequirement - p.totalWagered);
      const msgId = q.message.message_id;
      if (p.totalDeposited <= 0) {
        try { await bot!.editMessageText(
          `💸 <b>Pul Yechish</b>\n\n❌ Pul yechish uchun avval kamida bitta depozit qilishingiz kerak.`,
          { chat_id: chatId, message_id: msgId, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "➕ Hisob To'ldirish", callback_data: "deposit_menu" }], [{ text: "◀️ Ortga", callback_data: "main_menu" }]] } }
        ); } catch {}
        return;
      }
      if (p.balance < MIN_WITHDRAW_AMOUNT) {
        try { await bot!.editMessageText(
          `💸 <b>Pul Yechish</b>\n\n❌ <b>Balansingizda mablag' yetarli emas!</b>\n\nMinimal yechish miqdori: <b>${fmt(MIN_WITHDRAW_AMOUNT)} UZS</b>\n💰 Balansingiz: <b>${fmt(p.balance)} UZS</b>`,
          { chat_id: chatId, message_id: msgId, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "◀️ Ortga", callback_data: "main_menu" }]] } }
        ); } catch {}
        return;
      }
      if (wagerLeft > 0) {
        try { await bot!.editMessageText(
          `💸 <b>Pul Yechish</b>\n\n⚠️ <b>Shart bajarilmagan!</b>\n\n• Kerakli: ${fmt(p.wagerRequirement)} UZS\n• O'ynaldi: ${fmt(p.totalWagered)} UZS\n• Qolgan: <b>${fmt(wagerLeft)} UZS</b>\n\n💡 Depozit miqdorini 100% o'ynasangiz pul yechi olasiz!`,
          { chat_id: chatId, message_id: msgId, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "◀️ Ortga", callback_data: "main_menu" }]] } }
        ); } catch {}
        return;
      }
      try { await bot!.editMessageText(
        `💸 <b>Pul Yechish</b>\n\n💰 Balans: <b>${fmt(p.balance)} UZS</b>\n\nMiqdorni tanlang:`,
        { chat_id: chatId, message_id: msgId, parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: `💵 25%  — ${fmt(Math.floor(p.balance*0.25))} UZS`, callback_data: `wd_${Math.floor(p.balance*0.25)}` }],
          [{ text: `💵 50%  — ${fmt(Math.floor(p.balance*0.50))} UZS`, callback_data: `wd_${Math.floor(p.balance*0.50)}` }],
          [{ text: `💵 75%  — ${fmt(Math.floor(p.balance*0.75))} UZS`, callback_data: `wd_${Math.floor(p.balance*0.75)}` }],
          [{ text: `💵 100% — ${fmt(p.balance)} UZS`, callback_data: `wd_${p.balance}` }],
          [{ text: "✍️ O'zim yozaman", callback_data: "wd_custom" }],
          [{ text: "◀️ Ortga", callback_data: "main_menu" }],
        ]}}
      ); } catch {}
      return;
    }

    // Withdraw custom amount input
    if (data === "wd_custom") {
      await bot!.answerCallbackQuery(q.id);
      waitingForWithdrawAmount.add(q.from.id);
      await bot!.sendMessage(chatId,
        `✍️ <b>Yechish miqdorini kiriting (UZS):</b>\n\nFaqat raqam yuboring.\nMasalan: <code>15000</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Withdraw preset amount
    if (data.startsWith("wd_") && !data.startsWith("wd_ok") && !data.startsWith("wd_no")) {
      const amount = Number(data.split("_")[1]);
      if (!amount) return;
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      if (!p || p.balance < amount) { await bot!.sendMessage(chatId, "❌ Balans yetarli emas!"); return; }
      if (p.totalDeposited <= 0) { await bot!.sendMessage(chatId, "❌ Pul yechish uchun avval depozit qilishingiz kerak."); return; }
      if (amount < MIN_WITHDRAW_AMOUNT) { await bot!.sendMessage(chatId, `❌ Balansingizda mablag' yetarli emas. Minimal yechish miqdori <b>${fmt(MIN_WITHDRAW_AMOUNT)} UZS</b>.`, { parse_mode: "HTML" }); return; }
      pendingWithdraw.set(q.from.id, { amount });
      await bot!.sendMessage(chatId,
        `💸 <b>Karta ma'lumotlarini yuboring:</b>\n\n<code>KARTA: 8600123456789012\nEGASI: Ismingiz Familiyangiz</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: approve withdraw
    if (data.startsWith("wd_ok_")) {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(withdrawRequestsTable).where(eq(withdrawRequestsTable.id, reqId));
      if (!req || req.status !== "pending") { await bot!.answerCallbackQuery(q.id, { text: "Allaqachon qayta ishlangan" }); return; }
      await db.update(withdrawRequestsTable).set({ status: "approved" }).where(eq(withdrawRequestsTable.id, reqId));
      // Track totalWithdrawn on player
      const [playerW] = await db.select().from(playersTable).where(eq(playersTable.telegramId, req.telegramId));
      if (playerW) {
        await db.update(playersTable).set({ totalWithdrawn: playerW.totalWithdrawn + req.amount, updatedAt: new Date() }).where(eq(playersTable.telegramId, req.telegramId));
      }
      await db.insert(transactionsTable).values({
        playerId: req.playerId,
        type: "withdraw_approved",
        amount: req.amount,
        game: null,
      });
      await bot!.answerCallbackQuery(q.id, { text: "✅ Tasdiqlandi!" });
      try { await bot!.editMessageText(`✅ TASDIQLANDI — ${fmt(req.amount)} UZS`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      try {
        await bot!.sendMessage(Number(req.telegramId),
          `✅ <b>Pul yechish tasdiqlandi!</b>\n\n💵 <b>${fmt(req.amount)} UZS</b> kartangizga o'tkazildi.\n🏦 Karta: <code>${req.cardNumber}</code>`,
          { parse_mode: "HTML" }
        );
      } catch (err) { logger.warn({ err, telegramId: req.telegramId }, "withdraw approved notification failed"); }
      return;
    }

    // Admin: reject withdraw
    if (data.startsWith("wd_no_")) {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(withdrawRequestsTable).where(eq(withdrawRequestsTable.id, reqId));
      if (!req) return;
      await db.update(withdrawRequestsTable).set({ status: "rejected" }).where(eq(withdrawRequestsTable.id, reqId));
      const [p] = await db.select().from(playersTable).where(eq(playersTable.id, req.playerId));
      await db.update(playersTable).set({ balance: p.balance + req.amount, updatedAt: new Date() }).where(eq(playersTable.id, req.playerId));
      await bot!.answerCallbackQuery(q.id, { text: "❌ Rad etildi" });
      try { await bot!.editMessageText(`❌ RAD ETILDI`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      try {
        await bot!.sendMessage(Number(req.telegramId), `❌ <b>Pul yechish rad etildi.</b>\nBalansingiz qaytarildi.`, { parse_mode: "HTML" });
      } catch (err) { logger.warn({ err, telegramId: req.telegramId }, "withdraw rejected notification failed"); }
      return;
    }

    // Spin wheel
    if (data === "spin_wheel") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      if (!p) return;

      const now = new Date();
      if (p.lastSpinAt) {
        const diffMs = now.getTime() - new Date(p.lastSpinAt).getTime();
        const diffH = diffMs / (1000 * 60 * 60);
        if (diffH < 24) {
          const nextSpin = new Date(new Date(p.lastSpinAt).getTime() + 24 * 60 * 60 * 1000);
          const hLeft = Math.ceil((nextSpin.getTime() - now.getTime()) / (1000 * 60 * 60));
          const mLeft = Math.ceil(((nextSpin.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
          await bot!.sendMessage(chatId,
            `⏰ <b>Hali Spin vaqti kelmadi!</b>\n\n⏳ Keyingi spin: <b>${hLeft}s ${mLeft}m</b> da\n\nHar 24 soatda 1 marta bepul!`,
            { parse_mode: "HTML" }
          );
          return;
        }
      }

      // Spin prizes: [prize, weight]
      const prizes = [0, 0, 0, 0, 500, 500, 1000, 1000, 2000, 3000, 5000];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];

      const slots = ["🍎","🍋","🍇","🍒","💎","⭐","🎰","🍊","🍉","🎯","💰"];
      const spin1 = slots[Math.floor(Math.random() * slots.length)];
      const spin2 = slots[Math.floor(Math.random() * slots.length)];
      const spin3 = prize > 0 ? spin1 : slots[Math.floor(Math.random() * slots.length)];

      await db.update(playersTable).set({
        lastSpinAt: now,
        balance: p.balance + prize,
        totalWon: prize > 0 ? p.totalWon + prize : p.totalWon,
        updatedAt: now,
      }).where(eq(playersTable.telegramId, String(q.from.id)));

      if (prize > 0) {
        await bot!.sendMessage(chatId,
          `🎰 <b>[ ${spin1} | ${spin2} | ${spin1} ]</b>\n\n` +
          `🎉 <b>TABRIKLAYMIZ!</b>\n💰 Bonus: <b>+${fmt(prize)} UZS</b> balansingizga qo'shildi!\n\n` +
          `⏰ Keyingi spin ertaga mavjud bo'ladi`,
          { parse_mode: "HTML" }
        );
      } else {
        await bot!.sendMessage(chatId,
          `🎰 <b>[ ${spin1} | ${spin2} | ${spin3} ]</b>\n\n` +
          `😔 <b>Yutqazdingiz!</b>\nOmad yo'q, ertaga qaytib keling!\n\n` +
          `💡 Maksimal bonus: <b>5 000 UZS</b>\n` +
          `⏰ Keyingi spin ertaga mavjud bo'ladi`,
          { parse_mode: "HTML" }
        );
      }
      return;
    }

    // Referral menu
    if (data === "referral_menu") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      const botInfo = await bot!.getMe();
      const refLink = `https://t.me/${botInfo.username}?start=ref_${q.from.id}`;
      const count = p?.referralCount ?? 0;
      const refBonus = await getReferralBonus();
      const earned = count * refBonus;
      try { await bot!.editMessageText(
        `👥 <b>REFERAL DASTURI</b>\n\n` +
        `🎁 Har bir do'stingiz uchun: <b>+${fmt(refBonus)} UZS</b>\n\n` +
        `📊 Sizning natijangiz:\n` +
        `👤 Taklif qilganlar: <b>${count} ta</b>\n` +
        `💰 Jami topganingiz: <b>${fmt(earned)} UZS</b>\n\n` +
        `🔗 <b>Sizning havola:</b>\n<code>${refLink}</code>\n\n` +
        `📲 Havolani do'stingizga yuboring. U ro'yxatdan o'tgach, sizga <b>${fmt(refBonus)} UZS</b> tushadi!`,
        { chat_id: chatId, message_id: q.message.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "◀️ Ortga", callback_data: "main_menu" }]] } }
      ); } catch {}
      return;
    }

    // Admin: broadcast menu (from main menu button)
    if (data === "broadcast_menu") {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForBroadcast.add(q.from.id);
      await bot!.sendMessage(chatId,
        `📢 <b>Xabar Yuborish</b>\n\nBarcha o'yinchilarga yuboriladigan xabarni yozing:\n\n<i>Bekor qilish uchun /cancel yozing</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // ═══════════════════════════════════════
    // ADMIN PANEL CALLBACKS
    // ═══════════════════════════════════════
    const isAdmin = isAdminId(q.from.id);

    if (data === "admin_panel") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      await sendAdminMenu(chatId, q.from.id);
      return;
    }

    if (data === "admin_game_settings") {
      if (!hasPerm(q.from.id, "admins")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const keyboard = [
        [{ text: "📋 O'yinlar ro'yxati (yoqish/o'chirish, win%, qiyinlik, koeffitsiyent)", callback_data: "admin_gm_list_0" }],
        [{ text: "🛠 Hammasiga qo'llash", callback_data: "admin_gm_all" }],
        [{ text: "🌙 Qora tema", callback_data: "admin_theme_dark" }, { text: "☀️ Oq tema", callback_data: "admin_theme_light" }],
        [{ text: "🖤 Toza qora", callback_data: "admin_theme_black" }],
        [{ text: "🖼 Oltin fonlar", callback_data: "admin_bg_gold" }, { text: "🎨 Oddiy fon", callback_data: "admin_bg_classic" }],
        [{ text: "🔙 Admin panel", callback_data: "admin_panel" }],
      ];
      await bot!.sendMessage(chatId, "🎮 <b>O'YIN VA DIZAYN SOZLAMALARI</b>\n\nHar bir o'yinning yutish foizi, qiyinligi va koeffitsiyentini alohida sozlashingiz mumkin, yoki dizaynni tanlang.", { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } });
      return;
    }

    if (data === "admin_gm_noop") {
      await bot!.answerCallbackQuery(q.id);
      return;
    }

    if (data.startsWith("admin_gm_list_")) {
      await bot!.answerCallbackQuery(q.id);
      const page = Number(data.replace("admin_gm_list_", "")) || 0;
      await sendGameList(chatId, page, q.message.message_id);
      return;
    }

    if (data.startsWith("admin_gm_open_")) {
      await bot!.answerCallbackQuery(q.id);
      const game = data.replace("admin_gm_open_", "");
      await sendGameEditor(chatId, game, q.message.message_id);
      return;
    }

    if (data.startsWith("admin_gm_toggle_")) {
      const game = data.replace("admin_gm_toggle_", "");
      const [current] = await db.select().from(gameSettingsTable).where(eq(gameSettingsTable.game, game));
      const enabled = !(current?.enabled ?? true);
      await db.insert(gameSettingsTable).values({ game, enabled }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { enabled, updatedAt: new Date() } });
      await bot!.answerCallbackQuery(q.id, { text: enabled ? "✅ O'yin yoqildi" : "⛔ O'yin o'chirildi" });
      await sendGameEditor(chatId, game, q.message.message_id);
      return;
    }

    if (data.startsWith("admin_gm_win_")) {
      const rest = data.replace("admin_gm_win_", "");
      const idx = rest.lastIndexOf("_");
      const game = rest.slice(0, idx);
      const delta = Number(rest.slice(idx + 1));
      const [current] = await db.select().from(gameSettingsTable).where(eq(gameSettingsTable.game, game));
      const winChance = Math.min(95, Math.max(1, (current?.winChance ?? 40) + delta));
      await db.insert(gameSettingsTable).values({ game, winChance }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { winChance, updatedAt: new Date() } });
      await bot!.answerCallbackQuery(q.id, { text: `🎯 Win%: ${winChance}` });
      await sendGameEditor(chatId, game, q.message.message_id);
      return;
    }

    if (data.startsWith("admin_gm_mult_")) {
      const rest = data.replace("admin_gm_mult_", "");
      const idx = rest.lastIndexOf("_");
      const game = rest.slice(0, idx);
      const delta = Number(rest.slice(idx + 1));
      const [current] = await db.select().from(gameSettingsTable).where(eq(gameSettingsTable.game, game));
      const multiplier = Math.min(500, Math.max(10, (current?.multiplier ?? 100) + delta));
      await db.insert(gameSettingsTable).values({ game, multiplier }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { multiplier, updatedAt: new Date() } });
      await bot!.answerCallbackQuery(q.id, { text: `✖️ Koeffitsiyent: x${(multiplier / 100).toFixed(2)}` });
      await sendGameEditor(chatId, game, q.message.message_id);
      return;
    }

    if (data.startsWith("admin_gm_diff_")) {
      const game = data.replace("admin_gm_diff_", "");
      const [current] = await db.select().from(gameSettingsTable).where(eq(gameSettingsTable.game, game));
      const difficulty = nextDifficulty(current?.difficulty);
      const winChance = DIFFICULTY_WIN_SUGGEST[difficulty];
      await db.insert(gameSettingsTable).values({ game, difficulty, winChance }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { difficulty, winChance, updatedAt: new Date() } });
      await bot!.answerCallbackQuery(q.id, { text: `⚙️ Qiyinlik: ${difficulty} (win% ${winChance})` });
      await sendGameEditor(chatId, game, q.message.message_id);
      return;
    }

    if (data.startsWith("admin_gm_maxwin_")) {
      const game = data.replace("admin_gm_maxwin_", "");
      waitingForMaxWin.set(q.from.id, game);
      await bot!.answerCallbackQuery(q.id);
      await bot!.sendMessage(chatId, `💰 <b>${GAME_LABELS[game] ?? game}</b> uchun maksimal yutuq miqdorini kiriting (UZS).\n\nCheklovni olib tashlash uchun <code>0</code> yozing.\n\n<i>Bekor qilish uchun /cancel</i>`, { parse_mode: "HTML" });
      return;
    }

    if (data === "admin_gm_all") {
      await bot!.answerCallbackQuery(q.id);
      const keyboard = [
        [{ text: "🟢 Barchasiga: oson", callback_data: "admin_gm_allset_oson" }],
        [{ text: "🟡 Barchasiga: o'rta", callback_data: "admin_gm_allset_o'rta" }],
        [{ text: "🟠 Barchasiga: qiyin", callback_data: "admin_gm_allset_qiyin" }],
        [{ text: "🔴 Barchasiga: juda qiyin", callback_data: "admin_gm_allset_juda qiyin" }],
        [{ text: "➕5% win (barchasi)", callback_data: "admin_gm_alldelta_5" }, { text: "➖5% win (barchasi)", callback_data: "admin_gm_alldelta_-5" }],
        [{ text: "🔙 O'yinlar ro'yxati", callback_data: "admin_gm_list_0" }],
      ];
      await bot!.sendMessage(chatId, "🛠 <b>HAMMASIGA QO'LLASH</b>\n\nQiyinlik darajasi yoki win% o'zgarishini barcha o'yinlarga bir vaqtda qo'llang.", { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } });
      return;
    }

    if (data.startsWith("admin_gm_allset_")) {
      const difficulty = data.replace("admin_gm_allset_", "") as Difficulty;
      const winChance = DIFFICULTY_WIN_SUGGEST[difficulty] ?? 40;
      for (const g of ALL_GAMES) {
        await db.insert(gameSettingsTable).values({ game: g.key, difficulty, winChance }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { difficulty, winChance, updatedAt: new Date() } });
      }
      await bot!.answerCallbackQuery(q.id, { text: `✅ Barcha o'yinlarga qo'llandi: ${difficulty}`, show_alert: true });
      await sendGameList(chatId, 0);
      return;
    }

    if (data.startsWith("admin_gm_alldelta_")) {
      const delta = Number(data.replace("admin_gm_alldelta_", ""));
      const configured = await db.select().from(gameSettingsTable);
      const byGame = new Map(configured.map((r) => [r.game, r]));
      for (const g of ALL_GAMES) {
        const current = byGame.get(g.key);
        const winChance = Math.min(95, Math.max(1, (current?.winChance ?? 40) + delta));
        await db.insert(gameSettingsTable).values({ game: g.key, winChance }).onConflictDoUpdate({ target: gameSettingsTable.game, set: { winChance, updatedAt: new Date() } });
      }
      await bot!.answerCallbackQuery(q.id, { text: `✅ Barcha o'yinlar win% ${delta > 0 ? "+" : ""}${delta}`, show_alert: true });
      await sendGameList(chatId, 0);
      return;
    }

    if (data.startsWith("admin_theme_") || data.startsWith("admin_bg_")) {
      if (!hasPerm(q.from.id, "admins")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const isTheme = data.startsWith("admin_theme_");
      const key = isTheme ? "theme_mode" : "background_style";
      const value = data.replace(isTheme ? "admin_theme_" : "admin_bg_", "");
      await db.insert(appSettingsTable).values({ key, value }).onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
      await bot!.answerCallbackQuery(q.id, { text: "✅ Dizayn yangilandi" });
      await sendAdminMenu(chatId, q.from.id);
      return;
    }

    if (data === "admin_ref_price") {
      if (!(hasPerm(q.from.id, "finance") || hasPerm(q.from.id, "admins"))) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForRefPrice.add(q.from.id);
      const cur = await getReferralBonus();
      await bot!.sendMessage(chatId,
        `🤝 <b>Referal narxi</b>\n\nHozirgi qiymat: <b>${fmt(cur)} UZS</b>\n\nYangi miqdorni raqam bilan yozing (masalan: <code>2000</code>).\nO'zgarish barcha foydalanuvchilarga xabar qilinadi.\n\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "admin_broadcast") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForBroadcast.add(q.from.id);
      await bot!.sendMessage(chatId,
        `📢 <b>Barchaga Xabar</b>\n\nBarcha o'yinchilarga yuboriladigan xabarni yozing:\n\n<i>Bekor qilish uchun /cancel yozing</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "admin_send_user") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForSendId.add(q.from.id);
      await bot!.sendMessage(chatId,
        `💌 <b>Bitta Kishiga Xabar</b>\n\nFoydalanuvchining Telegram ID sini yuboring:\n\n<i>Masalan: <code>123456789</code></i>\n<i>Bekor qilish uchun /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "admin_addbal") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForAddbalId.add(q.from.id);
      await bot!.sendMessage(chatId,
        `💰 <b>Balans / Bonus Qo'shish</b>\n\nFoydalanuvchining Telegram ID sini yuboring:\n\n<i>Masalan: <code>123456789</code></i>\n<i>Bekor qilish uchun /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "admin_stat") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [totalPlayers] = await db.select({ count: sql<number>`count(*)::int` }).from(playersTable);
        const [newToday] = await db.select({ count: sql<number>`count(*)::int` }).from(playersTable).where(sql`created_at >= ${today}`);
        const [depTotal] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int`, cnt: sql<number>`count(*)::int` }).from(depositRequestsTable).where(eq(depositRequestsTable.status, "approved"));
        const [depToday] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int`, cnt: sql<number>`count(*)::int` }).from(depositRequestsTable).where(sql`created_at >= ${today} and status = 'approved'`);
        const [wdToday] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int`, cnt: sql<number>`count(*)::int` }).from(withdrawRequestsTable).where(sql`created_at >= ${today} and status = 'approved'`);
        const [wdTotal] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int` }).from(withdrawRequestsTable).where(eq(withdrawRequestsTable.status, "approved"));
        const [totalBal] = await db.select({ total: sql<number>`coalesce(sum(balance),0)::int` }).from(playersTable);
        const pendingDeps = await db.select({ cnt: sql<number>`count(*)::int` }).from(depositRequestsTable).where(eq(depositRequestsTable.status, "pending"));
        const pendingWds = await db.select({ cnt: sql<number>`count(*)::int` }).from(withdrawRequestsTable).where(eq(withdrawRequestsTable.status, "pending"));
        await bot!.sendMessage(chatId,
          `📊 <b>STATISTIKA</b>\n\n` +
          `👥 Jami o'yinchilar: <b>${totalPlayers.count}</b>\n` +
          `🆕 Bugun yangi: <b>${newToday.count}</b>\n\n` +
          `💰 Bugun depozit: <b>${fmt(depToday.total)} UZS</b> (${depToday.cnt} ta)\n` +
          `💰 Jami depozit: <b>${fmt(depTotal.total)} UZS</b> (${depTotal.cnt} ta)\n\n` +
          `💸 Bugun yechim: <b>${fmt(wdToday.total)} UZS</b> (${wdToday.cnt} ta)\n` +
          `💸 Jami yechim: <b>${fmt(wdTotal.total)} UZS</b>\n\n` +
          `🏦 Jami balanslar: <b>${fmt(totalBal.total)} UZS</b>\n\n` +
          `⏳ Kutilayotgan:\n• Depozit: <b>${pendingDeps[0]?.cnt ?? 0} ta</b>\n• Yechim: <b>${pendingWds[0]?.cnt ?? 0} ta</b>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } }
        );
      } catch (err) { logger.error({ err }, "admin_stat xato"); }
      return;
    }

    if (data === "admin_gamestat") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      try {
        const res: any = await db.execute(sql`
          SELECT game,
                 count(*) FILTER (WHERE type = 'bet')::int AS rounds,
                 coalesce(sum(amount) FILTER (WHERE type = 'bet'), 0)::int AS wagered,
                 coalesce(sum(amount) FILTER (WHERE type = 'win'), 0)::int AS paid
          FROM transactions
          WHERE game IS NOT NULL
          GROUP BY game
          ORDER BY wagered DESC
          LIMIT 25`);
        const rows: any[] = res.rows ?? res ?? [];
        if (!rows.length) {
          await bot!.sendMessage(chatId, "🎮 <b>O'YIN STATISTIKASI</b>\n\nHali o'yin o'ynalmagan.", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
          return;
        }
        let totalW = 0, totalP = 0;
        const lines = rows.map((r, i) => {
          const w = Number(r.wagered) || 0, pd = Number(r.paid) || 0;
          totalW += w; totalP += pd;
          const rtp = w > 0 ? ((pd / w) * 100).toFixed(1) : "0.0";
          return `${i + 1}. <b>${r.game}</b>\n   🎲 ${r.rounds} raund | 💰 ${fmt(w)}\n   🏆 To'langan: ${fmt(pd)} | RTP: <b>${rtp}%</b>\n   📈 Foyda: <b>${fmt(w - pd)} UZS</b>`;
        }).join("\n\n");
        const allRtp = totalW > 0 ? ((totalP / totalW) * 100).toFixed(1) : "0.0";
        await bot!.sendMessage(chatId,
          `🎮 <b>O'YIN STATISTIKASI</b>\n\n${lines}\n\n➖➖➖➖➖➖\n💰 Jami tikilgan: <b>${fmt(totalW)} UZS</b>\n🏆 Jami to'langan: <b>${fmt(totalP)} UZS</b>\n📊 Umumiy RTP: <b>${allRtp}%</b>\n📈 Sof foyda: <b>${fmt(totalW - totalP)} UZS</b>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
      } catch (err) { logger.error({ err }, "admin_gamestat xato"); }
      return;
    }

    if (data === "admin_top") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      try {
        const top = await db.select({
          telegramId: playersTable.telegramId,
          firstName: playersTable.firstName,
          username: playersTable.username,
          wagered: playersTable.totalWagered,
          won: playersTable.totalWon,
          lost: playersTable.totalLost,
          games: playersTable.gamesPlayed,
        }).from(playersTable)
          .where(sql`telegram_id <> 'demo_user'`)
          .orderBy(desc(playersTable.totalWagered))
          .limit(15);
        if (!top.length) {
          await bot!.sendMessage(chatId, "🏆 <b>TOP O'YINCHILAR</b>\n\nHali ma'lumot yo'q.", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
          return;
        }
        const medal = ["🥇", "🥈", "🥉"];
        const lines = top.map((pl, i) => {
          const name = pl.username ? `@${pl.username}` : pl.firstName;
          const net = (pl.lost ?? 0) - (pl.won ?? 0);
          return `${medal[i] ?? `${i + 1}.`} ${name}\n   🆔 <code>${pl.telegramId}</code>\n   🎲 ${pl.games} o'yin | 💰 tikkan: ${fmt(pl.wagered ?? 0)}\n   📈 Bot foydasi: <b>${fmt(net)} UZS</b>`;
        }).join("\n\n");
        await bot!.sendMessage(chatId, `🏆 <b>TOP O'YINCHILAR</b>\n\n${lines}`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
      } catch (err) { logger.error({ err }, "admin_top xato"); }
      return;
    }

    if (data === "admin_users") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const all = await db.select({
        telegramId: playersTable.telegramId,
        firstName: playersTable.firstName,
        username: playersTable.username,
        balance: playersTable.balance,
        gamesPlayed: playersTable.gamesPlayed,
      }).from(playersTable).orderBy(desc(playersTable.balance)).limit(30);
      const real = all.filter(p => p.telegramId !== "demo_user");
      const lines = real.map((p, i) => {
        const name = p.username ? `@${p.username}` : p.firstName;
        return `${i+1}. ${name}\n🆔 <code>${p.telegramId}</code> | 💰 <b>${fmt(p.balance)} UZS</b>`;
      }).join("\n\n");
      const chunks = lines.match(/[\s\S]{1,3800}/g) || ["Hali hech kim yo'q"];
      for (const chunk of chunks) {
        await bot!.sendMessage(chatId, `👥 <b>FOYDALANUVCHILAR (${real.length} ta)</b>\n\n${chunk}`,
          { parse_mode: "HTML" });
      }
      await bot!.sendMessage(chatId, "🔙", { reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
      return;
    }

    if (data === "admin_pending") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const deps = await db.select().from(depositRequestsTable)
        .where(eq(depositRequestsTable.status, "pending"))
        .orderBy(desc(depositRequestsTable.createdAt))
        .limit(20);
      if (!deps.length) {
        await bot!.sendMessage(chatId, `⏳ <b>Kutilayotgan depozitlar yo'q</b>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
        return;
      }
      for (const dep of deps) {
        const [pl] = await db.select().from(playersTable).where(eq(playersTable.id, dep.playerId));
        const name = pl?.username ? `@${pl.username}` : (pl?.firstName ?? "—");
        const msg = `⏳ <b>KUTILAYOTGAN DEPOZIT</b>\n\n👤 ${name}\n🆔 <code>${dep.telegramId}</code>\n💵 <b>${fmt(dep.amount)} UZS</b>\n🎁 Bonus: <b>${fmt(dep.bonusAmount)} UZS</b>`;
        try {
          if (dep.telegramFileId) {
            await bot!.sendPhoto(chatId, dep.telegramFileId, {
              caption: msg, parse_mode: "HTML",
              reply_markup: { inline_keyboard: [[
                { text: "✅ Tasdiqlash", callback_data: `dep_ok_${dep.id}` },
                { text: "❌ Rad etish", callback_data: `dep_no_${dep.id}` },
              ]]}
            });
          } else {
            await bot!.sendMessage(chatId, msg, {
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [[
                { text: "✅ Tasdiqlash", callback_data: `dep_ok_${dep.id}` },
                { text: "❌ Rad etish", callback_data: `dep_no_${dep.id}` },
              ]]}
            });
          }
        } catch {}
      }
      return;
    }

    if (data === "admin_approved_deposits") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const summaryRes = await db.execute(sql`
        SELECT
          count(*)::int as cnt,
          count(distinct telegram_id)::int as users,
          coalesce(sum(amount), 0)::int as total,
          coalesce(sum(bonus_amount), 0)::int as bonus
        FROM deposit_requests
        WHERE status = 'approved'
      `);
      const summary = (summaryRes.rows?.[0] as any) ?? {};
      const approvedRes = await db.execute(sql`
        SELECT
          d.id,
          d.telegram_id,
          d.amount,
          d.bonus_amount,
          d.created_at,
          p.username,
          p.first_name
        FROM deposit_requests d
        LEFT JOIN players p ON p.id = d.player_id
        WHERE d.status = 'approved'
        ORDER BY d.created_at DESC
        LIMIT 30
      `);
      const rows = (approvedRes.rows ?? []) as any[];
      if (!rows.length) {
        await bot!.sendMessage(chatId, `✅ <b>Tasdiqlangan depozitlar yo'q</b>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
        return;
      }
      const header =
        `✅ <b>TASDIQLANGAN DEPOZITLAR</b>\n\n` +
        `👥 Pul tushgan odamlar: <b>${Number(summary.users ?? 0)} ta</b>\n` +
        `🧾 Tasdiqlangan to'lovlar: <b>${Number(summary.cnt ?? 0)} ta</b>\n` +
        `💰 Jami tushgan: <b>${fmt(Number(summary.total ?? 0))} UZS</b>\n` +
        `🎁 Jami bonus: <b>${fmt(Number(summary.bonus ?? 0))} UZS</b>\n\n` +
        `📋 <b>Oxirgi 30 ta:</b>\n\n`;
      const lines = rows.map((dep, i) => {
        const name = dep.username ? `@${dep.username}` : (dep.first_name ?? "—");
        const date = dep.created_at ? new Date(dep.created_at).toLocaleString("uz-UZ") : "—";
        return `${i + 1}. ${name}\n🆔 <code>${dep.telegram_id}</code> | 🧾 #${dep.id}\n💵 <b>${fmt(Number(dep.amount))} UZS</b> + 🎁 ${fmt(Number(dep.bonus_amount))} UZS\n📅 ${date}`;
      }).join("\n\n");
      const chunks = (header + lines).match(/[\s\S]{1,3800}/g) || [header];
      for (const chunk of chunks) {
        await bot!.sendMessage(chatId, chunk, { parse_mode: "HTML" });
      }
      await bot!.sendMessage(chatId, "🔙", { reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
      return;
    }

    if (data === "admin_approved_withdrawals") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const summaryRes = await db.execute(sql`
        SELECT
          count(*)::int as cnt,
          count(distinct telegram_id)::int as users,
          coalesce(sum(amount), 0)::int as total
        FROM withdraw_requests
        WHERE status = 'approved'
      `);
      const summary = (summaryRes.rows?.[0] as any) ?? {};
      const approvedRes = await db.execute(sql`
        SELECT
          w.id,
          w.telegram_id,
          w.amount,
          w.card_number,
          w.card_holder,
          w.created_at,
          p.username,
          p.first_name
        FROM withdraw_requests w
        LEFT JOIN players p ON p.id = w.player_id
        WHERE w.status = 'approved'
        ORDER BY w.id DESC
        LIMIT 100
      `);
      const rows = (approvedRes.rows ?? []) as any[];
      if (!rows.length) {
        await bot!.sendMessage(chatId, `✅ <b>To'langan yechimlar yo'q</b>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
        return;
      }
      const header =
        `✅ <b>TO'LANGAN YECHIMLAR</b>\n\n` +
        `👥 Pul o'tkazilgan odamlar: <b>${Number(summary.users ?? 0)} ta</b>\n` +
        `🧾 To'langan so'rovlar: <b>${Number(summary.cnt ?? 0)} ta</b>\n` +
        `💸 Jami o'tkazilgan: <b>${fmt(Number(summary.total ?? 0))} UZS</b>\n\n` +
        `📋 <b>Oxirgi 100 ta:</b>\n\n`;
      const lines = rows.map((wd, i) => {
        const name = wd.username ? `@${wd.username}` : (wd.first_name ?? "—");
        const date = wd.created_at ? new Date(wd.created_at).toLocaleString("uz-UZ") : "—";
        return `${i + 1}. ${name}\n🆔 <code>${wd.telegram_id}</code> | 🧾 #${wd.id}\n💵 <b>${fmt(Number(wd.amount))} UZS</b>\n💳 <code>${wd.card_number}</code>\n👤 ${wd.card_holder}\n📅 ${date}`;
      }).join("\n\n");
      const chunks = (header + lines).match(/[\s\S]{1,3800}/g) || [header];
      for (const chunk of chunks) {
        await bot!.sendMessage(chatId, chunk, { parse_mode: "HTML" });
      }
      await bot!.sendMessage(chatId, "🔙", { reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
      return;
    }

    if (data === "admin_all_withdrawals") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const summaryRes = await db.execute(sql`
        SELECT
          status,
          count(*)::int as cnt,
          coalesce(sum(amount), 0)::int as total
        FROM withdraw_requests
        GROUP BY status
        ORDER BY status
      `);
      const rowsRes = await db.execute(sql`
        SELECT
          w.id,
          w.telegram_id,
          w.amount,
          w.card_number,
          w.card_holder,
          w.status,
          w.created_at,
          p.username,
          p.first_name
        FROM withdraw_requests w
        LEFT JOIN players p ON p.id = w.player_id
        ORDER BY w.id DESC
        LIMIT 50
      `);
      const stats = ((summaryRes.rows ?? []) as any[]).map(s => {
        const label = s.status === "approved" ? "✅ To'langan" : s.status === "pending" ? "⏳ Kutilayotgan" : s.status === "rejected" ? "❌ Rad etilgan" : s.status;
        return `${label}: <b>${Number(s.cnt ?? 0)} ta</b> — ${fmt(Number(s.total ?? 0))} UZS`;
      }).join("\n") || "Yechimlar yo'q";
      const rows = (rowsRes.rows ?? []) as any[];
      const lines = rows.length ? rows.map((wd, i) => {
        const name = wd.username ? `@${wd.username}` : (wd.first_name ?? "—");
        const date = wd.created_at ? new Date(wd.created_at).toLocaleString("uz-UZ") : "—";
        const status = wd.status === "approved" ? "✅ to'langan" : wd.status === "pending" ? "⏳ kutilmoqda" : wd.status === "rejected" ? "❌ rad" : wd.status;
        return `${i + 1}. ${name}\n🆔 <code>${wd.telegram_id}</code> | 🧾 #${wd.id} | ${status}\n💵 <b>${fmt(Number(wd.amount))} UZS</b>\n💳 <code>${wd.card_number}</code>\n👤 ${wd.card_holder}\n📅 ${date}`;
      }).join("\n\n") : "Yechimlar yo'q";
      const text = `📋 <b>BARCHA YECHIMLAR</b>\n\n${stats}\n\n📋 <b>Oxirgi 50 ta:</b>\n\n${lines}`;
      const chunks = text.match(/[\s\S]{1,3800}/g) || [text];
      for (const chunk of chunks) {
        await bot!.sendMessage(chatId, chunk, { parse_mode: "HTML" });
      }
      await bot!.sendMessage(chatId, "🔙", { reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
      return;
    }

    if (data === "admin_withdrawals") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const wds = await db.select().from(withdrawRequestsTable)
        .where(eq(withdrawRequestsTable.status, "pending"))
        .orderBy(desc(withdrawRequestsTable.createdAt))
        .limit(20);
      if (!wds.length) {
        await bot!.sendMessage(chatId, `💸 <b>Kutilayotgan yechimlar yo'q</b>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Admin panel", callback_data: "admin_panel" }]] } });
        return;
      }
      for (const wd of wds) {
        await bot!.sendMessage(chatId,
          `💸 <b>YECHIM SO'ROVI</b>\n\n🆔 <code>${wd.telegramId}</code>\n💵 <b>${fmt(wd.amount)} UZS</b>\n💳 ${wd.cardNumber}\n👤 ${wd.cardHolder}`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
            { text: "✅ To'landi", callback_data: `wd_ok_${wd.id}` },
            { text: "❌ Rad etish", callback_data: `wd_no_${wd.id}` },
          ]]}});
      }
      return;
    }

    // ===== JONLI SUHBAT callbacklari =====
    if (data === "live_chat") {
      await bot!.answerCallbackQuery(q.id);
      const uid = q.from.id;
      if (inLiveChat(uid)) {
        await bot!.sendMessage(chatId, "💬 Siz allaqachon jonli suhbatdasiz. Xabaringizni yozing.", {
          parse_mode: "HTML", reply_markup: LIVE_CHAT_END_KB });
        return;
      }
      if (isAdminId(uid)) {
        const waiting = [...liveChatQueue.values()];
        const kb = waiting.map(w => [{ text: `💬 ${w.name} (${w.userId})`, callback_data: `lc_accept_${w.userId}` }]);
        kb.push([{ text: "🔙 Asosiy menyu", callback_data: "main_menu" }]);
        await bot!.sendMessage(chatId,
          waiting.length
            ? `💬 <b>Kutayotgan suhbatlar</b>\n\nBiriga kirish uchun tanlang:`
            : `💬 <b>Hozircha kutayotgan suhbat yo'q</b>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: kb } }
        );
        return;
      }
      const [pl] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(uid)));
      const nm = pl?.firstName ?? q.from.first_name ?? "Foydalanuvchi";
      const un = pl?.username ? `@${pl.username}` : (q.from.username ? `@${q.from.username}` : "");
      const cnt = await requestLiveChat(uid, nm, un);
      await bot!.sendMessage(chatId,
        cnt
          ? `📨 <b>So'rov adminga yuborildi!</b>\n━━━━━━━━━━━━━━━━━━━━\n\n⏳ Admin chatga kirishi bilan shu yerda — bot ichida — bevosita yozishasiz.\n\n💡 Suhbatda faqat <b>siz va admin</b> bo'lasiz.`
          : `❌ Hozircha admin mavjud emas. Keyinroq urinib ko'ring.`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
          { text: "❌ So'rovni bekor qilish", callback_data: "lc_cancel" },
        ]]}}
      );
      return;
    }

    if (data === "lc_cancel") {
      liveChatQueue.delete(q.from.id);
      liveChatNotified.delete(q.from.id);
      await bot!.answerCallbackQuery(q.id, { text: "So'rov bekor qilindi" });
      return;
    }

    if (data.startsWith("lc_accept_")) {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const targetId = Number(data.replace("lc_accept_", ""));
      const adminId = q.from.id;
      if (liveChatUserToAdmin.has(targetId)) {
        await bot!.answerCallbackQuery(q.id, { text: "Bu suhbatni boshqa admin oldi" });
        return;
      }
      if (liveChatAdminToUser.has(adminId)) {
        await bot!.answerCallbackQuery(q.id, { text: "Avval joriy suhbatni tugating" });
        return;
      }
      liveChatQueue.delete(targetId);
      liveChatUserToAdmin.set(targetId, adminId);
      liveChatAdminToUser.set(adminId, targetId);
      pushLiveChatMsg(targetId, "system", "Admin suhbatga qo'shildi. Yozishingiz mumkin.");
      await bot!.answerCallbackQuery(q.id, { text: "✅ Chatga kirdingiz" });
      await bot!.sendMessage(adminId,
        `💬 <b>JONLI SUHBAT BOSHLANDI</b>\n━━━━━━━━━━━━━━━━━━━━\n\n👤 Foydalanuvchi: <code>${targetId}</code>\n\n✍️ Endi yozgan har bir xabaringiz to'g'ridan-to'g'ri unga boradi.\n🔚 Tugatish: /end`,
        { parse_mode: "HTML", reply_markup: LIVE_CHAT_END_KB }
      );
      try {
        await bot!.sendMessage(targetId,
          `💬 <b>ADMIN CHATGA KIRDI</b>\n━━━━━━━━━━━━━━━━━━━━\n\n👨‍💼 Admin siz bilan jonli suhbatga ulandi.\n\n✍️ Savolingizni shu yerga yozing — javob shu yerda keladi.\n🔚 Tugatish: /end`,
          { parse_mode: "HTML", reply_markup: LIVE_CHAT_END_KB }
        );
      } catch {
        await endLiveChat(adminId, "system");
      }
      // boshqa adminlarga xabar
      for (const other of (liveChatNotified.get(targetId) ?? [])) {
        if (other === adminId) continue;
        try { await bot!.sendMessage(other, `ℹ️ <code>${targetId}</code> bilan suhbatni boshqa admin oldi.`, { parse_mode: "HTML" }); } catch {}
      }
      liveChatNotified.delete(targetId);
      return;
    }

    if (data.startsWith("lc_reject_")) {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const targetId = Number(data.replace("lc_reject_", ""));
      liveChatQueue.delete(targetId);
      await bot!.answerCallbackQuery(q.id, { text: "Rad etildi" });
      try {
        await bot!.sendMessage(targetId,
          `😔 <b>Admin hozir band</b>\n\nIltimos, birozdan so'ng yana urinib ko'ring yoki 🆘 Yordam orqali savol qoldiring.`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }]] } }
        );
      } catch {}
      return;
    }

    if (data === "lc_end") {
      await bot!.answerCallbackQuery(q.id, { text: "Suhbat tugatildi" });
      if (inLiveChat(q.from.id)) {
        await endLiveChat(q.from.id, liveChatAdminToUser.has(q.from.id) ? "admin" : "user");
      }
      return;
    }

    // Help menu
    if (data === "help_menu") {
      await bot!.answerCallbackQuery(q.id);
      waitingForHelp.add(q.from.id);
      await bot!.sendMessage(chatId,
        `❓ <b>Yordam</b>\n\n✍️ Savolingizni yozing — admin tez orada javob beradi.\n\n💬 <i>Masalan: "Depozit tushmadi", "Pul yechishda muammo" va hokazo</i>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
          { text: "❌ Bekor qilish", callback_data: "cancel_help" },
        ]]}}
      );
      return;
    }

    // Cancel help
    if (data === "cancel_help") {
      waitingForHelp.delete(q.from.id);
      await bot!.answerCallbackQuery(q.id, { text: "Bekor qilindi" });
      return;
    }

    // Admin: reply to help
    if (data.startsWith("reply_help_")) {
      if (!isAdminId(q.from.id)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const targetUserId = Number(data.split("_")[2]);
      adminReplyTarget.set(q.from.id, targetUserId);
      await bot!.answerCallbackQuery(q.id, { text: "Javobingizni yozing" });
      await bot!.sendMessage(chatId,
        `📩 <b>Javob yozing:</b>\n\nQuyidagi foydalanuvchiga javob yuboriladi: <code>${targetUserId}</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Owner: adminlar boshqaruvi
    if (data === "admin_admins") {
      if (!hasPerm(q.from.id, "admins")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Faqat egasi uchun" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const rows = (await listAdmins()).filter(r => r.active && !ADMIN_IDS.has(Number(r.telegramId)));
      const kb: any[][] = rows.map(r => [{ text: `🗑 O'chirish — ${r.telegramId}`, callback_data: `admin_rmadmin_${r.telegramId}` }]);
      if (rows.length < MAX_EXTRA_ADMINS) kb.push([{ text: "➕ Moliya admini qo'shish", callback_data: "admin_addadmin" }]);
      kb.push([{ text: "🔙 Admin panel", callback_data: "admin_panel" }]);
      await bot!.sendMessage(chatId,
        `👑 <b>ADMINLAR</b>\n\n` +
        `🔒 Bosh admin: <code>${[...ADMIN_IDS].join(", ")}</code>\n\n` +
        (rows.length
          ? rows.map(r => `• <code>${r.telegramId}</code> — ${ROLE_LABEL[(r.role as AdminRole)] ?? r.role}`).join("\n")
          : "<i>Qo'shimcha admin yo'q</i>") +
        `\n\n📌 Limit: <b>${rows.length}/${MAX_EXTRA_ADMINS}</b>\n` +
        `<i>Qo'shilgan admin faqat pul kirim/chiqimni ko'radi va tasdiqlaydi.</i>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: kb } }
      );
      return;
    }

    if (data === "admin_addadmin") {
      if (!hasPerm(q.from.id, "admins")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Faqat egasi uchun" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForNewAdminId.add(q.from.id);
      await bot!.sendMessage(chatId,
        `➕ <b>Moliya admini qo'shish</b>\n\nYangi adminning Telegram ID sini yuboring:\n\n<i>Masalan: <code>123456789</code></i>\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data.startsWith("admin_rmadmin_")) {
      if (!hasPerm(q.from.id, "admins")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Faqat egasi uchun" }); return; }
      const rmId = Number(data.replace("admin_rmadmin_", ""));
      if (ADMIN_IDS.has(rmId)) { await bot!.answerCallbackQuery(q.id, { text: "❌ Bosh adminni o'chirib bo'lmaydi" }); return; }
      await bot!.answerCallbackQuery(q.id, { text: "O'chirildi" });
      DYNAMIC_ADMIN_IDS.delete(rmId);
      try { await removeAdmin(String(rmId)); } catch (err) { logger.error({ err }, "removeAdmin xato"); }
      await bot!.sendMessage(chatId, `✅ Admin o'chirildi: <code>${rmId}</code>`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👑 Adminlar", callback_data: "admin_admins" }]] } });
      return;
    }

    // Admin: ban/unban
    if (data === "admin_ban") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForBanId.add(q.from.id);
      await bot!.sendMessage(chatId,
        `🚫 <b>Ban / Unban</b>\n\nBan yoki unban qilmoqchi bo'lgan foydalanuvchining Telegram ID sini yuboring:\n\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: promo codes list
    if (data === "admin_promo") {
      if (!hasPerm(q.from.id, "promo")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const codes = await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.id)).limit(15);
      const lines = codes.length === 0 ? "Hali promo-kodlar yo'q" : codes.map((c) =>
        `🎫 <code>${c.code}</code> — ${fmt(c.amount)} UZS\n` +
        `   ${c.assignedTo ? `🔒 Shaxsiy: <code>${c.assignedTo}</code>` : "🌐 Ommaviy"} | Ishlatildi: ${c.usedCount}/${c.maxUses} | ${c.active ? "✅ Faol" : "❌ Tugagan"}`
      ).join("\n\n");
      const rows: any[][] = codes.map((c) => ([{ text: `👥 ${c.code} — kimlar oldi (${c.usedCount})`, callback_data: `admin_promo_uses_${c.id}` }]));
      rows.push([{ text: "➕ Yangi Promo Kod (ommaviy)", callback_data: "admin_promo_create" }]);
      rows.push([{ text: "🎁 Shaxsiy promokod berish", callback_data: "admin_promo_personal" }]);
      rows.push([{ text: "🔙 Admin panel", callback_data: "admin_panel" }]);
      await bot!.sendMessage(chatId,
        `🎫 <b>PROMO KODLAR</b>\n\n${lines}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: rows } }
      );
      return;
    }

    // Promokodni kimlar ishlatgani
    if (data.startsWith("admin_promo_uses_")) {
      if (!hasPerm(q.from.id, "promo")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const codeId = Number(data.replace("admin_promo_uses_", ""));
      const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, codeId));
      if (!promo) { await bot!.sendMessage(chatId, "❌ Promokod topilmadi."); return; }
      const uses = await db.select().from(promoUsesTable).where(eq(promoUsesTable.codeId, codeId));
      let body = "Hali hech kim ishlatmagan.";
      if (uses.length) {
        const parts: string[] = [];
        let n = 1;
        for (const u of uses) {
          const [pl] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(u.telegramId)));
          const when = new Date(u.createdAt).toLocaleString("uz-UZ");
          parts.push(`${n++}. ${pl?.firstName ?? "Foydalanuvchi"}${pl?.username ? ` (@${pl.username})` : ""}\n   🆔 <code>${u.telegramId}</code> | 🕒 ${when}`);
        }
        body = parts.join("\n");
      }
      await bot!.sendMessage(chatId,
        `👥 <b>${promo.code}</b> — kimlar oldi\n` +
        `💰 ${fmt(promo.amount)} UZS | ${promo.usedCount}/${promo.maxUses}\n` +
        (promo.assignedTo ? `🔒 Shaxsiy egasi: <code>${promo.assignedTo}</code>\n` : "🌐 Ommaviy kod\n") +
        `\n${body}`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Promo kodlar", callback_data: "admin_promo" }]] } }
      );
      return;
    }

    // Shaxsiy promokod: foydalanuvchi ID sini so'rash
    if (data === "admin_promo_personal") {
      if (!hasPerm(q.from.id, "promo")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForPromoPersonalId.add(q.from.id);
      await bot!.sendMessage(chatId,
        `🎁 <b>Shaxsiy promokod</b>\n\nKimga berilsin? Foydalanuvchining Telegram ID sini yuboring:\n\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Referal sovrini: to'g'ridan-to'g'ri shaxsiy promokod
    if (data.startsWith("admin_promo_ref_")) {
      if (!hasPerm(q.from.id, "promo")) { await bot!.answerCallbackQuery(q.id, { text: "❌ Faqat bosh admin promokod beradi" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const targetId = data.replace("admin_promo_ref_", "");
      waitingForPromoTarget.set(q.from.id, targetId);
      waitingForPromoCode.add(q.from.id);
      await bot!.sendMessage(chatId,
        `🎁 <b>Shaxsiy promokod</b> — egasi: <code>${targetId}</code>\n\nKod nomini yuboring (A-Z, 0-9):\n\n<i>Masalan: REFEREE500</i>\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data.startsWith("refmsg_")) {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      const targetId = data.replace("refmsg_", "");
      waitingForSendMsg.set(q.from.id, targetId);
      await bot!.sendMessage(chatId,
        `✍️ <code>${targetId}</code> ga yuboriladigan xabarni (promokodni) yozing:\n\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "admin_promo_create") {
      if (!isAdmin) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      await bot!.answerCallbackQuery(q.id);
      waitingForPromoCode.add(q.from.id);
      await bot!.sendMessage(chatId,
        `🎫 <b>Yangi Promo Kod</b>\n\nKod nomini yuboring (faqat lotin harflari va raqamlar):\n\n<i>Masalan: SUMMER2024</i>\n<i>Bekor qilish: /cancel</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Reyting
    if (data === "reyting") {
      await bot!.answerCallbackQuery(q.id);
      try {
        const resp = await fetch(`http://localhost:${process.env.PORT || 8080}/api/game/leaderboard`);
        const lb = await resp.json() as { topDepositors: any[]; topWithdrawers: any[] };

        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
        const fmtEntry = (e: any, i: number) => {
          const medal = medals[i] ?? `${i+1}.`;
          const name = e.username ? `@${e.username}` : e.firstName;
          const amt = Number(e.amount) || 0;
          return `${medal} ${name} — <b>${fmt(amt)} UZS</b>`;
        };

        const depositors = (lb.topDepositors || []).slice(0, 5).map(fmtEntry).join("\n") || "—";
        const withdrawers = (lb.topWithdrawers || []).slice(0, 5).map(fmtEntry).join("\n") || "—";

        // User's own stats
        const [me] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
        const myDeposited = me?.totalDeposited ?? 0;
        const myWithdrawn = me?.totalWithdrawn ?? 0;
        const myGames = me?.gamesPlayed ?? 0;

        await bot!.sendMessage(chatId,
          `🏆 <b>REYTING</b>\n\n` +
          `🎯 <b>Sizning natijangiz:</b>\n` +
          `🎮 O'yinlar: <b>${myGames}</b>  |  💰 Tashlagan: <b>${fmt(myDeposited)} UZS</b>  |  💸 Chiqargan: <b>${fmt(myWithdrawn)} UZS</b>\n\n` +
          `💰 <b>Ko'p Pul Tashlaganlar (Top 5):</b>\n${depositors}\n\n` +
          `💸 <b>Ko'p Pul Chiqarganlar (Top 5):</b>\n${withdrawers}`,
          { parse_mode: "HTML" }
        );
      } catch {
        await bot!.sendMessage(chatId, "❌ Reyting yuklanmadi. Keyinroq urinib ko'ring.", { parse_mode: "HTML" });
      }
      return;
    }

    await bot!.answerCallbackQuery(q.id);

    } catch (err) {
      logger.error({ err, data, userId: q.from.id }, "Callback query xatosi");
      try { await bot!.answerCallbackQuery(q.id, { text: "❌ Xato yuz berdi, qayta urinib ko'ring" }); } catch {}
    }
  };
  bot.on("callback_query", cbQueryHandler);
  _cbHandler = cbQueryHandler;

  bot.on("polling_error", (e) => logger.error({ err: e }, "Bot polling error"));
}
