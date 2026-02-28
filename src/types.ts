import type { Node, Edge } from '@vue-flow/core'

/** A single code beat for magic-move animation with optional narration metadata */
export interface MagicMoveStep {
  code: string
  title?: string
  comment?: string
  story?: string
  speaker?: string
}

/** Props for the FlowTimeline root element */
export interface FlowTimelineProps {
  title: string
  description?: string
  direction?: 'horizontal' | 'vertical'
  minHeight?: number
}

/** Props for trigger/entry-point nodes */
export interface TriggerNodeProps {
  label: string
  description?: string
  color?: string
}

/** Props for code block nodes */
export interface CodeNodeProps {
  label: string
  file?: string
  language?: string
  code: string
  comment?: string
  story?: string
  wrapLongLines?: boolean
  magicMoveSteps?: MagicMoveStep[]
}

/** Props for prose/description nodes */
export interface DescriptionNodeProps {
  label: string
  body: string
}

/** Props for link/reference nodes */
export interface LinkNodeProps {
  label: string
  href: string
  description?: string
}

/** Union of all node prop types */
export type AnyNodeProps =
  | TriggerNodeProps
  | CodeNodeProps
  | DescriptionNodeProps
  | LinkNodeProps

/** VueFlow custom node type names */
export type FlowNodeType = 'trigger' | 'code' | 'description' | 'link'

/** Data payload attached to each VueFlow node */
export interface FlowNodeData {
  key: string
  type: FlowNodeType
  elementType: string
  props: Record<string, unknown>
  index: number
}

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge

/** A single element in the flat spec */
export interface SpecElement {
  type: string
  props: Record<string, unknown>
  children?: string[]
}

/** The json-render spec format for flow-narrator */
export interface FlowNarratorSpec {
  root: string
  elements: Record<string, SpecElement>
  state?: Record<string, unknown>
}

/** Spec object or remote URL source */
export type FlowNarratorSource = FlowNarratorSpec | string

/** Public component props */
export interface FlowNarratorProps {
  src: FlowNarratorSource
  autoPlay?: boolean
  interval?: number
}
