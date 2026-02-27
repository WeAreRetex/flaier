<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentStep: number
  totalSteps: number
  playing: boolean
  label?: string
  description?: string
}>()

const emit = defineEmits<{
  next: []
  prev: []
  togglePlay: []
  goTo: [step: number]
}>()

const MAX_VISIBLE_DOTS = 11

const dotWindow = computed(() => {
  if (props.totalSteps <= MAX_VISIBLE_DOTS) {
    return { start: 0, end: Math.max(0, props.totalSteps - 1) }
  }

  const halfWindow = Math.floor(MAX_VISIBLE_DOTS / 2)
  let start = Math.max(0, props.currentStep - halfWindow)
  let end = Math.min(props.totalSteps - 1, start + MAX_VISIBLE_DOTS - 1)

  if (end - start + 1 < MAX_VISIBLE_DOTS) {
    start = Math.max(0, end - MAX_VISIBLE_DOTS + 1)
  }

  return { start, end }
})

const visibleStepIndexes = computed(() => {
  const indexes: number[] = []
  for (let i = dotWindow.value.start; i <= dotWindow.value.end; i += 1) {
    indexes.push(i)
  }
  return indexes
})

const hasLeadingSteps = computed(() => dotWindow.value.start > 0)
const hasTrailingSteps = computed(() => dotWindow.value.end < props.totalSteps - 1)
</script>

<template>
  <div class="w-full rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-2xl px-2.5 py-2">
    <div class="flex items-center gap-2">
      <button
        class="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 disabled:pointer-events-none transition-colors"
        :disabled="props.currentStep <= 0"
        @click="emit('prev')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <button
        class="w-8 h-8 rounded-xl flex items-center justify-center bg-foreground text-background hover:bg-foreground/85 transition-colors"
        @click="emit('togglePlay')"
      >
        <svg v-if="!props.playing" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
      </button>

      <button
        class="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 disabled:pointer-events-none transition-colors"
        :disabled="props.currentStep >= props.totalSteps - 1"
        @click="emit('next')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      <div class="w-px h-5 bg-border/60" />

      <div class="flex min-w-0 flex-1 items-center gap-2.5 px-1.5">
        <div class="h-1 flex-1 overflow-hidden rounded-full bg-muted/70">
          <div
            class="h-full bg-foreground transition-[width] duration-500 ease-out"
            :style="{
              width: `${props.totalSteps > 1 ? (props.currentStep / (props.totalSteps - 1)) * 100 : 100}%`,
            }"
          />
        </div>

        <div class="flex items-center gap-1">
          <span v-if="hasLeadingSteps" class="text-[10px] text-muted-foreground/60">...</span>

          <button
            v-for="step in visibleStepIndexes"
            :key="step"
            class="h-1.5 rounded-full transition-all duration-300"
            :class="step === props.currentStep
              ? 'bg-foreground w-4'
              : step < props.currentStep
                ? 'bg-muted-foreground/50 w-1.5'
                : 'bg-muted-foreground/20 w-1.5'"
            @click="emit('goTo', step)"
          />

          <span v-if="hasTrailingSteps" class="text-[10px] text-muted-foreground/60">...</span>
        </div>

        <span class="shrink-0 text-[11px] text-muted-foreground font-mono tabular-nums">
          {{ props.currentStep + 1 }}<span class="text-muted-foreground/40">/</span>{{ props.totalSteps }}
        </span>
      </div>
    </div>

    <div v-if="props.label || props.description" class="mt-2 border-t border-border/60 pt-2 px-1.5">
      <p v-if="props.label" class="text-[11px] font-medium text-foreground leading-snug break-words">
        {{ props.label }}
      </p>

      <p
        v-if="props.description"
        class="mt-1 max-h-[120px] overflow-auto pr-1 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words"
      >
        {{ props.description }}
      </p>
    </div>
  </div>
</template>
