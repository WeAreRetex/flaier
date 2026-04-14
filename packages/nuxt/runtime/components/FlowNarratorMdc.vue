<script setup lang="ts">
import { FlowNarratorPanel } from "flow-narrator";
import type { FlowNarratorSource } from "flow-narrator";
import { toRef } from "vue";
import { usePreparedFlowNarratorSource } from "../composables/usePreparedFlowNarratorSource";

const props = withDefaults(
  defineProps<{
    src: FlowNarratorSource;
    interval?: number;
    autoPlay?: boolean;
    height?: string | number;
    minHeight?: number;
    zIndex?: number;
  }>(),
  {
    interval: 3200,
    autoPlay: false,
    height: "min(72vh, 760px)",
    minHeight: 420,
    zIndex: 1400,
  },
);

const preparedSource = await usePreparedFlowNarratorSource(toRef(props, "src"));
</script>

<template>
  <ClientOnly>
    <FlowNarratorPanel
      class="fn-mdc"
      :src="preparedSource"
      :interval="interval"
      :auto-play="autoPlay"
      :height="height"
      :min-height="minHeight"
      :z-index="zIndex"
      :fullscreen-enabled="true"
    />

    <template #fallback>
      <div class="fn-mdc fn-mdc--fallback">
        <div class="fn-mdc__panel">
          <div class="fn-mdc__loading">Loading flow visualizer...</div>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.fn-mdc:not(.fn-panel--fullscreen) {
  width: 100%;
  margin: 1.4rem 0;
  overflow: hidden;
  border-radius: 1rem;
}

:deep(.fn-mdc .fn-panel__surface) {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.9));
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.24);
}

.fn-mdc--fallback .fn-mdc__panel {
  height: min(72vh, 760px);
  min-height: 420px;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.9));
  overflow: hidden;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.24);
}

.fn-mdc__loading {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
  background: radial-gradient(circle at 18% 12%, rgba(30, 41, 59, 0.85), rgba(2, 6, 23, 0.95));
}

@media (max-width: 900px) {
  .fn-mdc {
    margin: 1rem 0;
  }
}
</style>
