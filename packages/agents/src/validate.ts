import { dirname, resolve } from 'node:path'
import { autoFixSpec, formatSpecIssues, type Spec, validateSpec } from '@json-render/core'

const args = Bun.argv.slice(2)
const input = args[0]
const invocationCwd = process.env.FLOW_NARRATOR_ROOT ?? process.env.INIT_CWD ?? process.cwd()

if (!input) {
  throw new Error('Usage: bun ./src/validate.ts <spec-or-manifest.json>')
}

const absoluteInput = resolve(invocationCwd, input)
const payload = await readJson(absoluteInput)

if (isManifest(payload)) {
  await validateManifest(payload, dirname(absoluteInput))
  process.exit(0)
}

if (isSpec(payload)) {
  validateAndPrintSpec(payload, absoluteInput)
  process.exit(0)
}

throw new Error(`"${input}" is neither a flow manifest nor a flow spec.`)

async function validateManifest(
  manifest: { defaultFlowId?: unknown; flows: unknown[] },
  manifestDir: string,
) {
  const flowIds = new Set<string>()

  if (manifest.flows.length === 0) {
    throw new Error('Manifest has no flows.')
  }

  let totalSpecs = 0

  for (const [index, flow] of manifest.flows.entries()) {
    if (!isObject(flow)) {
      throw new Error(`Flow entry at index ${index} is not an object.`)
    }

    const id = asNonEmptyString(flow.id)
    if (!id) {
      throw new Error(`Flow entry at index ${index} is missing a valid id.`)
    }

    if (flowIds.has(id)) {
      throw new Error(`Duplicate flow id "${id}".`)
    }
    flowIds.add(id)

    const source = flow.src
    if (typeof source === 'string') {
      if (/^https?:\/\//i.test(source)) {
        console.log(`- ${id}: remote source (${source}) skipped`) 
        continue
      }

      const sourcePath = resolve(manifestDir, source)
      const sourceFile = Bun.file(sourcePath)
      if (!(await sourceFile.exists())) {
        throw new Error(`Flow "${id}" source does not exist: ${sourcePath}`)
      }

      const specPayload = await readJson(sourcePath)
      if (!isSpec(specPayload)) {
        throw new Error(`Flow "${id}" source is not a valid spec: ${sourcePath}`)
      }

      validateAndPrintSpec(specPayload, sourcePath, id)
      totalSpecs += 1
      continue
    }

    if (isSpec(source)) {
      validateAndPrintSpec(source, `${input}#${id}`, id)
      totalSpecs += 1
      continue
    }

    throw new Error(`Flow "${id}" has invalid src value.`)
  }

  const defaultFlowId = asNonEmptyString(manifest.defaultFlowId)
  if (defaultFlowId && !flowIds.has(defaultFlowId)) {
    throw new Error(`Manifest defaultFlowId "${defaultFlowId}" does not exist in flows.`)
  }

  console.log(`Validated manifest with ${flowIds.size} flows (${totalSpecs} local specs checked).`)
}

function validateAndPrintSpec(spec: Record<string, unknown>, label: string, flowId?: string) {
  const fixed = autoFixSpec(spec as unknown as Spec)
  const validation = validateSpec(fixed.spec)

  if (!validation.valid) {
    const header = flowId ? `Flow ${flowId}` : 'Spec'
    throw new Error(`${header} invalid (${label}):\n${formatSpecIssues(validation.issues)}`)
  }

  if (flowId) {
    console.log(`- ${flowId}: valid`) 
    return
  }

  console.log(`Spec valid: ${label}`)
}

async function readJson(path: string) {
  const file = Bun.file(path)
  if (!(await file.exists())) {
    throw new Error(`File does not exist: ${path}`)
  }

  return JSON.parse(await file.text()) as unknown
}

function isManifest(value: unknown): value is { defaultFlowId?: unknown; flows: unknown[] } {
  return isObject(value) && Array.isArray(value.flows)
}

function isSpec(value: unknown): value is Record<string, unknown> {
  return isObject(value) && typeof value.root === 'string' && isObject(value.elements)
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
