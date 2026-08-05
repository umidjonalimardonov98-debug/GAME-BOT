import app from "./app";
import { logger } from "./lib/logger";
import { startBot } from "./bot";
import { execSync } from "child_process";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ensureGameSettingsColumns } from "./lib/games-catalog";
import { ensureExtraSchema } from "./lib/schema-guard";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set — skipping migrations");
    return;
  }
  try {
    logger.info("Running database migrations...");
    execSync("pnpm --filter @workspace/db run push-force", {
      stdio: "inherit",
      cwd: "/app",
    });
    logger.info("Database migrations complete");
  } catch (err) {
    logger.error({ err }, "Migration failed — continuing anyway");
  }
  await ensureGameSettingsColumns(db, sql);
  await ensureExtraSchema(db, sql);
}

async function main() {
  await runMigrations();

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    try {
      await startBot();
      logger.info("Bot handlers registered successfully");
    } catch (err) {
      logger.error({ err }, "Bot start failed");
    }
  } else {
    logger.info("Bot disabled in development");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
