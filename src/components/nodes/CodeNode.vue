<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { ShikiMagicMove } from 'shiki-magic-move/vue'
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
  magicMoveSteps?: MagicMoveStep[]
  active?: boolean
  stepIndex?: number
}>(), {
  language: 'typescript',
  stepIndex: 0,
})

const { highlighter } = useShiki()

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

const narrativeKey = computed(() => {
  return `${props.stepIndex}:${displayTitle.value ?? ''}:${displayNarrative.value ?? ''}:${displaySpeaker.value ?? ''}`
})
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
    <div class="px-3 py-2.5 overflow-auto max-h-[280px]">
      <ShikiMagicMove
        v-if="highlighter"
        :highlighter="highlighter"
        :code="displayCode"
        :lang="language"
        theme="github-dark"
        :options="{ duration: 750, stagger: 0.12, lineNumbers: false }"
        class="!bg-transparent"
      />
      <pre v-else class="text-xs text-muted-foreground font-mono whitespace-pre-wrap"><code>{{ displayCode }}</code></pre>
    </div>

    <!-- Story -->
    <Transition name="fn-story" mode="out-in">
      <div v-if="displayNarrative" :key="narrativeKey" class="px-3 py-2 border-t border-border/50">
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
    </Transition>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.fn-story-enter-active,
.fn-story-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.fn-story-enter-from,
.fn-story-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
