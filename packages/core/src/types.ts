import type { Node, Edge } from "@vue-flow/core";

/** A single code beat for magic-move animation with optional narration metadata */
export interface MagicMoveStep {
  code: string;
  title?: string;
  comment?: string;
  story?: string;
  speaker?: string;
}

export interface TwoslashHtml {
  dark?: string;
  light?: string;
}

/** Optional metadata for traversal edges between nodes */
export type EdgeTransitionKind = "default" | "success" | "error" | "warning" | "retry" | "async";

/** Declarative edge metadata for branch labels and styling */
export interface EdgeTransition {
  to: string;
  label?: string;
  description?: string;
  kind?: EdgeTransitionKind;
  protocol?: string;
  transport?: "sync" | "async";
  auth?: string;
  contract?: string;
  criticality?: "low" | "medium" | "high";
}

/** Structured node source anchor */
export interface SourceAnchor {
  path: string;
  line?: number;
  column?: number;
  label?: string;
  href?: string;
}

/** Source anchor can be a compact string or structured object */
export type SourceAnchorInput = string | SourceAnchor;

/** Architectural zone/group container metadata */
export interface ArchitectureZone {
  id: string;
  label: string;
  description?: string;
  color?: string;
  padding?: number;
}

/** Architecture interface contract metadata */
export interface ArchitectureInterface {
  name: string;
  protocol?: string;
  direction?: "inbound" | "outbound" | "bidirectional";
  contract?: string;
  auth?: string;
  notes?: string;
}

/** Architecture data asset metadata */
export interface ArchitectureDataAsset {
  name: string;
  kind?: string;
  classification?: "public" | "internal" | "confidential" | "restricted";
  retention?: string;
  notes?: string;
}

/** Architecture security metadata */
export interface ArchitectureSecurity {
  auth?: string;
  encryption?: string;
  pii?: boolean;
  threatModel?: string;
}

/** Architecture operations metadata */
export interface ArchitectureOperations {
  owner?: string;
  slo?: string;
  alert?: string;
  runbook?: string;
}

/** Architecture reference links */
export interface ArchitectureLink {
  label: string;
  href: string;
}

/** Props for the FlowTimeline root element */
export interface FlowTimelineProps {
  title: string;
  description?: string;
  mode?: "narrative" | "architecture";
  zones?: ArchitectureZone[];
  direction?: "horizontal" | "vertical";
  minHeight?: number;
  layoutEngine?: "dagre" | "manual";
  layoutRankSep?: number;
  layoutNodeSep?: number;
  layoutEdgeSep?: number;
  themeMode?: "local" | "document";
  showHeaderOverlay?: boolean;
  showExportControls?: boolean;
  showThemeToggle?: boolean;
  showArchitectureInspector?: boolean;
  defaultArchitectureInspectorOpen?: boolean;
  showArchitectureInspectorToggleText?: boolean;
}

/** Props for architecture/infrastructure nodes */
export interface ArchitectureNodeProps {
  label: string;
  kind?: "service" | "database" | "queue" | "cache" | "gateway" | "external" | "compute";
  technology?: string;
  runtime?: string;
  owner?: string;
  tier?: "edge" | "application" | "integration" | "data" | "platform" | "external";
  status?: "planned" | "active" | "degraded" | "retired";
  zone?: string;
  description?: string;
  tags?: string[];
  responsibilities?: string[];
  capabilities?: string[];
  interfaces?: ArchitectureInterface[];
  data?: ArchitectureDataAsset[];
  security?: ArchitectureSecurity;
  operations?: ArchitectureOperations;
  links?: ArchitectureLink[];
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Props for trigger/entry-point nodes */
export interface TriggerNodeProps {
  label: string;
  description?: string;
  color?: string;
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Props for code block nodes */
export interface CodeNodeProps {
  label: string;
  file?: string;
  sourceAnchor?: SourceAnchorInput;
  language?: string;
  code: string;
  comment?: string;
  story?: string;
  wrapLongLines?: boolean;
  magicMoveSteps?: MagicMoveStep[];
  twoslash?: boolean;
  twoslashHtml?: TwoslashHtml;
  transitions?: EdgeTransition[];
}

/** Props for branch/decision nodes */
export interface DecisionNodeProps {
  label: string;
  condition?: string;
  description?: string;
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Props for payload snapshot/diff nodes */
export interface PayloadNodeProps {
  label: string;
  payload?: string;
  before?: string;
  after?: string;
  format?: "json" | "yaml" | "text";
  description?: string;
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Props for failure/error handling nodes */
export interface ErrorNodeProps {
  label: string;
  message: string;
  code?: string;
  cause?: string;
  mitigation?: string;
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Props for prose/description nodes */
export interface DescriptionNodeProps {
  label: string;
  body: string;
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Props for link/reference nodes */
export interface LinkNodeProps {
  label: string;
  href: string;
  description?: string;
  sourceAnchor?: SourceAnchorInput;
  transitions?: EdgeTransition[];
}

/** Union of all node prop types */
export type AnyNodeProps =
  | ArchitectureNodeProps
  | TriggerNodeProps
  | CodeNodeProps
  | DecisionNodeProps
  | PayloadNodeProps
  | ErrorNodeProps
  | DescriptionNodeProps
  | LinkNodeProps;

/** VueFlow custom node type names */
export type FlowNodeType =
  | "architecture"
  | "trigger"
  | "code"
  | "decision"
  | "payload"
  | "error"
  | "description"
  | "link";

/** Data payload attached to each VueFlow node */
export interface FlowNodeData {
  key: string;
  type: FlowNodeType;
  elementType: string;
  props: Record<string, unknown>;
  index: number;
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

/** A single element in the flat spec */
export interface SpecElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
}

/** The json-render spec format for flaier */
export interface FlaierSpec {
  root: string;
  elements: Record<string, SpecElement>;
  state?: Record<string, unknown>;
}

/** A single flow entry in a multi-flow manifest */
export interface FlaierManifestFlow {
  id: string;
  title?: string;
  description?: string;
  src: FlaierSpec | string;
  tags?: string[];
  entrypoints?: string[];
}

/** Multi-flow manifest generated by AI harnesses */
export interface FlaierManifest {
  version?: number;
  defaultFlowId?: string;
  flows: FlaierManifestFlow[];
}

/** Runtime-friendly flow option metadata */
export interface FlaierFlowOption {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  entrypoints?: string[];
}

/** Spec object, manifest object, or remote/local JSON source */
export type FlaierSource = FlaierSpec | FlaierManifest | string;

/** Public component props */
export interface FlaierProps {
  src: FlaierSource;
  autoPlay?: boolean;
  interval?: number;
  themeMode?: "local" | "document";
}

export interface FlaierPanelProps extends FlaierProps {
  height?: number | string;
  minHeight?: number;
  zIndex?: number;
  fullscreenEnabled?: boolean;
}
