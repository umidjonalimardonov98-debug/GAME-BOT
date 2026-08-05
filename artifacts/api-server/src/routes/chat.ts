import { Router, type IRouter } from "express";
import { isAdminSync } from "../lib/admins";

/**
 * Ommaviy chat — barcha o'yinchilar bir-birini ko'radi.
 * Xabarlar 1 soat saqlanadi, keyin avtomatik o'chadi.
 */

type Msg = {
  id: number;
  userId: string;
  name: string;
  username: string | null;
  text: string;
  admin: boolean;
  at: number;
};

const TTL_MS = 60 * 60 * 1000; // 1 soat
const MAX = 500;
const msgs: Msg[] = [];
let seq = 1;

/** oxirgi yozgan vaqt — spam himoyasi */
const lastSend = new Map<string, number>();

function cleanup() {
  const now = Date.now();
  while (msgs.length && (now - msgs[0].at > TTL_MS || msgs.length > MAX)) msgs.shift();
}

const router: IRouter = Router();

/** Yangi xabarlar oqimi */
router.get("/chat/feed", (req, res) => {
  cleanup();
  const since = Number(req.query.since ?? 0) || 0;
  const me = String(req.query.telegramId ?? "");
  const list = msgs
    .filter((m) => m.id > since)
    .slice(-80)
    .map((m) => ({ ...m, mine: m.userId === me }));
  res.json({
    messages: list,
    lastId: msgs.length ? msgs[msgs.length - 1].id : since,
    total: msgs.length,
  });
});

/** Xabar yuborish */
router.post("/chat/send", (req, res) => {
  try {
    cleanup();
    const { telegramId, name, username, text } = req.body ?? {};
    const id = String(telegramId ?? "").trim();
    const body = String(text ?? "").trim().slice(0, 300);
    if (!id) return res.status(400).json({ error: "telegramId kerak" });
    if (!body) return res.status(400).json({ error: "Xabar bo'sh" });

    const prev = lastSend.get(id) ?? 0;
    if (Date.now() - prev < 1200) return res.status(429).json({ error: "Sekinroq yozing" });
    lastSend.set(id, Date.now());

    const admin = isAdminSync(id);
    const msg: Msg = {
      id: seq++,
      userId: id,
      name: String(name || "O'yinchi").slice(0, 32),
      username: username ? String(username).slice(0, 32) : null,
      text: body,
      admin,
      at: Date.now(),
    };
    msgs.push(msg);
    return res.json({ ok: true, message: msg });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

export default router;
