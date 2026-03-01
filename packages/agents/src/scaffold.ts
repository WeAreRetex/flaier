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
  : template === 'architecture'
    ? createArchitectureSpec(title, description)
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
          sourceAnchor: {
            path: 'src/entrypoint.ts',
            line: 1,
          },
        },
        children: ['code-main'],
      },
      'code-main': {
        type: 'CodeNode',
        props: {
          label: 'Main Processing Step',
          sourceAnchor: {
            path: 'src/handler.ts',
            line: 1,
          },
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
          sourceAnchor: 'docs/architecture/flow.md:12',
        },
        children: ['link-reference'],
      },
      'link-reference': {
        type: 'LinkNode',
        props: {
          label: 'Reference',
          href: 'https://example.com',
          description: 'Point to source code, dashboards, or runbooks.',
          sourceAnchor: 'docs/runbooks/flow-reference.md:8',
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
          sourceAnchor: {
            path: 'src/entrypoint.ts',
            line: 1,
          },
        },
        children: ['decision-route'],
      },
      'decision-route': {
        type: 'DecisionNode',
        props: {
          label: 'Route by Input Validity',
          condition: 'payload.isValid === true',
          description: 'Choose success processing for valid payloads, otherwise go to error handling.',
          sourceAnchor: {
            path: 'src/validation/route.ts',
            line: 20,
          },
          transitions: [
            {
              to: 'payload-success',
              label: 'Valid payload',
              description: 'Continue with normalized payload and downstream processing.',
              kind: 'success',
            },
            {
              to: 'error-failure',
              label: 'Validation failed',
              description: 'Capture error details and route to fallback handling.',
              kind: 'error',
            },
          ],
        },
        children: ['payload-success', 'error-failure'],
      },
      'payload-success': {
        type: 'PayloadNode',
        props: {
          label: 'Normalized Payload',
          description: 'Show how incoming payload changes after validation and normalization.',
          sourceAnchor: {
            path: 'src/validation/normalize.ts',
            line: 12,
          },
          format: 'json',
          before: '{\n  "email": "USER@EXAMPLE.COM",\n  "plan": "pro",\n  "acceptedTerms": "yes"\n}',
          after: '{\n  "email": "user@example.com",\n  "plan": "pro",\n  "acceptedTerms": true\n}',
          transitions: [
            {
              to: 'code-commit',
              label: 'Persist changes',
              description: 'Write normalized data and continue workflow.',
              kind: 'success',
            },
          ],
        },
        children: ['code-commit'],
      },
      'code-commit': {
        type: 'CodeNode',
        props: {
          label: 'Persist User Record',
          sourceAnchor: {
            path: 'src/persistence/user-repository.ts',
            line: 31,
          },
          language,
          code: [
            'export async function persistUser(input: NormalizedUser) {',
            '  await db.user.upsert({',
            '    where: { email: input.email },',
            '    create: input,',
            '    update: input,',
            '  })',
            '}',
          ].join('\n'),
          comment: 'Persist validated input and keep writes idempotent.',
          story: 'This step commits canonical data so downstream services consume stable shape.',
        },
        children: ['link-follow-up'],
      },
      'error-failure': {
        type: 'ErrorNode',
        props: {
          label: 'Input Validation Error',
          message: 'Payload validation failed and cannot be persisted safely.',
          sourceAnchor: {
            path: 'src/validation/errors.ts',
            line: 8,
          },
          code: 'VAL-422',
          cause: 'Missing required field or incompatible type in submitted payload.',
          mitigation: 'Return 422 response, emit audit log, and notify upstream client with field details.',
          transitions: [
            {
              to: 'link-follow-up',
              label: 'Open runbook',
              description: 'Investigate failure rate and support resolution path.',
              kind: 'warning',
            },
          ],
        },
        children: ['link-follow-up'],
      },
      'link-follow-up': {
        type: 'LinkNode',
        props: {
          label: 'Runbook / Dashboard',
          href: 'https://example.com',
          description: 'Point to operational docs, dashboards, or next investigation step.',
          sourceAnchor: 'docs/runbooks/recovery.md:5',
        },
      },
    },
  }
}

