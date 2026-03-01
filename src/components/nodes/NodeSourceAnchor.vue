<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  href?: string
}>()

const opensNewTab = computed(() => {
  return typeof props.href === 'string' && /^https?:\/\//i.test(props.href)
})
</script>

<template>
  <a
    v-if="href"
    :href="href"
    :target="opensNewTab ? '_blank' : undefined"
    :rel="opensNewTab ? 'noopener noreferrer' : undefined"
    class="nowheel nopan nodrag inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    :draggable="false"
    @click.stop
    @pointerdown.stop
    @mousedown.stop
    @touchstart.stop
  >
    <svg
      class="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v7h-7" />
      <path d="M3 10v11h11" />
    </svg>
    <span class="truncate" :title="label">{{ label }}</span>
  </a>

  <span
    v-else
    class="nowheel nopan nodrag inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border/65 bg-muted/25 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
    :title="label"
    @click.stop
    @pointerdown.stop
    @mousedown.stop
    @touchstart.stop
  >
    <svg
      class="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10v11h11" />
      <path d="M10 14 21 3" />
      <path d="M14 3h7v7" />
    </svg>
    <span class="truncate">{{ label }}</span>
  </span>
</template>
