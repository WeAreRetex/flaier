<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";

defineProps<{
  label: string;
  condition?: string;
  description?: string;
  sourceAnchor?: {
    label: string;
    href?: string;
  };
  active?: boolean;
}>();
</script>

<template>
  <div
    class="fn-node w-[250px] rounded-lg border border-primary/35 bg-card px-4 py-3"
    :data-active="active"
    data-node-type="decision"
  >
    <Handle type="target" :position="Position.Left" />
    <div class="mb-1.5 flex items-center gap-2">
      <span
        class="inline-flex h-5 items-center rounded-full border border-primary/35 bg-primary/10 px-2 text-[10px] font-medium uppercase tracking-wider text-primary"
      >
        Decision
      </span>
    </div>
    <p class="text-sm font-medium text-foreground leading-snug">{{ label }}</p>
    <p
      v-if="condition"
      class="mt-1 text-[11px] text-foreground/85 font-mono leading-relaxed break-words"
    >
      {{ condition }}
    </p>
    <p v-if="description" class="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
      {{ description }}
    </p>
    <div v-if="sourceAnchor?.label" class="mt-1.5 max-w-full">
      <NodeSourceAnchor :label="sourceAnchor.label" :href="sourceAnchor.href" />
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>
