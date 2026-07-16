<script setup lang="ts">
import { computed, ref } from "vue";
import { useFlaierEditor } from "../../editor-context";
import { serializeSpecToDisk } from "../../validation/persistence";
import type { EditorAddableNodeType } from "../../composables/useFlowEditor";

const props = defineProps<{
  addableNodeTypes: EditorAddableNodeType[];
  canAddZone?: boolean;
}>();

const emit = defineEmits<{
  "add-node": [type: string];
  "add-zone": [];
  "toggle-sections": [];
  save: [];
}>();

const editor = useFlaierEditor();

const editing = computed(() => Boolean(editor?.editing.value));
const dirty = computed(() => Boolean(editor?.dirty.value));
const saving = computed(() => Boolean(editor?.saving.value));
const canUndo = computed(() => Boolean(editor?.canUndo.value));
const canRedo = computed(() => Boolean(editor?.canRedo.value));
const canSave = computed(() => Boolean(editor?.canSave.value));
const saveError = computed(() => editor?.saveError.value ?? null);

const addMenuOpen = ref(false);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const buttonClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card/85 px-2.5 text-[11px] text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-45";

function toggleEditing() {
  if (!editor) return;
  addMenuOpen.value = false;

  if (!editing.value) {
    editor.beginEdit();
    return;
  }

  if (
    dirty.value &&
    typeof window !== "undefined" &&
    !window.confirm("Discard unsaved flow changes?")
  ) {
    return;
  }

  editor.discard();
}

function handleAddNode(type: string) {
  addMenuOpen.value = false;
  emit("add-node", type);
}

async function copyJson() {
  const spec = editor?.draftSpec.value;
  if (!spec || typeof navigator === "undefined" || !navigator.clipboard) return;

  try {
    await navigator.clipboard.writeText(serializeSpecToDisk(spec));
    copied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    // Clipboard access denied — nothing actionable.
  }
}
</script>

<template>
  <div
    v-if="editor"
    class="fn-editor-toolbar pointer-events-auto absolute left-1/2 top-4 z-30 flex -translate-x-1/2 flex-col items-center gap-2"
  >
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        :class="buttonClass"
        :aria-pressed="editing"
        :title="editing ? 'Exit edit mode' : 'Edit flow'"
        @click="toggleEditing"
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
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
        <span>{{ editing ? "Done" : "Edit" }}</span>
      </button>

      <template v-if="editing">
        <button
          type="button"
          :class="buttonClass"
          :disabled="!canUndo"
          title="Undo (Cmd/Ctrl+Z)"
          @click="editor.undo()"
        >
          Undo
        </button>

        <button
          type="button"
          :class="buttonClass"
          :disabled="!canRedo"
          title="Redo (Cmd/Ctrl+Shift+Z)"
          @click="editor.redo()"
        >
          Redo
        </button>

        <div class="relative">
          <button
            type="button"
            :class="buttonClass"
            title="Add node"
            @click="addMenuOpen = !addMenuOpen"
          >
            + Add
          </button>

          <div
            v-if="addMenuOpen"
            class="absolute left-0 top-[calc(100%+8px)] w-40 rounded-lg border border-border/70 bg-card/95 p-1 shadow-2xl backdrop-blur-md"
          >
            <button
              v-for="nodeType in props.addableNodeTypes"
              :key="nodeType.type"
              type="button"
              class="w-full rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/70"
              @click="handleAddNode(nodeType.type)"
            >
              {{ nodeType.label }}
            </button>

            <button
              v-if="props.canAddZone"
              type="button"
              class="w-full rounded-md border-t border-border/50 px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/70"
              @click="
                addMenuOpen = false;
                emit('add-zone');
              "
            >
              Section
            </button>
          </div>
        </div>

        <button
          v-if="props.canAddZone"
          type="button"
          :class="buttonClass"
          title="Browse and edit sections"
          @click="emit('toggle-sections')"
        >
          Sections
        </button>

        <button type="button" :class="buttonClass" title="Copy spec JSON" @click="copyJson">
          {{ copied ? "Copied!" : "Copy JSON" }}
        </button>

        <button
          type="button"
          :class="buttonClass"
          :disabled="!canSave || saving || !dirty"
          :title="canSave ? 'Save to source file' : 'No save handler attached'"
          @click="emit('save')"
        >
          <span
            v-if="dirty"
            class="h-1.5 w-1.5 rounded-full bg-amber-400"
            aria-label="Unsaved changes"
          />
          <span>{{ saving ? "Saving..." : "Save" }}</span>
        </button>
      </template>
    </div>

    <p
      v-if="editing && saveError"
      class="max-w-[420px] whitespace-pre-line rounded-md border border-red-500/45 bg-red-500/12 px-2 py-1 text-[10px] leading-relaxed text-red-200"
    >
      {{ saveError }}
    </p>
  </div>
</template>
