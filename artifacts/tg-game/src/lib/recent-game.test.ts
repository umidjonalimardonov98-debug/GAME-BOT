import { describe, it, expect } from "vitest";
import { mostRecentGame } from "./recent-game";
const catalog = [{ key: "apple", path: "/apple" }, { key: "dice", path: "/dice" }];
describe("last-game replay", () => {
  it("reopens the most recently played game in one destination", () => {
    expect(mostRecentGame([{game:"apple",createdAt:"2026-11-04T10:00:00Z"},{game:"dice",createdAt:"2026-11-05T09:00:00Z"}],catalog)?.path).toBe("/dice");
  });
  it("does not reopen a disabled game", () => {
    expect(mostRecentGame([{game:"dice",createdAt:"2026-11-05T09:00:00Z"},{game:"apple",createdAt:"2026-11-04T10:00:00Z"}],catalog,{dice:false})?.path).toBe("/apple");
  });
  it("rejects unknown destinations and empty history", () => {
    expect(mostRecentGame([{game:"../withdraw",createdAt:"2026-11-05T09:00:00Z"}],catalog)).toBeNull();
    expect(mostRecentGame([],catalog)).toBeNull();
  });
});
