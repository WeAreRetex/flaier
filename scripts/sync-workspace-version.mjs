import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const manifestPaths = [
  "package.json",
  "apps/docs/package.json",
  "apps/slides/package.json",
  "apps/viewer/package.json",
  "packages/agents/package.json",
  "packages/core/package.json",
  "packages/nuxt/package.json",
];

const dependencySections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeWorkspaceDependencies(manifest) {
  for (const section of dependencySections) {
    const dependencies = manifest[section];
    if (!dependencies) continue;

    for (const [name, range] of Object.entries(dependencies)) {
      if (!name.startsWith("@flaier/")) continue;
      if (typeof range !== "string") continue;
      if (!range.startsWith("../")) continue;

      dependencies[name] = "workspace:*";
    }
  }
}

const rootManifestPath = resolve(rootDir, "package.json");
const rootManifest = readJson(rootManifestPath);
const version = rootManifest.version;

for (const relativePath of manifestPaths.slice(1)) {
  const manifestPath = resolve(rootDir, relativePath);
  const manifest = readJson(manifestPath);
  manifest.version = version;
  normalizeWorkspaceDependencies(manifest);
  writeJson(manifestPath, manifest);
}
