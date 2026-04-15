<script setup lang="ts">
import dagre from "@dagrejs/dagre";
import { useStateStore, useStateValue } from "@json-render/vue";
import {
  Position,
  VueFlow,
  type NodeProps,
  type NodeTypesObject,
  useNodesInitialized,
  useVueFlow,
} from "@vue-flow/core";
import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  markRaw,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";

import {
  CODE_NODE_MAX_INLINE_CHARS,
  estimateCodeNodeCharsPerLine,
  estimateCodeNodeWidth,
} from "../../code-node-sizing";
import { exportFlowDiagram, type DiagramExportFormat } from "../../composables/useDiagramExport";
import { useFlaierRuntime } from "../../composables/useFlaierRuntime";
import {
  hasTwoslashHints,
  hasTwoslashHtml,
  normalizeTwoslashHtml,
  normalizeTwoslashLanguage,
} from "../../twoslash";
import type {
  ArchitectureDataAsset,
  ArchitectureInterface,
  ArchitectureLink,
  ArchitectureNodeProps,
  FlaierCustomNodeContext,
  FlaierCustomNodeDefinition,
  FlaierCustomNodeSize,
  FlaierResolvedSourceAnchor,
  ArchitectureOperations,
  ArchitectureSecurity,
  ArchitectureZone,
  EdgeTransitionKind,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  FlowNodeType,
  MagicMoveStep,
  SpecElement,
  TwoslashHtml,
} from "../../types";
import TimelineControls from "../controls/TimelineControls.vue";
import ArchitectureSmoothEdge from "../edges/ArchitectureSmoothEdge.vue";
import ArchitectureNodeVue from "../nodes/ArchitectureNode.vue";
import CodeNodeVue from "../nodes/CodeNode.vue";
import DecisionNodeVue from "../nodes/DecisionNode.vue";
import DescriptionNodeVue from "../nodes/DescriptionNode.vue";
import ErrorNodeVue from "../nodes/ErrorNode.vue";
import LinkNodeVue from "../nodes/LinkNode.vue";
import PayloadNodeVue from "../nodes/PayloadNode.vue";
import TriggerNodeVue from "../nodes/TriggerNode.vue";

const props = withDefaults(
  defineProps<{
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
  }>(),
  {
    mode: "narrative",
    direction: "horizontal",
    layoutEngine: "dagre",
    themeMode: "local",
    showHeaderOverlay: true,
    showExportControls: true,
    showThemeToggle: true,
    showArchitectureInspector: true,
    defaultArchitectureInspectorOpen: true,
    showArchitectureInspectorToggleText: true,
  },
);

const TYPE_MAP: Record<string, FlowNodeType> = {
  ArchitectureNode: "architecture",
  TriggerNode: "trigger",
  CodeNode: "code",
  DecisionNode: "decision",
  PayloadNode: "payload",
  ErrorNode: "error",
  DescriptionNode: "description",
  LinkNode: "link",
};

function toNodeType(elementType: string): FlowNodeType | undefined {
  if (TYPE_MAP[elementType]) {
    return TYPE_MAP[elementType];
  }

  return customNodes.value[elementType] ? elementType : undefined;
}

function getCustomNodeDefinition(elementType: string): FlaierCustomNodeDefinition | undefined {
  return customNodes.value[elementType];
}

const DEFAULT_LAYOUT_ENGINE = "dagre";
const DEFAULT_FALLBACK_GAP = 420;
const DEFAULT_DAGRE_RANK_SEP_HORIZONTAL = 260;
const DEFAULT_DAGRE_NODE_SEP_HORIZONTAL = 120;
const DEFAULT_DAGRE_RANK_SEP_VERTICAL = 220;
const DEFAULT_DAGRE_NODE_SEP_VERTICAL = 120;
const DEFAULT_DAGRE_EDGE_SEP = 30;
const OVERVIEW_ENTER_ZOOM = 0.52;
const OVERVIEW_EXIT_ZOOM = 0.62;
const FLAIER_THEME_STORAGE_KEY = "flaier-ui-theme";
const ARCHITECTURE_ZONE_MIN_CONTENT_PADDING = 44;
const ARCHITECTURE_ZONE_MIN_BOTTOM_PADDING = 88;
const ARCHITECTURE_ZONE_LABEL_TOP = 12;
const ARCHITECTURE_ZONE_LABEL_HEIGHT = 22;
const ARCHITECTURE_ZONE_DESCRIPTION_HEIGHT = 16;
const ARCHITECTURE_ZONE_LABEL_TO_DESCRIPTION_GAP = 6;
const ARCHITECTURE_ZONE_LABEL_TO_CONTENT_GAP = 12;
const ARCHITECTURE_ZONE_NESTED_LABEL_STEP = 18;
const ARCHITECTURE_ZONE_CONTAINED_ZONE_GAP = 46;
const EDGE_TRANSITION_KINDS: EdgeTransitionKind[] = [
  "default",
  "success",
  "error",
  "warning",
  "retry",
  "async",
];
const EDGE_TRANSITION_KIND_SET = new Set(EDGE_TRANSITION_KINDS);
const EDGE_TRANSITION_TRANSPORT_SET = new Set(["sync", "async"]);
const EDGE_TRANSITION_CRITICALITY_SET = new Set(["low", "medium", "high"]);
const ARCHITECTURE_NODE_KINDS: Array<NonNullable<ArchitectureNodeProps["kind"]>> = [
  "service",
  "database",
  "queue",
  "cache",
  "gateway",
  "external",
  "compute",
];
const ARCHITECTURE_NODE_KIND_SET = new Set(ARCHITECTURE_NODE_KINDS);
const ARCHITECTURE_NODE_STATUS_VALUES: Array<NonNullable<ArchitectureNodeProps["status"]>> = [
  "planned",
  "active",
  "degraded",
  "retired",
];
const ARCHITECTURE_NODE_STATUS_SET = new Set(ARCHITECTURE_NODE_STATUS_VALUES);
const ARCHITECTURE_NODE_TIER_VALUES: Array<NonNullable<ArchitectureNodeProps["tier"]>> = [
  "edge",
  "application",
  "integration",
  "data",
  "platform",
  "external",
];
const ARCHITECTURE_NODE_TIER_SET = new Set(ARCHITECTURE_NODE_TIER_VALUES);
const ARCHITECTURE_INTERFACE_DIRECTION_VALUES: Array<
  NonNullable<ArchitectureInterface["direction"]>
> = ["inbound", "outbound", "bidirectional"];
const ARCHITECTURE_INTERFACE_DIRECTION_SET = new Set(ARCHITECTURE_INTERFACE_DIRECTION_VALUES);
const ARCHITECTURE_DATA_CLASSIFICATION_VALUES: Array<
  NonNullable<ArchitectureDataAsset["classification"]>
> = ["public", "internal", "confidential", "restricted"];
const ARCHITECTURE_DATA_CLASSIFICATION_SET = new Set(ARCHITECTURE_DATA_CLASSIFICATION_VALUES);
const ARCHITECTURE_ZONE_COLOR_PALETTE = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#a78bfa",
  "#14b8a6",
  "#fb7185",
];
const SOURCE_ANCHOR_LINK_PATTERN = /^(https?:\/\/|vscode:\/\/|idea:\/\/)/i;
const SOURCE_ANCHOR_TRAILING_LOCATION_PATTERN = /^(.*?):(\d+)(?::(\d+))?$/;

interface NodeSize {
  width: number;
  height: number;
}

interface OrderedNodeElement {
  key: string;
  index: number;
  nodeType: FlowNodeType;
  element: SpecElement;
}

interface TimelineFrame {
  nodeIndex: number;
  nodeKey: string;
  localStep: number;
  totalLocalSteps: number;
}

interface BranchChoice {
  id: string;
  label: string;
  description?: string;
  kind?: EdgeTransitionKind;
}

interface ParsedTransition {
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

interface ParsedSourceAnchor {
  label: string;
  href?: string;
}

interface ParsedAnchorLocation {
  path: string;
  line?: number;
  column?: number;
}

interface ResolvedArchitectureZone extends ArchitectureZone {
  padding: number;
}

interface ArchitectureZoneOverlay {
  id: string;
  label: string;
  description?: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeCount: number;
  nestingDepth: number;
  labelLane: number;
  labelOffsetY: number;
  descriptionOffsetY: number;
}

interface ArchitectureOutgoingEdge {
  target: string;
  label?: string;
  protocol?: string;
  transport?: "sync" | "async";
  auth?: string;
  criticality?: "low" | "medium" | "high";
}

interface ArchitectureInspectorArchitectureView {
  type: "ArchitectureNode";
  label: string;
  sourceAnchor?: ParsedSourceAnchor;
  kind?: ArchitectureNodeProps["kind"];
  status?: ArchitectureNodeProps["status"];
  tier?: ArchitectureNodeProps["tier"];
  technology?: string;
  runtime?: string;
  owner?: string;
  zoneLabel?: string;
  summary: string;
  tags: string[];
  responsibilities: string[];
  capabilities: string[];
  interfaces: ArchitectureInterface[];
  dataAssets: ArchitectureDataAsset[];
  security?: ArchitectureSecurity;
  operations?: ArchitectureOperations;
  links: ArchitectureLink[];
  outgoing: ArchitectureOutgoingEdge[];
}

interface ArchitectureInspectorGenericView {
  type: "Other";
  label: string;
  sourceAnchor?: ParsedSourceAnchor;
  summary: string;
  elementType: string;
}

type ArchitectureInspectorView =
  | ArchitectureInspectorArchitectureView
  | ArchitectureInspectorGenericView;

const EMPTY_ARCHITECTURE_INSPECTOR_NODE: ArchitectureInspectorArchitectureView = {
  type: "ArchitectureNode",
  label: "",
  summary: "",
  tags: [],
  responsibilities: [],
  capabilities: [],
  interfaces: [],
  dataAssets: [],
  links: [],
  outgoing: [],
};

const runtime = useFlaierRuntime();
const spec = computed(() => runtime.spec.value);
const customNodes = computed(() => runtime.nodes.value);
const availableFlows = computed(() => runtime.flowOptions.value);
const activeFlowId = computed(() => runtime.activeFlowId.value);
const activeFlow = computed(() => {
  const activeId = activeFlowId.value;
  if (!activeId) return undefined;
  return availableFlows.value.find((flow) => flow.id === activeId);
});
const showFlowSelector = computed(() => availableFlows.value.length > 1);
const showHeaderOverlay = computed(() => props.showHeaderOverlay !== false);
const overlayTitle = computed(() => activeFlow.value?.title ?? props.title);
const overlayDescription = computed(() => activeFlow.value?.description ?? props.description);
const headerModeLabel = computed(() => {
  if (showFlowSelector.value) {
    return "Flow";
  }

  return isArchitectureMode.value ? "Diagram" : "Narrative";
});
const headerDropdownRef = ref<HTMLDivElement | null>(null);
const headerDropdownOpen = ref(false);
const exportMenuRef = ref<HTMLDivElement | null>(null);
const exportMenuOpen = ref(false);
const exportInFlight = ref<DiagramExportFormat | null>(null);
const exportError = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const sceneRef = ref<HTMLElement | null>(null);
const containerReady = ref(false);
const containerWidth = ref(0);
const containerHeight = ref(0);
const uiTheme = ref<"dark" | "light">("dark");
let documentThemeObserver: MutationObserver | null = null;
let documentThemeMediaQuery: MediaQueryList | null = null;
let handleDocumentThemeMediaQueryChange: ((event: MediaQueryListEvent) => void) | null = null;
const isLightTheme = computed(() => uiTheme.value === "light");
const themeMode = computed(() => (props.themeMode === "document" ? "document" : "local"));
const isArchitectureMode = computed(() => props.mode === "architecture");
const showExportControls = computed(() => props.showExportControls !== false);
const showThemeToggle = computed(() => props.showThemeToggle !== false);
const showArchitectureInspectorPanel = computed(() => props.showArchitectureInspector !== false);
const defaultArchitectureInspectorOpen = computed(
  () => props.defaultArchitectureInspectorOpen !== false,
);
const showArchitectureInspectorToggleText = computed(
  () => props.showArchitectureInspectorToggleText !== false,
);
const showTopRightControls = computed(() => {
  return (
    showExportControls.value ||
    showThemeToggle.value ||
    (showExportControls.value && Boolean(exportError.value))
  );
});
const architectureInspectorOpen = ref(props.defaultArchitectureInspectorOpen !== false);
const themeToggleLabel = computed(() => {
  return isLightTheme.value ? "Switch to dark mode" : "Switch to light mode";
});

const architectureInspectorToggleLabel = computed(() => {
  return architectureInspectorOpen.value
    ? "Hide architecture details sidebar"
    : "Show architecture details sidebar";
});

const exportButtonLabel = computed(() => {
  if (exportInFlight.value === "png") {
    return "Exporting PNG...";
  }

  if (exportInFlight.value === "pdf") {
    return "Exporting PDF...";
  }

  return "Export full diagram";
});

function toggleTheme() {
  if (themeMode.value === "document") {
    applyDocumentTheme(isLightTheme.value ? "dark" : "light");
    return;
  }

  uiTheme.value = isLightTheme.value ? "dark" : "light";
}

function toggleArchitectureInspector() {
  architectureInspectorOpen.value = !architectureInspectorOpen.value;
}

function normalizeTheme(value: unknown): "dark" | "light" | null {
  if (value === "dark" || value === "light") {
    return value;
  }

  return null;
}

function readStoredTheme() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(FLAIER_THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function getPreferredSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getDocumentTheme(): "dark" | "light" | null {
  if (typeof document === "undefined") {
    return null;
  }

  const root = document.documentElement;
  const dataTheme = root.getAttribute("data-theme")?.trim().toLowerCase();

  if (dataTheme === "dark" || dataTheme === "light") {
    return dataTheme;
  }

  if (root.classList.contains("dark")) {
    return "dark";
  }

  if (root.classList.contains("light")) {
    return "light";
  }

  const colorScheme = root.style.colorScheme?.trim().toLowerCase();
  if (colorScheme === "dark" || colorScheme === "light") {
    return colorScheme;
  }

  return null;
}

function applyDocumentTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function persistTheme(theme: "dark" | "light") {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FLAIER_THEME_STORAGE_KEY, theme);
  } catch {
    // no-op when storage is unavailable
  }
}

