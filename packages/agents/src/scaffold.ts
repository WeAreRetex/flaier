import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { type Spec, validateSpec } from '@json-render/core'
import { validateFlowNarratorReadiness } from './flow-ready-validation'
import {
  getInvocationCwd,
  hasFlag,
  readArgValue,
  resolveFromInvocationCwd,
  slugifyId,
  type FlowSpec,
  writeJson,
} from './shared'

const args = Bun.argv.slice(2)

if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
  printUsage()
  process.exit(0)
}

const title = readArgValue(args, '--title')
if (!title) {
  throw new Error('Missing required argument: --title')
}

const description = readArgValue(args, '--description')
const template = normalizeTemplate(readArgValue(args, '--template') ?? 'linear')
const language = readArgValue(args, '--language') ?? 'typescript'
const force = hasFlag(args, '--force')

const invocationCwd = getInvocationCwd()
const defaultOut = join('flow-specs', `${slugifyId(title)}.flow.json`)
const outArg = readArgValue(args, '--out') ?? defaultOut
const outPath = resolveFromInvocationCwd(outArg, invocationCwd)

const target = Bun.file(outPath)
if ((await target.exists()) && !force) {
  throw new Error(`File already exists: ${outPath}. Re-run with --force to overwrite.`)
}

await mkdir(dirname(outPath), { recursive: true })

const spec = template === 'branching'
  ? createBranchingSpec(title, description, language)
  : createLinearSpec(title, description, language)

assertGeneratedSpec(spec)

await writeJson(outPath, spec)

console.log(`Created ${template} flow scaffold at ${outPath}`)

function assertGeneratedSpec(spec: FlowSpec) {
  const schemaValidation = validateSpec(spec as unknown as Spec)
  if (!schemaValidation.valid) {
    throw new Error('Internal error: generated scaffold does not pass schema validation.')
  }

  const readiness = validateFlowNarratorReadiness(spec)
  if (readiness.errors.length > 0) {
    throw new Error(
      `Internal error: generated scaffold is not flow-visualizer ready:\n${formatIssues(readiness.errors)}`,
    )
  }
}

function createLinearSpec(title: string, description: string | undefined, language: string): FlowSpec {
  return {
    root: 'timeline',
    state: {
      currentStep: 0,
      playing: false,
    },
    elements: {
      timeline: {
        type: 'FlowTimeline',
        props: {
          title,
          description,
          minHeight: 620,
          layoutEngine: 'dagre',
          layoutRankSep: 260,
          layoutNodeSep: 170,
          layoutEdgeSep: 34,
        },
        children: ['trigger-entry'],
      },
      'trigger-entry': {
        type: 'TriggerNode',
        props: {
          label: 'Entry Trigger',
          description: 'Replace with the real event, cron, or webhook that starts this flow.',
          color: '#22c55e',
        },
        children: ['code-main'],
      },
      'code-main': {
        type: 'CodeNode',
        props: {
          label: 'Main Processing Step',
          language,
          code: [
            'export async function handler(input: unknown) {',
            '  // TODO: add the core logic for this step',
            '  return input',
            '}',
          ].join('\n'),
          comment: 'Describe the responsibility of this step.',
          story: 'Explain what changes in system state after this code runs.',
        },
        children: ['describe-outcome'],
      },
      'describe-outcome': {
        type: 'DescriptionNode',
        props: {
          label: 'Outcome',
          body: 'Explain the side effects, persisted state, and downstream behavior.',
        },
        children: ['link-reference'],
      },
      'link-reference': {
        type: 'LinkNode',
        props: {
          label: 'Reference',
          href: 'https://example.com',
          description: 'Point to source code, dashboards, or runbooks.',
        },
      },
    },
  }
}

function createBranchingSpec(title: string, description: string | undefined, language: string): FlowSpec {
  return {
    root: 'timeline',
    state: {
      currentStep: 0,
      playing: false,
    },
    elements: {
      timeline: {
        type: 'FlowTimeline',
        props: {
          title,
          description,
          minHeight: 640,
          layoutEngine: 'dagre',
          layoutRankSep: 280,
          layoutNodeSep: 180,
          layoutEdgeSep: 36,
        },
        children: ['trigger-entry'],
      },
      'trigger-entry': {
        type: 'TriggerNode',
        props: {
          label: 'Entry Trigger',
          description: 'Replace with the event that starts this flow.',
          color: '#22c55e',
        },
        children: ['code-router'],
      },
      'code-router': {
        type: 'CodeNode',
        props: {
          label: 'Decision Step',
          language,
          code: [
            'export function decidePath(payload: unknown) {',
            '  // TODO: return true for happy path, false for fallback path',
            '  return Boolean(payload)',
            '}',
          ].join('\n'),
          comment: 'Explain the decision criteria for branching.',
          story: 'Narrate why a request takes the success path or fallback path.',
        },
        children: ['path-success', 'path-fallback'],
      },
      'path-success': {
        type: 'DescriptionNode',
        props: {
          label: 'Success Path',
          body: 'Describe the behavior when the main path succeeds.',
        },
        children: ['link-follow-up'],
      },
      'path-fallback': {
        type: 'DescriptionNode',
        props: {
          label: 'Fallback Path',
          body: 'Describe retries, degraded mode, alerts, or compensation logic.',
        },
        children: ['link-follow-up'],
      },
      'link-follow-up': {
        type: 'LinkNode',
        props: {
          label: 'Runbook / Dashboard',
          href: 'https://example.com',
          description: 'Point to operational docs, dashboards, or next investigation step.',
        },
      },
    },
  }
}

function normalizeTemplate(value: string): 'linear' | 'branching' {
  if (value === 'linear' || value === 'branching') {
    return value
  }

  throw new Error(`Unsupported --template "${value}". Use "linear" or "branching".`)
}

function formatIssues(issues: string[]) {
  return issues
    .map((issue) => `  - ${issue}`)
    .join('\n')
}

function printUsage() {
  console.log(
    [
      'Generate a flow-visualizer-ready flow scaffold.',
      '',
      'Usage:',
      '  bun ./src/scaffold.ts --title "Checkout Flow" --out ./flow-specs/checkout.flow.json',
      '',
      'Options:',
      '  --title <text>           Flow title (required)',
      '  --description <text>     Flow subtitle/description',
      '  --template <name>        linear | branching (default: linear)',
      '  --language <name>        CodeNode language (default: typescript)',
      '  --out <path>             Output file path (default: ./flow-specs/<slug>.flow.json)',
      '  --force                  Overwrite existing output file',
    ].join('\n'),
  )
}
