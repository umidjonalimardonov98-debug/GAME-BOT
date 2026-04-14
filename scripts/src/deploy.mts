#!/usr/bin/env node
/**
 * Auto-deploy: Replit → GitHub → Railway
 * Pushes all source files in one commit via GitHub API.
 * Usage: pnpm --filter @workspace/scripts run deploy
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const TOKEN = process.env.GITHUB_TOKEN ?? "";
const REPO = "umidjonalimardonov23-rgb/tg-casino-bot";
const BRANCH = "main";
const ROOT = "/home/runner/workspace";

const INCLUDE_PATTERNS = [
  "artifacts/api-server/src",
  "artifacts/tg-game/src",
  "artifacts/tg-game/public",
  "lib/db/src",
  "artifacts/api-server/package.json",
  "artifacts/tg-game/package.json",
  "artifacts/tg-game/index.html",
  "artifacts/tg-game/vite.config.ts",
  "artifacts/api-server/build.mjs",
  "package.json",
  "pnpm-workspace.yaml",
  "railway.toml",
  "nixpacks.toml",
];

function collectFiles(base: string): string[] {
  const out: string[] = [];
  try {
    const st = statSync(base);
    if (st.isFile()) { out.push(base); return out; }
    for (const f of readdirSync(base)) {
      out.push(...collectFiles(join(base, f)));
    }
  } catch {}
  return out;
}

async function gh(path: string, method = "GET", body?: object) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const msg = process.argv[2] ?? `auto-deploy: ${new Date().toISOString()}`;

  // 1. Get current HEAD
  const ref = await gh(`/git/refs/heads/${BRANCH}`);
  const baseSha: string = ref.object.sha;
  const baseTree = (await gh(`/git/commits/${baseSha}`)).tree.sha;

  // 2. Collect all files
  const allFiles: string[] = [];
  for (const pattern of INCLUDE_PATTERNS) {
    allFiles.push(...collectFiles(join(ROOT, pattern)));
  }

  console.log(`📦 ${allFiles.length} files collected, building tree…`);

  // 3. Build tree blobs
  const treeItems = allFiles.map((abs) => {
    const content = readFileSync(abs, "utf-8");
    const path = relative(ROOT, abs);
    return { path, mode: "100644", type: "blob", content };
  });

  // 4. Create tree
  const newTree = await gh(`/git/trees`, "POST", { base_tree: baseTree, tree: treeItems });

  // 5. Create commit
  const newCommit = await gh(`/git/commits`, "POST", {
    message: msg,
    tree: newTree.sha,
    parents: [baseSha],
  });

  // 6. Update ref
  await gh(`/git/refs/heads/${BRANCH}`, "PATCH", { sha: newCommit.sha, force: false });

  console.log(`✅ Pushed commit ${newCommit.sha.slice(0, 7)}: "${msg}"`);
  console.log(`🚀 Railway will auto-deploy in ~1-2 minutes`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
