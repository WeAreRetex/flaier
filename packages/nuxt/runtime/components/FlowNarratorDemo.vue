<script setup lang="ts">
import { FlowNarratorPanel } from "flow-narrator";
import type { FlowNarratorSource } from "flow-narrator";
import { toRef } from "vue";
import { usePreparedFlowNarratorSource } from "../composables/usePreparedFlowNarratorSource";

const props = withDefaults(
  defineProps<{
    src: FlowNarratorSource;
    autoPlay?: boolean;
    interval?: number;
    height?: number | string;
  }>(),
  {
    autoPlay: false,
    interval: 3000,
    height: 480,
  },
);

const preparedSource = await usePreparedFlowNarratorSource(toRef(props, "src"));
</script>

<template>
  <ClientOnly>
    <FlowNarratorPanel
      class="fn-demo"
      :src="preparedSource"
      :auto-play="autoPlay"
      :interval="interval"
      :height="height"
      :fullscreen-enabled="true"
    />

    <template #fallback>
      <div class="fn-demo">
        <div class="fn-demo__loading">Loading diagram...</div>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.fn-demo:not(.fn-panel--fullscreen) {
  width: 100%;
  margin: 1.5rem 0;
  overflow: hidden;
  border-radius: 0.75rem;
}

:deep(.fn-demo .fn-panel__surface) {
  border-radius: 0.75rem;
  border: 1px solid rgba(209, 213, 219, 1);
  background: radial-gradient(circle at 18% 12%, rgba(30, 41, 59, 0.94), rgba(2, 6, 23, 0.98));
}

:global(.dark) :deep(.fn-demo .fn-panel__surface) {
  border-color: rgba(55, 65, 81, 1);
}

.fn-demo__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: rgb(156 163 175);
  border-radius: 0.75rem;
  border: 1px solid rgba(209, 213, 219, 1);
  background: radial-gradient(circle at 18% 12%, rgba(30, 41, 59, 0.94), rgba(2, 6, 23, 0.98));
}

:global(.dark) .fn-demo__loading {
  border-color: rgba(55, 65, 81, 1);
}
</style>
