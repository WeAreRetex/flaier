import "./style.css";

export { default as FlowNarrator } from "./components/FlowNarrator.vue";
export { default as FlowNarratorPanel } from "./components/FlowNarratorPanel.vue";
export { catalog } from "./catalog";
export { registry } from "./registry";

export { useShiki } from "./composables/useShiki";
export { useTimeline } from "./composables/useTimeline";
export { useFlowNarratorRuntime } from "./composables/useFlowNarratorRuntime";
export { useFlowNarratorFullscreen } from "./composables/useFlowNarratorFullscreen";
export {
  hasTwoslashHints,
  hasTwoslashHtml,
  normalizeTwoslashHtml,
  normalizeTwoslashLanguage,
  resolveTwoslashHtmlForTheme,
} from "./twoslash";

export type {
  FlowNarratorSpec,
  FlowNarratorManifest,
  FlowNarratorManifestFlow,
  FlowNarratorFlowOption,
  FlowNarratorSource,
  FlowNarratorProps,
  FlowNarratorPanelProps,
  FlowTimelineProps,
  ArchitectureNodeProps,
  TriggerNodeProps,
  CodeNodeProps,
  DecisionNodeProps,
  PayloadNodeProps,
  ErrorNodeProps,
  DescriptionNodeProps,
  LinkNodeProps,
  ArchitectureZone,
  ArchitectureInterface,
  ArchitectureDataAsset,
  ArchitectureSecurity,
  ArchitectureOperations,
  ArchitectureLink,
  SourceAnchor,
  SourceAnchorInput,
  EdgeTransition,
  EdgeTransitionKind,
  MagicMoveStep,
  FlowNode,
  FlowEdge,
  FlowNodeType,
  FlowNodeData,
  TwoslashHtml,
} from "./types";

export type { SupportedTwoslashLanguage } from "./twoslash";