function syncDocumentTheme() {
  uiTheme.value = getDocumentTheme() ?? getPreferredSystemTheme();
}

function startDocumentThemeSync() {
  if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
    if (!documentThemeObserver) {
      documentThemeObserver = new MutationObserver(() => {
        syncDocumentTheme();
      });

      documentThemeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style", "data-theme"],
      });
    }
  }

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    if (!documentThemeMediaQuery) {
      documentThemeMediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    }

    if (!handleDocumentThemeMediaQueryChange) {
      handleDocumentThemeMediaQueryChange = () => {
        syncDocumentTheme();
      };

      if (typeof documentThemeMediaQuery.addEventListener === "function") {
        documentThemeMediaQuery.addEventListener("change", handleDocumentThemeMediaQueryChange);
      } else {
        documentThemeMediaQuery.addListener(handleDocumentThemeMediaQueryChange);
      }
    }
  }
}

function stopDocumentThemeSync() {
  if (documentThemeObserver) {
    documentThemeObserver.disconnect();
    documentThemeObserver = null;
  }

  if (documentThemeMediaQuery && handleDocumentThemeMediaQueryChange) {
    if (typeof documentThemeMediaQuery.removeEventListener === "function") {
      documentThemeMediaQuery.removeEventListener("change", handleDocumentThemeMediaQueryChange);
    } else {
      documentThemeMediaQuery.removeListener(handleDocumentThemeMediaQueryChange);
    }
  }

  handleDocumentThemeMediaQueryChange = null;
  documentThemeMediaQuery = null;
}

function toggleHeaderDropdown() {
  if (!showFlowSelector.value) return;
  closeExportMenu();
  headerDropdownOpen.value = !headerDropdownOpen.value;
}

function closeHeaderDropdown() {
  headerDropdownOpen.value = false;
}

function toggleExportMenu() {
  if (exportInFlight.value) return;
  if (!canExportDiagram.value) return;

  closeHeaderDropdown();
  exportMenuOpen.value = !exportMenuOpen.value;
}

function closeExportMenu() {
  exportMenuOpen.value = false;
}

function handleFlowSelect(flowId: string) {
  if (!flowId) return;

  runtime.setActiveFlow(flowId);
  headerDropdownOpen.value = false;
  closeExportMenu();
}

watch(showFlowSelector, (show) => {
  if (!show) {
    headerDropdownOpen.value = false;
  }
});

watch(activeFlowId, () => {
  headerDropdownOpen.value = false;
  closeExportMenu();
});

watch(uiTheme, (theme) => {
  if (themeMode.value === "document") {
    return;
  }

  persistTheme(theme);
});

watch(
  themeMode,
  (mode) => {
    if (mode === "document") {
      startDocumentThemeSync();
      syncDocumentTheme();
      return;
    }

    stopDocumentThemeSync();
    uiTheme.value = readStoredTheme() ?? getPreferredSystemTheme();
  },
  { immediate: true },
);

const rootElement = computed(() => {
  const activeSpec = spec.value;
  if (!activeSpec) return undefined;
  return activeSpec.elements[activeSpec.root];
});

const orderedNodeElements = computed<OrderedNodeElement[]>(() => {
  const activeSpec = spec.value;
  const root = rootElement.value;

  if (!activeSpec || !root?.children?.length) return [];

  const result: OrderedNodeElement[] = [];
  const queue = [...root.children];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const key = queue.shift();
    if (!key || seen.has(key)) continue;

    const element = activeSpec.elements[key];
    if (!element) continue;

    const nodeType = toNodeType(element.type);
    if (!nodeType) continue;

    seen.add(key);
    result.push({ key, index: result.length, nodeType, element });

    for (const childKey of element.children ?? []) {
      if (!seen.has(childKey)) {
        queue.push(childKey);
      }
    }
  }

  return result;
});

const orderedNodeByKey = computed<Record<string, OrderedNodeElement>>(() => {
  const map: Record<string, OrderedNodeElement> = {};

  for (const node of orderedNodeElements.value) {
    map[node.key] = node;
  }

  return map;
});

const rootLinearNextByKey = computed<Record<string, string>>(() => {
  const root = rootElement.value;
  if (!root?.children?.length) return {};
  const rootChildren = root.children;

  const map: Record<string, string> = {};

  rootChildren.forEach((key, index) => {
    const nextKey = rootChildren[index + 1];
    if (!nextKey) return;

    if (orderedNodeByKey.value[key] && orderedNodeByKey.value[nextKey]) {
      map[key] = nextKey;
    }
  });

  return map;
});

const transitionMetaBySource = computed<Record<string, Record<string, ParsedTransition>>>(() => {
  const map: Record<string, Record<string, ParsedTransition>> = {};

  for (const node of orderedNodeElements.value) {
    const transitions = toTransitions(node.element.props.transitions).filter((transition) =>
      Boolean(orderedNodeByKey.value[transition.to]),
    );

    if (transitions.length === 0) continue;

    const byTarget: Record<string, ParsedTransition> = {};
    for (const transition of transitions) {
      if (byTarget[transition.to]) continue;
      byTarget[transition.to] = transition;
    }

    if (Object.keys(byTarget).length > 0) {
      map[node.key] = byTarget;
    }
  }

  return map;
});

const outgoingNodeKeys = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {};

  for (const node of orderedNodeElements.value) {
    const transitionTargets = toTransitions(node.element.props.transitions)
      .map((transition) => transition.to)
      .filter((key) => Boolean(orderedNodeByKey.value[key]));

    const explicit = (node.element.children ?? []).filter((key) =>
      Boolean(orderedNodeByKey.value[key]),
    );

    const combined = mergeOutgoingTargets(transitionTargets, explicit);

    if (combined.length > 0) {
      map[node.key] = combined;
      continue;
    }

    const fallback = rootLinearNextByKey.value[node.key];
    map[node.key] = fallback ? [fallback] : [];
  }

  return map;
});

const incomingNodeKeys = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {};

  for (const node of orderedNodeElements.value) {
    map[node.key] = [];
  }

  for (const [source, targets] of Object.entries(outgoingNodeKeys.value)) {
    for (const target of targets) {
      if (!map[target]) continue;
      map[target].push(source);
    }
  }

  return map;
});

const startNodeKey = computed(() => {
  const root = rootElement.value;
  if (!root?.children?.length) return undefined;

  return root.children.find((key) => Boolean(orderedNodeByKey.value[key]));
});

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toTrimmedNonEmptyString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function toTrimmedNonEmptyString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toRequiredString(value: unknown) {
  return toOptionalString(value) ?? "";
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function toOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function toTwoslashHtml(value: unknown): TwoslashHtml | undefined {
  return normalizeTwoslashHtml(value);
}

function toPayloadFormat(value: unknown): "json" | "yaml" | "text" | undefined {
  if (value === "json" || value === "yaml" || value === "text") {
    return value;
  }

  return undefined;
}

function toArchitectureKind(value: unknown): ArchitectureNodeProps["kind"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (ARCHITECTURE_NODE_KIND_SET.has(value as NonNullable<ArchitectureNodeProps["kind"]>)) {
    return value as ArchitectureNodeProps["kind"];
  }

  return undefined;
}

function toArchitectureZoneId(value: unknown) {
  return toTrimmedNonEmptyString(value);
}

function toArchitectureStatus(value: unknown): ArchitectureNodeProps["status"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (ARCHITECTURE_NODE_STATUS_SET.has(value as NonNullable<ArchitectureNodeProps["status"]>)) {
    return value as ArchitectureNodeProps["status"];
  }

  return undefined;
}

function toArchitectureTier(value: unknown): ArchitectureNodeProps["tier"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (ARCHITECTURE_NODE_TIER_SET.has(value as NonNullable<ArchitectureNodeProps["tier"]>)) {
    return value as ArchitectureNodeProps["tier"];
  }

  return undefined;
}

function toArchitectureInterfaces(value: unknown): ArchitectureInterface[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: ArchitectureInterface[] = [];

  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const name = toTrimmedNonEmptyString(entry.name);
    if (!name) {
      continue;
    }

    const directionRaw = toTrimmedNonEmptyString(entry.direction);
    const direction =
      directionRaw &&
      ARCHITECTURE_INTERFACE_DIRECTION_SET.has(
        directionRaw as NonNullable<ArchitectureInterface["direction"]>,
      )
        ? (directionRaw as ArchitectureInterface["direction"])
        : undefined;

    result.push({
      name,
      protocol: toTrimmedNonEmptyString(entry.protocol),
      direction,
      contract: toTrimmedNonEmptyString(entry.contract),
      auth: toTrimmedNonEmptyString(entry.auth),
      notes: toTrimmedNonEmptyString(entry.notes),
    });
  }

  return result;
}

function toArchitectureDataAssets(value: unknown): ArchitectureDataAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: ArchitectureDataAsset[] = [];

  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const name = toTrimmedNonEmptyString(entry.name);
    if (!name) {
      continue;
    }

    const classificationRaw = toTrimmedNonEmptyString(entry.classification);
    const classification =
      classificationRaw &&
      ARCHITECTURE_DATA_CLASSIFICATION_SET.has(
        classificationRaw as NonNullable<ArchitectureDataAsset["classification"]>,
      )
        ? (classificationRaw as ArchitectureDataAsset["classification"])
        : undefined;

    result.push({
      name,
      kind: toTrimmedNonEmptyString(entry.kind),
      classification,
      retention: toTrimmedNonEmptyString(entry.retention),
      notes: toTrimmedNonEmptyString(entry.notes),
    });
  }

  return result;
}

function toArchitectureSecurity(value: unknown): ArchitectureSecurity | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const security = {
    auth: toTrimmedNonEmptyString(record.auth),
    encryption: toTrimmedNonEmptyString(record.encryption),
    pii: toOptionalBoolean(record.pii),
    threatModel: toTrimmedNonEmptyString(record.threatModel),
  } satisfies ArchitectureSecurity;

  if (
    !security.auth &&
    !security.encryption &&
    security.pii === undefined &&
    !security.threatModel
  ) {
    return undefined;
  }

  return security;
}

function toArchitectureOperations(value: unknown): ArchitectureOperations | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const operations = {
    owner: toTrimmedNonEmptyString(record.owner),
    slo: toTrimmedNonEmptyString(record.slo),
    alert: toTrimmedNonEmptyString(record.alert),
    runbook: toTrimmedNonEmptyString(record.runbook),
  } satisfies ArchitectureOperations;

  if (!operations.owner && !operations.slo && !operations.alert && !operations.runbook) {
    return undefined;
  }

  return operations;
}

function toArchitectureLinks(value: unknown): ArchitectureLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: ArchitectureLink[] = [];

  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const label = toTrimmedNonEmptyString(entry.label);
    const href = toTrimmedNonEmptyString(entry.href);
    if (!label || !href) {
      continue;
    }

    result.push({
      label,
      href,
    });
  }

  return result;
}

function toArchitectureZones(value: unknown): ResolvedArchitectureZone[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: ResolvedArchitectureZone[] = [];

  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const id = toTrimmedNonEmptyString(entry.id);
    const label = toTrimmedNonEmptyString(entry.label);
    if (!id || !label || seen.has(id)) {
      continue;
    }

    seen.add(id);

    const paddingRaw = entry.padding;
    const padding =
      typeof paddingRaw === "number" && Number.isFinite(paddingRaw)
        ? Math.max(28, Math.min(180, Math.round(paddingRaw)))
        : 62;

    result.push({
      id,
      label,
      description: toTrimmedNonEmptyString(entry.description),
      color: toTrimmedNonEmptyString(entry.color),
      padding,
    });
  }

  return result;
}

function humanizeZoneId(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\w/g, (char) => char.toUpperCase());
}

function resolveZoneColor(index: number, explicitColor?: string) {
  return (
    explicitColor ||
    ARCHITECTURE_ZONE_COLOR_PALETTE[index % ARCHITECTURE_ZONE_COLOR_PALETTE.length] ||
    "#38bdf8"
  );
}

function toHexChannel(value: string) {
  return Number.parseInt(value, 16);
}

function hexToRgb(value: string) {
  const hex = value.trim().replace(/^#/, "");
  if (hex.length === 3) {
    const r = toHexChannel(`${hex[0]}${hex[0]}`);
    const g = toHexChannel(`${hex[1]}${hex[1]}`);
    const b = toHexChannel(`${hex[2]}${hex[2]}`);
    if ([r, g, b].every((channel) => Number.isFinite(channel))) {
      return { r, g, b };
    }

    return undefined;
  }

  if (hex.length === 6) {
    const r = toHexChannel(hex.slice(0, 2));
    const g = toHexChannel(hex.slice(2, 4));
    const b = toHexChannel(hex.slice(4, 6));
    if ([r, g, b].every((channel) => Number.isFinite(channel))) {
      return { r, g, b };
    }
  }

  return undefined;
}

function withAlpha(color: string, alpha: number) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function toPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const asInteger = Math.floor(value);
  return asInteger > 0 ? asInteger : undefined;
}

function parseInlineSourceAnchorLocation(value: string): ParsedAnchorLocation | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const matched = SOURCE_ANCHOR_TRAILING_LOCATION_PATTERN.exec(trimmed);
  if (!matched) {
    return {
      path: trimmed,
    };
  }

  const rawPath = matched[1]?.trim();
  const rawLine = matched[2];
  const rawColumn = matched[3];

  if (!rawPath || !rawLine) {
    return {
      path: trimmed,
    };
  }

  const line = Number(rawLine);
  const column = rawColumn ? Number(rawColumn) : undefined;

  return {
    path: rawPath,
    line: Number.isFinite(line) && line > 0 ? Math.floor(line) : undefined,
    column: Number.isFinite(column) && (column ?? 0) > 0 ? Math.floor(column as number) : undefined,
  };
}

function toVsCodeFileHref(path: string, line?: number, column?: number) {
  const normalizedPath = path.trim().replace(/\\/g, "/");
  if (!normalizedPath) return undefined;

  const encodedPath = encodeURI(normalizedPath);
  const linePart = line ? `:${line}` : "";
  const columnPart = line && column ? `:${column}` : "";

  return `vscode://file/${encodedPath}${linePart}${columnPart}`;
}

