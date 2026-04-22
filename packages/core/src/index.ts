import "./style.css";

export { default as Flaier } from "./components/Flaier.vue";
export { default as FlaierPanel } from "./components/FlaierPanel.vue";
export {
  architectureDataAssetSchema,
  architectureInterfaceSchema,
  architectureLinkSchema,
  architectureOperationsSchema,
  architectureSecuritySchema,
  architectureZoneSchema,
  catalog,
  createFlaierCatalog,
  edgeTransitionKindSchema,
  edgeTransitionSchema,
  magicMoveStepSchema,
  sequenceGroupKindSchema,
  sequenceMessageArrowSchema,
  sequenceMessageKindSchema,
  sequenceNotePlacementSchema,
  sequenceParticipantKindSchema,
  sourceAnchorSchema,
  twoslashHtmlSchema,
} from "./catalog";
export { createFlaierRegistry, createFlaierRendererRegistry, registry } from "./registry";
export { mergeFlaierCustomNodes, normalizeFlaierCustomNodes } from "./custom-nodes";

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
  FlaierCatalogOptions,
  FlaierCustomNodeComponentProps,
  FlaierCustomNodeContext,
  FlaierCustomNodeDefinition,
  FlaierCustomNodeDefinitions,
  FlaierCustomNodeSize,
  FlaierResolvedSourceAnchor,
  FlowTimelineProps,
  ArchitectureNodeProps,
  TriggerNodeProps,
  CodeNodeProps,
  DecisionNodeProps,
  PayloadNodeProps,
  ErrorNodeProps,
  DescriptionNodeProps,
  LinkNodeProps,
  SequenceParticipantKind,
  SequenceMessageArrow,
  SequenceMessageKind,
  SequenceNotePlacement,
  SequenceGroupKind,
  SequenceParticipantProps,
  SequenceParticipantBoxProps,
  SequenceMessageProps,
  SequenceNoteProps,
  SequenceGroupProps,
  SequenceBranchProps,
  ArchitectureZone,
  ArchitectureInterface,
  ArchitectureDataAsset,
  ArchitectureSecurity,
  ArchitectureOperations,
  ArchitectureLink,
  SourceAnchor,
  SourceAnchorInput,
  EdgeShape,
  EdgeTransition,
  EdgeTransitionKind,
  MagicMoveStep,
  BuiltInFlowNodeType,
  FlowNode,
  FlowEdge,
  FlowNodeType,
  FlowNodeData,
  TwoslashHtml,
} from "./types";

export type { SupportedTwoslashLanguage } from "./twoslash";
