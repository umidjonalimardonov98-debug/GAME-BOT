import { describe, it, expect, vi } from "vitest";
import { ArenaMonitor, formatMonitor } from "./arena-monitor";
import { type Lobby } from "./arena-lobby";
const lobby = (): Lobby => ({ ownerId: "owner", createdAt: 0, openedAt: 0, starting: false, players: [{ telegramId: "owner", name: "Owner", at: 0 }] });
const inspect = (m: ArenaMonitor, l: Lobby, now: number) => m.inspect(new Map([["boxing:5000", l]]), new Map(), now, 2, 4, 30000);
describe("Railway LIVE monitor", () => {
  it("reports offline ownership, actual active players and the original 300000ms expiry without a false alarm", () => {
    const m = new ArenaMonitor(); const l = lobby();
    const s = inspect(m, l, 60000);
    expect(s.ttlMs).toBe(300000);
    expect(s.groups[0]).toMatchObject({ active: 0, ownerOnline: false, remainingMs: 240000 });
    expect(s.issues).toEqual([]);
    expect(l.createdAt).toBe(0);
  });
  it("detects an expired group that was not cleaned up", () => {
    expect(inspect(new ArenaMonitor(), lobby(), 330000).issues.map(i => i.key)).toContain("boxing:5000:expiry");
  });
  it("detects extension of the five-minute lifetime", () => {
    const m = new ArenaMonitor(); const l = lobby(); inspect(m, l, 60000); l.createdAt = 60000;
    expect(inspect(m, l, 60001).issues.map(i => i.key)).toContain("boxing:5000:ttl-reset");
  });
  it("detects a stuck room and counts fresh heartbeats only", () => {
    const m = new ArenaMonitor();
    const s = m.inspect(new Map(), new Map([["r1", { id: "r1", game: "boxing", phase: "play", deadline: 1000, revealUntil: 0, players: [{ left: false, lastSeenAt: 31000 }, { left: false, lastSeenAt: 0 }] }]]), 32000, 2, 4, 30000);
    expect(s.rooms[0].active).toBe(1); expect(s.issues[0].key).toBe("r1:stalled");
  });
  it("alerts once, reminds after five minutes and sends recovery", async () => {
    const m = new ArenaMonitor(); const send = vi.fn(async (_text: string) => {}); inspect(m, lobby(), 330000);
    await m.notify(send, 330000); await m.notify(send, 340000); expect(send).toHaveBeenCalledTimes(1);
    await m.notify(send, 630000); expect(send).toHaveBeenCalledTimes(2);
    m.inspect(new Map(), new Map(), 640000, 2, 4, 30000); await m.notify(send, 640000);
    expect(send).toHaveBeenCalledTimes(3); expect(send.mock.calls[2][0]).toContain("TIKLANDI/YOPILDI");
  });
  it("retries failed alerts without changing game state", async () => {
    const m = new ArenaMonitor(); const l = lobby(); inspect(m, l, 330000);
    const send = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    await expect(m.notify(send, 330000)).rejects.toThrow("offline"); await m.notify(send, 340000);
    expect(send).toHaveBeenCalledTimes(2); expect(l.players).toHaveLength(1);
  });
  it("waits for the stuck-start grace period", () => {
    const m = new ArenaMonitor(); const l = lobby(); l.starting = true;
    expect(inspect(m, l, 0).issues).toEqual([]);
    expect(inspect(m, l, 29999).issues).toEqual([]);
    expect(inspect(m, l, 30000).issues[0].key).toBe("boxing:5000:starting");
  });
});