function resolveSourceAnchorHref(
  path: string,
  line?: number,
  column?: number,
  explicitHref?: string,
) {
  if (explicitHref) {
    return explicitHref;
  }

  if (SOURCE_ANCHOR_LINK_PATTERN.test(path)) {
    return path;
  }

  return toVsCodeFileHref(path, line, column);
}

function toSourceAnchor(value: unknown): ParsedSourceAnchor | undefined {
  const inlineAnchor = toTrimmedNonEmptyString(value);
  if (inlineAnchor) {
    const parsed = parseInlineSourceAnchorLocation(inlineAnchor);

    return {
      label: inlineAnchor,
      href: parsed ? resolveSourceAnchorHref(parsed.path, parsed.line, parsed.column) : undefined,
    };
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const path = toTrimmedNonEmptyString(record.path);
  if (!path) {
    return undefined;
  }

  const line = toPositiveInteger(record.line);
  const column = toPositiveInteger(record.column);
  const explicitLabel = toTrimmedNonEmptyString(record.label);
  const explicitHref = toTrimmedNonEmptyString(record.href);

  const location = [path];
  if (line !== undefined) {
    location.push(String(line));

    if (column !== undefined) {
      location.push(String(column));
    }
  }

  const label = explicitLabel ?? location.join(":");

  return {
    label,
    href: resolveSourceAnchorHref(path, line, column, explicitHref),
  };
}

function resolveNodeSourceAnchor(nodeProps: Record<string, unknown>) {
  const explicit = toSourceAnchor(nodeProps.sourceAnchor);
  if (explicit) {
    return explicit;
  }

  const fileFallback = toTrimmedNonEmptyString(nodeProps.file);
  if (!fileFallback) {
    return undefined;
  }

  return {
    label: fileFallback,
  } satisfies ParsedSourceAnchor;
}

function createCustomNodeContext(
  node: OrderedNodeElement,
): FlaierCustomNodeContext<Record<string, unknown>> {
  return {
    key: node.key,
    elementType: node.element.type,
    props: node.element.props,
    sourceAnchor: resolveNodeSourceAnchor(node.element.props) as
      | FlaierResolvedSourceAnchor
      | undefined,
  };
}

function toCustomNodeSize(value: FlaierCustomNodeSize | undefined): NodeSize | undefined {
  if (!value) {
    return undefined;
  }

  const width = Number(value.width);
  const height = Number(value.height);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return undefined;
  }

  return {
    width: Math.max(120, Math.round(width)),
    height: Math.max(72, Math.round(height)),
  };
}

function getNodeSummary(node: OrderedNodeElement) {
  const customNode = getCustomNodeDefinition(node.element.type);
  if (customNode?.getSummary) {
    return customNode.getSummary(createCustomNodeContext(node)) ?? "";
  }

  if (node.element.type === "CodeNode") {
    return (
      toTrimmedNonEmptyString(node.element.props.story) ??
      toTrimmedNonEmptyString(node.element.props.comment) ??
      ""
    );
  }

  if (node.element.type === "DescriptionNode") {
    return toTrimmedNonEmptyString(node.element.props.body) ?? "";
  }

  if (node.element.type === "DecisionNode") {
    return (
      toTrimmedNonEmptyString(node.element.props.description) ??
      toTrimmedNonEmptyString(node.element.props.condition) ??
      ""
    );
  }

  if (node.element.type === "PayloadNode") {
    return toTrimmedNonEmptyString(node.element.props.description) ?? "";
  }

  if (node.element.type === "ErrorNode") {
    const message = toTrimmedNonEmptyString(node.element.props.message);
    const cause = toTrimmedNonEmptyString(node.element.props.cause);
    const mitigation = toTrimmedNonEmptyString(node.element.props.mitigation);

    return [message, cause ? `Cause: ${cause}` : "", mitigation ? `Mitigation: ${mitigation}` : ""]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");
  }

  if (node.element.type === "ArchitectureNode") {
    const technology = toTrimmedNonEmptyString(node.element.props.technology);
    const description = toTrimmedNonEmptyString(node.element.props.description);

    return [technology ? `Technology: ${technology}` : "", description ?? ""]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");
  }

  return toTrimmedNonEmptyString(node.element.props.description) ?? "";
}

function createCustomNodeRenderer(
  elementType: string,
  definition: FlaierCustomNodeDefinition,
  displayName: string,
) {
  return markRaw(
    defineComponent<NodeProps<FlowNodeData>>({
      name: `Flaier${displayName}Node`,
      props: [
        "id",
        "type",
        "selected",
        "connectable",
        "position",
        "dimensions",
        "label",
        "isValidTargetPos",
        "isValidSourcePos",
        "parent",
        "parentNodeId",
        "dragging",
        "resizing",
        "zIndex",
        "targetPosition",
        "sourcePosition",
        "dragHandle",
        "data",
        "events",
      ],
      setup(nodeProps) {
        return () =>
          h(definition.component, {
            ...nodeProps.data?.props,
            active: nodeProps.data?.active,
            nodeKey: nodeProps.data?.key,
            elementType: nodeProps.data?.elementType ?? elementType,
            sourceAnchor: nodeProps.data?.sourceAnchor,
          });
      },
    }),
  );
}

const customNodeTypes = computed<NodeTypesObject>(() => {
  return Object.fromEntries(
    Object.entries(customNodes.value).map(([elementType, definition]) => {
      const displayName = elementType.replace(/[^a-z0-9]+/gi, "") || "Custom";

      return [elementType, createCustomNodeRenderer(elementType, definition, displayName)];
    }),
  );
});

function codeNodeTwoslashEnabled(element: SpecElement) {
  if (element.type !== "CodeNode") return false;

  if (!normalizeTwoslashLanguage(toOptionalString(element.props.language))) {
    return false;
  }

  if (!hasTwoslashHtml(toTwoslashHtml(element.props.twoslashHtml))) {
    return false;
  }

  const requested = toOptionalBoolean(element.props.twoslash);
  if (requested === true) return true;
  if (requested === false) return false;

  const variants = [
    toRequiredString(element.props.code),
    ...toMagicMoveSteps(element.props.magicMoveSteps).map((step) => step.code),
  ];

  return variants.some((code) => hasTwoslashHints(code));
}

function toPositiveNumber(value: unknown, fallback: number, min = 1) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(min, Math.floor(value));
  }

  return fallback;
}

function toMagicMoveSteps(value: unknown): MagicMoveStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is MagicMoveStep => {
      if (!item || typeof item !== "object") return false;

      const record = item as Record<string, unknown>;
      if (typeof record.code !== "string") return false;

      const optionalKeys: Array<"title" | "comment" | "story" | "speaker"> = [
        "title",
        "comment",
        "story",
        "speaker",
      ];

      return optionalKeys.every((key) => {
        const current = record[key];
        return current === undefined || typeof current === "string";
      });
    })
    .map((item) => ({
      code: item.code,
      title: toOptionalString(item.title),
      comment: toOptionalString(item.comment),
      story: toOptionalString(item.story),
      speaker: toOptionalString(item.speaker),
    }));
}

function toTransitionKind(value: unknown): EdgeTransitionKind | undefined {
  if (typeof value !== "string") return undefined;
  return EDGE_TRANSITION_KIND_SET.has(value as EdgeTransitionKind)
    ? (value as EdgeTransitionKind)
    : undefined;
}

function toTransitionTransport(value: unknown): "sync" | "async" | undefined {
  if (typeof value !== "string") return undefined;
  return EDGE_TRANSITION_TRANSPORT_SET.has(value) ? (value as "sync" | "async") : undefined;
}

function toTransitionCriticality(value: unknown): "low" | "medium" | "high" | undefined {
  if (typeof value !== "string") return undefined;
  return EDGE_TRANSITION_CRITICALITY_SET.has(value)
    ? (value as "low" | "medium" | "high")
    : undefined;
}

function toTransitions(value: unknown): ParsedTransition[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== "object") return false;
      if (!toOptionalString(item.to)) return false;

      const label = item.label;
      const description = item.description;
      const kind = item.kind;
      const protocol = item.protocol;
      const transport = item.transport;
      const auth = item.auth;
      const contract = item.contract;
      const criticality = item.criticality;

      if (label !== undefined && typeof label !== "string") return false;
      if (description !== undefined && typeof description !== "string") return false;
      if (kind !== undefined && !toTransitionKind(kind)) return false;
      if (protocol !== undefined && typeof protocol !== "string") return false;
      if (transport !== undefined && !toTransitionTransport(transport)) return false;
      if (auth !== undefined && typeof auth !== "string") return false;
      if (contract !== undefined && typeof contract !== "string") return false;
      if (criticality !== undefined && !toTransitionCriticality(criticality)) return false;

      return true;
    })
    .map((item) => ({
      to: toRequiredString(item.to),
      label: toOptionalString(item.label),
      description: toOptionalString(item.description),
      kind: toTransitionKind(item.kind),
      protocol: toOptionalString(item.protocol),
      transport: toTransitionTransport(item.transport),
      auth: toOptionalString(item.auth),
      contract: toOptionalString(item.contract),
      criticality: toTransitionCriticality(item.criticality),
    }));
}

function resolveTransitionEdgeLabel(transition?: ParsedTransition) {
  if (!transition) {
    return undefined;
  }

  const metadataParts = [transition.protocol, transition.transport, transition.criticality].filter(
    (value): value is string => Boolean(value),
  );

  if (transition.label) {
    return metadataParts.length > 0
      ? `${transition.label} (${metadataParts.join(" | ")})`
      : transition.label;
  }

  if (metadataParts.length > 0) {
    return metadataParts.join(" | ");
  }

  return undefined;
}

function mergeOutgoingTargets(primary: string[], secondary: string[]) {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const target of [...primary, ...secondary]) {
    if (!target || seen.has(target)) continue;

    seen.add(target);
    merged.push(target);
  }

  return merged;
}

function getNodeFrameCount(element: SpecElement) {
  if (element.type !== "CodeNode") return 1;

  const magicMoveSteps = toMagicMoveSteps(element.props.magicMoveSteps);
  const baseSteps = Math.max(1, magicMoveSteps.length);

  if (magicMoveSteps.length > 0 && codeNodeTwoslashEnabled(element)) {
    return baseSteps + 1;
  }

  return baseSteps;
}

function getCodeNodeMaxLines(element: SpecElement) {
  const rootCodeLines = toRequiredString(element.props.code).split("\n").length;
  const stepLines = toMagicMoveSteps(element.props.magicMoveSteps).map(
    (step) => step.code.split("\n").length,
  );

  return Math.max(rootCodeLines, ...stepLines);
}

function getCodeNodeMaxLineLength(element: SpecElement) {
  const variants = [
    toRequiredString(element.props.code),
    ...toMagicMoveSteps(element.props.magicMoveSteps).map((step) => step.code),
  ];

  return variants.reduce((max, code) => {
    const lineMax = code
      .split("\n")
      .reduce((lineLengthMax, line) => Math.max(lineLengthMax, line.length), 0);

    return Math.max(max, lineMax);
  }, 0);
}

function estimateWrappedLines(text: string, charsPerLine = 48) {
  return text
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

function getCodeNodeWrappedLines(element: SpecElement, charsPerLine = 44) {
  const variants = [
    toRequiredString(element.props.code),
    ...toMagicMoveSteps(element.props.magicMoveSteps).map((step) => step.code),
  ];

  return variants.reduce((max, code) => {
    return Math.max(max, estimateWrappedLines(code, charsPerLine));
  }, 1);
}

function hasCodeNodeStoryMeta(element: SpecElement) {
  return toMagicMoveSteps(element.props.magicMoveSteps).some((step) => step.title || step.speaker);
}

function getCodeNodeStoryLines(element: SpecElement) {
  const variants = [
    toOptionalString(element.props.story),
    toOptionalString(element.props.comment),
    ...toMagicMoveSteps(element.props.magicMoveSteps).flatMap((step) => [step.story, step.comment]),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (variants.length === 0) return 0;

  return variants.reduce((max, current) => Math.max(max, estimateWrappedLines(current)), 1);
}

function estimateNodeTextLines(value: unknown, charsPerLine: number) {
  const text = toOptionalString(value);
  if (!text) return 0;
  return estimateWrappedLines(text, charsPerLine);
}

function estimateCodeNodeSize(element: SpecElement): NodeSize {
  const maxLineLength = getCodeNodeMaxLineLength(element);
  const nodeWidth = estimateCodeNodeWidth(maxLineLength);
  const codeCharsPerLine = estimateCodeNodeCharsPerLine(nodeWidth);
  const autoWrapEnabled = maxLineLength > CODE_NODE_MAX_INLINE_CHARS;
  const wrapEnabled = toBoolean(element.props.wrapLongLines) || autoWrapEnabled;

  const codeLines = wrapEnabled
    ? getCodeNodeWrappedLines(element, codeCharsPerLine)
    : getCodeNodeMaxLines(element);
  const storyLines = getCodeNodeStoryLines(element);
  const storyHasMeta = hasCodeNodeStoryMeta(element);

  const codeViewportHeight = wrapEnabled
    ? Math.min(400, Math.max(190, 72 + codeLines * 16))
    : Math.min(340, Math.max(160, 84 + codeLines * 17));

  const storyViewportHeight =
    storyLines > 0 ? Math.min(220, Math.max(88, (storyHasMeta ? 56 : 34) + storyLines * 18)) : 0;

  return {
    width: nodeWidth,
    height: Math.min(760, Math.max(230, 42 + codeViewportHeight + storyViewportHeight + 14)),
  };
}

function estimateNodeSize(node: OrderedNodeElement): NodeSize {
  const { element } = node;
  const customNode = getCustomNodeDefinition(element.type);

  if (customNode?.estimateSize) {
    const customSize = toCustomNodeSize(customNode.estimateSize(createCustomNodeContext(node)));
    if (customSize) {
      return customSize;
    }
  }

  if (customNode) {
    return {
      width: 240,
      height: 120,
    };
  }

  if (element.type === "ArchitectureNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 28));
    const technologyLines = estimateNodeTextLines(element.props.technology, 30);
    const ownerLines = estimateNodeTextLines(element.props.owner, 30);
    const runtimeLines = estimateNodeTextLines(element.props.runtime, 30);
    const descriptionLines = estimateNodeTextLines(element.props.description, 34);
    const capabilityCount = Math.min(4, toStringArray(element.props.capabilities).length);
    const tagCount = Math.min(4, toStringArray(element.props.tags).length);
    const chipRows =
      (capabilityCount > 0 ? Math.ceil(capabilityCount / 2) : 0) + (tagCount > 0 ? 1 : 0);
    const metaRows =
      toArchitectureStatus(element.props.status) || toArchitectureTier(element.props.tier) ? 1 : 0;
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 270,
      height: Math.min(
        460,
        Math.max(
          144,
          58 +
            labelLines * 19 +
            technologyLines * 14 +
            ownerLines * 12 +
            runtimeLines * 12 +
            descriptionLines * 15 +
            metaRows * 16 +
            chipRows * 18 +
            anchorHeight,
        ),
      ),
    };
  }

  if (element.type === "CodeNode") {
    return estimateCodeNodeSize(element);
  }

  if (element.type === "TriggerNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 24));
    const descriptionLines = estimateNodeTextLines(element.props.description, 30);
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 220,
      height: Math.min(
        300,
        Math.max(100, 46 + labelLines * 18 + descriptionLines * 15 + anchorHeight),
      ),
    };
  }

  if (element.type === "DecisionNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 26));
    const conditionLines = estimateNodeTextLines(element.props.condition, 34);
    const descriptionLines = estimateNodeTextLines(element.props.description, 34);
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 250,
      height: Math.min(
        360,
        Math.max(
          122,
          50 + labelLines * 18 + conditionLines * 16 + descriptionLines * 15 + anchorHeight,
        ),
      ),
    };
  }

  if (element.type === "PayloadNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 32));
    const descriptionLines = estimateNodeTextLines(element.props.description, 34);
    const beforeLines = estimateNodeTextLines(element.props.before, 40);
    const afterLines = estimateNodeTextLines(element.props.after, 40);
    const payloadLines = estimateNodeTextLines(element.props.payload, 40);
    const bodyLines = Math.max(payloadLines, beforeLines + afterLines);
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 300,
      height: Math.min(
        540,
        Math.max(160, 60 + labelLines * 18 + descriptionLines * 14 + bodyLines * 10 + anchorHeight),
      ),
    };
  }

  if (element.type === "ErrorNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 30));
    const messageLines = Math.max(1, estimateNodeTextLines(element.props.message, 34));
    const causeLines = estimateNodeTextLines(element.props.cause, 34);
    const mitigationLines = estimateNodeTextLines(element.props.mitigation, 34);
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 280,
      height: Math.min(
        440,
        Math.max(
          140,
          58 +
            labelLines * 18 +
            messageLines * 16 +
            causeLines * 15 +
            mitigationLines * 15 +
            anchorHeight,
        ),
      ),
    };
  }

  if (element.type === "DescriptionNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 26));
    const bodyLines = Math.max(1, estimateNodeTextLines(element.props.body, 30));
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 240,
      height: Math.min(360, Math.max(118, 44 + labelLines * 18 + bodyLines * 16 + anchorHeight)),
    };
  }

  if (element.type === "LinkNode") {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 24));
    const descriptionLines = estimateNodeTextLines(element.props.description, 30);
    const anchorHeight = resolveNodeSourceAnchor(element.props) ? 18 : 0;

    return {
      width: 220,
      height: Math.min(
        300,
        Math.max(98, 42 + labelLines * 18 + descriptionLines * 15 + anchorHeight),
      ),
    };
  }

  return {
    width: 240,
    height: 120,
  };
}

