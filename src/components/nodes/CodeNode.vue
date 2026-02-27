<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { ShikiMagicMove, ShikiMagicMovePrecompiled } from 'shiki-magic-move/vue'
import { codeToKeyedTokens, type KeyedTokensInfo } from 'shiki-magic-move/core'
import 'shiki-magic-move/dist/style.css'
import { useShiki } from '../../composables/useShiki'
import type { MagicMoveStep } from '../../types'

const props = withDefaults(defineProps<{
  label: string
  file?: string
  language?: string
  code: string
  comment?: string
  story?: string
  wrapLongLines?: boolean
  magicMoveSteps?: MagicMoveStep[]
  active?: boolean
  stepIndex?: number
}>(), {
  language: 'typescript',
  wrapLongLines: false,
  stepIndex: 0,
})

const { highlighter } = useShiki()
const AUTO_WRAP_LINE_LENGTH = 58

const activeStep = computed(() => {
  if (!props.magicMoveSteps?.length) return undefined
  const idx = Math.min(props.stepIndex, props.magicMoveSteps.length - 1)
  return props.magicMoveSteps[idx]
})

const displayCode = computed(() => {
  return activeStep.value?.code ?? props.code
})

const displayTitle = computed(() => activeStep.value?.title)

const displaySpeaker = computed(() => activeStep.value?.speaker)

const displayNarrative = computed(() => {
  return activeStep.value?.story
    ?? activeStep.value?.comment
    ?? props.story
    ?? props.comment
})

const codeSequence = computed(() => {
  if (props.magicMoveSteps?.length) {
    return props.magicMoveSteps.map((step) => step.code)
  }

  return [props.code]
})

const codeVariants = computed(() => {
  const variants = [props.code, ...codeSequence.value]
  return variants.filter((value): value is string => typeof value === 'string' && value.length > 0)
})

function getMaxLineLength(code: string) {
  return code
    .split('\n')
    .reduce((max, line) => Math.max(max, line.length), 0)
}

const maxLineLength = computed(() => {
  return codeVariants.value.reduce((max, code) => {
    return Math.max(max, getMaxLineLength(code))
  }, 0)
})

const shouldWrapLongLines = computed(() => {
  return props.wrapLongLines || maxLineLength.value > AUTO_WRAP_LINE_LENGTH
})

const precompiledSteps = computed<KeyedTokensInfo[] | null>(() => {
  const hl = highlighter.value
  if (!hl) return null

  const requestedLang = props.language ?? 'typescript'

  try {
    return codeSequence.value.map((code) => codeToKeyedTokens(
      hl as never,
      code,
      {
        lang: requestedLang,
        theme: 'github-dark',
      } as never,
      false,
    ))
  } catch {
    return null
  }
})

const precompiledStepIndex = computed(() => {
  const steps = precompiledSteps.value
  if (!steps?.length) return 0
  return Math.max(0, Math.min(props.stepIndex, steps.length - 1))
})

function estimateWrappedLines(text: string, charsPerLine = 44) {
  return text
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
}

const codeViewportHeight = computed(() => {
  const maxLines = codeVariants.value.reduce((max, code) => {
    const lines = shouldWrapLongLines.value
      ? estimateWrappedLines(code)
      : code.split('\n').length

    return Math.max(max, lines)
  }, 1)

  if (shouldWrapLongLines.value) {
    return Math.min(400, Math.max(190, 72 + maxLines * 16))
  }

  return Math.min(340, Math.max(160, 84 + maxLines * 17))
})

const narrativeVariants = computed(() => {
  const variants = [
    props.story,
    props.comment,
    ...(props.magicMoveSteps?.flatMap((step) => [step.story, step.comment]) ?? []),
  ]

  return variants.filter((value): value is string => typeof value === 'string' && value.length > 0)
})

const hasNarrative = computed(() => narrativeVariants.value.length > 0)

const hasNarrativeMeta = computed(() => {
  return Boolean(
    props.magicMoveSteps?.some((step) => step.title || step.speaker)
      || displayTitle.value
      || displaySpeaker.value,
  )
})

const narrativeViewportHeight = computed(() => {
  if (!hasNarrative.value) return 0

  const maxLines = narrativeVariants.value.reduce((max, text) => {
    return Math.max(max, estimateWrappedLines(text))
  }, 1)

  const baseHeight = hasNarrativeMeta.value ? 56 : 34

  return Math.min(220, Math.max(88, baseHeight + maxLines * 18))
})

const magicMoveOptions = {
  duration: 480,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  stagger: 0,
  delayMove: 0.18,
  delayEnter: 0.42,
  delayLeave: 0.06,
  animateContainer: false,
  containerStyle: false,
  splitTokens: true,
  enhanceMatching: true,
  lineNumbers: false,
} as const
</script>

<template>
  <div
    class="fn-node w-[340px] rounded-lg border border-border bg-card overflow-hidden"
    :data-active="active"
  >
    <Handle type="target" :position="Position.Left" />

    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border/50">
      <span class="text-sm font-medium text-foreground">{{ label }}</span>
      <span v-if="file" class="text-[10px] text-muted-foreground font-mono">{{ file }}</span>
    </div>

    <!-- Code -->
    <div
      class="fn-code-stage px-3 py-2.5 overflow-y-auto transition-[height] duration-300 ease-out"
      :class="shouldWrapLongLines ? 'overflow-x-hidden' : 'overflow-x-auto'"
      :style="{ height: `${codeViewportHeight}px` }"
      :data-wrap="shouldWrapLongLines"
    >
      <ShikiMagicMovePrecompiled
        v-if="!shouldWrapLongLines && precompiledSteps && precompiledSteps.length > 0"
        :steps="precompiledSteps"
        :step="precompiledStepIndex"
        :options="magicMoveOptions"
      />
      <ShikiMagicMove
        v-else-if="highlighter"
        :highlighter="highlighter"
        :code="displayCode"
        :lang="language"
        theme="github-dark"
        :options="magicMoveOptions"
        class="!bg-transparent"
      />
      <pre
        v-else
        class="text-xs text-muted-foreground font-mono"
        :class="shouldWrapLongLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'"
      ><code>{{ displayCode }}</code></pre>
    </div>

    <!-- Story -->
    <div
      v-if="hasNarrative"
      class="px-3 py-2 border-t border-border/50 overflow-y-auto overflow-x-hidden transition-[height] duration-300 ease-out"
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
.fn-code-stage[data-wrap="false"] :deep(pre) {
  display: inline-block;
  width: max-content;
  min-width: max-content;
}

.fn-code-stage[data-wrap="true"] :deep(.shiki-magic-move-container),
.fn-code-stage[data-wrap="true"] :deep(pre),
.fn-code-stage[data-wrap="true"] :deep(pre code) {
  display: block;
  width: 100%;
  min-width: 0 !important;
  white-space: pre-wrap !important;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
