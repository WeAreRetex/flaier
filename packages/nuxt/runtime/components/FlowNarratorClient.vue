<script setup lang="ts">
import { FlowNarrator } from "flow-narrator";
import type { FlowNarratorSource } from "flow-narrator";
import { toRef } from "vue";
import { usePreparedFlowNarratorSource } from "../composables/usePreparedFlowNarratorSource";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    src: FlowNarratorSource;
    autoPlay?: boolean;
    interval?: number;
    fallbackText?: string;
  }>(),
  {
    autoPlay: false,
    interval: 3000,
    fallbackText: "Loading flow visualizer...",
  },
);

const preparedSource = await usePreparedFlowNarratorSource(toRef(props, "src"));
</script>

<template>
  <ClientOnly>
    <FlowNarrator
      v-bind="$attrs"
      :src="preparedSource"
      :auto-play="autoPlay"
      :interval="interval"
    />

    <template #fallback>
      <slot name="fallback">
        <div class="fn-client__fallback">
          {{ fallbackText }}
        </div>
      </slot>
    </template>
  </ClientOnly>
</template>

<style scoped>
.fn-client__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
}
</style>