const selectedBranchByNode = ref<Record<string, string>>({});
const pathFrames = ref<TimelineFrame[]>([]);

function createFramesForNode(nodeKey: string): TimelineFrame[] {
  const node = orderedNodeByKey.value[nodeKey];
  if (!node) return [];

  const totalLocalSteps = getNodeFrameCount(node.element);

  return Array.from({ length: totalLocalSteps }, (_, localStep) => ({
    nodeIndex: node.index,
    nodeKey,
    localStep,
    totalLocalSteps,
  }));
}

function resolveNextNode(nodeKey: string, options: string[]) {
  const selected = selectedBranchByNode.value[nodeKey];
  if (selected && options.includes(selected)) {
    return selected;
  }

  return options[0];
}

function buildGuidedPath(startKey: string, maxFrames = 450): TimelineFrame[] {
  const frames: TimelineFrame[] = [];
  const visitedEdges = new Map<string, number>();
  let currentKey: string | undefined = startKey;

  while (currentKey && frames.length < maxFrames) {
    const nodeFrames = createFramesForNode(currentKey);
    if (nodeFrames.length === 0) break;

    frames.push(...nodeFrames);

    const options = outgoingNodeKeys.value[currentKey] ?? [];
    if (options.length === 0) break;

    const nextKey = resolveNextNode(currentKey, options);
    if (!nextKey) break;

    const edgeKey = `${currentKey}->${nextKey}`;
    const edgeVisits = (visitedEdges.get(edgeKey) ?? 0) + 1;
    visitedEdges.set(edgeKey, edgeVisits);
    if (edgeVisits > 2) break;

    currentKey = nextKey;
  }

  return frames;
}

function findNearestFrameIndex(frames: TimelineFrame[], nodeKey: string, anchor = 0) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < frames.length; index += 1) {
    if (frames[index]?.nodeKey !== nodeKey) continue;

    const distance = Math.abs(index - anchor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function sortOptionsForTraversal(sourceKey: string, options: string[]) {
  const selected = selectedBranchByNode.value[sourceKey];

  return [...options].sort((a, b) => {
    const aSelected = a === selected;
    const bSelected = b === selected;

    if (aSelected !== bSelected) {
      return aSelected ? -1 : 1;
    }

    const aIndex = orderedNodeByKey.value[a]?.index ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderedNodeByKey.value[b]?.index ?? Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });
}

function findPathKeysToNode(startKey: string, targetKey: string) {
  if (startKey === targetKey) {
    return [startKey];
  }

  const queue: Array<{ key: string; path: string[]; depth: number }> = [
    {
      key: startKey,
      path: [startKey],
      depth: 0,
    },
  ];

  const visitedDepth = new Map<string, number>([[startKey, 0]]);
  const maxDepth = Math.max(8, orderedNodeElements.value.length + 8);
  const maxIterations = Math.max(
    80,
    orderedNodeElements.value.length * orderedNodeElements.value.length * 2,
  );
  let guard = 0;

  while (queue.length > 0 && guard < maxIterations) {
    guard += 1;

    const current = queue.shift();
    if (!current) continue;
    if (current.depth >= maxDepth) continue;

    const options = sortOptionsForTraversal(current.key, outgoingNodeKeys.value[current.key] ?? []);

    for (const option of options) {
      if (!orderedNodeByKey.value[option]) continue;

      const nextDepth = current.depth + 1;
      if (option === targetKey) {
        return [...current.path, option];
      }

      const knownDepth = visitedDepth.get(option);
      if (knownDepth !== undefined && knownDepth <= nextDepth) {
        continue;
      }

      visitedDepth.set(option, nextDepth);
      queue.push({
        key: option,
        path: [...current.path, option],
        depth: nextDepth,
      });
    }
  }

  return null;
}

function applyBranchSelectionsForPath(pathKeys: string[]) {
  if (pathKeys.length < 2) return;

  const nextSelected = { ...selectedBranchByNode.value };

  for (let index = 0; index < pathKeys.length - 1; index += 1) {
    const source = pathKeys[index];
    const target = pathKeys[index + 1];
    if (!source || !target) continue;

    const options = outgoingNodeKeys.value[source] ?? [];
    if (options.length > 1 && options.includes(target)) {
      nextSelected[source] = target;
    }
  }

  selectedBranchByNode.value = nextSelected;
}

const totalSteps = computed(() => pathFrames.value.length);
const maxStepIndex = computed(() => Math.max(0, totalSteps.value - 1));

const { set } = useStateStore();
const currentStepState = useStateValue<number>("/currentStep");
const playingState = useStateValue<boolean>("/playing");

function clampStep(value: number) {
  if (!Number.isFinite(value)) return 0;
  const step = Math.floor(value);
  return Math.max(0, Math.min(step, maxStepIndex.value));
}

const currentStep = computed<number>({
  get() {
    return clampStep(Number(currentStepState.value ?? 0));
  },
  set(value: number) {
    set("/currentStep", clampStep(value));
  },
});

const playing = computed<boolean>({
  get() {
    return Boolean(playingState.value ?? false);
  },
  set(value: boolean) {
    set("/playing", value);
  },
});

watch(
  [startNodeKey, orderedNodeElements, isArchitectureMode],
  ([start, , architectureMode]) => {
    if (architectureMode) {
      selectedBranchByNode.value = {};
      pathFrames.value = [];
      currentStep.value = 0;
      playing.value = false;
      return;
    }

    selectedBranchByNode.value = {};

    if (!start) {
      pathFrames.value = [];
      currentStep.value = 0;
      return;
    }

    const built = buildGuidedPath(start);
    pathFrames.value = built.length > 0 ? built : createFramesForNode(start);
    currentStep.value = clampStep(Number(currentStepState.value ?? 0));
  },
  { immediate: true },
);

watch(totalSteps, () => {
  currentStep.value = clampStep(currentStep.value);
});

const intervalMs = computed(() => {
  const value = Number(runtime.interval.value);
  if (!Number.isFinite(value) || value <= 0) return 3000;
  return Math.max(250, Math.floor(value));
});

let timer: ReturnType<typeof setInterval> | null = null;

function clearTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function next() {
  if (isArchitectureMode.value) {
    return false;
  }

  if (currentStep.value >= totalSteps.value - 1) {
    return false;
  }

  currentStep.value += 1;
  return true;
}

watch(
  [playing, totalSteps, intervalMs],
  ([isPlaying, steps, interval]) => {
    clearTimer();

    if (!isPlaying || steps <= 1) return;

    timer = setInterval(() => {
      const advanced = next();
      if (!advanced) {
        playing.value = false;
      }
    }, interval);
  },
  { immediate: true },
);

function prev() {
  if (isArchitectureMode.value) {
    return;
  }

  if (currentStep.value > 0) {
    currentStep.value -= 1;
  }
}

function goTo(step: number) {
  if (isArchitectureMode.value) {
    return;
  }

  currentStep.value = clampStep(step);
}

function togglePlay() {
  if (isArchitectureMode.value) {
    playing.value = false;
    return;
  }

  if (totalSteps.value <= 1) {
    playing.value = false;
    return;
  }

  playing.value = !playing.value;
}

const activeFrame = computed(() => pathFrames.value[currentStep.value]);
const nextPlannedNodeKey = computed(() => pathFrames.value[currentStep.value + 1]?.nodeKey);

function jumpToNode(nodeKey: string) {
  if (!orderedNodeByKey.value[nodeKey]) return;

  playing.value = false;

  const existingIndex = findNearestFrameIndex(pathFrames.value, nodeKey, currentStep.value);
  if (existingIndex >= 0) {
    currentStep.value = existingIndex;
    return;
  }

  const start = startNodeKey.value;
  if (!start) {
    const standaloneFrames = createFramesForNode(nodeKey);
    if (standaloneFrames.length === 0) return;

    pathFrames.value = standaloneFrames;
    currentStep.value = 0;
    return;
  }

  const pathKeys = findPathKeysToNode(start, nodeKey);
  if (pathKeys) {
    applyBranchSelectionsForPath(pathKeys);
  }

  const rebuiltFrames = buildGuidedPath(start);
  pathFrames.value = rebuiltFrames.length > 0 ? rebuiltFrames : createFramesForNode(start);

  const rebuiltIndex = findNearestFrameIndex(pathFrames.value, nodeKey, currentStep.value);
  if (rebuiltIndex >= 0) {
    currentStep.value = rebuiltIndex;
    return;
  }

  const standaloneFrames = createFramesForNode(nodeKey);
  if (standaloneFrames.length === 0) return;

  pathFrames.value = standaloneFrames;
  currentStep.value = 0;
}

const resolvedLayoutEngine = computed<"dagre" | "manual">(() => {
  return props.layoutEngine === "manual" ? "manual" : DEFAULT_LAYOUT_ENGINE;
});

const resolvedLayoutRankSep = computed(() => {
  const fallback =
    props.direction === "vertical"
      ? DEFAULT_DAGRE_RANK_SEP_VERTICAL
      : DEFAULT_DAGRE_RANK_SEP_HORIZONTAL;

  return toPositiveNumber(props.layoutRankSep, fallback, 80);
});

const resolvedLayoutNodeSep = computed(() => {
  const fallback =
    props.direction === "vertical"
      ? DEFAULT_DAGRE_NODE_SEP_VERTICAL
      : DEFAULT_DAGRE_NODE_SEP_HORIZONTAL;

  return toPositiveNumber(props.layoutNodeSep, fallback, 40);
});

const resolvedLayoutEdgeSep = computed(() => {
  return toPositiveNumber(props.layoutEdgeSep, DEFAULT_DAGRE_EDGE_SEP, 8);
});

function createFallbackLayoutPositions(
  nodes: OrderedNodeElement[],
  rankGap = DEFAULT_FALLBACK_GAP,
) {
  const mainGap = Math.max(80, rankGap);
  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of nodes) {
    if (props.direction === "vertical") {
      positions[node.key] = { x: 0, y: node.index * mainGap };
      continue;
    }

    positions[node.key] = { x: node.index * mainGap, y: 0 };
  }

  return positions;
}

function normalizePositions(positions: Record<string, { x: number; y: number }>) {
  if (Object.keys(positions).length === 0) {
    return positions;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (const position of Object.values(positions)) {
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
  }

  for (const key of Object.keys(positions)) {
    const currentPosition = positions[key];
    if (!currentPosition) continue;

    positions[key] = {
      x: currentPosition.x - minX,
      y: currentPosition.y - minY,
    };
  }

  return positions;
}

function createManualLayoutPositions(
  orderedNodes: OrderedNodeElement[],
  rankGap: number,
  laneGap: number,
) {
  if (orderedNodes.length === 0) return {};

  const depthByKey: Record<string, number> = {};
  for (const node of orderedNodes) {
    depthByKey[node.key] = Number.NEGATIVE_INFINITY;
  }

  const startKey = startNodeKey.value ?? orderedNodes[0]?.key;
  if (!startKey) {
    return createFallbackLayoutPositions(orderedNodes, rankGap);
  }

  depthByKey[startKey] = 0;

  const queue: string[] = [startKey];
  const maxDepth = Math.max(0, orderedNodes.length - 1);
  let guard = 0;
  const maxIterations = Math.max(24, orderedNodes.length * orderedNodes.length);

  while (queue.length > 0 && guard < maxIterations) {
    guard += 1;

    const key = queue.shift();
    if (!key) continue;

    const baseDepth = depthByKey[key] ?? Number.NEGATIVE_INFINITY;
    if (!Number.isFinite(baseDepth)) continue;

    for (const target of outgoingNodeKeys.value[key] ?? []) {
      if (!(target in depthByKey)) continue;

      const candidateDepth = Math.min(maxDepth, baseDepth + 1);
      const currentDepth = depthByKey[target] ?? Number.NEGATIVE_INFINITY;

      if (candidateDepth > currentDepth) {
        depthByKey[target] = candidateDepth;
        queue.push(target);
      }
    }
  }

  let fallbackDepth = 0;
  for (const node of orderedNodes) {
    if (Number.isFinite(depthByKey[node.key])) continue;

    depthByKey[node.key] = Math.min(maxDepth, fallbackDepth);
    fallbackDepth += 1;
  }

  const layers: Record<number, string[]> = {};
  for (const node of orderedNodes) {
    const depth = depthByKey[node.key] ?? 0;
    if (!layers[depth]) {
      layers[depth] = [];
    }

    layers[depth].push(node.key);
  }

  const laneByKey: Record<string, number> = {};
  const sortedDepths = Object.keys(layers)
    .map(Number)
    .sort((a, b) => a - b);

  for (const depth of sortedDepths) {
    const layerKeys = [...(layers[depth] ?? [])];

    layerKeys.sort((a, b) => {
      const aParents = (incomingNodeKeys.value[a] ?? []).filter((parent) => {
        const parentDepth = depthByKey[parent] ?? Number.NEGATIVE_INFINITY;
        return Number.isFinite(parentDepth) && parentDepth < depth;
      });
      const bParents = (incomingNodeKeys.value[b] ?? []).filter((parent) => {
        const parentDepth = depthByKey[parent] ?? Number.NEGATIVE_INFINITY;
        return Number.isFinite(parentDepth) && parentDepth < depth;
      });

      const aAnchor =
        aParents.length > 0
          ? aParents.reduce((sum, parent) => sum + (laneByKey[parent] ?? 0), 0) / aParents.length
          : 0;
      const bAnchor =
        bParents.length > 0
          ? bParents.reduce((sum, parent) => sum + (laneByKey[parent] ?? 0), 0) / bParents.length
          : 0;

      if (aAnchor === bAnchor) {
        const aIndex = orderedNodeByKey.value[a]?.index ?? 0;
        const bIndex = orderedNodeByKey.value[b]?.index ?? 0;
        return aIndex - bIndex;
      }

      return aAnchor - bAnchor;
    });

    const count = layerKeys.length;
    layerKeys.forEach((key, index) => {
      laneByKey[key] = (index - (count - 1) / 2) * laneGap;
    });
  }

  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of orderedNodes) {
    const depth = depthByKey[node.key] ?? 0;
    const lane = laneByKey[node.key] ?? 0;

    if (props.direction === "vertical") {
      positions[node.key] = {
        x: Math.round(lane),
        y: Math.round(depth * rankGap),
      };
      continue;
    }

    positions[node.key] = {
      x: Math.round(depth * rankGap),
      y: Math.round(lane),
    };
  }

  return normalizePositions(positions);
}

const nodeSizes = computed<Record<string, NodeSize>>(() => {
  const sizes: Record<string, NodeSize> = {};

  for (const node of orderedNodeElements.value) {
    sizes[node.key] = estimateNodeSize(node);
  }

  return sizes;
});

const architectureZoneDefinitions = computed<ResolvedArchitectureZone[]>(() => {
  if (!isArchitectureMode.value) {
    return [];
  }

  const rootZones = toArchitectureZones(props.zones ?? rootElement.value?.props.zones);
  const byId = new Map<string, ResolvedArchitectureZone>();

  for (const zone of rootZones) {
    byId.set(zone.id, zone);
  }

  for (const node of orderedNodeElements.value) {
    const zoneId = toArchitectureZoneId(node.element.props.zone);
    if (!zoneId || byId.has(zoneId)) {
      continue;
    }

    byId.set(zoneId, {
      id: zoneId,
      label: humanizeZoneId(zoneId),
      padding: 62,
    });
  }

  return Array.from(byId.values());
});

const architectureZoneLabelById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};

  for (const zone of architectureZoneDefinitions.value) {
    map[zone.id] = zone.label;
  }

  return map;
});

