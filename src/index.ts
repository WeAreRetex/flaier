export { default as FlowNarrator } from './components/FlowNarrator.vue'
export { catalog } from './catalog'
export { registry } from './registry'

export { useShiki } from './composables/useShiki'
export { useTimeline } from './composables/useTimeline'
export { useFlowNarratorRuntime } from './composables/useFlowNarratorRuntime'

export type {
  FlowNarratorSpec,
  FlowNarratorSource,
  FlowNarratorProps,
  FlowTimelineProps,
  TriggerNodeProps,
  CodeNodeProps,
  DescriptionNodeProps,
  LinkNodeProps,
  MagicMoveStep,
  FlowNode,
  FlowEdge,
  FlowNodeType,
  FlowNodeData,
} from './types'
