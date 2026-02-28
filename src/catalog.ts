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

export const catalog = defineCatalog(schema, {
  components: {
    FlowTimeline: {
      props: z.object({
        title: z.string(),
        description: z.string().optional(),
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
    TriggerNode: {
      props: z.object({
        label: z.string(),
        description: z.string().optional(),
        color: z.string().default('#22c55e'),
      }),
      description: 'Entry point node representing a trigger (cron, webhook, event)',
    },
    CodeNode: {
      props: z.object({
        label: z.string(),
        file: z.string().optional(),
        language: z.string().default('typescript'),
        code: z.string(),
        comment: z.string().optional(),
        story: z.string().optional(),
        wrapLongLines: z.boolean().default(false),
        magicMoveSteps: z.array(magicMoveStepSchema).optional(),
        twoslash: z.boolean().optional(),
      }),
      description: 'Code block with syntax highlighting, step-by-step magic-move transitions, optional twoslash callouts, and narration/story beats',
    },
    DescriptionNode: {
      props: z.object({
        label: z.string(),
        body: z.string(),
      }),
      description: 'Prose/text explanation node for documenting a pipeline step',
    },
    LinkNode: {
      props: z.object({
        label: z.string(),
        href: z.string(),
        description: z.string().optional(),
      }),
      description: 'Clickable reference link to a file or URL',
    },
  },
  actions: {},
})
