import TelegramBot from "node-telegram-bot-api";
import { eq, and, isNull } from "drizzle-orm";
import { db, playersTable, depositRequestsTable, withdrawRequestsTable } from "@workspace/db";
import { logger } from "./lib/logger";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHANNEL_INVITE = process.env.CHANNEL_INVITE || "";
const CHANNEL_ID = process.env.CHANNEL_ID || "";
const ADMIN_ID = Number(process.env.ADMIN_TELEGRAM_ID || "0");
const CARD_NUMBER = process.env.CARD_NUMBER || "";
const CARD_HOLDER = process.env.CARD_HOLDER || "";
const DOMAINS = process.env.REPLIT_DOMAINS || "";
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "";
const APP_URL = RENDER_URL || (DOMAINS ? `https://${DOMAINS.split(",")[0]}` : "");
const BONUS_PERCENT = 20;

let bot: TelegramBot | null = null;
const waitingForCheck = new Map<number, number>();             // userId -> depositRequestId
const waitingForAmount = new Set<number>();                    // userId waiting to type deposit amount
const waitingForWithdrawAmount = new Set<number>();            // userId waiting to type withdraw amount
const pendingWithdraw = new Map<number, { amount: number }>(); // userId -> withdraw info
const waitingForHelp = new Set<number>();                      // userId waiting to type help question
const adminReplyTarget = new Map<number, number>();            // adminId -> targetUserId (for admin replies)

export async function notifyAdminWithdraw(opts: {
  reqId: number; telegramId: string; firstName: string; username: string | null;
  amount: number; cardNumber: string; cardHolder: string;
}) {
  if (!bot || !ADMIN_ID) return;
  try {
    await bot.sendMessage(ADMIN_ID,
      `💸 <b>PUL YECHISH SO'ROVI (WEB)</b>\n\n` +
      `👤 ${opts.firstName} (@${opts.username ?? "—"})\n` +
      `🆔 <code>${opts.telegramId}</code>\n` +
      `💵 Miqdor: <b>${fmt(opts.amount)} UZS</b>\n` +
      `💳 Karta: <code>${opts.cardNumber}</code>\n` +
      `👤 Egasi: ${opts.cardHolder}`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
        { text: "✅ To'landi", callback_data: `wd_ok_${opts.reqId}` },
        { text: "❌ Rad", callback_data: `wd_no_${opts.reqId}` },
      ]]}}
    );
  } catch (err) {
    logger.error({ err }, "notifyAdminWithdraw xato");
  }
}

function fmt(n: number) { return n.toLocaleString("uz-UZ"); }

async function checkSub(userId: number): Promise<boolean> {
  if (!bot || !CHANNEL_ID) return true;
  try {
    const m = await bot.getChatMember(CHANNEL_ID, userId);
    return ["member","administrator","creator"].includes(m.status);
  } catch { return true; }
}

async function getOrCreatePlayer(tgUser: TelegramBot.User) {
  const rows = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(tgUser.id)));
  if (rows.length) {
    await db.update(playersTable).set({ username: tgUser.username ?? null, firstName: tgUser.first_name, updatedAt: new Date() }).where(eq(playersTable.telegramId, String(tgUser.id)));
    return rows[0];
  }
  const [p] = await db.insert(playersTable).values({ telegramId: String(tgUser.id), username: tgUser.username ?? null, firstName: tgUser.first_name, lastName: tgUser.last_name ?? null, balance: 10000 }).returning();
  return p;
}

const DEPOSIT_URL = APP_URL.endsWith("/") ? `${APP_URL}deposit` : `${APP_URL}/deposit`;

async function mainMenu(chatId: number, name: string, balance: number) {
  await bot!.sendMessage(chatId,
    `🎮 <b>Salom, ${name}!</b>\n\n💰 Balansingiz: <b>${fmt(balance)} UZS</b>\n\n👇 O'yinni boshlash uchun tugmani bosing:`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: [
      [{ text: "🎮 O'YINNI BOSHLASH", web_app: { url: APP_URL } }],
      [{ text: "💰 Balansim", callback_data: "balance" }, { text: "📖 Qoidalar", callback_data: "howto" }],
      [{ text: "➕ Hisob To'ldirish", web_app: { url: DEPOSIT_URL } }, { text: "💸 Pul Yechish", callback_data: "withdraw_menu" }],
      [{ text: "🏆 Reyting", callback_data: "reyting" }, { text: "❓ Yordam", callback_data: "help_menu" }],
    ]}}
  );
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