const architectureNodeZoneByKey = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};

  for (const node of orderedNodeElements.value) {
    const zoneId = toArchitectureZoneId(node.element.props.zone);
    if (!zoneId) {
      continue;
    }

    map[node.key] = zoneId;
  }

  return map;
});

const architectureZoneOverlays = computed<ArchitectureZoneOverlay[]>(() => {
  if (!isArchitectureMode.value) {
    return [];
  }

  const rawOverlays: Array<{
    id: string;
    label: string;
    description?: string;
    color: string;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    padding: number;
    nodeCount: number;
    sourceIndex: number;
  }> = [];

  architectureZoneDefinitions.value.forEach((zone, index) => {
    const members = orderedNodeElements.value.filter(
      (node) => architectureNodeZoneByKey.value[node.key] === zone.id,
    );
    if (members.length === 0) {
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const member of members) {
      const position = layoutPositions.value[member.key];
      if (!position) {
        continue;
      }

      const size = nodeSizes.value[member.key] ?? { width: 240, height: 120 };

      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return;
    }

    const padding = zone.padding;
    rawOverlays.push({
      id: zone.id,
      label: zone.label,
      description: zone.description,
      color: resolveZoneColor(index, zone.color),
      minX,
      minY,
      maxX,
      maxY,
      padding,
      nodeCount: members.length,
      sourceIndex: index,
    });
  });

  const provisionalBounds = rawOverlays.map((overlay) => ({
    id: overlay.id,
    x: overlay.minX - overlay.padding,
    y: overlay.minY - overlay.padding,
    width: overlay.maxX - overlay.minX + overlay.padding * 2,
    height: overlay.maxY - overlay.minY + overlay.padding * 2,
  }));

  const nestingDepthById = new Map<string, number>();
  const containsNestedZoneById = new Map<string, boolean>();

  for (const current of provisionalBounds) {
    const depth = provisionalBounds.reduce((count, candidate) => {
      if (candidate.id === current.id) {
        return count;
      }

      const containsCurrent =
        candidate.x <= current.x + 12 &&
        candidate.y <= current.y + 12 &&
        candidate.x + candidate.width >= current.x + current.width - 12 &&
        candidate.y + candidate.height >= current.y + current.height - 12;

      return containsCurrent ? count + 1 : count;
    }, 0);

    nestingDepthById.set(current.id, depth);
    containsNestedZoneById.set(
      current.id,
      provisionalBounds.some((candidate) => {
        if (candidate.id === current.id) {
          return false;
        }

        return (
          current.x <= candidate.x + 12 &&
          current.y <= candidate.y + 12 &&
          current.x + current.width >= candidate.x + candidate.width - 12 &&
          current.y + current.height >= candidate.y + candidate.height - 12
        );
      }),
    );
  }

  const overlappingZoneIds = new Set<string>();
  for (let index = 0; index < provisionalBounds.length; index += 1) {
    const current = provisionalBounds[index];
    if (!current) {
      continue;
    }

    for (let compareIndex = index + 1; compareIndex < provisionalBounds.length; compareIndex += 1) {
      const candidate = provisionalBounds[compareIndex];
      if (!candidate) {
        continue;
      }

      const overlaps =
        current.x < candidate.x + candidate.width &&
        current.x + current.width > candidate.x &&
        current.y < candidate.y + candidate.height &&
        current.y + current.height > candidate.y;

      if (!overlaps) {
        continue;
      }

      overlappingZoneIds.add(current.id);
      overlappingZoneIds.add(candidate.id);
    }
  }

  const labelLaneById = new Map<string, number>();
  const placedLabelBoxes: Array<{
    id: string;
    lane: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  const sortedForLabelPlacement = rawOverlays
    .map((overlay) => {
      const sidePadding = Math.max(overlay.padding, ARCHITECTURE_ZONE_MIN_CONTENT_PADDING);
      const descriptionReserve = overlay.description
        ? ARCHITECTURE_ZONE_DESCRIPTION_HEIGHT + ARCHITECTURE_ZONE_LABEL_TO_CONTENT_GAP
        : 0;
      const topPadding =
        sidePadding +
        ARCHITECTURE_ZONE_LABEL_HEIGHT +
        ARCHITECTURE_ZONE_LABEL_TO_CONTENT_GAP +
        descriptionReserve;
      const width = Math.min(
        Math.max(132, overlay.label.length * 7 + String(overlay.nodeCount).length * 14 + 86),
        Math.max(148, overlay.maxX - overlay.minX + sidePadding * 2 - 28),
      );

      return {
        id: overlay.id,
        x: overlay.minX - sidePadding + 16,
        y: overlay.minY - topPadding + ARCHITECTURE_ZONE_LABEL_TOP,
        width,
      };
    })
    .sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      }

      return a.x - b.x;
    });

  for (const labelCandidate of sortedForLabelPlacement) {
    let lane = 0;

    while (
      placedLabelBoxes.some((placed) => {
        if (placed.lane !== lane) {
          return false;
        }

        const currentY = labelCandidate.y + lane * ARCHITECTURE_ZONE_NESTED_LABEL_STEP;
        return (
          labelCandidate.x < placed.x + placed.width &&
          labelCandidate.x + labelCandidate.width > placed.x &&
          currentY < placed.y + placed.height &&
          currentY + ARCHITECTURE_ZONE_LABEL_HEIGHT > placed.y
        );
      })
    ) {
      lane += 1;
    }

    labelLaneById.set(labelCandidate.id, lane);
    placedLabelBoxes.push({
      id: labelCandidate.id,
      lane,
      x: labelCandidate.x,
      y: labelCandidate.y + lane * ARCHITECTURE_ZONE_NESTED_LABEL_STEP,
      width: labelCandidate.width,
      height: ARCHITECTURE_ZONE_LABEL_HEIGHT,
    });
  }

  const maxLabelLane = placedLabelBoxes.reduce((max, placed) => Math.max(max, placed.lane), 0);

  return rawOverlays
    .map((overlay) => {
      const nestingDepth = nestingDepthById.get(overlay.id) ?? 0;
      const nestedZoneGap = containsNestedZoneById.get(overlay.id)
        ? ARCHITECTURE_ZONE_CONTAINED_ZONE_GAP
        : 0;
      const baseSidePadding = Math.max(overlay.padding, ARCHITECTURE_ZONE_MIN_CONTENT_PADDING);
      const sidePadding = baseSidePadding + nestedZoneGap;
      const bottomPadding =
        Math.max(baseSidePadding, ARCHITECTURE_ZONE_MIN_BOTTOM_PADDING) + nestedZoneGap;
      const labelLane = labelLaneById.get(overlay.id) ?? 0;
      const labelOffsetY =
        ARCHITECTURE_ZONE_LABEL_TOP + labelLane * ARCHITECTURE_ZONE_NESTED_LABEL_STEP;
      const showDescription = Boolean(overlay.description) && !overlappingZoneIds.has(overlay.id);
      const descriptionOffsetY =
        labelOffsetY + ARCHITECTURE_ZONE_LABEL_HEIGHT + ARCHITECTURE_ZONE_LABEL_TO_DESCRIPTION_GAP;
      const descriptionReserve = showDescription
        ? ARCHITECTURE_ZONE_DESCRIPTION_HEIGHT + ARCHITECTURE_ZONE_LABEL_TO_CONTENT_GAP
        : 0;
      const topPadding =
        sidePadding +
        ARCHITECTURE_ZONE_LABEL_HEIGHT +
        ARCHITECTURE_ZONE_LABEL_TO_CONTENT_GAP +
        descriptionReserve +
        maxLabelLane * ARCHITECTURE_ZONE_NESTED_LABEL_STEP;

      return {
        id: overlay.id,
        label: overlay.label,
        description: showDescription ? overlay.description : undefined,
        color: overlay.color,
        x: Math.round(overlay.minX - sidePadding),
        y: Math.round(overlay.minY - topPadding),
        width: Math.max(120, Math.round(overlay.maxX - overlay.minX + sidePadding * 2)),
        height: Math.max(100, Math.round(overlay.maxY - overlay.minY + topPadding + bottomPadding)),
        nodeCount: overlay.nodeCount,
        nestingDepth,
        labelLane,
        labelOffsetY,
        descriptionOffsetY,
        sourceIndex: overlay.sourceIndex,
      };
    })
    .sort((a, b) => {
      const areaDiff = b.width * b.height - a.width * a.height;
      if (areaDiff !== 0) {
        return areaDiff;
      }

      return a.sourceIndex - b.sourceIndex;
    })
    .map(({ sourceIndex: _sourceIndex, ...overlay }) => overlay);
});

function architectureZoneCardStyle(zone: ArchitectureZoneOverlay) {
  return {
    left: `${zone.x}px`,
    top: `${zone.y}px`,
    width: `${zone.width}px`,
    height: `${zone.height}px`,
    borderColor: withAlpha(zone.color, 0.38),
    background: `linear-gradient(180deg, ${withAlpha(zone.color, 0.1)} 0%, ${withAlpha(zone.color, 0.045)} 62%, ${withAlpha(zone.color, 0.03)} 100%)`,
    boxShadow: `inset 0 0 0 1px ${withAlpha(zone.color, 0.1)}`,
  };
}

function architectureZoneLabelStyle(zone: ArchitectureZoneOverlay) {
  return {
    top: `${zone.labelOffsetY}px`,
    borderColor: withAlpha(zone.color, 0.55),
    background: withAlpha(zone.color, 0.18),
    color: zone.color,
  };
}

function architectureZoneDescriptionStyle(zone: ArchitectureZoneOverlay) {
  return {
    top: `${zone.descriptionOffsetY}px`,
  };
}

