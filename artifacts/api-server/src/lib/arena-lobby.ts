export const GROUP_TTL_MS = 5 * 60_000;
export const PRESENCE_MS = 20_000;
export type LobbyPlayer = { telegramId: string; name: string; at: number };
export type Lobby = { ownerId: string; players: LobbyPlayer[]; openedAt: number; createdAt: number; starting: boolean };

export function activePlayers(lobby: Lobby, now: number): LobbyPlayer[] {
  return lobby.players.filter((p) => now - p.at < PRESENCE_MS);
}

export function cleanLobby(lobby: Lobby, now: number, min: number): boolean {
  if (lobby.starting) return false;
  lobby.players = lobby.players.filter((p) => p.telegramId === lobby.ownerId || now - p.at < PRESENCE_MS);
  const active = activePlayers(lobby, now).length;
  if (active < min) lobby.openedAt = now;
  return now - lobby.createdAt >= GROUP_TTL_MS && active < min;
}