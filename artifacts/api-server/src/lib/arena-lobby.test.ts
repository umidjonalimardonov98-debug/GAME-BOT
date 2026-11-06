import { describe, expect, it } from "vitest";
import { activePlayers, cleanLobby, GROUP_TTL_MS, type Lobby } from "./arena-lobby";

const group = (): Lobby => ({ ownerId: "owner", createdAt: 0, openedAt: 0, starting: false, players: [{ telegramId: "owner", name: "Ali", at: 0 }] });
describe("open LIVE groups", () => {
  it("retains the disconnected owner's group for all five minutes", () => {
    const lobby = group();
    expect(GROUP_TTL_MS).toBe(300000);
    expect(cleanLobby(lobby, 299999, 2)).toBe(false);
    expect(lobby.players.map((p) => p.telegramId)).toEqual(["owner"]);
    expect(cleanLobby(lobby, 300000, 2)).toBe(true);
  });
  it("accepts visitors while offline owner is never wagered into a match", () => {
    const lobby = group();
    cleanLobby(lobby, 60000, 2);
    lobby.players.push({ telegramId: "visitor", name: "Vali", at: 60000 });
    expect(cleanLobby(lobby, 60001, 2)).toBe(false);
    expect(activePlayers(lobby, 60001).map((p) => p.telegramId)).toEqual(["visitor"]);
    lobby.players.push({ telegramId: "second", name: "Umar", at: 60001 });
    expect(activePlayers(lobby, 60002)).toHaveLength(2);
  });
  it("reconnects without extending the original expiry", () => {
    const lobby = group();
    cleanLobby(lobby, 120000, 2);
    const owner = lobby.players[0];
    if (owner) owner.at = 120000;
    expect(activePlayers(lobby, 120001)).toHaveLength(1);
    expect(lobby.createdAt).toBe(0);
    expect(cleanLobby(lobby, 300000, 2)).toBe(true);
  });
});