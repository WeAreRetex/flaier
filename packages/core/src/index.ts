import "./style.css";

export { default as Flaier } from "./components/Flaier.vue";
export { default as FlaierPanel } from "./components/FlaierPanel.vue";
export { catalog } from "./catalog";
export { registry } from "./registry";

export { useShiki } from "./composables/useShiki";
export { useTimeline } from "./composables/useTimeline";
export { useFlaierRuntime } from "./composables/useFlaierRuntime";
export { useFlaierFullscreen } from "./composables/useFlaierFullscreen";
export {
  hasTwoslashHints,
  hasTwoslashHtml,
  normalizeTwoslashHtml,
  normalizeTwoslashLanguage,
  resolveTwoslashHtmlForTheme,
} from "./twoslash";

export type {
  FlaierSpec,
  FlaierManifest,
  FlaierManifestFlow,
  FlaierFlowOption,
  FlaierSource,
  FlaierProps,
  FlaierPanelProps,
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
