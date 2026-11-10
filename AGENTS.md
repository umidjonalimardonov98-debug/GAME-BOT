# GAME-BOT frontend rules
- Keep LIVE lobby lifetime separate from heartbeat eligibility; disconnected owners may remain visible but only fresh players enter wagered matches.
- Open-group sorting and countdowns use pure helpers shared with focused tests so polling cannot change sort selection.
- Use a shared allowlisted game catalog for home replay and cross-game navigation so history values cannot create arbitrary destinations.
- Replay uses existing player transaction history and opens the fresh game screen without placing a wager or restoring a previous room.
- Keep navigation palette tokens in game-navigation.css independent of per-game table artwork and mechanics.
- Run recent-game.test.ts when changing replay selection.

- LIVE monitoring observes in-process lobbies and room heartbeats without starting games or changing wagers; owner-only Telegram commands expose status and batched alerts report anomalies and recovery.

- Use shared PlayingCard artwork and tokens across solo/LIVE games, retaining its source license and attribution.
- Navigation dialogs use body portals; never paint-contain a header that holds overlays.
- Reset root scroll on navigation and offset sticky headers by Telegram safe insets to avoid obscured controls.
- Durak taps use the tested legal-move affordance helper, submission lock and immediate state readback; the server remains authoritative.

- Daily Telegram reminders use UTC+5 settings, a PostgreSQL advisory lock and per-day recipient claims to prevent duplicates across Railway restarts and replicas; admin actions require the existing broadcast permission.
