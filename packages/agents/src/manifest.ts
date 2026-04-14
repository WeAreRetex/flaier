import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { autoFixSpec, formatSpecIssues, type Spec, validateSpec } from "@json-render/core";
import { validateFlowNarratorReadiness } from "./flow-ready-validation";
import {
  asNonEmptyString,
  ensureUniqueId,
  getInvocationCwd,
  getSpecMetadata,
  hasFlag,
  isFlowSpec,
  readArgValue,
  readJson,
  resolveDefaultFlowId,
  resolveFromInvocationCwd,
  type FlowManifest,
  type FlowManifestFlow,
  type FlowSpec,
  writeJson,
} from "./shared";

const args = process.argv.slice(2);

if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
  printUsage();
  process.exit(0);
}

const invocationCwd = getInvocationCwd();
const dirArg = readArgValue(args, "--dir") ?? "flow-specs";
const outArg = readArgValue(args, "--out") ?? join(dirArg, "manifest.json");
const defaultFlowIdArg = readArgValue(args, "--default");
const skipValidation = hasFlag(args, "--skip-validate");

const dir = resolveFromInvocationCwd(dirArg, invocationCwd);
const out = resolveFromInvocationCwd(outArg, invocationCwd);

const flowFiles = await collectFlowFiles(dir);

if (flowFiles.length === 0) {
  throw new Error(`No *.flow.json files found in "${dir}".`);
}

await mkdir(dirname(out), { recursive: true });

const outputDir = dirname(out);
const usedIds = new Set<string>();
const flows: FlowManifestFlow[] = [];

for (const filePath of flowFiles) {
  const spec = await readFlowSpec(filePath);

  if (!skipValidation) {
    assertSpecValidity(spec, filePath);
  }

  const metadata = getSpecMetadata(spec, filePath);
  const id = ensureUniqueId(metadata.id, usedIds);

  if (id !== metadata.id) {
    console.warn(`- adjusted duplicate id "${metadata.id}" -> "${id}" (${filePath})`);
  }

  const relativeSource = relative(outputDir, filePath).replace(/\\/g, "/");

  flows.push({
    id,
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
    entrypoints: metadata.entrypoints,
    src: relativeSource.startsWith(".") ? relativeSource : `./${relativeSource}`,
  });
}

const flowIds = flows.map((flow) => flow.id);
const preferredDefault = asNonEmptyString(defaultFlowIdArg);
const defaultFlowId = resolveDefaultFlowId(preferredDefault, flowIds);

if (preferredDefault && preferredDefault !== defaultFlowId) {
  console.warn(
    `- requested default flow "${preferredDefault}" not found, using "${defaultFlowId}"`,
  );
}

const manifest: FlowManifest = {
  version: 1,
  defaultFlowId,
  flows,
};

await writeJson(out, manifest);

console.log(`Wrote ${flows.length} flows to ${out}`);

async function collectFlowFiles(directory: string) {
  const entries: string[] = [];

  await walk(directory);

  entries.sort((a, b) => a.localeCompare(b));
  return entries;

  async function walk(currentDir: string): Promise<void> {
    for (const entry of await readdir(currentDir, { withFileTypes: true })) {
      const entryPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".flow.json")) {
        entries.push(entryPath);
      }
    }
  }
}

async function readFlowSpec(filePath: string): Promise<FlowSpec> {
  const payload = await readJson(filePath);

  if (!isFlowSpec(payload)) {
    throw new Error(`File "${filePath}" is not a valid flow spec.`);
  }

  const fixed = autoFixSpec(payload as unknown as Spec);
  return fixed.spec as FlowSpec;
}

function assertSpecValidity(spec: FlowSpec, filePath: string) {
  const schemaValidation = validateSpec(spec as unknown as Spec);
  if (!schemaValidation.valid) {
    throw new Error(
      `Invalid spec shape in "${filePath}":\n${formatSpecIssues(schemaValidation.issues)}`,
    );
  }

  const readiness = validateFlowNarratorReadiness(spec);
  if (readiness.errors.length > 0) {
    throw new Error(`Flow readiness errors in "${filePath}":\n${formatIssues(readiness.errors)}`);
  }

  if (readiness.warnings.length > 0) {
    console.warn(`- warnings for ${filePath}:\n${formatIssues(readiness.warnings)}`);
  }
}

function formatIssues(issues: string[]) {
  return issues.map((issue) => `  - ${issue}`).join("\n");
}

function printUsage() {
  console.log(
    [
      "Build a flow manifest from local *.flow.json files.",
      "",
      "Usage:",
      "  pnpm run manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json",
      "",
      "Options:",
      "  --dir <path>             Directory to scan (default: flow-specs)",
      "  --out <path>             Manifest file path (default: <dir>/manifest.json)",
      "  --default <flow-id>      Preferred default flow id",
      "  --skip-validate          Skip schema/readiness checks before writing manifest",
    ].join("\n"),
  );
}
