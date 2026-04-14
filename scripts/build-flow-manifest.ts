import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";

interface FlowFileMetadata {
  id: string;
  title?: string;
  description?: string;
  src: string;
}

interface ManifestOutput {
  version: number;
  defaultFlowId?: string;
  flows: FlowFileMetadata[];
}

const args = process.argv.slice(2);
const dir = readArgValue(args, "--dir") ?? "flow-specs";
const out = readArgValue(args, "--out") ?? join(dir, "manifest.json");
const defaultFlowId = readArgValue(args, "--default");

const flowFiles = await collectFlowFiles(dir);

if (flowFiles.length === 0) {
  throw new Error(`No *.flow.json files found in "${dir}".`);
}

const outputDir = dirname(out);
const flows: FlowFileMetadata[] = [];

for (const filePath of flowFiles) {
  const metadata = await readFlowMetadata(filePath);
  const relativeSource = relative(outputDir, filePath).replace(/\\/g, "/");

  flows.push({
    id: metadata.id,
    title: metadata.title,
    description: metadata.description,
    src: relativeSource.startsWith(".") ? relativeSource : `./${relativeSource}`,
  });
}

const manifest: ManifestOutput = {
  version: 1,
  defaultFlowId: resolveDefaultFlowId(defaultFlowId, flows),
  flows,
};

await mkdir(outputDir, { recursive: true });
await writeFile(out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Wrote ${flows.length} flows to ${out}`);

function readArgValue(argv: string[], key: string) {
  const index = argv.indexOf(key);
  if (index < 0) return undefined;

  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

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

async function readFlowMetadata(filePath: string) {
  const text = await readFile(filePath, "utf8");
  const payload = JSON.parse(text) as unknown;

  if (!isObject(payload) || typeof payload.root !== "string" || !isObject(payload.elements)) {
    throw new Error(`Invalid flow spec shape in "${filePath}".`);
  }

  const rootElement = payload.elements[payload.root];
  const rootProps =
    isObject(rootElement) && isObject(rootElement.props) ? rootElement.props : undefined;

  const title = toOptionalString(rootProps?.title);
  const description = toOptionalString(rootProps?.description);

  return {
    id: createIdFromFile(filePath),
    title,
    description,
  };
}

function resolveDefaultFlowId(preferred: string | undefined, flows: FlowFileMetadata[]) {
  if (preferred && flows.some((flow) => flow.id === preferred)) {
    return preferred;
  }

  return flows[0]?.id;
}

function createIdFromFile(filePath: string) {
  const fileName = basename(filePath);
  const withoutExt = fileName.slice(0, fileName.length - extname(fileName).length);

  return (
    withoutExt
      .replace(/\.flow$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "flow"
  );
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
