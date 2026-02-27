<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  label: string
  body: string
  active?: boolean
}>()
</script>

<template>
  <div
    class="fn-node w-[240px] rounded-lg border border-border bg-card px-4 py-3"
    :data-active="active"
  >
    <Handle type="target" :position="Position.Left" />
    <p class="text-sm font-medium text-foreground leading-snug mb-1">{{ label }}</p>
    <p class="text-[11px] text-muted-foreground leading-relaxed">{{ body }}</p>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>
