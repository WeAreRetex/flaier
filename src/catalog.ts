import { defineCatalog } from '@json-render/core'
import { schema } from '@json-render/vue'
import { z } from 'zod'

const magicMoveStepSchema = z.object({
  code: z.string(),
  title: z.string().optional(),
  comment: z.string().optional(),
  story: z.string().optional(),
  speaker: z.string().optional(),
})

const edgeTransitionKindSchema = z.enum([
  'default',
  'success',
  'error',
  'warning',
  'retry',
  'async',
])

const edgeTransitionSchema = z.object({
  to: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  kind: edgeTransitionKindSchema.optional(),
})

const sourceAnchorSchema = z.union([
  z.string(),
  z.object({
    path: z.string(),
    line: z.number().int().positive().optional(),
    column: z.number().int().positive().optional(),
    label: z.string().optional(),
    href: z.string().optional(),
  }),
])

export const catalog = defineCatalog(schema, {
  components: {
    FlowTimeline: {
      props: z.object({
        title: z.string(),
        description: z.string().optional(),
        mode: z.enum(['narrative', 'architecture']).default('narrative'),
        direction: z.enum(['horizontal', 'vertical']).default('horizontal'),
        minHeight: z.number().int().positive().optional(),
        layoutEngine: z.enum(['dagre', 'manual']).default('dagre'),
        layoutRankSep: z.number().positive().optional(),
        layoutNodeSep: z.number().positive().optional(),
        layoutEdgeSep: z.number().positive().optional(),
      }),
      description: 'Root timeline container that orchestrates a pipeline flow graph',
      slots: ['default'],
    },
    ArchitectureNode: {
      props: z.object({
        label: z.string(),
        kind: z.enum(['service', 'database', 'queue', 'cache', 'gateway', 'external', 'compute']).default('service'),
        technology: z.string().optional(),
        description: z.string().optional(),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Architecture/infrastructure component node for system diagrams',
    },
    TriggerNode: {
      props: z.object({
        label: z.string(),
        description: z.string().optional(),
        color: z.string().default('#22c55e'),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Entry point node representing a trigger (cron, webhook, event)',
    },
    CodeNode: {
      props: z.object({
        label: z.string(),
        file: z.string().optional(),
        sourceAnchor: sourceAnchorSchema.optional(),
        language: z.string().default('typescript'),
        code: z.string(),
        comment: z.string().optional(),
        story: z.string().optional(),
        wrapLongLines: z.boolean().default(false),
        magicMoveSteps: z.array(magicMoveStepSchema).optional(),
        twoslash: z.boolean().optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Code block with syntax highlighting, step-by-step magic-move transitions, optional twoslash callouts, and narration/story beats',
    },
    DecisionNode: {
      props: z.object({
        label: z.string(),
        condition: z.string().optional(),
        description: z.string().optional(),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Branch decision node that explains routing criteria before fan-out paths',
    },
    PayloadNode: {
      props: z.object({
        label: z.string(),
        payload: z.string().optional(),
        before: z.string().optional(),
        after: z.string().optional(),
        format: z.enum(['json', 'yaml', 'text']).default('json'),
        description: z.string().optional(),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Data-focused node for payload snapshots and before/after transformations',
    },
    ErrorNode: {
      props: z.object({
        label: z.string(),
        message: z.string(),
        code: z.string().optional(),
        cause: z.string().optional(),
        mitigation: z.string().optional(),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Failure node that captures error detail, cause, and recovery guidance',
    },
    DescriptionNode: {
      props: z.object({
        label: z.string(),
        body: z.string(),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Prose/text explanation node for documenting a pipeline step',
    },
    LinkNode: {
      props: z.object({
        label: z.string(),
        href: z.string(),
        description: z.string().optional(),
        sourceAnchor: sourceAnchorSchema.optional(),
        transitions: z.array(edgeTransitionSchema).optional(),
      }),
      description: 'Clickable reference link to a file or URL',
    },
  },
  actions: {},
})
