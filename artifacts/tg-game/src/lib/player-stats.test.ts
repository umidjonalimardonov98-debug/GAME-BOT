import { describe, it, expect } from "vitest";
import { computeStats } from "./player-stats";
import { sanitizeFavorites, toggleFavorite } from "./favorites";

describe("computeStats", () => {
  it("counts rounds, wins and ranks most played game first", () => {
    const s = computeStats([
      { type: "win", amount: 500, game: "dice", createdAt: "2026-11-05" },
      { type: "loss", amount: 200, game: "dice", createdAt: "2026-11-05" },
      { type: "loss", amount: 100, game: "mines", createdAt: "2026-11-05" },
    ]);
    expect(s.rounds).toBe(3); expect(s.wins).toBe(1); expect(s.winRate).toBe(33);
    expect(s.net).toBe(200); expect(s.games[0]).toEqual({ key: "dice", rounds: 2, wins: 1, net: 300 });
  });
  it("returns zeros for empty history", () => { expect(computeStats([]).winRate).toBe(0); });
});
describe("favorites", () => {
  it("drops unknown keys and duplicates", () => { expect(sanitizeFavorites(["dice", "x", "dice", 5], new Set(["dice"]))).toEqual(["dice"]); });
  it("toggle adds to front and removes", () => {
    expect(toggleFavorite(["a"], "b")).toEqual(["b", "a"]);
    expect(toggleFavorite(["a", "b"], "a")).toEqual(["b"]);
  });
});
