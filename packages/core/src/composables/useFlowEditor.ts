import { useVueFlow, type Connection, type EdgeMouseEvent, type GraphNode } from "@vue-flow/core";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type WritableComputedRef,
} from "vue";
import { useFlaierEditor } from "../editor-context";
import {
  addEdge,
  addNode,
  addZone,
  deleteNode,
  removeEdge,
  setNodePosition,
  snapshotAllPositions,
} from "../spec-edit";
import type { ArchitectureZone } from "../types";

export interface EditorAddableNodeType {
  type: string;
  label: string;
}

export interface UseFlowEditorOptions {
  flowId: string;
  isSequenceMode: ComputedRef<boolean>;
  isArchitectureMode: ComputedRef<boolean>;
  playing: WritableComputedRef<boolean> | Ref<boolean>;
  containerWidth: Ref<number>;
  containerHeight: Ref<number>;
  /** Lazy accessor for the currently rendered node positions. */
  getRenderedPositions?: () => Record<string, { x: number; y: number }>;
}

const DEFAULT_NODE_PROPS: Record<string, Record<string, unknown>> = {
  ArchitectureNode: { label: "New component", kind: "service" },
  TriggerNode: { label: "New trigger" },
  DescriptionNode: { label: "New note", body: "Describe this step." },
  DecisionNode: { label: "New decision" },
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;

  return Boolean(target.closest('[contenteditable="true"]'));
}

/**
 * All renderer-side editor behavior: drag persistence, edge creation,
 * selection, deletion, keyboard shortcuts, and the add-node palette.
 * With no editor context provided (read-only viewer) everything is inert.
 */
export interface EditorSelectedEdge {
  source: string;
  target: string;
}

