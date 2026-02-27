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
  magicMoveSteps?: MagicMoveStep[]
  active?: boolean
  stepIndex?: number
}>(), {
  language: 'typescript',
  stepIndex: 0,
})

const { highlighter } = useShiki()

const displayCode = computed(() => {
  if (!props.magicMoveSteps?.length) return props.code
  const idx = Math.min(props.stepIndex, props.magicMoveSteps.length - 1)
  return props.magicMoveSteps[idx]?.code ?? props.code
})

const displayComment = computed(() => {
  if (!props.magicMoveSteps?.length) return props.comment
  const idx = Math.min(props.stepIndex, props.magicMoveSteps.length - 1)
  return props.magicMoveSteps[idx]?.comment ?? props.comment
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
    <div class="px-3 py-2.5 overflow-auto max-h-[200px]">
      <ShikiMagicMove
        v-if="highlighter"
        :highlighter="highlighter"
        :code="displayCode"
        :lang="language"
        theme="github-dark"
        :options="{ duration: 500, stagger: 0, lineNumbers: false }"
        class="!bg-transparent"
      />
      <pre v-else class="text-xs text-muted-foreground font-mono whitespace-pre-wrap"><code>{{ displayCode }}</code></pre>
    </div>

    <!-- Comment -->
    <div v-if="displayComment" class="px-3 py-2 border-t border-border/50">
      <p class="text-[11px] text-muted-foreground leading-relaxed">{{ displayComment }}</p>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>
