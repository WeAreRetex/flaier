import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

export interface FlowElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
}

export interface FlowSpec {
  root: string;
  elements: Record<string, FlowElement>;
  state?: Record<string, unknown>;
}

export interface FlowManifestFlow {
  id: string;
  title?: string;
  description?: string;
  src: FlowSpec | string;
  tags?: string[];
  entrypoints?: string[];
}

export interface FlowManifest {
  version?: number;
  defaultFlowId?: string;
  flows: FlowManifestFlow[];
}

export interface FlowSpecMetadata {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
  entrypoints?: string[];
}

export function getInvocationCwd() {
  return process.env.FLOW_NARRATOR_ROOT ?? process.env.INIT_CWD ?? process.cwd();
}

export function resolveFromInvocationCwd(value: string, invocationCwd = getInvocationCwd()) {
  return resolve(invocationCwd, value);
}

export async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(path: string) {
  if (!(await pathExists(path))) {
    throw new Error(`File does not exist: ${path}`);
  }

  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function writeJson(path: string, payload: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function readArgValue(argv: string[], key: string) {
  const index = argv.indexOf(key);
  if (index < 0) return undefined;

  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

export function hasFlag(argv: string[], key: string) {
  return argv.includes(key);
}

export function slugifyId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "flow";
}

export function createIdFromFilePath(filePath: string) {
  const fileName = basename(filePath);
  const withoutExt = fileName.slice(0, fileName.length - extname(fileName).length);

  return slugifyId(withoutExt.replace(/\.flow$/i, ""));
}

export function ensureUniqueId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  let next = `${baseId}-${suffix}`;

  while (usedIds.has(next)) {
    suffix += 1;
    next = `${baseId}-${suffix}`;
  }

  usedIds.add(next);
  return next;
}

export function resolveDefaultFlowId(preferred: string | undefined, flowIds: string[]) {
  if (preferred && flowIds.includes(preferred)) {
    return preferred;
  }

  return flowIds[0];
}

export function isFlowManifest(value: unknown): value is FlowManifest {
  return isObject(value) && Array.isArray(value.flows);
}

export function isFlowSpec(value: unknown): value is FlowSpec {
  if (!isObject(value)) return false;
  return typeof value.root === "string" && isObject(value.elements);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const result = value.filter((entry): entry is string => {
    return typeof entry === "string" && entry.length > 0;
  });

  return result.length > 0 ? result : undefined;
}

export function getSpecMetadata(spec: FlowSpec, filePath?: string): FlowSpecMetadata {
  const rootElement = spec.elements[spec.root];
  const rootProps = isObject(rootElement) && isObject(rootElement.props) ? rootElement.props : {};

  const title = toOptionalString(rootProps.title);
  const description = toOptionalString(rootProps.description);
  const preferredId = toOptionalString(rootProps.flowId) ?? toOptionalString(rootProps.id);
  const tags = toStringArray(rootProps.tags);
  const entrypoints = toStringArray(rootProps.entrypoints);
  const fallbackId = filePath ? createIdFromFilePath(filePath) : slugifyId(title ?? spec.root);

  return {
    id: slugifyId(preferredId ?? fallbackId),
    title,
    description,
    tags,
    entrypoints,
  };
}
