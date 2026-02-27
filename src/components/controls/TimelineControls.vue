<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <div class="flex items-center gap-2 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-2xl px-2 py-1.5">
    <!-- Nav buttons -->
    <button
      class="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 disabled:pointer-events-none transition-colors"
      :disabled="currentStep <= 0"
      @click="emit('prev')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>

    <button
      class="w-8 h-8 rounded-xl flex items-center justify-center bg-foreground text-background hover:bg-foreground/85 transition-colors"
      @click="emit('togglePlay')"
    >
      <svg v-if="!playing" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
      <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
    </button>

    <button
      class="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 disabled:pointer-events-none transition-colors"
      :disabled="currentStep >= totalSteps - 1"
      @click="emit('next')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>

    <!-- Separator -->
    <div class="w-px h-5 bg-border/60" />

    <!-- Step info -->
    <div class="flex items-center gap-2.5 px-1.5">
      <div class="h-1 w-16 overflow-hidden rounded-full bg-muted/70">
        <div
          class="h-full bg-foreground transition-[width] duration-500 ease-out"
          :style="{
            width: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100}%`,
          }"
        />
      </div>

      <!-- Progress dots -->
      <div class="flex items-center gap-1">
        <button
          v-for="i in totalSteps"
          :key="i"
          class="w-1.5 h-1.5 rounded-full transition-all duration-300"
          :class="(i - 1) === currentStep
            ? 'bg-foreground w-4'
            : (i - 1) < currentStep
              ? 'bg-muted-foreground/50'
              : 'bg-muted-foreground/20'"
          @click="emit('goTo', i - 1)"
        />
      </div>

      <span class="text-[11px] text-muted-foreground font-mono tabular-nums">
        {{ currentStep + 1 }}<span class="text-muted-foreground/40">/</span>{{ totalSteps }}
      </span>
    </div>

    <!-- Label (if provided) -->
    <template v-if="label">
      <div class="w-px h-5 bg-border/60" />
      <div class="max-w-[280px] px-1.5">
        <p class="text-[11px] font-medium text-foreground truncate leading-tight">{{ label }}</p>
        <p v-if="description" class="text-[10px] text-muted-foreground truncate leading-tight">{{ description }}</p>
      </div>
    </template>
  </div>
</template>
