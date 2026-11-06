export type Group = { stake: number; count: number; max: number; names: string[]; expiresIn: number | null; startsIn: number | null; ownerOnline?: boolean; onlineCount?: number };
export type GroupSort = "stake" | "seats" | "time";
export function sortGroups(groups: Group[], sort: GroupSort, descending: boolean): Group[] {
  const value = (g: Group) => sort === "stake" ? g.stake : sort === "seats" ? g.max - g.count : (g.startsIn ?? g.expiresIn ?? Number.MAX_SAFE_INTEGER);
  return [...groups].sort((a, b) => (value(a) - value(b)) * (descending ? -1 : 1) || a.stake - b.stake);
}
export function countdownGroups(groups: Group[], elapsed: number): Group[] {
  return groups.map((g) => ({ ...g, expiresIn: g.expiresIn == null ? null : Math.max(0, g.expiresIn - elapsed), startsIn: g.startsIn == null ? null : Math.max(0, g.startsIn - elapsed) }))
    .filter((g) => g.startsIn != null || g.expiresIn == null || g.expiresIn > 0);
}