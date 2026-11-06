import { describe, expect, it } from "vitest";
import { countdownGroups, sortGroups, type Group } from "./arena-groups";
const groups: Group[] = [
  { stake: 25000, count: 3, max: 4, names: [], expiresIn: 240000, startsIn: 15000 },
  { stake: 5000, count: 1, max: 4, names: [], expiresIn: 120000, startsIn: null },
  { stake: 10000, count: 2, max: 4, names: [], expiresIn: 290000, startsIn: 25000 },
];
describe("group sorting", () => {
  it("sorts stake in either direction", () => {
    expect(sortGroups(groups, "stake", false).map((g) => g.stake)).toEqual([5000, 10000, 25000]);
    expect(sortGroups(groups, "stake", true).map((g) => g.stake)).toEqual([25000, 10000, 5000]);
  });
  it("sorts by actual available seats in either direction", () => {
    expect(sortGroups(groups, "seats", true).map((g) => g.count)).toEqual([1, 2, 3]);
    expect(sortGroups(groups, "seats", false).map((g) => g.count)).toEqual([3, 2, 1]);
  });
  it("sorts by the current start or expiry countdown in either direction", () => {
    expect(sortGroups(groups, "time", false).map((g) => g.stake)).toEqual([25000, 10000, 5000]);
    expect(sortGroups(groups, "time", true).map((g) => g.stake)).toEqual([5000, 10000, 25000]);
  });
  it("keeps remaining time accurate and removes expired open groups", () => {
    expect(countdownGroups(groups, 1000)[0]?.startsIn).toBe(14000);
    expect(countdownGroups(groups, 120000).map((g) => g.stake)).toEqual([25000, 10000]);
  });
});