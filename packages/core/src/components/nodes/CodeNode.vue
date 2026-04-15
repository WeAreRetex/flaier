<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { ShikiMagicMove, ShikiMagicMovePrecompiled } from "shiki-magic-move/vue";
import { codeToKeyedTokens, type KeyedTokensInfo } from "shiki-magic-move/core";
import "shiki-magic-move/dist/style.css";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";
import {
  CODE_NODE_MAX_INLINE_CHARS,
  estimateCodeNodeCharsPerLine,
  estimateCodeNodeWidth,
} from "../../code-node-sizing";
import { useShiki } from "../../composables/useShiki";
import {
  hasTwoslashHints,
  hasTwoslashHtml,
  normalizeTwoslashLanguage,
  resolveTwoslashHtmlForTheme,
} from "../../twoslash";
import type { MagicMoveStep, TwoslashHtml } from "../../types";

const TWOSLASH_SWAP_DELAY_MS = 560;
const FALLBACK_SHIKI_LANGUAGE = "text";

const props = withDefaults(
  defineProps<{
    label: string;
    file?: string;
    language?: string;
    code: string;
    comment?: string;
    story?: string;
    wrapLongLines?: boolean;
    magicMoveSteps?: MagicMoveStep[];
    twoslash?: boolean;
    twoslashHtml?: TwoslashHtml;
    sourceAnchor?: {
      label: string;
      href?: string;
    };
    uiTheme?: "dark" | "light";
    active?: boolean;
    stepIndex?: number;
  }>(),
  {
    language: "typescript",
    wrapLongLines: false,
    uiTheme: "dark",
    stepIndex: 0,
  },
);

const { highlighter } = useShiki();
const isClient = typeof window !== "undefined";

const activeStep = computed(() => {
  if (!props.magicMoveSteps?.length) return undefined;
  const idx = Math.min(props.stepIndex, props.magicMoveSteps.length - 1);
  return props.magicMoveSteps[idx];
});

const displayCode = computed(() => {
  return activeStep.value?.code ?? props.code;
});

const displayTitle = computed(() => activeStep.value?.title);

const displaySpeaker = computed(() => activeStep.value?.speaker);

const displayNarrative = computed(() => {
  return activeStep.value?.story ?? activeStep.value?.comment ?? props.story ?? props.comment;
});

const codeSequence = computed(() => {
  if (props.magicMoveSteps?.length) {
    return props.magicMoveSteps.map((step) => step.code);
  }

  return [props.code];
});

const requestedLanguage = computed(() => {
  return (props.language ?? "typescript").trim().toLowerCase();
});

const renderLanguage = computed(() => {
  const language = requestedLanguage.value || "typescript";
  const hl = highlighter.value;

  if (!hl) {
    return language;
  }

  const loadedLanguages = hl.getLoadedLanguages();
  if (loadedLanguages.includes(language)) {
    return language;
  }

  try {
    const resolvedAlias = hl.resolveLangAlias(language);
    if (loadedLanguages.includes(resolvedAlias)) {
      return resolvedAlias;
    }
  } catch {}

  return FALLBACK_SHIKI_LANGUAGE;
});

const codeVariants = computed(() => {
  const variants = [props.code, ...codeSequence.value];
  return variants.filter((value): value is string => typeof value === "string" && value.length > 0);
});

const hasMagicMoveSteps = computed(() => {
  return (props.magicMoveSteps?.length ?? 0) > 0;
});

const autoTwoslashEnabled = computed(() => {
  return codeVariants.value.some((code) => hasTwoslashHints(code));
});

const twoslashRequested = computed(() => {
  return props.twoslash ?? autoTwoslashEnabled.value;
});

const twoslashLanguage = computed(() => {
  return normalizeTwoslashLanguage(props.language);
});

const resolvedTwoslashHtml = computed(() => {
  return resolveTwoslashHtmlForTheme(props.twoslashHtml, props.uiTheme);
});

const displaySourceAnchor = computed(() => {
  if (props.sourceAnchor?.label) {
    return props.sourceAnchor;
  }

  if (props.file) {
    return { label: props.file };
  }

  return undefined;
});

const canRenderTwoslash = computed(() => {
  return (
    twoslashRequested.value &&
    Boolean(twoslashLanguage.value) &&
    hasTwoslashHtml(props.twoslashHtml)
  );
});

function getMaxLineLength(code: string) {
  return code.split("\n").reduce((max, line) => Math.max(max, line.length), 0);
}

const maxLineLength = computed(() => {
  return codeVariants.value.reduce((max, code) => {
    return Math.max(max, getMaxLineLength(code));
  }, 0);
});