export function useFlowEditor(options: UseFlowEditorOptions) {
  const editor = useFlaierEditor();
  const { onConnect, onEdgeClick, onNodeDragStop, viewport } = useVueFlow(options.flowId);

  const editorAvailable = computed(() => {
    return Boolean(editor?.enabled.value) && !options.isSequenceMode.value;
  });

  const editorActive = computed(() => {
    return editorAvailable.value && Boolean(editor?.editing.value);
  });

  const selectedNodeKeys = ref<string[]>([]);
  const selectedZoneId = ref<string | null>(null);
  const selectedEdge = ref<EditorSelectedEdge | null>(null);
  const sectionsListOpen = ref(false);

  const addableNodeTypes = computed<EditorAddableNodeType[]>(() => {
    if (options.isArchitectureMode.value) {
      return [{ type: "ArchitectureNode", label: "Component" }];
    }

    return [
      { type: "TriggerNode", label: "Trigger" },
      { type: "DescriptionNode", label: "Note" },
      { type: "DecisionNode", label: "Decision" },
    ];
  });

  function clearSelection() {
    if (selectedNodeKeys.value.length > 0) {
      selectedNodeKeys.value = [];
    }
    selectedZoneId.value = null;
    selectedEdge.value = null;
    sectionsListOpen.value = false;
  }

  function selectZone(zoneId: string) {
    if (!editorActive.value) return;

    selectedNodeKeys.value = [];
    selectedEdge.value = null;
    selectedZoneId.value = selectedZoneId.value === zoneId ? null : zoneId;
  }

  function toggleSectionsList() {
    if (!editorActive.value) return;

    const open = !sectionsListOpen.value;
    selectedNodeKeys.value = [];
    selectedZoneId.value = null;
    selectedEdge.value = null;
    sectionsListOpen.value = open;
  }

  function backToSectionsList() {
    selectedZoneId.value = null;
    sectionsListOpen.value = true;
  }

  function handleEditNodeClick(nodeKey: string, event?: MouseEvent) {
    if (!editorActive.value) return;

    selectedZoneId.value = null;
    selectedEdge.value = null;
    sectionsListOpen.value = false;
    const additive = Boolean(event?.shiftKey || event?.metaKey || event?.ctrlKey);
    const alreadySelected = selectedNodeKeys.value.includes(nodeKey);

    if (additive) {
      selectedNodeKeys.value = alreadySelected
        ? selectedNodeKeys.value.filter((key) => key !== nodeKey)
        : [...selectedNodeKeys.value, nodeKey];
      return;
    }

    selectedNodeKeys.value =
      alreadySelected && selectedNodeKeys.value.length === 1 ? [] : [nodeKey];
  }

  function deleteSelection() {
    if (!editor) return;

    if (selectedNodeKeys.value.length > 0) {
      const keys = [...selectedNodeKeys.value];
      editor.applyEdit((spec) => keys.reduce((current, key) => deleteNode(current, key), spec));
      clearSelection();
      return;
    }

    const edge = selectedEdge.value;
    if (edge) {
      editor.applyEdit((spec) => removeEdge(spec, edge.source, edge.target));
      selectedEdge.value = null;
    }
  }

  function deleteSelectedEdge() {
    const edge = selectedEdge.value;
    if (!editor || !edge) return;

    editor.applyEdit((spec) => removeEdge(spec, edge.source, edge.target));
    selectedEdge.value = null;
  }

  function viewportCenterPosition() {
    const zoom =
      Number.isFinite(viewport.value.zoom) && viewport.value.zoom > 0 ? viewport.value.zoom : 1;
    const x = Number.isFinite(viewport.value.x) ? viewport.value.x : 0;
    const y = Number.isFinite(viewport.value.y) ? viewport.value.y : 0;

    return {
      x: Math.round((options.containerWidth.value / 2 - x) / zoom),
      y: Math.round((options.containerHeight.value / 2 - y) / zoom),
    };
  }

  function addNodeOfType(type: string) {
    if (!editor || !editorActive.value) return;

    const props = DEFAULT_NODE_PROPS[type] ?? { label: `New ${type}` };
    editor.applyEdit((spec) =>
      addNode(spec, {
        type,
        props: { ...props },
        position: viewportCenterPosition(),
      }),
    );
  }

  function addZoneAction() {
    if (!editor || !editorActive.value) return;

    const draft = editor.draftSpec.value;
    const rootZones = draft?.elements[draft.root]?.props.zones;
    const usedIds = new Set(
      (Array.isArray(rootZones) ? (rootZones as ArchitectureZone[]) : [])
        .map((zone) => zone?.id)
        .filter((id): id is string => typeof id === "string"),
    );

    let id = "section";
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `section-${suffix}`;
      suffix += 1;
    }

    editor.applyEdit((spec) => addZone(spec, { id, label: "New section" }));
    selectedNodeKeys.value = [];
    selectedZoneId.value = id;
    sectionsListOpen.value = false;
  }

  function requestSave() {
    if (!editor || !editorActive.value) return;

    // Snapshot every rendered position on save so dagre only ever places
    // nodes an AI adds later without positions (stable round-trips).
    const positions = options.getRenderedPositions?.();
    if (positions && Object.keys(positions).length > 0) {
      editor.applyEdit((spec) => snapshotAllPositions(spec, positions));
    }

    editor.requestSave();
  }

  onNodeDragStop(({ nodes }: { nodes: GraphNode[] }) => {
    if (!editor || !editorActive.value || nodes.length === 0) return;

    editor.applyEdit((spec) =>
      nodes.reduce(
        (current, node) =>
          setNodePosition(current, node.id, {
            x: node.position.x,
            y: node.position.y,
          }),
        spec,
      ),
    );
  });

  onConnect((connection: Connection) => {
    if (!editor || !editorActive.value) return;
    if (!connection.source || !connection.target) return;

    editor.applyEdit((spec) => addEdge(spec, connection.source, connection.target));
  });

  onEdgeClick(({ edge }: EdgeMouseEvent) => {
    if (!editorActive.value) return;

    selectedNodeKeys.value = [];
    selectedZoneId.value = null;
    sectionsListOpen.value = false;

    const isSame =
      selectedEdge.value?.source === edge.source && selectedEdge.value?.target === edge.target;
    selectedEdge.value = isSame ? null : { source: edge.source, target: edge.target };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (!editor || !editorActive.value) return;
    if (event.defaultPrevented) return;
    if (isEditableTarget(event.target)) return;

    const mod = event.metaKey || event.ctrlKey;

    if (mod && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      if (event.shiftKey) {
        editor.redo();
      } else {
        editor.undo();
      }
      return;
    }

    if (mod && (event.key === "y" || event.key === "Y")) {
      event.preventDefault();
      editor.redo();
      return;
    }

    if (mod) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      if (selectedNodeKeys.value.length === 0 && !selectedEdge.value) return;
      event.preventDefault();
      deleteSelection();
      return;
    }

    if (event.key === "Escape") {
      clearSelection();
    }
  }

  onMounted(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("keydown", handleKeydown);
  });

  watch(editorActive, (active) => {
    clearSelection();

    if (active) {
      options.playing.value = false;
    }
  });

  // Deleted or renamed nodes/zones must not linger in the selection.
  watch(
    () => editor?.draftSpec.value,
    (draft) => {
      if (!draft) {
        clearSelection();
        return;
      }

      selectedNodeKeys.value = selectedNodeKeys.value.filter((key) => Boolean(draft.elements[key]));

      const edge = selectedEdge.value;
      if (edge && (!draft.elements[edge.source] || !draft.elements[edge.target])) {
        selectedEdge.value = null;
      }

      if (selectedZoneId.value) {
        const rootZones = draft.elements[draft.root]?.props.zones;
        const stillExists =
          Array.isArray(rootZones) &&
          (rootZones as ArchitectureZone[]).some((zone) => zone?.id === selectedZoneId.value);

        if (!stillExists) {
          selectedZoneId.value = null;
        }
      }
    },
  );

  return {
    editor,
    editorAvailable,
    editorActive,
    selectedNodeKeys,
    selectedZoneId,
    selectedEdge,
    deleteSelectedEdge,
    sectionsListOpen,
    addableNodeTypes,
    addNodeOfType,
    addZoneAction,
    deleteSelection,
    clearSelection,
    selectZone,
    toggleSectionsList,
    backToSectionsList,
    handleEditNodeClick,
    requestSave,
  };
}
