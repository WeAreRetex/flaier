import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { createError, type H3Event } from 'h3'

interface FlowSpec {
  root: string
  elements: Record<string, unknown>
  state?: Record<string, unknown>
}

interface FlowManifestFlow {
  id: string
  title?: string
  description?: string
  src: FlowSpec | string
  tags?: string[]
  entrypoints?: string[]
}

interface FlowManifest {
  version?: number
  defaultFlowId?: string
  flows: FlowManifestFlow[]
}

interface LoadedManifest {
  manifest: FlowManifest
  baseDir: string
}

const FLOW_SPEC_SUFFIX = '.flow.json'

export async function getFlowManifestForApi(event: H3Event): Promise<FlowManifest> {
  const loaded = await loadFlowManifest(event)

  return {
    version: loaded.manifest.version ?? 1,
    defaultFlowId: loaded.manifest.defaultFlowId,
    flows: loaded.manifest.flows.map((flow) => ({
      ...flow,
      src: `/api/flows/spec/${encodeURIComponent(flow.id)}`,
    })),
  }
}

export async function getFlowSpecById(event: H3Event, flowIdRaw: string | undefined): Promise<FlowSpec> {
  const flowId = toOptionalString(flowIdRaw)
  if (!flowId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Flow id is required.',
    })
  }

  const loaded = await loadFlowManifest(event)
  const flow = loaded.manifest.flows.find((entry) => entry.id === flowId)

  if (!flow) {
    throw createError({
      statusCode: 404,
      statusMessage: `Flow "${flowId}" was not found.`,
    })
  }

  return readFlowSource(flow, loaded.baseDir)
}

async function loadFlowManifest(event: H3Event): Promise<LoadedManifest> {
  const specsDir = await ensureFlowSpecsDir(event)
  const manifestPath = join(specsDir, 'manifest.json')

  if (existsSync(manifestPath)) {
    const payload = await readJsonFile(manifestPath)

    if (!isObject(payload) || !Array.isArray(payload.flows)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Invalid manifest at "${manifestPath}".`,
      })
    }

    return {
      manifest: normalizeManifest(payload, dirname(manifestPath)),
      baseDir: dirname(manifestPath),
    }
  }

  return {
    manifest: await buildManifestFromSpecsDir(specsDir),
    baseDir: specsDir,
  }
}

async function ensureFlowSpecsDir(event: H3Event) {
  const runtimeConfig = event.context.runtimeConfig as Record<string, unknown> | undefined
  const configured = toOptionalString(runtimeConfig?.flowSpecsDir)
  const specsDir = resolve(process.cwd(), configured ?? './flow-specs')

  await mkdir(specsDir, { recursive: true })
  return specsDir
}

function normalizeManifest(payload: Record<string, unknown>, baseDir: string): FlowManifest {
  const entries = payload.flows
  if (!Array.isArray(entries)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Manifest must include a flows array.',
    })
  }

  const ids = new Set<string>()
  const flows: FlowManifestFlow[] = []

  for (const entry of entries) {
    if (!isObject(entry)) continue

    const rawSource = entry.src
    if (!rawSource) continue

    const source = normalizeSource(rawSource, baseDir)
    if (!source) continue

    const fallbackId = typeof source === 'string'
      ? createIdFromPath(source)
      : `flow-${flows.length + 1}`

    const id = toOptionalString(entry.id) ?? fallbackId
    if (ids.has(id)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Duplicate flow id "${id}" in manifest.`,
      })
    }

    ids.add(id)

    flows.push({
      id,
      title: toOptionalString(entry.title),
      description: toOptionalString(entry.description),
      src: source,
      tags: toStringArray(entry.tags),
      entrypoints: toStringArray(entry.entrypoints),
    })
  }

  if (flows.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Manifest does not contain valid flows.',
    })
  }

  const defaultFlowId = toOptionalString(payload.defaultFlowId)

  return {
    version: typeof payload.version === 'number' ? payload.version : 1,
    defaultFlowId: defaultFlowId && ids.has(defaultFlowId) ? defaultFlowId : flows[0]?.id,
    flows,
  }
}

function normalizeSource(value: unknown, baseDir: string): FlowSpec | string | null {
  if (isFlowSpec(value)) {
    return value
  }

  if (typeof value !== 'string' || value.length === 0) {
    return null
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const resolved = resolvePathInside(baseDir, value)
  const relativePath = relative(baseDir, resolved).replace(/\\/g, '/')

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

async function buildManifestFromSpecsDir(specsDir: string): Promise<FlowManifest> {
  const files = await collectSpecFiles(specsDir)

  const flows: FlowManifestFlow[] = []
  for (const filePath of files) {
    const payload = await readJsonFile(filePath)
    if (!isFlowSpec(payload)) continue

    const metadata = getSpecMetadata(payload)
    const relativeSource = relative(specsDir, filePath).replace(/\\/g, '/')

    flows.push({
      id: createIdFromPath(filePath),
      title: metadata.title,
      description: metadata.description,
      src: relativeSource.startsWith('.') ? relativeSource : `./${relativeSource}`,
    })
  }

  if (flows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `No *.flow.json files found in "${specsDir}" and no manifest.json is available.`,
    })
  }

  return {
    version: 1,
    defaultFlowId: flows[0]?.id,
    flows,
  }
}

async function collectSpecFiles(specsDir: string) {
  const files: string[] = []
  const stack: string[] = [specsDir]

  while (stack.length > 0) {
    const currentDir = stack.pop()
    if (!currentDir) continue

    const entries = await readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }

      if (entry.isFile() && entry.name.endsWith(FLOW_SPEC_SUFFIX)) {
        files.push(fullPath)
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b))
  return files
}

async function readFlowSource(flow: FlowManifestFlow, baseDir: string): Promise<FlowSpec> {
  if (isFlowSpec(flow.src)) {
    return flow.src
  }

  const source = flow.src
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source)
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `Failed to fetch remote flow source "${source}".`,
      })
    }

    const payload = await response.json()
    if (!isFlowSpec(payload)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Remote flow source "${source}" is not a valid flow spec.`,
      })
    }

    return payload
  }

  const absolutePath = resolvePathInside(baseDir, source)
  const payload = await readJsonFile(absolutePath)

  if (!isFlowSpec(payload)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Flow source "${source}" is not a valid flow spec.`,
    })
  }

  return payload
}

function resolvePathInside(baseDir: string, inputPath: string) {
  const absolutePath = resolve(baseDir, inputPath)
  const pathRelativeToBase = relative(baseDir, absolutePath)

  if (
    pathRelativeToBase.startsWith('..')
    || pathRelativeToBase.includes(`${sep}..${sep}`)
    || pathRelativeToBase === '..'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `Path "${inputPath}" escapes flow specs directory.`,
    })
  }

  return absolutePath
}

function getSpecMetadata(spec: FlowSpec) {
  const rootElement = spec.elements[spec.root]
  const rootProps = isObject(rootElement) && isObject(rootElement.props)
    ? rootElement.props
    : null

  return {
    title: toOptionalString(rootProps?.title),
    description: toOptionalString(rootProps?.description),
  }
}

function createIdFromPath(filePath: string) {
  const fileName = basename(filePath)
  return fileName
    .replace(/\.flow\.json$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'flow'
}

async function readJsonFile(filePath: string) {
  const content = await readFile(filePath, 'utf8')
  return JSON.parse(content) as unknown
}

function isFlowSpec(value: unknown): value is FlowSpec {
  return isObject(value)
    && typeof value.root === 'string'
    && isObject(value.elements)
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined

  const result = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
  return result.length > 0 ? result : undefined
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
