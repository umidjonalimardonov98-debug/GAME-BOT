import { Router, type IRouter } from "express";
import { and, gt, gte, lt, desc, sql } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import { isAdminSync } from "../lib/admins";

/**
 * Ommaviy chat — barcha o'yinchilar bir-birini ko'radi.
 * Xabarlar bazada saqlanadi (server qayta ishga tushsa ham yo'qolmaydi)
 * va 1 soatdan keyin avtomatik o'chadi.
 */

const TTL_MS = 60 * 60 * 1000; // 1 soat

/** oxirgi yozgan vaqt — spam himoyasi */
const lastSend = new Map<string, number>();

let lastCleanup = 0;
async function cleanup() {
  if (Date.now() - lastCleanup < 30_000) return;
  lastCleanup = Date.now();
  try {
    await db.delete(chatMessagesTable).where(lt(chatMessagesTable.createdAt, new Date(Date.now() - TTL_MS)));
  } catch {
    // jadval hali yaratilmagan bo'lishi mumkin
  }
}

function shape(m: { id: number; telegramId: string; name: string; username: string | null; text: string; admin: boolean; createdAt: Date }, me: string) {
  return {
    id: m.id,
    userId: m.telegramId,
    name: m.name,
    username: m.username,
    text: m.text,
    admin: m.admin,
    at: new Date(m.createdAt).getTime(),
    mine: m.telegramId === me,
  };
}

const router: IRouter = Router();

/** Yangi xabarlar oqimi */
router.get("/chat/feed", async (req, res) => {
  await cleanup();
  const since = Number(req.query.since ?? 0) || 0;
  const me = String(req.query.telegramId ?? "");
  const fresh = new Date(Date.now() - TTL_MS);
  try {
    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(and(gt(chatMessagesTable.id, since), gte(chatMessagesTable.createdAt, fresh)))
      .orderBy(desc(chatMessagesTable.id))
      .limit(80);
    const list = rows.reverse().map((m) => shape(m as any, me));
    const [{ cnt } = { cnt: 0 }] = (await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(chatMessagesTable)
      .where(gte(chatMessagesTable.createdAt, fresh))) as any[];
    res.json({
      messages: list,
      lastId: list.length ? list[list.length - 1]!.id : since,
      total: Number(cnt ?? 0),
    });
  } catch {
    res.json({ messages: [], lastId: since, total: 0 });
  }
});

/** Xabar yuborish */
router.post("/chat/send", async (req, res) => {
  try {
    await cleanup();
    const { telegramId, name, username, text } = req.body ?? {};
    const id = String(telegramId ?? "").trim();
    const body = String(text ?? "").trim().slice(0, 300);
    if (!id) return res.status(400).json({ error: "telegramId kerak" });
    if (!body) return res.status(400).json({ error: "Xabar bo'sh" });

    const prev = lastSend.get(id) ?? 0;
    if (Date.now() - prev < 1200) return res.status(429).json({ error: "Sekinroq yozing" });
    lastSend.set(id, Date.now());

    const [row] = await db
      .insert(chatMessagesTable)
      .values({
        telegramId: id,
        name: String(name || "O'yinchi").slice(0, 32),
        username: username ? String(username).slice(0, 32) : null,
        text: body,
        admin: isAdminSync(id),
      })
      .returning();

    return res.json({ ok: true, message: shape(row as any, id) });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

export default router;
