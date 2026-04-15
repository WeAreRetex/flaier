<script setup lang="ts">
import { FlaierPanel } from "@flaier/core";
import type { FlaierCustomNodeDefinitions, FlaierSource } from "@flaier/core";
import { toRef } from "vue";
import { useMergedFlaierNodes } from "../composables/useFlaierNodes";
import { usePreparedFlaierSource } from "../composables/usePreparedFlaierSource";

const props = withDefaults(
  defineProps<{
    src: FlaierSource;
    interval?: number;
    autoPlay?: boolean;
    height?: string | number;
    minHeight?: number;
    zIndex?: number;
    nodes?: FlaierCustomNodeDefinitions;
  }>(),
  {
    interval: 3200,
    autoPlay: false,
    height: "min(72vh, 760px)",
    minHeight: 420,
    zIndex: 1400,
  },
);

const preparedSource = await usePreparedFlaierSource(toRef(props, "src"));
const mergedNodes = useMergedFlaierNodes(toRef(props, "nodes"));
</script>

<template>
  <ClientOnly>
    <FlaierPanel
      class="fn-mdc"
      :src="preparedSource"
      :interval="interval"
      :auto-play="autoPlay"
      :height="height"
      :min-height="minHeight"
      :z-index="zIndex"
      :nodes="mergedNodes"
      theme-mode="document"
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

<style>
.fn-mdc {
  --fn-mdc-border: rgba(148, 163, 184, 0.28);
  --fn-mdc-surface-bg: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.96),
    rgba(241, 245, 249, 0.96)
  );
  --fn-mdc-loading-bg: radial-gradient(
    circle at 18% 12%,
    rgba(255, 255, 255, 0.98),
    rgba(241, 245, 249, 0.96)
  );
  --fn-mdc-loading-color: rgba(71, 85, 105, 0.9);
  --fn-mdc-shadow: 0 28px 80px rgba(15, 23, 42, 0.12);
}

html.dark .fn-mdc,
html[data-theme="dark"] .fn-mdc {
  --fn-mdc-border: rgba(148, 163, 184, 0.35);
  --fn-mdc-surface-bg: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.9));
  --fn-mdc-loading-bg: radial-gradient(
    circle at 18% 12%,
    rgba(30, 41, 59, 0.85),
    rgba(2, 6, 23, 0.95)
  );
  --fn-mdc-loading-color: rgba(148, 163, 184, 0.9);
  --fn-mdc-shadow: 0 28px 80px rgba(2, 6, 23, 0.24);
}

@media (prefers-color-scheme: dark) {
  html:not(.light):not(.dark):not([data-theme="light"]):not([data-theme="dark"]) .fn-mdc {
    --fn-mdc-border: rgba(148, 163, 184, 0.35);
    --fn-mdc-surface-bg: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.9));
    --fn-mdc-loading-bg: radial-gradient(
      circle at 18% 12%,
      rgba(30, 41, 59, 0.85),
      rgba(2, 6, 23, 0.95)
    );
    --fn-mdc-loading-color: rgba(148, 163, 184, 0.9);
    --fn-mdc-shadow: 0 28px 80px rgba(2, 6, 23, 0.24);
  }
}

.fn-mdc:not(.fn-panel--fullscreen) {
  width: 100%;
  margin: 1.4rem 0;
  overflow: hidden;
  border-radius: 1rem;
}

.fn-mdc .fn-panel__surface {
  border-radius: 1rem;
  border: 1px solid var(--fn-mdc-border);
  background: var(--fn-mdc-surface-bg);
  box-shadow: var(--fn-mdc-shadow);
}

.fn-mdc--fallback .fn-mdc__panel {
  height: min(72vh, 760px);
  min-height: 420px;
  border-radius: 1rem;
  border: 1px solid var(--fn-mdc-border);
  background: var(--fn-mdc-surface-bg);
  overflow: hidden;
  box-shadow: var(--fn-mdc-shadow);
}

.fn-mdc__loading {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 0.9rem;
  color: var(--fn-mdc-loading-color);
  background: var(--fn-mdc-loading-bg);
}

@media (max-width: 900px) {
  .fn-mdc {
    margin: 1rem 0;
  }
}
</style>
