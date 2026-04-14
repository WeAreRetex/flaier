<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";

const props = withDefaults(
  defineProps<{
    label: string;
    description?: string;
    color?: string;
    sourceAnchor?: {
      label: string;
      href?: string;
    };
    active?: boolean;
  }>(),
  {
    color: "#22c55e",
  },
);
</script>

<template>
  <div
    class="fn-node w-[220px] rounded-lg border border-border bg-card px-4 py-3"
    :data-active="active"
  >
    <div class="flex items-center gap-2 mb-1.5">
      <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: color }" />
      <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        >Trigger</span
      >
    </div>
    <p class="text-sm font-medium text-foreground leading-snug">{{ label }}</p>
    <div v-if="sourceAnchor?.label" class="mt-1.5 max-w-full">
      <NodeSourceAnchor :label="sourceAnchor.label" :href="sourceAnchor.href" />
    </div>
    <p v-if="description" class="text-[11px] text-muted-foreground mt-1 leading-relaxed">
      {{ description }}
    </p>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>
