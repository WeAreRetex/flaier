import { dirname, resolve } from 'node:path'
import { autoFixSpec, formatSpecIssues, type Spec, validateSpec } from '@json-render/core'
import { validateFlowNarratorReadiness } from './flow-ready-validation'
import {
  asNonEmptyString,
  getInvocationCwd,
  hasFlag,
  isFlowManifest,
  isFlowSpec,
  isObject,
  readJson,
  type FlowManifest,
  type FlowManifestFlow,
  type FlowSpec,
} from './shared'

const args = Bun.argv.slice(2)

if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
  printUsage()
  process.exit(0)
}

const input = args[0]
const invocationCwd = getInvocationCwd()

if (!input) {
  throw new Error('Usage: bun ./src/validate.ts <spec-or-manifest.json>')
}

const absoluteInput = resolve(invocationCwd, input)
const payload = await readJson(absoluteInput)

if (isFlowManifest(payload)) {
  await validateManifest(payload, dirname(absoluteInput), input)
  process.exit(0)
}

if (isFlowSpec(payload)) {
  validateAndPrintSpec(payload, absoluteInput)
  process.exit(0)
}

throw new Error(`"${input}" is neither a flow manifest nor a flow spec.`)

async function validateManifest(manifest: FlowManifest, manifestDir: string, manifestLabel: string) {
  const flowIds = new Set<string>()

  if (manifest.flows.length === 0) {
    throw new Error('Manifest has no flows.')
  }

  let totalValidatedSpecs = 0

  for (const [index, rawFlow] of manifest.flows.entries()) {
    if (!isObject(rawFlow)) {
      throw new Error(`Flow entry at index ${index} is not an object.`)
    }

    const flow = rawFlow as FlowManifestFlow
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
      if (!isFlowSpec(specPayload)) {
        throw new Error(`Flow "${id}" source is not a valid spec: ${sourcePath}`)
      }

      validateAndPrintSpec(specPayload, sourcePath, id)
      totalValidatedSpecs += 1
      continue
    }

    if (isFlowSpec(source)) {
      validateAndPrintSpec(source, `${manifestLabel}#${id}`, id)
      totalValidatedSpecs += 1
      continue
    }

    throw new Error(`Flow "${id}" has invalid src value.`)
  }

  const defaultFlowId = asNonEmptyString(manifest.defaultFlowId)
  if (defaultFlowId && !flowIds.has(defaultFlowId)) {
    throw new Error(`Manifest defaultFlowId "${defaultFlowId}" does not exist in flows.`)
  }

  console.log(`Validated manifest with ${flowIds.size} flows (${totalValidatedSpecs} local specs checked).`)
}

function validateAndPrintSpec(spec: FlowSpec, label: string, flowId?: string) {
  const fixed = autoFixSpec(spec as unknown as Spec)
  const normalizedSpec = fixed.spec as FlowSpec
  const schemaValidation = validateSpec(normalizedSpec as unknown as Spec)

  if (!schemaValidation.valid) {
    const header = flowId ? `Flow ${flowId}` : 'Spec'
    throw new Error(`${header} invalid (${label}):\n${formatSpecIssues(schemaValidation.issues)}`)
  }

  const readiness = validateFlowNarratorReadiness(normalizedSpec)
  if (readiness.errors.length > 0) {
    const header = flowId ? `Flow ${flowId}` : 'Spec'
    throw new Error(`${header} is not flow-visualizer ready (${label}):\n${formatIssues(readiness.errors)}`)
  }

  if (readiness.warnings.length > 0) {
    const prefix = flowId ? `- ${flowId}` : 'Spec'
    console.log(`${prefix}: warnings\n${formatIssues(readiness.warnings)}`)
  }

  if (flowId) {
    console.log(`- ${flowId}: valid`)
    return
  }

  console.log(`Spec valid: ${label}`)
}

function formatIssues(issues: string[]) {
  return issues
    .map((issue) => `  - ${issue}`)
    .join('\n')
}

function printUsage() {
  console.log(
    [
      'Validate a single flow spec or a multi-flow manifest.',
      '',
      'Usage:',
      '  bun ./src/validate.ts ./flow-specs/manifest.json',
      '  bun ./src/validate.ts ./flow-specs/auth-login.flow.json',
    ].join('\n'),
  )
}
