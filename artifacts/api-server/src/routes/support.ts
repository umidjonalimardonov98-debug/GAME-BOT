import { Router, type IRouter } from "express";
import { requestLiveChatFromApp, getLiveChatStatus, getLiveChatMessages, sendLiveChatMessageFromApp, sendLiveChatVoiceFromApp } from "../bot";

const router: IRouter = Router();

/** Mini App ichidan admin bilan jonli suhbat so'rash */
router.post("/support/live-chat", async (req, res) => {
  try {
    const { telegramId, name, username } = req.body ?? {};
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    const r = await requestLiveChatFromApp({ telegramId: String(telegramId), name, username });
    if (!r.ok) return res.status(503).json({ error: r.error || "So'rov yuborilmadi" });
    return res.json(r);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

/** Suhbat holati: idle | pending | active */
router.get("/support/live-chat/:telegramId", (req, res) => {
  try {
    res.json({
      ...getLiveChatStatus(String(req.params.telegramId)),
      botUsername: process.env.BOT_USERNAME || "",
    });
  } catch {
    res.json({ status: "idle", botUsername: process.env.BOT_USERNAME || "" });
  }
});

/** Suhbat xabarlari (har bir foydalanuvchi uchun alohida) */
router.get("/support/live-chat/:telegramId/messages", (req, res) => {
  try {
    const since = Number(req.query.since ?? 0) || 0;
    res.json({ messages: getLiveChatMessages(String(req.params.telegramId), since) });
  } catch {
    res.json({ messages: [] });
  }
});

/** Mini App ichidan admin bilan yozishma */
router.post("/support/live-chat/message", async (req, res) => {
  try {
    const { telegramId, text } = req.body ?? {};
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    const r = await sendLiveChatMessageFromApp({ telegramId: String(telegramId), text: String(text ?? "") });
    if (!r.ok) return res.status(400).json({ error: r.error });
    return res.json(r);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

/** Mini App ichidan ovozli xabar */
router.post("/support/live-chat/voice", async (req, res) => {
  try {
    const { telegramId, audioBase64, mime, seconds } = req.body ?? {};
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    const r = await sendLiveChatVoiceFromApp({
      telegramId: String(telegramId),
      audioBase64: String(audioBase64 ?? ""),
      mime: mime ? String(mime) : undefined,
      seconds: Number(seconds ?? 0),
    });
    if (!r.ok) return res.status(400).json({ error: r.error });
    return res.json(r);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

export default router;
