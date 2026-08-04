import { Router, type IRouter } from "express";
import { requestLiveChatFromApp, getLiveChatStatus } from "../bot";

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

export default router;
