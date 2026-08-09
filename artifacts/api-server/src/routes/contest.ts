import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { getContest, getContestTop, getContestPlayerStat } from "../lib/contest";
import { getBotUsername } from "../bot";

const router: IRouter = Router();

/** Konkurs ma'lumoti + TOP 10 (ixtiyoriy: o'yinchining natijasi) */
router.get("/contest/:telegramId?", async (req, res): Promise<void> => {
  try {
    const c = await getContest();
    const top = c.startAt ? await getContestTop(sql, 10) : [];
    const botUsername = await getBotUsername();
    const rawId = (req.params as Record<string, string | undefined>)["telegramId"];
    const telegramId = rawId ? String(rawId) : "";
    const me = telegramId && c.startAt ? await getContestPlayerStat(sql, telegramId) : { count: 0, rank: null };
    res.json({
      active: c.active,
      title: c.title,
      desc: c.desc,
      startAt: c.startAt,
      endAt: c.endAt,
      prizes: c.prizes,
      top,
      me,
      botUsername,
      link: botUsername && telegramId ? `https://t.me/${botUsername}?start=ref_${telegramId}` : "",
    });
  } catch {
    res.status(500).json({ error: "contest info failed" });
  }
});

export default router;