const nodeWidth = computed(() => {
  return estimateCodeNodeWidth(maxLineLength.value);
});

const codeCharsPerLine = computed(() => {
  return estimateCodeNodeCharsPerLine(nodeWidth.value);
});

const shouldWrapLongLines = computed(() => {
  return props.wrapLongLines || maxLineLength.value > CODE_NODE_MAX_INLINE_CHARS;
});

const shikiTheme = computed(() => {
  return props.uiTheme === "light" ? "github-light" : "github-dark";
});

const twoslashShown = ref(false);

const showTwoslashPane = computed(() => {
  return twoslashShown.value && resolvedTwoslashHtml.value.length > 0;
});

let finalSwapTimer: ReturnType<typeof setTimeout> | null = null;

function getLastMagicMoveStepIndex() {
  return Math.max(0, (props.magicMoveSteps?.length ?? 1) - 1);
}

function clearFinalSwapTimer() {
  if (!finalSwapTimer) return;
  clearTimeout(finalSwapTimer);
  finalSwapTimer = null;
}

function scheduleFinalSwap() {
  if (!isClient) return;

  clearFinalSwapTimer();
  finalSwapTimer = setTimeout(() => {
    if (!canRenderTwoslash.value || !hasMagicMoveSteps.value) return;
    if (props.stepIndex >= getLastMagicMoveStepIndex()) {
      twoslashShown.value = true;
    }
  }, TWOSLASH_SWAP_DELAY_MS);
}

function handleMagicMoveEnd() {
  if (!canRenderTwoslash.value || !hasMagicMoveSteps.value) return;
  if (props.stepIndex < getLastMagicMoveStepIndex()) return;

  clearFinalSwapTimer();
  twoslashShown.value = true;
}

