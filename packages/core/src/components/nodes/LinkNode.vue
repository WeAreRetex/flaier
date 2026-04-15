<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";

defineProps<{
  label: string;
  href: string;
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
    class="fn-node w-[220px] rounded-lg border border-border bg-card px-4 py-3"
    :data-active="active"
    data-node-type="link"
  >
    <Handle type="target" :position="Position.Left" />
    <a :href="href" target="_blank" rel="noopener noreferrer" class="block group">
      <p
        class="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug"
      >
        {{ label }}
      </p>
      <p v-if="description" class="text-[11px] text-muted-foreground mt-1 leading-relaxed">
        {{ description }}
      </p>
    </a>
    <div v-if="sourceAnchor?.label" class="mt-1.5 max-w-full">
      <NodeSourceAnchor :label="sourceAnchor.label" :href="sourceAnchor.href" />
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>
