<script setup lang="ts">
import { computed } from "vue";
import { useFlaierEditor } from "../../editor-context";
import { resolveIconUrl } from "../../icon-url";
import {
  deleteNode,
  removeZone,
  updateEdgeMeta,
  updateNodeProps,
  updateZone,
} from "../../spec-edit";
import type { ArchitectureZone, EdgeTransitionKind, SpecElement } from "../../types";

export interface EditorInspectorEdge {
  source: string;
  target: string;
  sourceLabel: string;
  targetLabel: string;
  label?: string;
  kind?: string;
  description?: string;
}

interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select";
  options?: string[];
  /** Select only: prepend an empty "(none)" choice that clears the prop. */
  optional?: boolean;
  required?: boolean;
  mono?: boolean;
  placeholder?: string;
  hint?: string;
}

const props = defineProps<{
  nodeKey: string | null;
  element: SpecElement | null;
  zoneId: string | null;
  edge: EditorInspectorEdge | null;
  zones: ArchitectureZone[];
  zoneNodeCounts?: Record<string, number>;
  showSectionsList?: boolean;
  isArchitectureMode: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "select-zone": [zoneId: string];
  "add-zone": [];
  "back-to-list": [];
  "delete-edge": [];
}>();

const EDGE_KINDS = ["default", "success", "error", "warning", "retry", "async"];

const editor = useFlaierEditor();

const ARCHITECTURE_KINDS = [
  "service",
  "database",
  "queue",
  "cache",
  "gateway",
  "external",
  "compute",
];

const NODE_FIELDS: Record<string, FieldDef[]> = {
  ArchitectureNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "kind", label: "Kind", kind: "select", options: ARCHITECTURE_KINDS },
    {
      key: "icon",
      label: "Icon",
      kind: "text",
      mono: true,
      placeholder: "logos:aws-lambda",
      hint: "Iconify name or image URL — browse icon-sets.iconify.design",
    },
    { key: "technology", label: "Technology", kind: "text" },
    { key: "runtime", label: "Runtime", kind: "text" },
    { key: "owner", label: "Owner", kind: "text" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      optional: true,
      options: ["planned", "active", "degraded", "retired"],
    },
    {
      key: "tier",
      label: "Tier",
      kind: "select",
      optional: true,
      options: ["edge", "application", "integration", "data", "platform", "external"],
    },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "narrative", label: "Overview", kind: "textarea" },
  ],
  TriggerNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  DescriptionNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "body", label: "Body", kind: "textarea", required: true },
  ],
  DecisionNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "condition", label: "Condition", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  PayloadNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "payload", label: "Payload", kind: "textarea", mono: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  ErrorNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "message", label: "Message", kind: "text", required: true },
    { key: "cause", label: "Cause", kind: "text" },
    { key: "mitigation", label: "Mitigation", kind: "textarea" },
  ],
  LinkNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "href", label: "URL", kind: "text", required: true },
    { key: "description", label: "Description", kind: "textarea" },
  ],
  CodeNode: [
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "file", label: "File", kind: "text" },
    { key: "code", label: "Code", kind: "textarea", required: true, mono: true },
    { key: "comment", label: "Comment", kind: "textarea" },
  ],
};

const FALLBACK_FIELDS: FieldDef[] = [{ key: "label", label: "Label", kind: "text" }];

const nodeFields = computed<FieldDef[]>(() => {
  if (!props.element) return [];
  return NODE_FIELDS[props.element.type] ?? FALLBACK_FIELDS;
});

const iconPreviewUrl = computed(() => {
  const icon = stringProp("icon");
  return icon ? resolveIconUrl(icon) : undefined;
});

const showZoneSelect = computed(() => {
  return (
    props.element?.type === "ArchitectureNode" && props.isArchitectureMode && props.zones.length > 0
  );
});

const showColorField = computed(() => props.element?.type === "TriggerNode");

const selectedZone = computed(() => {
  if (!props.zoneId) return null;
  return props.zones.find((zone) => zone.id === props.zoneId) ?? null;
});

const fieldClass =
  "w-full rounded-md border border-border/70 bg-background/70 px-2 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-sky-400/70";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

function stringProp(key: string): string {
  const value = props.element?.props[key];
  return typeof value === "string" ? value : "";
}

function readValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}

function commitNodeProp(field: FieldDef, event: Event) {
  const key = props.nodeKey;
  if (!editor || !key) return;

  const raw = readValue(event);
  // Mono textareas hold code/payload where whitespace is meaningful.
  const value = field.mono && field.kind === "textarea" ? raw : raw.trim();

  if (value === "" && field.required) {
    // Revert the control to the current value instead of writing an empty
    // required prop.
    (event.target as HTMLInputElement).value = stringProp(field.key);
    return;
  }

  editor.applyEdit((spec) =>
    updateNodeProps(spec, key, { [field.key]: value === "" ? undefined : value }),
  );
}

