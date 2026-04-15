<script setup lang="ts">
import { FlaierPanel } from "@flaier/core";
import type { FlaierCustomNodeDefinitions, FlaierSource } from "@flaier/core";
import { toRef } from "vue";
import { useMergedFlaierNodes } from "../composables/useFlaierNodes";
import { usePreparedFlaierSource } from "../composables/usePreparedFlaierSource";

const props = withDefaults(
  defineProps<{
    src: FlaierSource;
    autoPlay?: boolean;
    interval?: number;
    height?: number | string;
    nodes?: FlaierCustomNodeDefinitions;
  }>(),
  {
    autoPlay: false,
    interval: 3000,
    height: 480,
  },
);

const preparedSource = await usePreparedFlaierSource(toRef(props, "src"));
const mergedNodes = useMergedFlaierNodes(toRef(props, "nodes"));
</script>

<template>
  <ClientOnly>
    <FlaierPanel
      class="fn-demo"
      :src="preparedSource"
      :auto-play="autoPlay"
      :interval="interval"
      :height="height"
      :nodes="mergedNodes"
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
  --fn-demo-surface-border: rgba(209, 213, 219, 1);
  --fn-demo-surface-bg: radial-gradient(
    circle at 18% 12%,
    rgba(30, 41, 59, 0.94),
    rgba(2, 6, 23, 0.98)
  );
  width: 100%;
  margin: 1.5rem 0;
  overflow: hidden;
  border-radius: 0.75rem;
}

:deep(.fn-demo .fn-panel__surface) {
  border-radius: 0.75rem;
  border: 1px solid var(--fn-demo-surface-border);
  background: var(--fn-demo-surface-bg);
}

:global(.dark) :deep(.fn-demo .fn-panel__surface) {
  --fn-demo-surface-border: rgba(55, 65, 81, 1);
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
  border: 1px solid var(--fn-demo-surface-border);
  background: var(--fn-demo-surface-bg);
}

:global(.dark) .fn-demo__loading {
  --fn-demo-surface-border: rgba(55, 65, 81, 1);
}
</style>
