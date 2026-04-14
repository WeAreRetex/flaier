import { shallowRef, type ShallowRef } from "vue";
import type { HighlighterCore } from "shiki";

let highlighterPromise: Promise<HighlighterCore> | null = null;
const highlighterRef: ShallowRef<HighlighterCore | null> = shallowRef(null);

/**
 * Shared singleton Shiki highlighter.
 * Lazily created on first call; the same instance is reused across all components.
 */
export function useShiki(
  langs: string[] = [
    "typescript",
    "tsx",
    "javascript",
    "jsx",
    "python",
    "json",
    "bash",
    "yaml",
    "go",
    "rust",
  ],
  theme = "github-dark",
) {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(async ({ createHighlighter }) => {
      const themes = Array.from(new Set(["github-dark", "github-light", theme]));
      const hl = await createHighlighter({ themes, langs });
      highlighterRef.value = hl;
      return hl;
    });
  }

  return {
    highlighter: highlighterRef,
    ready: highlighterPromise,
  };
}