function commitNodeZone(event: Event) {
  const key = props.nodeKey;
  if (!editor || !key) return;

  const value = readValue(event);
  editor.applyEdit((spec) =>
    updateNodeProps(spec, key, { zone: value === "" ? undefined : value }),
  );
}

function commitNodeColor(event: Event) {
  const key = props.nodeKey;
  if (!editor || !key) return;

  editor.applyEdit((spec) => updateNodeProps(spec, key, { color: readValue(event) }));
}

function clearNodeColor() {
  const key = props.nodeKey;
  if (!editor || !key) return;

  editor.applyEdit((spec) => updateNodeProps(spec, key, { color: undefined }));
}

function handleDeleteNode() {
  const key = props.nodeKey;
  if (!editor || !key) return;

  editor.applyEdit((spec) => deleteNode(spec, key));
  emit("close");
}

function commitZoneMeta(key: "label" | "description", event: Event) {
  const zoneId = props.zoneId;
  if (!editor || !zoneId) return;

  const value = readValue(event).trim();

  if (key === "label" && value === "") {
    (event.target as HTMLInputElement).value = selectedZone.value?.label ?? "";
    return;
  }

  editor.applyEdit((spec) => updateZone(spec, zoneId, { [key]: value === "" ? undefined : value }));
}

function commitZoneColor(event: Event) {
  const zoneId = props.zoneId;
  if (!editor || !zoneId) return;

  editor.applyEdit((spec) => updateZone(spec, zoneId, { color: readValue(event) }));
}

function clearZoneColor() {
  const zoneId = props.zoneId;
  if (!editor || !zoneId) return;

  editor.applyEdit((spec) => updateZone(spec, zoneId, { color: undefined }));
}

function handleDeleteZone() {
  const zoneId = props.zoneId;
  if (!editor || !zoneId) return;

  if (
    typeof window !== "undefined" &&
    !window.confirm("Delete this section? Nodes keep rendering without it.")
  ) {
    return;
  }

  editor.applyEdit((spec) => removeZone(spec, zoneId));
  emit("close");
}

function toColorInputValue(value: string | undefined) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#38bdf8";
}

function commitEdgeMeta(key: "label" | "description" | "kind", event: Event) {
  const edge = props.edge;
  if (!editor || !edge) return;

  const raw = readValue(event).trim();
  const value = raw === "" || (key === "kind" && raw === "default") ? undefined : raw;

  editor.applyEdit((spec) =>
    updateEdgeMeta(spec, edge.source, edge.target, {
      [key]: key === "kind" ? (value as EdgeTransitionKind | undefined) : value,
    }),
  );
}

const sectionsListVisible = computed(() => {
  return Boolean(props.showSectionsList) && !selectedZone.value && !props.element && !props.edge;
});

function zoneNodeCount(zoneId: string) {
  return props.zoneNodeCounts?.[zoneId] ?? 0;
}

const panelTitle = computed(() => {
  if (selectedZone.value) return "Section";
  if (props.edge) return "Edge";
  if (sectionsListVisible.value) return "Sections";
  return props.element?.type ?? "";
});
</script>

