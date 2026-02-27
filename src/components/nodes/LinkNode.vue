<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  label: string
  href: string
  description?: string
  active?: boolean
}>()
</script>

<template>
  <div
    class="fn-node w-[220px] rounded-lg border border-border bg-card px-4 py-3"
    :data-active="active"
  >
    <Handle type="target" :position="Position.Left" />
    <a :href="href" target="_blank" rel="noopener noreferrer" class="block group">
      <p class="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{{ label }}</p>
      <p v-if="description" class="text-[11px] text-muted-foreground mt-1 leading-relaxed">{{ description }}</p>
    </a>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>
