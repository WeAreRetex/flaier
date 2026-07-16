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
  flowLayoutSchema,
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
export {
  addEdge,
  addNode,
  addZone,
  deleteNode,
  ensureReachability,
  generateNodeKey,
  getLayoutPositions,
  materializeImplicitTransitions,
  pruneOrphanPositions,
  removeEdge,
  setNodePosition,
  snapshotAllPositions,
  updateEdgeMeta,
  updateNodeProps,
  updateZone,
  removeZone,
} from "./spec-edit";
export type {
  AddEdgeMeta,
  AddNodeInput,
  AddZoneInput,
  FlowLayoutPosition,
  FlowLayoutPositions,
} from "./spec-edit";
export { flaierEditorKey, useFlaierEditor } from "./editor-context";
export type { FlaierEditorContext } from "./editor-context";
export { resolveIconUrl } from "./icon-url";
export { validateFlaierReadiness } from "./validation/flow-ready-validation";
export type { FlowReadinessResult } from "./validation/flow-ready-validation";
export {
  isFlowSpecPayload,
  sanitizeSpecForPersistence,
  serializeSpecToDisk,
} from "./validation/persistence";

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
  FlaierSaveRequest,
  FlaierSaveResult,
  FlaierCatalogOptions,
  FlaierCustomNodeComponentProps,
  FlaierCustomNodeContext,
  FlaierCustomNodeDefinition,
  FlaierCustomNodeDefinitions,
  FlaierCustomNodeSize,
  FlaierResolvedSourceAnchor,
  FlowTimelineLayout,
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
  EdgeArrows,
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