watch(
  [canRenderTwoslash, hasMagicMoveSteps],
  ([enabled, hasSteps]) => {
    if (!enabled) {
      clearFinalSwapTimer();
      twoslashShown.value = false;
      return;
    }

    if (!hasSteps) {
      twoslashShown.value = true;
      return;
    }

    if (props.stepIndex < getLastMagicMoveStepIndex()) {
      twoslashShown.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => props.stepIndex,
  (stepIndex, previousStepIndex) => {
    if (!canRenderTwoslash.value || !hasMagicMoveSteps.value) return;

    const lastStepIndex = getLastMagicMoveStepIndex();

    if (stepIndex < lastStepIndex) {
      clearFinalSwapTimer();
      twoslashShown.value = false;
      return;
    }

    if (previousStepIndex === undefined || previousStepIndex < lastStepIndex) {
      scheduleFinalSwap();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  clearFinalSwapTimer();
});

const precompiledSteps = computed<KeyedTokensInfo[] | null>(() => {
  const hl = highlighter.value;
  if (!hl) return null;

  try {
    return codeSequence.value.map((code) =>
      codeToKeyedTokens(
        hl as never,
        code,
        {
          lang: renderLanguage.value,
          theme: shikiTheme.value,
        } as never,
        false,
      ),
    );
  } catch {
    return null;
  }
});

const precompiledStepIndex = computed(() => {
  const steps = precompiledSteps.value;
  if (!steps?.length) return 0;
  return Math.max(0, Math.min(props.stepIndex, steps.length - 1));
});

function estimateWrappedLines(text: string, charsPerLine = 44) {
  return text
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

const codeViewportHeight = computed(() => {
  const maxLines = codeVariants.value.reduce((max, code) => {
    const lines = shouldWrapLongLines.value
      ? estimateWrappedLines(code, codeCharsPerLine.value)
      : code.split("\n").length;

    return Math.max(max, lines);
  }, 1);

  if (shouldWrapLongLines.value) {
    return Math.min(400, Math.max(190, 72 + maxLines * 16));
  }

  return Math.min(340, Math.max(160, 84 + maxLines * 17));
});

const narrativeVariants = computed(() => {
  const variants = [
    props.story,
    props.comment,
    ...(props.magicMoveSteps?.flatMap((step) => [step.story, step.comment]) ?? []),
  ];

  return variants.filter((value): value is string => typeof value === "string" && value.length > 0);
});

const hasNarrative = computed(() => narrativeVariants.value.length > 0);

const hasNarrativeMeta = computed(() => {
  return Boolean(
    props.magicMoveSteps?.some((step) => step.title || step.speaker) ||
    displayTitle.value ||
    displaySpeaker.value,
  );
});

const narrativeViewportHeight = computed(() => {
  if (!hasNarrative.value) return 0;

  const maxLines = narrativeVariants.value.reduce((max, text) => {
    return Math.max(max, estimateWrappedLines(text));
  }, 1);

  const baseHeight = hasNarrativeMeta.value ? 56 : 34;

  return Math.min(220, Math.max(88, baseHeight + maxLines * 18));
});

const magicMoveOptions = {
  duration: 480,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  stagger: 0,
  delayMove: 0.18,
  delayEnter: 0.42,
  delayLeave: 0.06,
  animateContainer: false,
  containerStyle: false,
  splitTokens: true,
  enhanceMatching: true,
  lineNumbers: false,
} as const;
</script>

<template>
  <div
    class="fn-node rounded-lg border border-border bg-card overflow-hidden"
    :style="{ width: `${nodeWidth}px` }"
    :data-active="active"
    data-node-type="code"
  >
    <Handle type="target" :position="Position.Left" />

    <!-- Header -->
    <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50">
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{{ label }}</span>
      <NodeSourceAnchor
        v-if="displaySourceAnchor"
        :label="displaySourceAnchor.label"
        :href="displaySourceAnchor.href"
      />
    </div>

    <!-- Code -->
    <div
      class="fn-code-stage nowheel nopan px-3 py-2.5 overflow-y-auto transition-[height] duration-300 ease-out"
      :class="shouldWrapLongLines ? 'overflow-x-hidden' : 'overflow-x-auto'"
      :style="{ height: `${codeViewportHeight}px` }"
      :data-wrap="shouldWrapLongLines"
    >
      <div v-if="showTwoslashPane" class="fn-twoslash" v-html="resolvedTwoslashHtml" />
      <ShikiMagicMovePrecompiled
        v-else-if="!shouldWrapLongLines && precompiledSteps && precompiledSteps.length > 0"
        :steps="precompiledSteps"
        :step="precompiledStepIndex"
        :options="magicMoveOptions"
        @end="handleMagicMoveEnd"
      />
      <ShikiMagicMove
        v-else-if="highlighter"
        :highlighter="highlighter"
        :code="displayCode"
        :lang="renderLanguage"
        :theme="shikiTheme"
        :options="magicMoveOptions"
        class="!bg-transparent"
        @end="handleMagicMoveEnd"
      />
      <pre
        v-else
        class="fn-static-code text-xs text-muted-foreground font-mono"
        :class="shouldWrapLongLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'"
      ><code>{{ displayCode }}</code></pre>
    </div>

    <!-- Story -->
    <div
      v-if="hasNarrative"
      class="nowheel nopan px-3 py-2 border-t border-border/50 overflow-y-auto overflow-x-hidden transition-[height] duration-300 ease-out"
      :style="{ height: `${narrativeViewportHeight}px` }"
    >
      <div class="min-h-full">
        <div class="mb-1 flex items-center justify-between gap-2">
          <p v-if="displayTitle" class="text-[11px] font-medium text-foreground leading-snug">
            {{ displayTitle }}
          </p>
          <span
            v-if="displaySpeaker"
            class="text-[10px] uppercase tracking-wider text-muted-foreground border border-border/60 rounded-full px-2 py-0.5"
          >
            {{ displaySpeaker }}
          </span>
        </div>

        <p class="text-[11px] text-muted-foreground leading-relaxed">{{ displayNarrative }}</p>
      </div>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.fn-code-stage[data-wrap="false"] :deep(.shiki-magic-move-container),
.fn-code-stage[data-wrap="false"] :deep(.fn-static-code),
.fn-code-stage[data-wrap="false"] :deep(.fn-twoslash),
.fn-code-stage[data-wrap="false"] :deep(.fn-twoslash .twoslash),
.fn-code-stage[data-wrap="false"] :deep(.fn-twoslash pre.shiki) {
  display: inline-block;
  width: max-content;
  min-width: max-content;
}

.fn-code-stage[data-wrap="true"] :deep(.shiki-magic-move-container),
.fn-code-stage[data-wrap="true"] :deep(.fn-static-code),
.fn-code-stage[data-wrap="true"] :deep(.fn-static-code code),
.fn-code-stage[data-wrap="true"] :deep(.fn-twoslash),
.fn-code-stage[data-wrap="true"] :deep(.fn-twoslash .twoslash),
.fn-code-stage[data-wrap="true"] :deep(.fn-twoslash pre.shiki),
.fn-code-stage[data-wrap="true"] :deep(.fn-twoslash pre.shiki > code) {
  display: block;
  width: 100%;
  min-width: 0 !important;
  white-space: pre-wrap !important;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.fn-twoslash :deep(pre.shiki) {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

.fn-twoslash :deep(pre.shiki code) {
  font-size: 12px;
  line-height: 1.65;
}

.fn-twoslash :deep(.twoslash-popup-container) {
  max-width: min(520px, calc(100vw - 5rem));
}
</style>
