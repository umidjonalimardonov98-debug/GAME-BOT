import { afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
const store = vi.hoisted(() => ({ players: new Map<string, { id: number; balance: number; totalWon: number; totalLost: number; gamesPlayed: number; totalWagered: number }>() }));
vi.mock("drizzle-orm", () => ({ eq: (_column: unknown, value: string) => value }));
vi.mock("@workspace/db", () => ({
  playersTable: { telegramId: "telegramId" }, transactionsTable: {},
  db: {
    select: () => ({ from: () => ({ where: async (id: string) => [store.players.get(id)].filter(Boolean) }) }),
    update: () => ({ set: (data: object) => ({ where: async (id: string) => Object.assign(store.players.get(id) ?? {}, data) }) }),
    insert: () => ({ values: async () => {} }),
  },
}));
vi.mock("../lib/live-settings", () => ({ getLiveSettings: async () => ({ enabled: true, timerMs: 0 }) }));
import router from "./arena";
const app = express();
app.use(express.json()); app.use(router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Test server not listening");
const base = `http://127.0.0.1:${address.port}`;
afterAll(() => { server.close(); vi.restoreAllMocks(); });
const request = async (path: string, body?: object) => {
  const response = await fetch(base + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  expect(response.status).toBe(200);
  return response.json();
};
const player = (id: string) => {
  store.players.set(id, { id: store.players.size + 1, balance: 1000000, totalWon: 0, totalLost: 0, gamesPlayed: 0, totalWagered: 0 });
  return { telegramId: id, name: id, game: "boxing", stake: 5000 };
};
describe("LIVE group API", () => {
  it("lists and allows joining an offline owner's group until exactly five minutes, then rejects polling without recreating it", async () => {
    let now = 1000000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const owner = player("owner-a");
    await request("/arena/queue", owner);
    now += 60000;
    let list = await request("/arena/rooms?game=boxing");
    expect(list.groups[0]).toMatchObject({ stake: 5000, ownerOnline: false, expiresIn: 240000 });
    const visitor = player("visitor-a");
    expect((await request("/arena/queue", visitor)).status).toBe("waiting");
    list = await request("/arena/rooms?game=boxing");
    expect(list.groups[0]).toMatchObject({ onlineCount: 1, startsIn: null, expiresIn: 240000 });
    now = 1299999;
    expect((await request("/arena/rooms?game=boxing")).groups[0].expiresIn).toBe(1);
    now = 1300000;
    expect((await request("/arena/rooms?game=boxing")).groups).toEqual([]);
    expect((await request("/arena/queue", { ...owner, poll: true })).status).toBe("expired");
    expect((await request("/arena/rooms?game=boxing")).groups).toEqual([]);
    expect(store.players.get("owner-a")?.balance).toBe(1000000);
  });
  it("starts with two present visitors but never charges or seats the disconnected owner", async () => {
    let now = 2000000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const owner = player("owner-b");
    await request("/arena/queue", owner);
    now += 60000;
    const a = player("visitor-b"); const b = player("visitor-c");
    await request("/arena/queue", a); await request("/arena/queue", b);
    now += 15000;
    await request("/arena/queue", { ...a, poll: true }); await request("/arena/queue", { ...b, poll: true });
    now += 15000;
    const match = await request("/arena/queue", { ...a, poll: true });
    expect(match.status).toBe("matched");
    const state = await request(`/arena/state?telegramId=visitor-b&roomId=${match.roomId}`);
    expect(state.players.map((p: { name: string }) => p.name)).toEqual(["visitor-b", "visitor-c"]);
    expect(store.players.get("owner-b")?.balance).toBe(1000000);
    expect(store.players.get("visitor-b")?.balance).toBe(995000);
    expect(store.players.get("visitor-c")?.balance).toBe(995000);
  });
});