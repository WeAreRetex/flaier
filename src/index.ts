import './style.css'

export { default as FlowNarrator } from './components/FlowNarrator.vue'
export { catalog } from './catalog'
export { registry } from './registry'

export { useShiki } from './composables/useShiki'
export { useTimeline } from './composables/useTimeline'
export { useFlowNarratorRuntime } from './composables/useFlowNarratorRuntime'

export type {
  FlowNarratorSpec,
  FlowNarratorManifest,
  FlowNarratorManifestFlow,
  FlowNarratorFlowOption,
  FlowNarratorSource,
  FlowNarratorProps,
  FlowTimelineProps,
  ArchitectureNodeProps,
  TriggerNodeProps,
  CodeNodeProps,
  DecisionNodeProps,
  PayloadNodeProps,
  ErrorNodeProps,
  DescriptionNodeProps,
  LinkNodeProps,
  SourceAnchor,
  SourceAnchorInput,
  EdgeTransition,
  EdgeTransitionKind,
  MagicMoveStep,
  FlowNode,
  FlowEdge,
  FlowNodeType,
  FlowNodeData,
} from './types'
