import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const releaseType = process.argv[2] ?? "patch";

if (!["patch", "minor", "major"].includes(releaseType)) {
  throw new Error(`Unsupported release type: ${releaseType}`);
}

const releaseFiles = [
  "CHANGELOG.md",
  "package.json",
  "apps/docs/package.json",
  "apps/slides/package.json",
  "apps/viewer/package.json",
  "packages/agents/package.json",
  "packages/core/package.json",
  "packages/nuxt/package.json",
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const changelogenArgs = ["exec", "changelogen", "--bump", "--output"];

if (releaseType !== "patch") {
  changelogenArgs.push(`--${releaseType}`);
}

run("vp", changelogenArgs);
run("node", ["./scripts/sync-workspace-version.mjs"]);

const version = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8")).version;

run("git", ["add", ...releaseFiles]);
run("git", ["commit", "-m", `chore(release): v${version}`]);
run("git", ["tag", `v${version}`]);