export function processWebhookUpdate(body: object) {
  if (!bot) return;
  bot.processUpdate(body as any);
}

export async function startBot() {
  if (!TOKEN) { logger.warn("No BOT TOKEN"); return; }

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && APP_URL) {
    const webhookUrl = `${APP_URL}/api/bot-webhook`;
    bot = new TelegramBot(TOKEN, { webHook: false });
    await bot.setWebHook(webhookUrl);
    logger.info({ webhookUrl }, "Bot started (webhook mode)");
  } else {
    // Development — do NOT start polling (would conflict with production webhook)
    logger.info("Bot skipped in development (production webhook is active)");
    return;
  }

  // /start command
  bot.onText(/\/start/, async (msg) => {
    const user = msg.from; if (!user) return;
    const player = await getOrCreatePlayer(user);
    const subOk = await checkSub(user.id);
    if (!subOk) {
      await bot!.sendMessage(msg.chat.id,
        `🎮 <b>Game Botga Xush Kelibsiz!</b>\n\n⚡️ O'yin o'ynash uchun avval kanalga obuna bo'ling!`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: "📢 Kanalga Obuna Bo'lish", url: CHANNEL_INVITE }],
          [{ text: "✅ Obuna Bo'ldim", callback_data: "check_sub" }],
        ]}}
      );
      return;
    }
    await mainMenu(msg.chat.id, user.first_name, player.balance);
  });

  // Photo handler — deposit receipt
  bot.on("photo", async (msg) => {
    const userId = msg.from?.id; if (!userId) return;
    const fileId = msg.photo![msg.photo!.length - 1].file_id;

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

    if (ADMIN_ID) {
      try {
        await bot!.sendPhoto(ADMIN_ID, fileId, {
          caption:
            `💳 <b>YANGI DEPOZIT SO'ROVI</b>\n\n` +
            `👤 ${player.firstName} (@${player.username ?? "—"})\n` +
            `🆔 <code>${player.telegramId}</code>\n` +
            `💵 Miqdor: <b>${fmt(req.amount)} UZS</b>\n` +
            `🎁 Bonus (+${BONUS_PERCENT}%): <b>${fmt(req.bonusAmount)} UZS</b>\n` +
            `💰 Jami: <b>${fmt(req.amount + req.bonusAmount)} UZS</b>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[
            { text: "✅ Tasdiqlash", callback_data: `dep_ok_${reqId}` },
            { text: "❌ Rad etish", callback_data: `dep_no_${reqId}` },
          ]]}
        });
      } catch (err) {
        logger.error({ err, adminId: ADMIN_ID }, "Admin ga xabar yuborishda xato — ADMIN_TELEGRAM_ID ni tekshiring");
      }
    }
  });

  // Text handler
  bot.on("message", async (msg) => {
    if (!msg.text || !msg.from || msg.text.startsWith("/")) return;
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Admin reply to user help question
    if (userId === ADMIN_ID && adminReplyTarget.has(ADMIN_ID)) {
      const targetId = adminReplyTarget.get(ADMIN_ID)!;
      adminReplyTarget.delete(ADMIN_ID);
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
      if (isNaN(amount) || amount < 1000) {
        await bot!.sendMessage(chatId, `❌ Noto'g'ri miqdor. Kamida <b>1,000 UZS</b> kiriting:`, { parse_mode: "HTML" });
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
      if (isNaN(amount) || amount < 1000) {
        await bot!.sendMessage(chatId, `❌ Noto'g'ri miqdor. Kamida <b>1,000 UZS</b> kiriting:`, { parse_mode: "HTML" });
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

      await db.update(playersTable).set({ balance: p.balance - pw.amount, updatedAt: new Date() }).where(eq(playersTable.telegramId, String(userId)));
      const [req] = await db.insert(withdrawRequestsTable).values({
        playerId: p.id, telegramId: String(userId), amount: pw.amount, cardNumber, cardHolder,
      }).returning();

      await bot!.sendMessage(chatId, `⏳ <b>So'rovingiz adminga yuborildi!</b>`, { parse_mode: "HTML" });

      if (ADMIN_ID) {
        try {
          await bot!.sendMessage(ADMIN_ID,
            `💸 <b>PUL YECHISH SO'ROVI</b>\n\n👤 ${p.firstName} (@${p.username ?? "—"})\n🆔 <code>${p.telegramId}</code>\n💵 Miqdor: <b>${fmt(pw.amount)} UZS</b>\n💳 Karta: <code>${cardNumber}</code>\n👤 Egasi: ${cardHolder}`,
            { parse_mode: "HTML", reply_markup: { inline_keyboard: [[
              { text: "✅ To'landi", callback_data: `wd_ok_${req.id}` },
              { text: "❌ Rad", callback_data: `wd_no_${req.id}` },
            ]]}}
          );
        } catch (err) {
          logger.error({ err, adminId: ADMIN_ID }, "Admin ga yechish so'rovi yuborishda xato");
        }
      }
    }
  });

  // Callback handler
  bot.on("callback_query", async (q) => {
    if (!q.message || !q.from) return;
    const chatId = q.message.chat.id;
    const data = q.data || "";

    // Subscription check
    if (data === "check_sub") {
      const ok = await checkSub(q.from.id);
      if (!ok) { await bot!.answerCallbackQuery(q.id, { text: "❌ Hali obuna bo'lmadingiz!", show_alert: true }); return; }
      await bot!.answerCallbackQuery(q.id, { text: "✅ Tasdiqlandi!" });
      const p = await getOrCreatePlayer(q.from);
      await mainMenu(chatId, q.from.first_name, p.balance);
      return;
    }

    // Balance
    if (data === "balance") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      const wagerLeft = Math.max(0, (p?.wagerRequirement ?? 0) - (p?.totalWagered ?? 0));
      await bot!.sendMessage(chatId,
        `💰 <b>Hisobingiz</b>\n\n💵 Balans: <b>${fmt(p?.balance ?? 0)} UZS</b>\n🎮 O'yinlar: <b>${p?.gamesPlayed ?? 0}</b>\n🏆 Yutgan: <b>${fmt(p?.totalWon ?? 0)} UZS</b>\n📈 O'ynaldi: <b>${fmt(p?.totalWagered ?? 0)} UZS</b>\n` +
        (wagerLeft > 0 ? `\n⚠️ Chiqarish uchun yana <b>${fmt(wagerLeft)} UZS</b> o'ynash kerak` : `\n✅ Chiqarishga ruxsat bor`),
        { parse_mode: "HTML" }
      );
      return;
    }

    // How to
    if (data === "howto") {
      await bot!.answerCallbackQuery(q.id);
      await bot!.sendMessage(chatId,
        `📖 <b>Qanday O'ynaladi?</b>\n\n🍎 <b>Apple of Fortune</b> — Olma toping, ko'proq topsangiz ko'proq yutasiz!\n\n🎲 <b>Dice</b> — 2 zar yig'indisi 7 dan KO'P (x2.3), TENG (x5.8) yoki KAM (x2.3)\n\n✈️ <b>Aviator</b> — Koeffitsiyent oshganda "Cash Out" bosing!`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Deposit menu
    if (data === "deposit_menu") {
      await bot!.answerCallbackQuery(q.id);
      await bot!.sendMessage(chatId,
        `➕ <b>Hisob To'ldirish</b>\n\n🎁 Har qanday miqdorga <b>+${BONUS_PERCENT}% bonus</b>!\n\n💳 Karta: <code>${CARD_NUMBER}</code>\n👤 ${CARD_HOLDER}\n\nMiqdorni tanlang yoki o'zingiz kiriting:`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: "💵 10,000 UZS", callback_data: "dep_10000" }, { text: "💵 25,000 UZS", callback_data: "dep_25000" }],
          [{ text: "💵 50,000 UZS", callback_data: "dep_50000" }, { text: "💵 100,000 UZS", callback_data: "dep_100000" }],
          [{ text: "💵 250,000 UZS", callback_data: "dep_250000" }, { text: "💵 500,000 UZS", callback_data: "dep_500000" }],
          [{ text: "✍️ O'zim yozaman", callback_data: "dep_custom" }],
        ]}}
      );
      return;
    }

    // Custom deposit amount
    if (data === "dep_custom") {
      await bot!.answerCallbackQuery(q.id);
      waitingForAmount.add(q.from.id);
      await bot!.sendMessage(chatId,
        `✍️ <b>Miqdorni kiriting:</b>\n\nFaqat raqam yuboring (UZS)\nMasalan: <code>75000</code>`,
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
      if (q.from.id !== ADMIN_ID) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
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
      await bot!.sendMessage(Number(req.telegramId),
        `🎉 <b>Depozitingiz tasdiqlandi!</b>\n\n💵 Miqdor: <b>${fmt(req.amount)} UZS</b>\n🎁 Bonus: <b>+${fmt(req.bonusAmount)} UZS</b>\n💰 Jami: <b>${fmt(total)} UZS</b>\n\nO'yiningiz omadli bo'lsin! 🎮`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: reject deposit
    if (data.startsWith("dep_no_")) {
      if (q.from.id !== ADMIN_ID) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, reqId));
      if (!req) return;
      await db.update(depositRequestsTable).set({ status: "rejected" }).where(eq(depositRequestsTable.id, reqId));
      await bot!.answerCallbackQuery(q.id, { text: "❌ Rad etildi" });
      try { await bot!.editMessageCaption(`❌ RAD ETILDI`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      await bot!.sendMessage(Number(req.telegramId), `❌ <b>Depozitingiz rad etildi.</b>\nMuammo bo'lsa admin bilan bog'laning.`, { parse_mode: "HTML" });
      return;
    }

    // Withdraw menu
    if (data === "withdraw_menu") {
      await bot!.answerCallbackQuery(q.id);
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
      if (!p) return;
      const wagerLeft = Math.max(0, p.wagerRequirement - p.totalWagered);
      if (wagerLeft > 0) {
        await bot!.sendMessage(chatId,
          `💸 <b>Pul Yechish</b>\n\n⚠️ <b>Shart bajarilmagan!</b>\n\n• Kerakli: ${fmt(p.wagerRequirement)} UZS\n• O'ynaldi: ${fmt(p.totalWagered)} UZS\n• Qolgan: <b>${fmt(wagerLeft)} UZS</b>\n\n💡 Depozit miqdorini 100% o'ynasangiz pul yechi olasiz!`,
          { parse_mode: "HTML" }
        );
        return;
      }
      await bot!.sendMessage(chatId,
        `💸 <b>Pul Yechish</b>\n\n💰 Balans: <b>${fmt(p.balance)} UZS</b>\n\nMiqdorni tanlang:`,
        { parse_mode: "HTML", reply_markup: { inline_keyboard: [
          [{ text: `💵 25%  — ${fmt(Math.floor(p.balance*0.25))} UZS`, callback_data: `wd_${Math.floor(p.balance*0.25)}` }],
          [{ text: `💵 50%  — ${fmt(Math.floor(p.balance*0.50))} UZS`, callback_data: `wd_${Math.floor(p.balance*0.50)}` }],
          [{ text: `💵 75%  — ${fmt(Math.floor(p.balance*0.75))} UZS`, callback_data: `wd_${Math.floor(p.balance*0.75)}` }],
          [{ text: `💵 100% — ${fmt(p.balance)} UZS`, callback_data: `wd_${p.balance}` }],
          [{ text: "✍️ O'zim yozaman", callback_data: "wd_custom" }],
        ]}}
      );
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
      pendingWithdraw.set(q.from.id, { amount });
      await bot!.sendMessage(chatId,
        `💸 <b>Karta ma'lumotlarini yuboring:</b>\n\n<code>KARTA: 8600123456789012\nEGASI: Ismingiz Familiyangiz</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: approve withdraw
    if (data.startsWith("wd_ok_")) {
      if (q.from.id !== ADMIN_ID) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(withdrawRequestsTable).where(eq(withdrawRequestsTable.id, reqId));
      if (!req || req.status !== "pending") { await bot!.answerCallbackQuery(q.id, { text: "Allaqachon qayta ishlangan" }); return; }
      await db.update(withdrawRequestsTable).set({ status: "approved" }).where(eq(withdrawRequestsTable.id, reqId));
      await bot!.answerCallbackQuery(q.id, { text: "✅ Tasdiqlandi!" });
      try { await bot!.editMessageText(`✅ TASDIQLANDI — ${fmt(req.amount)} UZS`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      await bot!.sendMessage(Number(req.telegramId),
        `✅ <b>Pul yechish tasdiqlandi!</b>\n\n💵 <b>${fmt(req.amount)} UZS</b> kartangizga o'tkazildi.\n🏦 Karta: <code>${req.cardNumber}</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Admin: reject withdraw
    if (data.startsWith("wd_no_")) {
      if (q.from.id !== ADMIN_ID) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const reqId = Number(data.split("_")[2]);
      const [req] = await db.select().from(withdrawRequestsTable).where(eq(withdrawRequestsTable.id, reqId));
      if (!req) return;
      await db.update(withdrawRequestsTable).set({ status: "rejected" }).where(eq(withdrawRequestsTable.id, reqId));
      const [p] = await db.select().from(playersTable).where(eq(playersTable.id, req.playerId));
      await db.update(playersTable).set({ balance: p.balance + req.amount, updatedAt: new Date() }).where(eq(playersTable.id, req.playerId));
      await bot!.answerCallbackQuery(q.id, { text: "❌ Rad etildi" });
      try { await bot!.editMessageText(`❌ RAD ETILDI`, { chat_id: chatId, message_id: q.message.message_id }); } catch {}
      await bot!.sendMessage(Number(req.telegramId), `❌ <b>Pul yechish rad etildi.</b>\nBalansingiz qaytarildi.`, { parse_mode: "HTML" });
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
      if (q.from.id !== ADMIN_ID) { await bot!.answerCallbackQuery(q.id, { text: "❌ Ruxsat yo'q" }); return; }
      const targetUserId = Number(data.split("_")[2]);
      adminReplyTarget.set(ADMIN_ID, targetUserId);
      await bot!.answerCallbackQuery(q.id, { text: "Javobingizni yozing" });
      await bot!.sendMessage(chatId,
        `📩 <b>Javob yozing:</b>\n\nQuyidagi foydalanuvchiga javob yuboriladi: <code>${targetUserId}</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Reyting
    if (data === "reyting") {
      await bot!.answerCallbackQuery(q.id);
      try {
        const resp = await fetch(`http://localhost:${process.env.PORT || 8080}/api/game/leaderboard`);
        const lb = await resp.json() as { topWinners: any[]; topDepositors: any[] };

        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
        const fmtEntry = (e: any, i: number) => {
          const medal = medals[i] ?? `${i+1}.`;
          const name = e.username ? `@${e.username}` : e.firstName;
          const amt = Number(e.amount) || 0;
          return `${medal} ${name} — <b>${fmt(amt)} UZS</b>`;
        };

        const winners = lb.topWinners.slice(0, 5).map(fmtEntry).join("\n") || "—";
        const depositors = lb.topDepositors.slice(0, 5).map(fmtEntry).join("\n") || "—";

        // User's own stats
        const [me] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(q.from.id)));
        const myWon = me?.totalWon ?? 0;
        const myGames = me?.gamesPlayed ?? 0;

        await bot!.sendMessage(chatId,
          `🏆 <b>REYTING</b>\n\n` +
          `🎯 <b>Sizning natijangiz:</b>\n` +
          `🎮 O'yinlar: <b>${myGames}</b>  |  🏆 Yutgan: <b>${fmt(myWon)} UZS</b>\n\n` +
          `💰 <b>Ko'p Yutganlar (Top 5):</b>\n${winners}\n\n` +
          `💵 <b>Ko'p Tashlaganlar (Top 5):</b>\n${depositors}`,
          { parse_mode: "HTML" }
        );
      } catch {
        await bot!.sendMessage(chatId, "❌ Reyting yuklanmadi. Keyinroq urinib ko'ring.", { parse_mode: "HTML" });
      }
      return;
    }

    await bot!.answerCallbackQuery(q.id);
  });

  bot.on("polling_error", (e) => logger.error({ err: e }, "Bot polling error"));
}
