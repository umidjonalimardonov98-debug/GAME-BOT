import { activePlayers, GROUP_TTL_MS, type Lobby } from "./arena-lobby";

export const MONITOR_INTERVAL_MS = 10_000;
const GRACE_MS = 30_000;
const REMINDER_MS = 5 * 60_000;
export type MonitoredRoom = {
  id: string; game: string; phase: string; deadline: number; revealUntil: number;
  players: { left: boolean; lastSeenAt?: number }[];
};
export type MonitorIssue = { key: string; message: string };
export type MonitorSnapshot = {
  checkedAt: number; ttlMs: number; groups: { key: string; state: string; players: number; active: number; ownerOnline: boolean; remainingMs: number }[];
  rooms: { id: string; game: string; phase: string; active: number; players: number }[];
  issues: MonitorIssue[];
};

/** Observation only: never starts games, changes wagers, or submits player moves. */
export class ArenaMonitor {
  private seen = new Map<string, { createdAt: number; startingAt: number | null }>();
  private delivered = new Map<string, number>();
  private pendingRecovery = new Map<string, MonitorIssue>();
  private previous = new Map<string, MonitorIssue>();
  private busy = false;
  snapshot: MonitorSnapshot = { checkedAt: 0, ttlMs: GROUP_TTL_MS, groups: [], rooms: [], issues: [] };

  inspect(lobbies: Map<string, Lobby>, rooms: Map<string, MonitoredRoom>, now: number, min: number, max: number, waitMs: number): MonitorSnapshot {
    const issues: MonitorIssue[] = [];
    const add = (key: string, message: string) => issues.push({ key, message });
    const groups = [...lobbies].map(([key, lobby]) => {
      const prior = this.seen.get(key);
      const startingAt = lobby.starting ? prior?.startingAt ?? now : null;
      this.seen.set(key, { createdAt: lobby.createdAt, startingAt });
      const active = activePlayers(lobby, now).length;
      const age = now - lobby.createdAt;
      if (!Number.isFinite(age) || age < 0) add(`${key}:clock`, `${key}: xona yaratilish vaqti noto'g'ri.`);
      if (prior && lobby.createdAt > prior.createdAt && !lobby.starting) add(`${key}:ttl-reset`, `${key}: 5 daqiqalik muddat qayta boshlangan.`);
      if (age >= GROUP_TTL_MS + GRACE_MS && active < min && !lobby.starting) add(`${key}:expiry`, `${key}: muddati tugagan xona yopilmagan.`);
      if (startingAt !== null && now - startingAt >= GRACE_MS) add(`${key}:starting`, `${key}: o'yinni boshlash 30 soniyadan ko'p kutmoqda.`);
      if (!lobby.starting && active >= min && now - lobby.openedAt > waitMs + GRACE_MS) add(`${key}:waiting`, `${key}: faol o'yinchilar yetarli, lekin o'yin boshlanmagan.`);
      if (lobby.players.length > max || new Set(lobby.players.map(p => p.telegramId)).size !== lobby.players.length) add(`${key}:seats`, `${key}: o'rinlar yoki takroriy o'yinchi xatosi.`);
      return { key, state: lobby.starting ? "starting" : "waiting", players: lobby.players.length, active, ownerOnline: activePlayers(lobby, now).some(p => p.telegramId === lobby.ownerId), remainingMs: Math.max(0, GROUP_TTL_MS - age) };
    });
    for (const key of this.seen.keys()) if (!lobbies.has(key)) this.seen.delete(key);
    const roomRows = [...rooms.values()].filter(r => r.phase !== "done").map(room => {
      const active = room.players.filter(p => !p.left && p.lastSeenAt !== undefined && now - p.lastSeenAt < 20_000).length;
      const deadline = room.phase === "reveal" ? room.revealUntil : room.deadline;
      if (now > deadline + GRACE_MS) add(`${room.id}:stalled`, `${room.game}/${room.id}: ${room.phase} holati muddatidan o'tib ketgan; faol o'yinchilar ${active}/${room.players.length}.`);
      return { id: room.id, game: room.game, phase: room.phase, active, players: room.players.length };
    });
    this.snapshot = { checkedAt: now, ttlMs: GROUP_TTL_MS, groups, rooms: roomRows, issues };
    return this.snapshot;
  }

  async notify(send: (text: string) => Promise<void>, now: number): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const current = new Map(this.snapshot.issues.map(issue => [issue.key, issue]));
      for (const [key, issue] of this.previous) if (!current.has(key) && this.delivered.has(key)) this.pendingRecovery.set(key, issue);
      for (const key of current.keys()) this.pendingRecovery.delete(key);
      this.previous = current;
      const warnings = [...current.values()].filter(issue => !this.delivered.has(issue.key) || now - (this.delivered.get(issue.key) ?? 0) >= REMINDER_MS);
      const recovered = [...this.pendingRecovery.values()];
      if (!warnings.length && !recovered.length) return;
      const text = ["LIVE MONITORING", new Date(now).toISOString(), ...warnings.map(i => `MUAMMO: ${i.message}`), ...recovered.map(i => `TIKLANDI/YOPILDI: ${i.message}`)].join("\n");
      await send(text.slice(0, 3800));
      for (const issue of warnings) this.delivered.set(issue.key, now);
      for (const issue of recovered) { this.delivered.delete(issue.key); this.pendingRecovery.delete(issue.key); }
    } finally { this.busy = false; }
  }
}

export function formatMonitor(snapshot: MonitorSnapshot): string {
  return ["LIVE MONITORING", snapshot.checkedAt ? new Date(snapshot.checkedAt).toISOString() : "Birinchi tekshiruv kutilmoqda", `Saqlash: ${snapshot.ttlMs / 1000} soniya`, `Ochiq guruhlar: ${snapshot.groups.length}`, `Jonli xonalar: ${snapshot.rooms.length}`, `Muammolar: ${snapshot.issues.length}`, ...snapshot.groups.slice(0, 20).map(g => `${g.key}: ${g.state}, faol ${g.active}/${g.players}, egasi ${g.ownerOnline ? "onlayn" : "oflayn"}, qolgan ${Math.ceil(g.remainingMs / 1000)}s`), ...snapshot.rooms.slice(0, 20).map(r => `${r.game}/${r.id}: ${r.phase}, faol ${r.active}/${r.players}`)].join("\n");
}
