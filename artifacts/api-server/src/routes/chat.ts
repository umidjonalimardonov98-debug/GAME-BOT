import { Router, type IRouter } from "express";
import { and, gt, gte, lt, desc, sql } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import { isAdminSync } from "../lib/admins";

/**
 * Ommaviy chat — barcha o'yinchilar bir-birini ko'radi.
 * Matn, rasm va ovozli xabar. Xabarlar bazada saqlanadi va 10 soatdan keyin o'chadi.
 */

const TTL_MS = 10 * 60 * 60 * 1000; // 10 soat
const MAX_MEDIA = 700_000; // ~700KB data URL

/** oxirgi yozgan vaqt — spam himoyasi */
const lastSend = new Map<string, number>();

let archiveReady = false;
/** Arxiv jadvali — o'chirilgan xabarlar yo'qolmasin (audit uchun) */
async function ensureArchive() {
  if (archiveReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_messages_archive (
      id integer PRIMARY KEY,
      telegram_id text NOT NULL,
      name text NOT NULL,
      username text,
      text text NOT NULL,
      kind text,
      media text,
      reply_to text,
      admin boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL,
      archived_at timestamp NOT NULL DEFAULT now()
    )
  `);
  archiveReady = true;
}

let lastCleanup = 0;
/**
 * 10 soatlik siyosat: muddati o'tgan xabarlar avval arxivga ko'chiriladi,
 * keyin faol jadvaldan o'chadi. Foydalanuvchi faqat 10 soat ichidagini ko'radi.
 */
async function cleanup() {
  if (Date.now() - lastCleanup < 60_000) return;
  lastCleanup = Date.now();
  const cutoff = new Date(Date.now() - TTL_MS);
  try {
    await ensureArchive();
    // media (data URL) arxivda saqlanmaydi — joy tejaladi
    await db.execute(sql`
      INSERT INTO chat_messages_archive
        (id, telegram_id, name, username, text, kind, media, reply_to, admin, created_at)
      SELECT id, telegram_id, name, username, text, kind, NULL, reply_to, admin, created_at
      FROM chat_messages WHERE created_at < ${cutoff}
      ON CONFLICT (id) DO NOTHING
    `);
  } catch {
    // arxiv ishlamasa ham tozalash davom etadi
  }
  try {
    await db.delete(chatMessagesTable).where(lt(chatMessagesTable.createdAt, cutoff));
  } catch {
    // jadval hali yaratilmagan bo'lishi mumkin
  }
}

type Row = {
  id: number; telegramId: string; name: string; username: string | null;
  text: string; admin: boolean; createdAt: Date;
  kind?: string | null; media?: string | null; replyTo?: string | null;
};

function shape(m: Row, me: string) {
  return {
    id: m.id,
    userId: m.telegramId,
    name: m.name,
    username: m.username,
    text: m.text,
    kind: m.kind || "text",
    media: m.media || null,
    replyTo: m.replyTo || null,
    admin: m.admin,
    at: new Date(m.createdAt).getTime(),
    expiresAt: new Date(m.createdAt).getTime() + TTL_MS,
    mine: m.telegramId === me,
  };
}

const router: IRouter = Router();

/** Saqlash siyosati — mijoz "xabarlar 10 soat saqlanadi" deb ko'rsatadi */
router.get("/chat/policy", (_req, res) => {
  res.json({ ttlMs: TTL_MS, ttlHours: TTL_MS / 3_600_000, archived: true });
});

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
      .limit(60);
    const list = rows.reverse().map((m) => shape(m as any, me));
    const [{ cnt } = { cnt: 0 }] = (await db
      .select({ cnt: sql<number>`count(distinct telegram_id)::int` })
      .from(chatMessagesTable)
      .where(gte(chatMessagesTable.createdAt, fresh))) as any[];
    res.json({
      messages: list,
      lastId: list.length ? list[list.length - 1]!.id : since,
      total: Number(cnt ?? 0),
      ttlMs: TTL_MS,
    });
  } catch {
    res.json({ messages: [], lastId: since, total: 0 });
  }
});

/** Xabar yuborish — matn, rasm yoki ovoz */
router.post("/chat/send", async (req, res) => {
  try {
    await cleanup();
    const { telegramId, name, username, text, kind, media, replyTo } = req.body ?? {};
    const id = String(telegramId ?? "").trim();
    const type = ["text", "photo", "voice"].includes(String(kind)) ? String(kind) : "text";
    const body = String(text ?? "").trim().slice(0, 500);
    const data = media ? String(media) : null;

    if (!id) return res.status(400).json({ error: "telegramId kerak" });
    if (type === "text" && !body) return res.status(400).json({ error: "Xabar bo'sh" });
    if (type !== "text" && !data) return res.status(400).json({ error: "Fayl yo'q" });
    if (data && data.length > MAX_MEDIA) return res.status(413).json({ error: "Fayl juda katta (maks ~500KB)" });
    if (data && !/^data:(image|audio)\//.test(data)) return res.status(400).json({ error: "Noto'g'ri fayl" });

    const prev = lastSend.get(id) ?? 0;
    if (Date.now() - prev < 900) return res.status(429).json({ error: "Sekinroq yozing" });
    lastSend.set(id, Date.now());

    const [row] = await db
      .insert(chatMessagesTable)
      .values({
        telegramId: id,
        name: String(name || "O'yinchi").slice(0, 32),
        username: username ? String(username).slice(0, 32) : null,
        text: body,
        kind: type,
        media: data,
        replyTo: replyTo ? String(replyTo).slice(0, 120) : null,
        admin: isAdminSync(id),
      })
      .returning();

    return res.json({ ok: true, message: shape(row as any, id) });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

export default router;