const layoutPositions = computed<Record<string, { x: number; y: number }>>(() => {
  const orderedNodes = orderedNodeElements.value;
  if (orderedNodes.length === 0) return {};

  const rankGap = resolvedLayoutRankSep.value;
  const nodeGap = resolvedLayoutNodeSep.value;
  const edgeGap = resolvedLayoutEdgeSep.value;
  const fallback = createFallbackLayoutPositions(orderedNodes, rankGap);

  if (resolvedLayoutEngine.value === "manual") {
    return createManualLayoutPositions(orderedNodes, rankGap, nodeGap);
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: props.direction === "vertical" ? "TB" : "LR",
    ranker: "network-simplex",
    acyclicer: "greedy",
    align: "UL",
    marginx: 36,
    marginy: 36,
    ranksep: rankGap,
    nodesep: nodeGap,
    edgesep: edgeGap,
  });

  for (const node of orderedNodes) {
    const size = nodeSizes.value[node.key] ?? { width: 240, height: 120 };

    graph.setNode(node.key, {
      width: size.width,
      height: size.height,
    });
  }

  for (const node of orderedNodes) {
    const targets = outgoingNodeKeys.value[node.key] ?? [];
    const preferredTarget = resolveNextNode(node.key, targets);

    for (const target of targets) {
      if (!orderedNodeByKey.value[target]) continue;

      graph.setEdge(node.key, target, {
        minlen: 1,
        weight: target === preferredTarget ? 3 : 1,
      });
    }
  }

  try {
    dagre.layout(graph);
  } catch {
    return fallback;
  }

  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of orderedNodes) {
    const layoutNode = graph.node(node.key);
    if (!layoutNode || typeof layoutNode.x !== "number" || typeof layoutNode.y !== "number") {
      continue;
    }

    const size = nodeSizes.value[node.key] ?? { width: 240, height: 120 };

    positions[node.key] = {
      x: Math.round(layoutNode.x - size.width / 2),
      y: Math.round(layoutNode.y - size.height / 2),
    };
  }

  if (Object.keys(positions).length === 0) {
    return fallback;
  }

  return normalizePositions(positions);
});

const nodes = computed<FlowNode[]>(() => {
  const fallbackPositions = createFallbackLayoutPositions(
    orderedNodeElements.value,
    resolvedLayoutRankSep.value,
  );

  return orderedNodeElements.value.map(({ key, nodeType, element, index }) => ({
    id: key,
    type: nodeType,
    targetPosition: Position.Left,
    sourcePosition: Position.Right,
    position:
      layoutPositions.value[key] ??
      fallbackPositions[key] ??
      (props.direction === "vertical"
        ? { x: 0, y: index * DEFAULT_FALLBACK_GAP }
        : { x: index * DEFAULT_FALLBACK_GAP, y: 0 }),
    data: {
      key,
      type: nodeType,
      elementType: element.type,
      props: element.props,
      active: isActive(key),
      sourceAnchor: resolveNodeSourceAnchor(element.props),
      index,
    },
  }));
});

const edges = computed<FlowEdge[]>(() => {
  const result: FlowEdge[] = [];

  for (const node of orderedNodeElements.value) {
    const targets = outgoingNodeKeys.value[node.key] ?? [];

    for (const target of targets) {
      if (!orderedNodeByKey.value[target]) continue;

      const isActiveEdge =
        !isArchitectureMode.value &&
        activeFrame.value?.nodeKey === node.key &&
        nextPlannedNodeKey.value === target;
      const transition = transitionMetaBySource.value[node.key]?.[target];
      const edgeClasses = [
        isActiveEdge ? "active-edge" : null,
        transition?.kind ? `edge-kind-${transition.kind}` : null,
      ].filter((value): value is string => Boolean(value));

      const edgeLabel = resolveTransitionEdgeLabel(transition);
      const hasLabel = Boolean(edgeLabel);

      result.push({
        id: `e-${node.key}-${target}`,
        source: node.key,
        target,
        type: isArchitectureMode.value ? "architecture" : "smoothstep",
        animated: !isArchitectureMode.value,
        class: edgeClasses.length > 0 ? edgeClasses.join(" ") : undefined,
        label: edgeLabel,
        labelShowBg: hasLabel && !isArchitectureMode.value,
        labelBgPadding: hasLabel && !isArchitectureMode.value ? [6, 3] : undefined,
        labelBgBorderRadius: hasLabel && !isArchitectureMode.value ? 6 : undefined,
        labelBgStyle:
          hasLabel && !isArchitectureMode.value
            ? { fill: "var(--color-card)", fillOpacity: 0.985, stroke: "var(--color-border)" }
            : undefined,
        labelStyle:
          hasLabel && !isArchitectureMode.value
            ? {
                fill: "var(--color-foreground)",
                fontSize: "10px",
                fontWeight: 600,
              }
            : undefined,
      });
    }
  }

  return result;
});

const diagramBounds = computed(() => {
  if (nodes.value.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes.value) {
    const size = nodeSizes.value[node.id] ?? { width: 240, height: 120 };
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }

  for (const zone of architectureZoneOverlays.value) {
    minX = Math.min(minX, zone.x);
    minY = Math.min(minY, zone.y);
    maxX = Math.max(maxX, zone.x + zone.width);
    maxY = Math.max(maxY, zone.y + zone.height);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.max(1, Math.ceil(maxX - minX)),
    height: Math.max(1, Math.ceil(maxY - minY)),
  };
});

function createExportFileBaseName() {
  const rawName = activeFlow.value?.id ?? overlayTitle.value ?? props.title ?? "flow-diagram";

  const slug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "flow-diagram";
}

async function exportDiagram(format: DiagramExportFormat) {
  if (exportInFlight.value) return;
  if (!canExportDiagram.value) return;

  const flowElement = sceneRef.value;
  const bounds = diagramBounds.value;

  if (!flowElement || !bounds) {
    exportError.value = "Diagram is still initializing. Try again in a moment.";
    return;
  }

  exportError.value = null;
  exportMenuOpen.value = false;
  exportInFlight.value = format;

  try {
    await exportFlowDiagram({
      flowElement,
      theme: uiTheme.value,
      bounds,
      fileNameBase: createExportFileBaseName(),
      format,
    });
  } catch (error) {
    exportError.value =
      error instanceof Error ? error.message : `Failed to export ${format.toUpperCase()} diagram.`;
  } finally {
    exportInFlight.value = null;
  }
}

function isActive(nodeKey: string) {
  if (isArchitectureMode.value) {
    return true;
  }

  return activeFrame.value?.nodeKey === nodeKey;
}

function codeStepIndex(nodeKey: string) {
  if (activeFrame.value?.nodeKey !== nodeKey) {
    return 0;
  }

  return activeFrame.value.localStep;
}

const activeNode = computed(() => {
  const key = activeFrame.value?.nodeKey;
  if (!key) return undefined;
  return orderedNodeByKey.value[key];
});

const activeLocalStep = computed(() => activeFrame.value?.localStep ?? 0);

const activeLabel = computed(() => {
  const node = activeNode.value;
  if (!node) return "";

  const base = toOptionalString(node.element.props.label) ?? "";

  if (node.element.type !== "CodeNode") {
    return base;
  }

  const steps = toMagicMoveSteps(node.element.props.magicMoveSteps);
  if (steps.length === 0) return base;

  const title = steps[Math.min(activeLocalStep.value, steps.length - 1)]?.title;
  return title ? `${base} - ${title}` : base;
});

const activeDescription = computed(() => {
  const node = activeNode.value;
  if (!node) return "";

  if (node.element.type === "CodeNode") {
    const steps = toMagicMoveSteps(node.element.props.magicMoveSteps);
    const defaultStory =
      toOptionalString(node.element.props.story) ?? toOptionalString(node.element.props.comment);

    if (steps.length > 0) {
      const beat = steps[Math.min(activeLocalStep.value, steps.length - 1)];

      return beat?.story ?? beat?.comment ?? defaultStory ?? "";
    }

    return defaultStory ?? "";
  }

  return getNodeSummary(node);
});

const activeSourceAnchor = computed(() => {
  const node = activeNode.value;
  if (!node) return undefined;

  return resolveNodeSourceAnchor(node.element.props);
});

const architectureSelectedNodeKey = ref<string | null>(null);

const architectureSelectedNode = computed(() => {
  if (!isArchitectureMode.value) {
    return undefined;
  }

  const selected = architectureSelectedNodeKey.value;
  if (selected && orderedNodeByKey.value[selected]) {
    return orderedNodeByKey.value[selected];
  }

  return orderedNodeElements.value[0];
});

watch(
  [isArchitectureMode, orderedNodeElements],
  ([architectureMode, ordered]) => {
    if (!architectureMode) {
      architectureSelectedNodeKey.value = null;
      return;
    }

    const selected = architectureSelectedNodeKey.value;
    if (selected && ordered.some((node) => node.key === selected)) {
      return;
    }

    architectureSelectedNodeKey.value = ordered[0]?.key ?? null;
  },
  { immediate: true },
);

const architectureInspector = computed<ArchitectureInspectorView | null>(() => {
  const node = architectureSelectedNode.value;
  if (!node) {
    return null;
  }

  const label = toTrimmedNonEmptyString(node.element.props.label) ?? node.key;
  const sourceAnchor = resolveNodeSourceAnchor(node.element.props);

  if (node.element.type !== "ArchitectureNode") {
    return {
      type: "Other",
      label,
      summary: getNodeSummary(node),
      sourceAnchor,
      elementType: node.element.type,
    };
  }

  const zoneId = toArchitectureZoneId(node.element.props.zone);
  const zoneLabel = zoneId
    ? (architectureZoneLabelById.value[zoneId] ?? humanizeZoneId(zoneId))
    : undefined;
  const interfaces = toArchitectureInterfaces(node.element.props.interfaces);
  const dataAssets = toArchitectureDataAssets(node.element.props.data);
  const security = toArchitectureSecurity(node.element.props.security);
  const operations = toArchitectureOperations(node.element.props.operations);
  const links = toArchitectureLinks(node.element.props.links);
  const outgoing: ArchitectureOutgoingEdge[] = [];

  for (const targetKey of outgoingNodeKeys.value[node.key] ?? []) {
    const targetNode = orderedNodeByKey.value[targetKey];
    if (!targetNode) {
      continue;
    }

    const transition = transitionMetaBySource.value[node.key]?.[targetKey];

    outgoing.push({
      target: toTrimmedNonEmptyString(targetNode.element.props.label) ?? targetKey,
      label: transition?.label,
      protocol: transition?.protocol,
      transport: transition?.transport,
      auth: transition?.auth,
      criticality: transition?.criticality,
    });
  }

  return {
    type: "ArchitectureNode",
    label,
    kind: toArchitectureKind(node.element.props.kind),
    status: toArchitectureStatus(node.element.props.status),
    tier: toArchitectureTier(node.element.props.tier),
    technology: toTrimmedNonEmptyString(node.element.props.technology),
    runtime: toTrimmedNonEmptyString(node.element.props.runtime),
    owner: toTrimmedNonEmptyString(node.element.props.owner),
    zoneLabel,
    summary: toTrimmedNonEmptyString(node.element.props.description) ?? "",
    tags: toStringArray(node.element.props.tags),
    responsibilities: toStringArray(node.element.props.responsibilities),
    capabilities: toStringArray(node.element.props.capabilities),
    interfaces,
    dataAssets,
    security,
    operations,
    links,
    outgoing,
    sourceAnchor,
  };
});

const architectureInspectorNode = computed<ArchitectureInspectorArchitectureView | null>(() => {
  const inspector = architectureInspector.value;
  if (!inspector || inspector.type !== "ArchitectureNode") {
    return null;
  }

  return inspector;
});

const architectureInspectorNodeSafe = computed(() => {
  return architectureInspectorNode.value ?? EMPTY_ARCHITECTURE_INSPECTOR_NODE;
});

const architectureInspectorPanelStyle = computed(() => {
  return {
    transform: architectureInspectorOpen.value ? "translateX(0)" : "translateX(100%)",
  };
});

const branchChoices = computed<BranchChoice[]>(() => {
  if (isArchitectureMode.value) {
    return [];
  }

  const node = activeNode.value;
  const frame = activeFrame.value;
  if (!node || !frame) return [];

  if (frame.localStep < frame.totalLocalSteps - 1) {
    return [];
  }

  const options = outgoingNodeKeys.value[node.key] ?? [];
  if (options.length <= 1) return [];

  const result: BranchChoice[] = [];

  for (const id of options) {
    const target = orderedNodeByKey.value[id];
    if (!target) continue;

    const transition = transitionMetaBySource.value[node.key]?.[id];

    const targetLabel = toOptionalString(target.element.props.label) ?? id;
    const targetDescription = getNodeSummary(target);

    result.push({
      id,
      label: transition?.label ?? targetLabel,
      description: transition?.description ?? targetDescription,
      kind: transition?.kind,
    });
  }

  return result;
});

const selectedBranchChoiceId = computed(() => {
  const node = activeNode.value;
  if (!node || branchChoices.value.length === 0) return undefined;

  const selected = selectedBranchByNode.value[node.key];
  if (selected) return selected;

  return nextPlannedNodeKey.value;
});

function chooseChoice(choiceId: string) {
  const node = activeNode.value;
  if (!node) return;

  const options = outgoingNodeKeys.value[node.key] ?? [];
  if (!options.includes(choiceId)) return;

  selectedBranchByNode.value = {
    ...selectedBranchByNode.value,
    [node.key]: choiceId,
  };

  const prefix = pathFrames.value.slice(0, currentStep.value + 1);
  const suffix = buildGuidedPath(choiceId);

  pathFrames.value = [...prefix, ...suffix];

  if (pathFrames.value.length > currentStep.value + 1) {
    currentStep.value += 1;
  }
}

const containerMinHeight = computed(() => {
  const provided = Number(props.minHeight);
  if (Number.isFinite(provided) && provided >= 320) {
    return Math.floor(provided);
  }

  if (isArchitectureMode.value) {
    return 620;
  }

  const node = activeNode.value ?? orderedNodeElements.value[0];
  if (!node || node.element.type !== "CodeNode") {
    return 520;
  }

  const maxLineLength = getCodeNodeMaxLineLength(node.element);
  const nodeWidth = estimateCodeNodeWidth(maxLineLength);
  const codeCharsPerLine = estimateCodeNodeCharsPerLine(nodeWidth);
  const autoWrapEnabled = maxLineLength > CODE_NODE_MAX_INLINE_CHARS;
  const wrapEnabled = toBoolean(node.element.props.wrapLongLines) || autoWrapEnabled;

  const codeLines = wrapEnabled
    ? getCodeNodeWrappedLines(node.element, codeCharsPerLine)
    : getCodeNodeMaxLines(node.element);
  const storyLines = getCodeNodeStoryLines(node.element);
  const storyHasMeta = hasCodeNodeStoryMeta(node.element);

  const codeViewportHeight = wrapEnabled
    ? Math.min(400, Math.max(190, 72 + codeLines * 16))
    : Math.min(340, Math.max(160, 84 + codeLines * 17));

  const storyViewportHeight =
    storyLines > 0 ? Math.min(220, Math.max(88, (storyHasMeta ? 56 : 34) + storyLines * 18)) : 0;

  return Math.min(880, Math.max(560, codeViewportHeight + storyViewportHeight + 300));
});

