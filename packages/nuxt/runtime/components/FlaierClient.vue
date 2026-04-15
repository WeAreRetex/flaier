<script setup lang="ts">
import { Flaier } from "@flaier/core";
import type { FlaierCustomNodeDefinitions, FlaierSource } from "@flaier/core";
import { toRef } from "vue";
import { useMergedFlaierNodes } from "../composables/useFlaierNodes";
import { usePreparedFlaierSource } from "../composables/usePreparedFlaierSource";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    src: FlaierSource;
    autoPlay?: boolean;
    interval?: number;
    fallbackText?: string;
    nodes?: FlaierCustomNodeDefinitions;
  }>(),
  {
    autoPlay: false,
    interval: 3000,
    fallbackText: "Loading flow visualizer...",
  },
);

const preparedSource = await usePreparedFlaierSource(toRef(props, "src"));
const mergedNodes = useMergedFlaierNodes(toRef(props, "nodes"));
</script>

<template>
  <ClientOnly>
    <Flaier
      v-bind="$attrs"
      :src="preparedSource"
      :auto-play="autoPlay"
      :interval="interval"
      :nodes="mergedNodes"
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
