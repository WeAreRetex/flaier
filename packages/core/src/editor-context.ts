import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";
import type { FlaierSpec } from "./types";

/**
 * Editor session contract provided by <Flaier> when `editable` is set.
 * The renderer injects it optionally: a null context means the component
 * behaves exactly like the read-only viewer.
 */
export interface FlaierEditorContext {
  /** Whether the host allows editing at all (editable prop). */
  enabled: Ref<boolean>;
  /** Whether an edit session is currently active. */
  editing: Ref<boolean>;
  /** The mutable draft spec; null outside an edit session. */
  draftSpec: Ref<FlaierSpec | null>;
  /** True once the draft diverges from the loaded spec. */
  dirty: Ref<boolean>;
  /** True while a save request is in flight. */
  saving: Ref<boolean>;
  /** Message from the last failed save, if any. */
  saveError: Ref<string | null>;
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  /** Whether the host attached a save handler; Save is disabled otherwise. */
  canSave: ComputedRef<boolean>;
  beginEdit: () => void;
  discard: () => void;
  /** Apply an immutable spec mutation to the draft (records undo history). */
  applyEdit: (mutate: (spec: FlaierSpec) => FlaierSpec) => void;
  undo: () => void;
  redo: () => void;
  requestSave: () => void;
}

export const flaierEditorKey: InjectionKey<FlaierEditorContext> = Symbol("flaier-editor");

export function useFlaierEditor(): FlaierEditorContext | null {
  return inject(flaierEditorKey, null);
}