const instance = getCurrentInstance();
const flowId = `flaier-${instance?.uid ?? 0}`;
const { fitView, onNodeClick, onViewportChange, setCenter, viewport } = useVueFlow(flowId);
const nodesInitialized = useNodesInitialized();
const paneReady = ref(false);
const overviewMode = ref(false);
let resizeObserver: ResizeObserver | null = null;

const architectureZoneLayerStyle = computed(() => {
  const x = Number.isFinite(viewport.value.x) ? viewport.value.x : 0;
  const y = Number.isFinite(viewport.value.y) ? viewport.value.y : 0;
  const zoom = Number.isFinite(viewport.value.zoom) ? viewport.value.zoom : 1;

  return {
    transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    transformOrigin: "0 0",
  };
});

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null;
  if (!target) return;

  if (headerDropdownOpen.value && !headerDropdownRef.value?.contains(target)) {
    closeHeaderDropdown();
  }

  if (exportMenuOpen.value && !exportMenuRef.value?.contains(target)) {
    closeExportMenu();
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeHeaderDropdown();
    closeExportMenu();

    if (isArchitectureMode.value) {
      architectureInspectorOpen.value = false;
    }

    return;
  }

  if (event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (isEditableTarget(event.target)) return;
  if (isArchitectureMode.value) return;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    next();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    prev();
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    const choice = branchChoices.value[index];
    if (!choice) return;

    event.preventDefault();
    chooseChoice(choice.id);
  }
}

function syncOverviewModeFromZoom(zoom: number) {
  if (overviewMode.value) {
    if (zoom >= OVERVIEW_EXIT_ZOOM) {
      overviewMode.value = false;
    }

    return;
  }

  if (zoom <= OVERVIEW_ENTER_ZOOM) {
    overviewMode.value = true;
  }
}

watch(
  () => viewport.value.zoom,
  (zoom) => {
    if (!Number.isFinite(zoom)) return;

    syncOverviewModeFromZoom(zoom);
  },
  { immediate: true },
);

onViewportChange((transform) => {
  if (!Number.isFinite(transform.zoom)) return;

  syncOverviewModeFromZoom(transform.zoom);
});

onNodeClick(({ node }) => {
  if (isArchitectureMode.value) {
    architectureSelectedNodeKey.value = node.id;
    architectureInspectorOpen.value = true;
    return;
  }

  jumpToNode(node.id);
});

function updateContainerReady() {
  const element = containerRef.value;
  containerWidth.value = element?.clientWidth ?? 0;
  containerHeight.value = element?.clientHeight ?? 0;
  containerReady.value = containerWidth.value > 0 && containerHeight.value > 0;
}

const sceneStyle = computed<Record<string, string>>(() => ({
  height: `${Math.max(containerHeight.value, containerMinHeight.value)}px`,
}));

onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
  }

  nextTick(() => {
    updateContainerReady();

    if (typeof ResizeObserver === "undefined") return;

    resizeObserver = new ResizeObserver(() => {
      updateContainerReady();
    });

    if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
    }
  });
});

function onInit() {
  paneReady.value = true;
}

const viewportReady = computed(
  () => paneReady.value && nodesInitialized.value && containerReady.value && nodes.value.length > 0,
);

const canExportDiagram = computed(() => {
  return Boolean(viewportReady.value && diagramBounds.value);
});

watch(canExportDiagram, (canExport) => {
  if (!canExport) {
    closeExportMenu();
  }
});

const narrativeFocusTarget = computed(() => {
  if (isArchitectureMode.value || overviewMode.value || !viewportReady.value) {
    return null;
  }

  const nodeKey = activeFrame.value?.nodeKey;
  if (!nodeKey) {
    return null;
  }

  const node = nodes.value.find((candidate) => candidate.id === nodeKey);
  if (!node) {
    return null;
  }

  const size = nodeSizes.value[node.id] ?? { width: 240, height: 120 };

  return {
    signature: [
      node.id,
      Math.round(node.position.x),
      Math.round(node.position.y),
      Math.round(size.width),
      Math.round(size.height),
      Math.round(containerWidth.value),
      Math.round(containerHeight.value),
    ].join(":"),
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  };
});

const narrativeFitSignature = ref("");

watch(
  [viewportReady, isArchitectureMode, nodes, containerWidth, containerHeight],
  ([ready, architectureMode, currentNodes, width, height]) => {
    if (!ready || architectureMode || currentNodes.length === 0) return;

    const signature = [
      `${Math.round(width)}x${Math.round(height)}`,
      ...currentNodes.map(
        (node) => `${node.id}:${Math.round(node.position.x)}:${Math.round(node.position.y)}`,
      ),
    ].join("|");

    if (signature === narrativeFitSignature.value) {
      return;
    }

    narrativeFitSignature.value = signature;

    nextTick(() => {
      void fitView({
        duration: 280,
        padding: 0.3,
        maxZoom: 0.95,
      });
    });
  },
  { immediate: true },
);

watch(
  () => narrativeFocusTarget.value?.signature ?? "",
  () => {
    const target = narrativeFocusTarget.value;
    if (!target) return;

    const zoom = Number.isFinite(viewport.value.zoom) ? viewport.value.zoom : 1;

    nextTick(() => {
      void setCenter(target.x, target.y, { duration: 280, zoom });
    });
  },
  { immediate: true },
);

const architectureFitSignature = ref("");

watch(
  [viewportReady, isArchitectureMode, nodes, containerWidth, containerHeight],
  ([ready, architectureMode, currentNodes, width, height]) => {
    if (!ready || !architectureMode || currentNodes.length === 0) return;

    const signature = [
      `${Math.round(width)}x${Math.round(height)}`,
      ...currentNodes.map(
        (node) => `${node.id}:${Math.round(node.position.x)}:${Math.round(node.position.y)}`,
      ),
    ].join("|");

    if (signature === architectureFitSignature.value) {
      return;
    }

    architectureFitSignature.value = signature;

    nextTick(() => {
      void fitView({
        duration: 260,
        padding: 0.18,
        maxZoom: 1.15,
      });
    });
  },
  { immediate: true },
);

watch(isArchitectureMode, (architectureMode) => {
  if (architectureMode) {
    playing.value = false;
    narrativeFitSignature.value = "";
    architectureInspectorOpen.value = defaultArchitectureInspectorOpen.value;
    return;
  }

  narrativeFitSignature.value = "";
  architectureFitSignature.value = "";
  architectureInspectorOpen.value = defaultArchitectureInspectorOpen.value;
});