<template>
  <div
    v-if="editor && (element || selectedZone || edge || sectionsListVisible)"
    class="fn-editor-inspector pointer-events-auto absolute bottom-4 right-3 top-16 z-40 w-[280px]"
  >
    <div
      class="flex max-h-full flex-col gap-3 overflow-y-auto rounded-xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <button
            v-if="selectedZone && props.showSectionsList"
            type="button"
            class="rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to sections"
            title="Back to sections"
            @click="emit('back-to-list')"
          >
            ←
          </button>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {{ panelTitle }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md px-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close editor panel"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <!-- Sections list -->
      <template v-if="sectionsListVisible">
        <p v-if="zones.length === 0" class="text-xs text-muted-foreground">No sections yet.</p>

        <button
          v-for="zone in zones"
          :key="zone.id"
          type="button"
          class="flex w-full items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted/70"
          @click="emit('select-zone', zone.id)"
        >
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
            :style="{ background: zone.color ?? 'transparent' }"
          />
          <span class="min-w-0 flex-1 truncate">{{ zone.label }}</span>
          <span class="shrink-0 text-[10px] text-muted-foreground">
            {{ zoneNodeCount(zone.id) }} node{{ zoneNodeCount(zone.id) === 1 ? "" : "s" }}
          </span>
        </button>

        <button
          type="button"
          class="mt-1 rounded-md border border-border/70 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          @click="emit('add-zone')"
        >
          + Add section
        </button>
      </template>

      <!-- Edge form -->
      <template v-else-if="edge">
        <p class="break-words text-[11px] text-muted-foreground">
          {{ edge.sourceLabel }} → {{ edge.targetLabel }}
        </p>

        <div>
          <label :class="labelClass">Label</label>
          <input
            :class="fieldClass"
            type="text"
            :value="edge.label ?? ''"
            placeholder="e.g. publishes event"
            @change="commitEdgeMeta('label', $event)"
          />
        </div>

        <div>
          <label :class="labelClass">Kind</label>
          <select
            :class="fieldClass"
            :value="edge.kind ?? 'default'"
            @change="commitEdgeMeta('kind', $event)"
          >
            <option v-for="kind in EDGE_KINDS" :key="kind" :value="kind">{{ kind }}</option>
          </select>
        </div>

        <div>
          <label :class="labelClass">Description</label>
          <textarea
            :class="fieldClass"
            rows="3"
            :value="edge.description ?? ''"
            @change="commitEdgeMeta('description', $event)"
          />
        </div>

        <button
          type="button"
          class="mt-1 rounded-md border border-red-500/50 px-2 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
          @click="emit('delete-edge')"
        >
          Delete edge
        </button>
      </template>

      <!-- Zone form -->
      <template v-else-if="selectedZone">
        <div>
          <label :class="labelClass">Name</label>
          <input
            :class="fieldClass"
            type="text"
            :value="selectedZone.label"
            @change="commitZoneMeta('label', $event)"
          />
        </div>

        <div>
          <label :class="labelClass">Background color</label>
          <div class="flex items-center gap-2">
            <input
              class="h-7 w-10 cursor-pointer rounded border border-border/70 bg-transparent"
              type="color"
              :value="toColorInputValue(selectedZone.color)"
              @change="commitZoneColor($event)"
            />
            <button
              v-if="selectedZone.color"
              type="button"
              class="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              @click="clearZoneColor"
            >
              Reset
            </button>
          </div>
        </div>

        <div>
          <label :class="labelClass">Description</label>
          <textarea
            :class="fieldClass"
            rows="3"
            :value="selectedZone.description ?? ''"
            @change="commitZoneMeta('description', $event)"
          />
        </div>

        <button
          type="button"
          class="mt-1 rounded-md border border-red-500/50 px-2 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
          @click="handleDeleteZone"
        >
          Delete section
        </button>
      </template>

      <!-- Node form -->
      <template v-else-if="element">
        <div v-for="field in nodeFields" :key="field.key">
          <label :class="labelClass">{{ field.label }}</label>

          <select
            v-if="field.kind === 'select'"
            :class="fieldClass"
            :value="
              field.optional ? stringProp(field.key) : stringProp(field.key) || field.options?.[0]
            "
            @change="commitNodeProp(field, $event)"
          >
            <option v-if="field.optional" value="">(none)</option>
            <option v-for="option in field.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <textarea
            v-else-if="field.kind === 'textarea'"
            :class="[fieldClass, field.mono ? 'font-mono text-[11px]' : '']"
            :rows="field.mono ? 8 : 3"
            :value="stringProp(field.key)"
            @change="commitNodeProp(field, $event)"
          />

          <div v-else class="flex items-center gap-2">
            <input
              :class="[fieldClass, field.mono ? 'font-mono text-[11px]' : '']"
              type="text"
              :value="stringProp(field.key)"
              :placeholder="field.placeholder"
              @change="commitNodeProp(field, $event)"
            />
            <img
              v-if="field.key === 'icon' && iconPreviewUrl"
              :src="iconPreviewUrl"
              alt=""
              class="h-6 w-6 shrink-0 rounded border border-border/60 bg-muted/15 object-contain p-0.5"
            />
          </div>

          <p v-if="field.hint" class="mt-1 text-[10px] leading-snug text-muted-foreground">
            {{ field.hint }}
          </p>
        </div>

        <div v-if="showZoneSelect">
          <label :class="labelClass">Section</label>
          <select :class="fieldClass" :value="stringProp('zone')" @change="commitNodeZone">
            <option value="">No section</option>
            <option v-for="zone in zones" :key="zone.id" :value="zone.id">
              {{ zone.label }}
            </option>
          </select>
        </div>

        <div v-if="showColorField">
          <label :class="labelClass">Color</label>
          <div class="flex items-center gap-2">
            <input
              class="h-7 w-10 cursor-pointer rounded border border-border/70 bg-transparent"
              type="color"
              :value="toColorInputValue(stringProp('color') || undefined)"
              @change="commitNodeColor"
            />
            <button
              v-if="stringProp('color')"
              type="button"
              class="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              @click="clearNodeColor"
            >
              Reset
            </button>
          </div>
        </div>

        <button
          type="button"
          class="mt-1 rounded-md border border-red-500/50 px-2 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
          @click="handleDeleteNode"
        >
          Delete node
        </button>
      </template>
    </div>
  </div>
</template>