function createArchitectureSpec(title: string, description: string | undefined): FlowSpec {
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
          mode: 'architecture',
          minHeight: 640,
          layoutEngine: 'dagre',
          layoutRankSep: 260,
          layoutNodeSep: 170,
          layoutEdgeSep: 34,
        },
        children: ['gateway-edge'],
      },
      'gateway-edge': {
        type: 'ArchitectureNode',
        props: {
          label: 'Edge Gateway',
          kind: 'gateway',
          technology: 'Bun.serve + auth middleware',
          description: 'Ingress point for external requests. Terminates auth and routes to internal services.',
          sourceAnchor: {
            path: 'src/server/index.ts',
            line: 1,
          },
          transitions: [
            {
              to: 'service-api',
              label: 'Route request',
              description: 'Forward validated request to API service.',
              kind: 'default',
            },
          ],
        },
        children: ['service-api'],
      },
      'service-api': {
        type: 'ArchitectureNode',
        props: {
          label: 'API Service',
          kind: 'service',
          technology: 'TypeScript + domain handlers',
          description: 'Coordinates application logic and emits domain events.',
          sourceAnchor: {
            path: 'src/services/api-service.ts',
            line: 12,
          },
          transitions: [
            {
              to: 'queue-events',
              label: 'Publish events',
              description: 'Emit asynchronous work units.',
              kind: 'async',
            },
            {
              to: 'database-primary',
              label: 'Persist state',
              description: 'Commit core entities to primary store.',
              kind: 'success',
            },
          ],
        },
        children: ['queue-events', 'database-primary'],
      },
      'queue-events': {
        type: 'ArchitectureNode',
        props: {
          label: 'Event Queue',
          kind: 'queue',
          technology: 'Durable queue / topic',
          description: 'Buffers asynchronous jobs and protects core APIs from burst traffic.',
          transitions: [
            {
              to: 'compute-worker',
              label: 'Dispatch jobs',
              description: 'Workers pull and process events.',
              kind: 'async',
            },
          ],
        },
        children: ['compute-worker'],
      },
      'compute-worker': {
        type: 'ArchitectureNode',
        props: {
          label: 'Worker Pool',
          kind: 'compute',
          technology: 'Bun workers',
          description: 'Executes side effects, retries transient failures, and updates cache/store.',
          transitions: [
            {
              to: 'cache-read',
              label: 'Warm cache',
              description: 'Push computed projections for fast reads.',
              kind: 'retry',
            },
          ],
        },
        children: ['cache-read'],
      },
      'database-primary': {
        type: 'ArchitectureNode',
        props: {
          label: 'Primary Database',
          kind: 'database',
          technology: 'Postgres',
          description: 'Source of truth for transactional writes.',
          transitions: [
            {
              to: 'cache-read',
              label: 'Project reads',
              description: 'Serve low-latency traffic from cache layer.',
              kind: 'success',
            },
          ],
        },
        children: ['cache-read'],
      },
      'cache-read': {
        type: 'ArchitectureNode',
        props: {
          label: 'Read Cache',
          kind: 'cache',
          technology: 'Redis',
          description: 'Accelerates reads and absorbs repeated query traffic.',
          transitions: [
            {
              to: 'external-observability',
              label: 'Emit telemetry',
              description: 'Publish architecture health to dashboards.',
              kind: 'warning',
            },
          ],
        },
        children: ['external-observability'],
      },
      'external-observability': {
        type: 'ArchitectureNode',
        props: {
          label: 'Observability Stack',
          kind: 'external',
          technology: 'Metrics + traces + alerts',
          description: 'Tracks latency, error rates, and queue depth for operations.',
          sourceAnchor: 'docs/architecture/observability.md:6',
        },
      },
    },
  }
}

function normalizeTemplate(value: string): 'linear' | 'branching' | 'architecture' {
  if (value === 'linear' || value === 'branching' || value === 'architecture') {
    return value
  }

  throw new Error(`Unsupported --template "${value}". Use "linear", "branching", or "architecture".`)
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
      '  --template <name>        linear | branching | architecture (default: linear)',
      '  --language <name>        CodeNode language (default: typescript)',
      '  --out <path>             Output file path (default: ./flow-specs/<slug>.flow.json)',
      '  --force                  Overwrite existing output file',
    ].join('\n'),
  )
}