onUnmounted(() => {
  clearTimer();

  if (typeof document !== "undefined") {
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
    document.removeEventListener("keydown", handleDocumentKeydown);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  stopDocumentThemeSync();
});
</script>

<template>
  <div
    ref="containerRef"
    class="flaier relative h-full w-full font-sans antialiased bg-background transition-[min-height] duration-300 ease-out"
    :style="{ minHeight: `${containerMinHeight}px` }"
    :data-mode="isArchitectureMode ? 'architecture' : 'narrative'"
    :data-focus-mode="overviewMode ? 'overview' : 'focus'"
    :data-theme="uiTheme"
  >
    <div ref="sceneRef" class="relative w-full overflow-hidden" :style="sceneStyle">
      <div
        v-if="containerReady && isArchitectureMode && architectureZoneOverlays.length > 0"
        class="pointer-events-none absolute inset-0 z-0"
      >
        <div class="absolute inset-0" data-zone-overlay="true" :style="architectureZoneLayerStyle">
          <div
            v-for="zone in architectureZoneOverlays"
            :key="zone.id"
            class="absolute rounded-2xl border border-dashed"
            :style="architectureZoneCardStyle(zone)"
          >
            <div
              class="absolute left-4 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
              :style="architectureZoneLabelStyle(zone)"
            >
              <span>{{ zone.label }}</span>
              <span class="opacity-80"
                >{{ zone.nodeCount }} node{{ zone.nodeCount === 1 ? "" : "s" }}</span
              >
            </div>

            <p
              v-if="zone.description"
              class="absolute left-4 right-4 text-[10px] leading-snug text-muted-foreground"
              :style="architectureZoneDescriptionStyle(zone)"
            >
              {{ zone.description }}
            </p>
          </div>
        </div>
      </div>

      <VueFlow
        v-if="containerReady"
        :id="flowId"
        :nodes="nodes"
        :edges="edges"
        :node-types="customNodeTypes"
        :fit-view-on-init="false"
        :elements-selectable="false"
        :nodes-focusable="false"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :zoom-on-scroll="true"
        :zoom-on-pinch="true"
        :pan-on-drag="true"
        :pan-on-scroll="true"
        :min-zoom="0.15"
        :max-zoom="2"
        :prevent-scrolling="true"
        class="relative z-[10] h-full w-full"
        @init="onInit"
      >
        <template #node-architecture="{ data }">
          <ArchitectureNodeVue
            :label="toRequiredString(data.props.label)"
            :kind="toArchitectureKind(data.props.kind)"
            :technology="toOptionalString(data.props.technology)"
            :runtime="toOptionalString(data.props.runtime)"
            :owner="toOptionalString(data.props.owner)"
            :tier="toArchitectureTier(data.props.tier)"
            :status="toArchitectureStatus(data.props.status)"
            :tags="toStringArray(data.props.tags)"
            :capabilities="toStringArray(data.props.capabilities)"
            :description="toOptionalString(data.props.description)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>

        <template #edge-architecture="edgeProps">
          <ArchitectureSmoothEdge v-bind="edgeProps" />
        </template>

        <template #node-trigger="{ data }">
          <TriggerNodeVue
            :label="toRequiredString(data.props.label)"
            :description="toOptionalString(data.props.description)"
            :color="toOptionalString(data.props.color)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>

        <template #node-code="{ data }">
          <CodeNodeVue
            :label="toRequiredString(data.props.label)"
            :file="toOptionalString(data.props.file)"
            :language="toOptionalString(data.props.language)"
            :code="toRequiredString(data.props.code)"
            :comment="toOptionalString(data.props.comment)"
            :story="toOptionalString(data.props.story)"
            :wrap-long-lines="toBoolean(data.props.wrapLongLines)"
            :magic-move-steps="toMagicMoveSteps(data.props.magicMoveSteps)"
            :twoslash="toOptionalBoolean(data.props.twoslash)"
            :twoslash-html="toTwoslashHtml(data.props.twoslashHtml)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :ui-theme="uiTheme"
            :active="isActive(data.key)"
            :step-index="codeStepIndex(data.key)"
          />
        </template>

        <template #node-decision="{ data }">
          <DecisionNodeVue
            :label="toRequiredString(data.props.label)"
            :condition="toOptionalString(data.props.condition)"
            :description="toOptionalString(data.props.description)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>

        <template #node-payload="{ data }">
          <PayloadNodeVue
            :label="toRequiredString(data.props.label)"
            :payload="toOptionalString(data.props.payload)"
            :before="toOptionalString(data.props.before)"
            :after="toOptionalString(data.props.after)"
            :format="toPayloadFormat(data.props.format)"
            :description="toOptionalString(data.props.description)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>

        <template #node-error="{ data }">
          <ErrorNodeVue
            :label="toRequiredString(data.props.label)"
            :message="toRequiredString(data.props.message)"
            :code="toOptionalString(data.props.code)"
            :cause="toOptionalString(data.props.cause)"
            :mitigation="toOptionalString(data.props.mitigation)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>

        <template #node-description="{ data }">
          <DescriptionNodeVue
            :label="toRequiredString(data.props.label)"
            :body="toRequiredString(data.props.body)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>

        <template #node-link="{ data }">
          <LinkNodeVue
            :label="toRequiredString(data.props.label)"
            :href="toRequiredString(data.props.href)"
            :description="toOptionalString(data.props.description)"
            :source-anchor="resolveNodeSourceAnchor(data.props)"
            :active="isActive(data.key)"
          />
        </template>
      </VueFlow>

      <div v-else class="h-full w-full" />
    </div>

    <div
      v-if="showHeaderOverlay && (showFlowSelector || overlayTitle || overlayDescription)"
      ref="headerDropdownRef"
      class="absolute top-4 left-4 z-20 w-[min(90vw,430px)]"
    >
      <div class="relative">
        <button
          type="button"
          class="group w-full rounded-lg border border-border/70 bg-card/85 px-3 py-2 text-left text-xs shadow-lg backdrop-blur-md transition-colors"
          :class="showFlowSelector ? 'cursor-pointer hover:border-primary/45' : 'cursor-default'"
          :disabled="!showFlowSelector"
          :aria-expanded="showFlowSelector ? headerDropdownOpen : undefined"
          aria-haspopup="listbox"
          @click="toggleHeaderDropdown"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {{ headerModeLabel }}
              </p>
              <p v-if="overlayTitle" class="mt-1 truncate text-sm font-medium text-foreground">
                {{ overlayTitle }}
              </p>
              <p
                v-if="overlayDescription"
                class="mt-0.5 text-[11px] leading-relaxed text-muted-foreground break-words"
              >
                {{ overlayDescription }}
              </p>
            </div>

            <svg
              v-if="showFlowSelector"
              class="mt-0.5 h-4 w-4 shrink-0 transition-all"
              :class="
                headerDropdownOpen
                  ? 'rotate-180 text-foreground'
                  : 'text-muted-foreground group-hover:text-foreground'
              "
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>

        <div
          v-if="showFlowSelector && headerDropdownOpen"
          class="absolute inset-x-0 top-[calc(100%+8px)] rounded-lg border border-border/70 bg-card/95 p-1 shadow-2xl backdrop-blur-md"
          role="listbox"
        >
          <button
            v-for="flow in availableFlows"
            :key="flow.id"
            type="button"
            class="w-full rounded-md px-2.5 py-2 text-left transition-colors"
            :class="
              flow.id === activeFlowId
                ? 'bg-primary/14 text-foreground'
                : 'text-foreground/90 hover:bg-muted/70'
            "
            @click="handleFlowSelect(flow.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-medium">{{ flow.title }}</p>
              <span
                v-if="flow.id === activeFlowId"
                class="rounded-full border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary"
              >
                Active
              </span>
            </div>
            <p
              v-if="flow.description"
              class="mt-0.5 text-[11px] leading-relaxed text-muted-foreground break-words"
            >
              {{ flow.description }}
            </p>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showTopRightControls"
      class="fn-architecture-controls absolute top-4 right-4 z-20 flex flex-col items-end gap-2"
    >
      <div ref="exportMenuRef" class="relative">
        <button
          v-if="showExportControls"
          type="button"
          class="group inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-card/85 px-3 text-[11px] text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-55"
          :aria-label="exportButtonLabel"
          :title="exportButtonLabel"
          :disabled="!canExportDiagram || Boolean(exportInFlight)"
          @click="toggleExportMenu"
        >
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M4 20h16" />
          </svg>
          <span>Export</span>
        </button>

        <div
          v-if="showExportControls && exportMenuOpen"
          class="absolute right-0 top-[calc(100%+8px)] w-44 rounded-lg border border-border/70 bg-card/95 p-1 shadow-2xl backdrop-blur-md"
        >
          <button
            type="button"
            class="w-full rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/70"
            :disabled="Boolean(exportInFlight)"
            @click="exportDiagram('png')"
          >
            Export PNG
          </button>
          <button
            type="button"
            class="w-full rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/70"
            :disabled="Boolean(exportInFlight)"
            @click="exportDiagram('pdf')"
          >
            Export PDF
          </button>
        </div>
      </div>

      <button
        v-if="showThemeToggle"
        type="button"
        class="fn-theme-toggle group inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/85 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        @click="toggleTheme"
      >
        <svg
          v-if="isLightTheme"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Z" />
          <path
            d="M18.36 5.64a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.7a1 1 0 0 1 0-1.42Z"
          />
          <path d="M20 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1Z" />
          <path
            d="M18.36 18.36a1 1 0 0 1 0-1.41l.71-.71a1 1 0 0 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42 0Z"
          />
          <path d="M12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
          <path
            d="M5.64 18.36a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 1 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42Z"
          />
          <path d="M5 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2h1Z" />
          <path
            d="M5.64 5.64a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0Z"
          />
          <circle cx="12" cy="12" r="4" />
        </svg>

        <svg
          v-else
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z" />
        </svg>
      </button>

      <p
        v-if="showExportControls && exportError"
        class="max-w-[260px] rounded-md border border-red-500/45 bg-red-500/12 px-2 py-1 text-[10px] leading-relaxed text-red-200"
      >
        {{ exportError }}
      </p>
    </div>

    <div
      v-if="!isArchitectureMode"
      class="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-3"
      style="padding-bottom: max(env(safe-area-inset-bottom), 0px)"
    >
      <div class="pointer-events-auto w-full max-w-[980px]">
        <TimelineControls
          :current-step="currentStep"
          :total-steps="totalSteps"
          :playing="playing"
          :label="activeLabel"
          :description="activeDescription"
          :source-anchor-label="activeSourceAnchor?.label"
          :source-anchor-href="activeSourceAnchor?.href"
          :choices="branchChoices"
          :selected-choice-id="selectedBranchChoiceId"
          @next="next"
          @prev="prev"
          @go-to="goTo"
          @toggle-play="togglePlay"
          @choose-choice="chooseChoice"
        />
      </div>
    </div>

    <div
      v-if="isArchitectureMode && showArchitectureInspectorPanel && architectureInspector"
      class="fn-architecture-inspector pointer-events-none absolute bottom-3 right-0 top-16 z-30 w-[min(92vw,430px)]"
      style="
        padding-right: max(env(safe-area-inset-right), 0px);
        padding-bottom: max(env(safe-area-inset-bottom), 0px);
      "
    >
      <div class="absolute inset-0 overflow-visible">
        <aside
          class="pointer-events-auto absolute inset-y-0 right-0 w-full transition-all duration-300 ease-out"
          :style="architectureInspectorPanelStyle"
        >
          <button
            type="button"
            class="fn-architecture-inspector__toggle absolute right-full top-1/2 z-30 inline-flex h-20 w-8 -translate-y-1/2 translate-x-px flex-col items-center justify-center gap-1 rounded-l-lg rounded-r-none border border-border/70 border-r-0 bg-gradient-to-b from-card/95 via-card/88 to-card/78 px-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-2xl backdrop-blur-xl transition-all duration-200 hover:text-foreground"
            :aria-label="architectureInspectorToggleLabel"
            :title="architectureInspectorToggleLabel"
            @click="toggleArchitectureInspector"
          >
            <svg
              class="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path v-if="architectureInspectorOpen" d="m14.5 6-5.5 6 5.5 6" />
              <path v-else d="m9.5 6 5.5 6-5.5 6" />
            </svg>
            <span
              v-if="showArchitectureInspectorToggleText"
              class="inline-block font-semibold leading-none"
              style="writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 0.1em"
            >
              Details
            </span>
          </button>

          <div
            class="fn-architecture-inspector__panel flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/95 via-card/90 to-card/82 shadow-2xl backdrop-blur-xl"
          >
            <div class="border-b border-border/60 px-3 py-2.5">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold text-foreground leading-snug break-words">
                    {{ architectureInspector.label }}
                  </p>

                  <div v-if="architectureInspectorNode" class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-if="architectureInspectorNodeSafe.kind"
                      class="inline-flex items-center rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                    >
                      {{ architectureInspectorNodeSafe.kind }}
                    </span>
                    <span
                      v-if="architectureInspectorNodeSafe.status"
                      class="inline-flex items-center rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary"
                    >
                      {{ architectureInspectorNodeSafe.status }}
                    </span>
                    <span
                      v-if="architectureInspectorNodeSafe.tier"
                      class="inline-flex items-center rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                    >
                      {{ architectureInspectorNodeSafe.tier }}
                    </span>
                    <span
                      v-if="architectureInspectorNodeSafe.zoneLabel"
                      class="inline-flex items-center rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                    >
                      Zone: {{ architectureInspectorNodeSafe.zoneLabel }}
                    </span>
                  </div>
                </div>

                <a
                  v-if="
                    architectureInspector.sourceAnchor?.label &&
                    architectureInspector.sourceAnchor?.href
                  "
                  :href="architectureInspector.sourceAnchor.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
                >
                  <span class="truncate">{{ architectureInspector.sourceAnchor.label }}</span>
                </a>

                <p
                  v-else-if="architectureInspector.sourceAnchor?.label"
                  class="inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                >
                  <span class="truncate">{{ architectureInspector.sourceAnchor.label }}</span>
                </p>
              </div>

              <p
                v-if="architectureInspector.summary"
                class="mt-1.5 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words"
              >
                {{ architectureInspector.summary }}
              </p>
            </div>

            <div class="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
              <template v-if="architectureInspectorNode">
                <div class="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                  <p
                    class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Core
                  </p>
                  <p
                    v-if="architectureInspectorNodeSafe.technology"
                    class="mt-1 text-[10px] text-foreground"
                  >
                    Technology: {{ architectureInspectorNodeSafe.technology }}
                  </p>
                  <p
                    v-if="architectureInspectorNodeSafe.runtime"
                    class="mt-1 text-[10px] text-foreground"
                  >
                    Runtime: {{ architectureInspectorNodeSafe.runtime }}
                  </p>
                  <p
                    v-if="architectureInspectorNodeSafe.owner"
                    class="mt-1 text-[10px] text-foreground"
                  >
                    Owner: {{ architectureInspectorNodeSafe.owner }}
                  </p>
                  <p
                    v-if="architectureInspectorNodeSafe.operations?.slo"
                    class="mt-1 text-[10px] text-foreground"
                  >
                    SLO: {{ architectureInspectorNodeSafe.operations.slo }}
                  </p>
                  <p
                    v-if="architectureInspectorNodeSafe.operations?.alert"
                    class="mt-1 text-[10px] text-foreground"
                  >
                    Alert: {{ architectureInspectorNodeSafe.operations.alert }}
                  </p>
                </div>

                <div
                  v-if="
                    architectureInspectorNodeSafe.security ||
                    architectureInspectorNodeSafe.dataAssets.length > 0
                  "
                  class="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5"
                >
                  <p
                    class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Data & Security
                  </p>
                  <template v-if="architectureInspectorNodeSafe.security">
                    <p
                      v-if="architectureInspectorNodeSafe.security.auth"
                      class="mt-1 text-[10px] text-foreground"
                    >
                      Auth: {{ architectureInspectorNodeSafe.security.auth }}
                    </p>
                    <p
                      v-if="architectureInspectorNodeSafe.security.encryption"
                      class="mt-1 text-[10px] text-foreground"
                    >
                      Encryption: {{ architectureInspectorNodeSafe.security.encryption }}
                    </p>
                    <p
                      v-if="architectureInspectorNodeSafe.security.pii !== undefined"
                      class="mt-1 text-[10px] text-foreground"
                    >
                      PII: {{ architectureInspectorNodeSafe.security.pii ? "Yes" : "No" }}
                    </p>
                    <p
                      v-if="architectureInspectorNodeSafe.security.threatModel"
                      class="mt-1 text-[10px] text-foreground"
                    >
                      Threat Model: {{ architectureInspectorNodeSafe.security.threatModel }}
                    </p>
                  </template>

                  <div
                    v-if="architectureInspectorNodeSafe.dataAssets.length > 0"
                    class="mt-1.5 space-y-1"
                  >
                    <p
                      v-for="asset in architectureInspectorNodeSafe.dataAssets"
                      :key="`${asset.name}-${asset.kind ?? ''}`"
                      class="text-[10px] text-foreground"
                    >
                      {{ asset.name }}<span v-if="asset.kind"> ({{ asset.kind }})</span
                      ><span v-if="asset.classification"> - {{ asset.classification }}</span
                      ><span v-if="asset.retention"> - {{ asset.retention }}</span>
                    </p>
                  </div>
                </div>

                <div
                  v-if="
                    architectureInspectorNodeSafe.responsibilities.length > 0 ||
                    architectureInspectorNodeSafe.capabilities.length > 0 ||
                    architectureInspectorNodeSafe.tags.length > 0
                  "
                  class="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5"
                >
                  <p
                    class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Capabilities
                  </p>

                  <div
                    v-if="architectureInspectorNodeSafe.capabilities.length > 0"
                    class="mt-1 flex flex-wrap gap-1"
                  >
                    <span
                      v-for="capability in architectureInspectorNodeSafe.capabilities"
                      :key="capability"
                      class="inline-flex items-center rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary"
                    >
                      {{ capability }}
                    </span>
                  </div>

                  <div
                    v-if="architectureInspectorNodeSafe.tags.length > 0"
                    class="mt-1 flex flex-wrap gap-1"
                  >
                    <span
                      v-for="tag in architectureInspectorNodeSafe.tags"
                      :key="tag"
                      class="inline-flex items-center rounded border border-border/70 bg-card/35 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                    >
                      #{{ tag }}
                    </span>
                  </div>

                  <ul
                    v-if="architectureInspectorNodeSafe.responsibilities.length > 0"
                    class="mt-1 space-y-0.5 text-[10px] text-foreground"
                  >
                    <li v-for="item in architectureInspectorNodeSafe.responsibilities" :key="item">
                      - {{ item }}
                    </li>
                  </ul>
                </div>

                <div
                  v-if="
                    architectureInspectorNodeSafe.interfaces.length > 0 ||
                    architectureInspectorNodeSafe.outgoing.length > 0 ||
                    architectureInspectorNodeSafe.links.length > 0 ||
                    architectureInspectorNodeSafe.operations?.runbook
                  "
                  class="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5"
                >
                  <p
                    class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Interfaces & Links
                  </p>

                  <div
                    v-if="architectureInspectorNodeSafe.interfaces.length > 0"
                    class="mt-1 space-y-1"
                  >
                    <p
                      v-for="iface in architectureInspectorNodeSafe.interfaces"
                      :key="`${iface.name}-${iface.protocol ?? ''}-${iface.direction ?? ''}`"
                      class="text-[10px] text-foreground"
                    >
                      {{ iface.name }}<span v-if="iface.protocol"> ({{ iface.protocol }})</span
                      ><span v-if="iface.direction"> - {{ iface.direction }}</span
                      ><span v-if="iface.auth"> - auth: {{ iface.auth }}</span
                      ><span v-if="iface.contract"> - {{ iface.contract }}</span>
                    </p>
                  </div>

                  <p
                    v-if="architectureInspectorNodeSafe.operations?.runbook"
                    class="mt-1 text-[10px] text-foreground"
                  >
                    Runbook: {{ architectureInspectorNodeSafe.operations.runbook }}
                  </p>

                  <div
                    v-if="architectureInspectorNodeSafe.outgoing.length > 0"
                    class="mt-1 space-y-1"
                  >
                    <p
                      v-for="edge in architectureInspectorNodeSafe.outgoing"
                      :key="`${edge.target}-${edge.label ?? ''}-${edge.protocol ?? ''}`"
                      class="text-[10px] text-foreground"
                    >
                      {{ edge.label ?? "Connect" }} -> {{ edge.target
                      }}<span v-if="edge.protocol"> ({{ edge.protocol }})</span
                      ><span v-if="edge.transport"> - {{ edge.transport }}</span
                      ><span v-if="edge.auth"> - auth: {{ edge.auth }}</span
                      ><span v-if="edge.criticality"> - {{ edge.criticality }}</span>
                    </p>
                  </div>

                  <div
                    v-if="architectureInspectorNodeSafe.links.length > 0"
                    class="mt-1 flex flex-wrap gap-1"
                  >
                    <a
                      v-for="link in architectureInspectorNodeSafe.links"
                      :key="`${link.label}-${link.href}`"
                      :href="link.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center rounded border border-border/70 bg-card/35 px-1.5 py-0.5 text-[9px] text-foreground transition-colors hover:border-primary/45"
                    >
                      {{ link.label }}
                    </a>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
