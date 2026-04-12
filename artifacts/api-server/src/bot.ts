import TelegramBot from "node-telegram-bot-api";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { logger } from "./lib/logger";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_INVITE = process.env.CHANNEL_INVITE || "https://t.me/+BIxGcXiUhIc5MWJi";
const CHANNEL_ID = process.env.CHANNEL_ID || "";
const DOMAINS = process.env.REPLIT_DOMAINS || "";
const APP_URL = DOMAINS ? `https://${DOMAINS.split(",")[0]}` : "";

let bot: TelegramBot | null = null;

async function checkSubscription(userId: number): Promise<boolean> {
  if (!bot || !CHANNEL_ID) return true;
  try {
    const member = await bot.getChatMember(CHANNEL_ID, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return true;
  }
}

async function syncPlayer(tgUser: TelegramBot.User) {
  try {
    const existing = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(tgUser.id)));
    if (existing.length === 0) {
      await db.insert(playersTable).values({
        telegramId: String(tgUser.id),
        username: tgUser.username ?? null,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        balance: 10000,
      });
    } else {
      await db.update(playersTable)
        .set({ username: tgUser.username ?? null, firstName: tgUser.first_name, updatedAt: new Date() })
        .where(eq(playersTable.telegramId, String(tgUser.id)));
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to sync player");
  }
}

export function startBot() {
  if (!TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, bot disabled");
    return;
  }

  bot = new TelegramBot(TOKEN, { polling: true });
  logger.info("Telegram bot started");

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    if (!user) return;

    await syncPlayer(user);

    const isSubscribed = await checkSubscription(user.id);

    if (!isSubscribed) {
      await bot!.sendMessage(chatId,
        `🎮 <b>Game Botga Xush Kelibsiz!</b>\n\n` +
        `⚡️ O'yin o'ynash uchun avval kanalga obuna bo'ling!\n\n` +
        `📢 Kanalga obuna bo'lgach, <b>/start</b> bosing`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Kanalga Obuna Bo'lish", url: CHANNEL_INVITE }],
              [{ text: "✅ Obuna Bo'ldim", callback_data: "check_sub" }],
            ]
          }
        }
      );
      return;
    }

    await sendMainMenu(chatId, user.first_name);
  });

  bot.on("callback_query", async (query) => {
    if (!query.message || !query.from) return;
    const chatId = query.message.chat.id;

    if (query.data === "check_sub") {
      const isSubscribed = await checkSubscription(query.from.id);
      if (!isSubscribed) {
        await bot!.answerCallbackQuery(query.id, { text: "❌ Hali obuna bo'lmadingiz!", show_alert: true });
        return;
      }
      await bot!.answerCallbackQuery(query.id, { text: "✅ Obuna tasdiqlandi!" });
      await syncPlayer(query.from);
      await sendMainMenu(chatId, query.from.first_name);
    }

    if (query.data === "menu_balance") {
      const [player] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(query.from.id)));
      const balance = player?.balance ?? 0;
      await bot!.answerCallbackQuery(query.id);
      await bot!.sendMessage(chatId,
        `💰 <b>Sizning Hisobingiz</b>\n\n` +
        `💵 Balans: <b>${balance.toLocaleString()} UZS</b>\n` +
        `🎮 O'yinlar: <b>${player?.gamesPlayed ?? 0}</b>\n` +
        `🏆 Jami Yutgan: <b>${(player?.totalWon ?? 0).toLocaleString()} UZS</b>\n\n` +
        `👇 O'yin ilovasini oching:`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🎮 O'yin Ochish", web_app: { url: APP_URL } }]]
          }
        }
      );
    }

    if (query.data === "menu_howtoplay") {
      await bot!.answerCallbackQuery(query.id);
      await bot!.sendMessage(chatId,
        `📖 <b>Qanday O'ynaladi?</b>\n\n` +
        `🍄 <b>Apple of Fortune</b>\n` +
        `Yashirin katakchalardan mushroom toping! Har bir mushroom topilganda koeffitsiyent oshadi. O'z vaqtida to'xta!\n\n` +
        `🎲 <b>Dice</b>\n` +
        `2 zar uloqtiriladi. Ularning yig'indisi 7 dan ko'p, teng yoki kam bo'lishini taxmin qiling:\n` +
        `• Ko'proq 7 → x2.3\n• Teng 7 → x5.8\n• Ozroq 7 → x2.3\n\n` +
        `✈️ <b>Aviator</b>\n` +
        `Samolyot uchib ko'tarilganda koeffitsiyent oshib boradi. Samolyot tushishidan <b>OLDIN</b> "Cash Out" bosing!\n\n` +
        `💡 <b>Maslahat:</b> Kichik tikishdan boshlang va strategiyangizni rivojlantiring!`,
        { parse_mode: "HTML" }
      );
    }
  });

  bot.on("polling_error", (err) => {
    logger.error({ err }, "Bot polling error");
  });
}

async function sendMainMenu(chatId: number, name: string) {
  const [player] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(chatId)));
  const balance = player?.balance ?? 10000;

  await bot!.sendMessage(chatId,
    `🎮 <b>Assalomu Alaykum, ${name}!</b>\n\n` +
    `💰 Balansingiz: <b>${balance.toLocaleString()} UZS</b>\n\n` +
    `🎰 Uch xil qiziqarli o'yin sizni kutmoqda!\n` +
    `🍄 Apple of Fortune • 🎲 Dice • ✈️ Aviator\n\n` +
    `👇 O'yin ochish uchun tugmani bosing:`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 O'YINNI BOSHLASH", web_app: { url: APP_URL } }],
          [
            { text: "💰 Balansim", callback_data: "menu_balance" },
            { text: "📖 Qanday O'ynaladi", callback_data: "menu_howtoplay" },
          ],
        ]
      }
    }
  );
}
