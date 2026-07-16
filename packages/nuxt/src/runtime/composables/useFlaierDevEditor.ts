import { computed, unref, type MaybeRef } from "vue";
import type { FlaierSaveRequest, FlaierSource } from "@flaier/core";

const SAVE_ENDPOINT = "/_flaier/save";

/**
 * Dev-only editor wiring shared by the Nuxt wrapper components. Editing is
 * available only in local dev (`import.meta.dev`) against a file-backed
 * `.flow.json` source; production builds compile the guard to false so the
 * bindings (and the save round-trip) disappear entirely.
 */
export function useFlaierDevEditor(
  source: MaybeRef<FlaierSource>,
  editable: MaybeRef<boolean | undefined>,
) {
  const editingAllowed = computed(() => {
    if (!import.meta.dev) return false;

    const src = unref(source);
    return unref(editable) !== false && typeof src === "string" && src.endsWith(".flow.json");
  });

  async function handleSave(request: FlaierSaveRequest) {
    const src = unref(source);

    if (typeof src !== "string") {
      request.complete({ ok: false, message: "Only file-based flow sources can be saved." });
      return;
    }

    try {
      await $fetch(SAVE_ENDPOINT, {
        method: "POST",
        body: {
          src,
          spec: request.spec,
        },
      });

      request.complete({ ok: true });
    } catch (error) {
      const errorData = (
        error as { data?: { data?: { errors?: string[] }; statusMessage?: string } }
      ).data;

      request.complete({
        ok: false,
        errors: errorData?.data?.errors,
        message:
          errorData?.data?.errors?.join("\n") ??
          errorData?.statusMessage ??
          (error instanceof Error ? error.message : "Failed to save flow spec."),
      });
    }
  }

  const editorBindings = computed(() => {
    if (!editingAllowed.value) return {};
    return { editable: true, onSave: handleSave };
  });

  return { editingAllowed, editorBindings };
}
