<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";

defineProps<{
  label: string;
  message: string;
  code?: string;
  cause?: string;
  mitigation?: string;
  sourceAnchor?: {
    label: string;
    href?: string;
  };
  active?: boolean;
}>();
</script>

<template>
  <div
    class="fn-node w-[280px] rounded-lg border border-red-400/45 bg-card overflow-hidden"
    :data-active="active"
  >
    <Handle type="target" :position="Position.Left" />

    <div
      class="flex items-center justify-between gap-2 border-b border-red-400/35 bg-red-400/10 px-3 py-2"
    >
      <span class="text-sm font-medium text-foreground">{{ label }}</span>
      <span
        class="rounded-full border border-red-400/45 bg-red-400/18 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-200"
      >
        Error
      </span>
    </div>

    <div class="space-y-2 px-3 py-2.5">
      <p class="text-[11px] leading-relaxed text-foreground">{{ message }}</p>

      <div
        v-if="code"
        class="inline-flex items-center rounded-md border border-red-400/35 bg-red-400/12 px-2 py-0.5 text-[10px] font-mono text-red-100"
      >
        {{ code }}
      </div>

      <p v-if="cause" class="text-[11px] leading-relaxed text-muted-foreground">
        <span class="font-medium text-foreground/90">Cause:</span> {{ cause }}
      </p>

      <p v-if="mitigation" class="text-[11px] leading-relaxed text-muted-foreground">
        <span class="font-medium text-foreground/90">Mitigation:</span> {{ mitigation }}
      </p>

      <div v-if="sourceAnchor?.label" class="max-w-full pt-1">
        <NodeSourceAnchor :label="sourceAnchor.label" :href="sourceAnchor.href" />
      </div>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>
