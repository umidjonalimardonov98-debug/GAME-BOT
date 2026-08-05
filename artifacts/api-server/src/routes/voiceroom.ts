import { Router, type IRouter } from "express";

/**
 * Jonli ovozli xona (guruhdagi jonli chat kabi).
 * Foydalanuvchi mikrofonni bosib turib gapiradi -> qisqa audio bo'lak (clip)
 * serverga tushadi va xonadagi hammaga ketma-ket eshittiriladi.
 * Barchasi xotirada saqlanadi (oxirgi 3 daqiqa).
 */

type Clip = {
  id: number;
  userId: string;
  name: string;
  seconds: number;
  mime: string;
  at: number;
  buf: Buffer;
};

const CLIP_TTL_MS = 3 * 60 * 1000;
const MAX_CLIPS = 200;
const clips: Clip[] = [];
let clipSeq = 1;

type Member = { id: string; name: string; at: number; talkingUntil: number };
const members = new Map<string, Member>();
const ONLINE_MS = 25_000;

function cleanup() {
  const now = Date.now();
  while (clips.length && (now - clips[0].at > CLIP_TTL_MS || clips.length > MAX_CLIPS)) clips.shift();
  for (const [k, m] of members) if (now - m.at > ONLINE_MS) members.delete(k);
}

function onlineList() {
  cleanup();
  const now = Date.now();
  return [...members.values()]
    .sort((a, b) => b.at - a.at)
    .map((m) => ({ id: m.id, name: m.name, talking: m.talkingUntil > now }));
}

const router: IRouter = Router();

/** Xonaga ulanish / online belgisi (har 8 soniyada chaqiriladi) */
router.post("/voice-room/heartbeat", (req, res) => {
  const { telegramId, name } = req.body ?? {};
  const id = String(telegramId ?? "").trim();
  if (!id) return res.status(400).json({ error: "telegramId kerak" });
  const prev = members.get(id);
  members.set(id, {
    id,
    name: String(name || prev?.name || "O'yinchi").slice(0, 32),
    at: Date.now(),
    talkingUntil: prev?.talkingUntil ?? 0,
  });
  return res.json({ ok: true, online: onlineList() });
});

/** Xonadan chiqish */
router.post("/voice-room/leave", (req, res) => {
  const id = String(req.body?.telegramId ?? "");
  members.delete(id);
  res.json({ ok: true });
});

/** Gapiryapti indikatori */
router.post("/voice-room/talking", (req, res) => {
  const id = String(req.body?.telegramId ?? "");
  const m = members.get(id);
  if (m) { m.at = Date.now(); m.talkingUntil = Date.now() + 2500; }
  res.json({ ok: true });
});

/** Ovozli bo'lak yuborish */
router.post("/voice-room/push", (req, res) => {
  try {
    const { telegramId, name, audioBase64, mime, seconds } = req.body ?? {};
    const id = String(telegramId ?? "").trim();
    if (!id) return res.status(400).json({ error: "telegramId kerak" });
    const raw = String(audioBase64 || "").replace(/^data:[^,]+,/, "");
    if (!raw) return res.status(400).json({ error: "Ovoz bo'sh" });
    const buf = Buffer.from(raw, "base64");
    if (!buf.length || buf.length > 6 * 1024 * 1024) return res.status(400).json({ error: "Ovoz hajmi mos emas" });
    cleanup();
    const clip: Clip = {
      id: clipSeq++,
      userId: id,
      name: String(name || members.get(id)?.name || "O'yinchi").slice(0, 32),
      seconds: Math.max(1, Math.round(Number(seconds) || 1)),
      mime: String(mime || "audio/webm"),
      at: Date.now(),
      buf,
    };
    clips.push(clip);
    const m = members.get(id);
    if (m) { m.at = Date.now(); m.talkingUntil = 0; }
    return res.json({ ok: true, id: clip.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

/** Yangi bo'laklar ro'yxati (audio o'zi alohida so'raladi) */
router.get("/voice-room/feed", (req, res) => {
  cleanup();
  const since = Number(req.query.since ?? 0) || 0;
  const me = String(req.query.telegramId ?? "");
  const list = clips
    .filter((c) => c.id > since)
    .slice(-20)
    .map((c) => ({ id: c.id, userId: c.userId, name: c.name, seconds: c.seconds, at: c.at, mine: c.userId === me }));
  res.json({ clips: list, online: onlineList(), lastId: clips.length ? clips[clips.length - 1].id : since });
});

/** Bo'lak audiosi */
router.get("/voice-room/clip/:id", (req, res) => {
  const c = clips.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).end();
  res.setHeader("Content-Type", c.mime);
  res.setHeader("Cache-Control", "public, max-age=120");
  return res.end(c.buf);
});

export default router;
