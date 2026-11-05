# GAME-BOT frontend rules
- Use a shared allowlisted game catalog for home replay and cross-game navigation so history values cannot create arbitrary destinations.
- Replay uses existing player transaction history and opens the fresh game screen without placing a wager or restoring a previous room.
- Keep navigation palette tokens in game-navigation.css independent of per-game table artwork and mechanics.
- Run recent-game.test.ts when changing replay selection.
