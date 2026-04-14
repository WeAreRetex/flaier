<script setup lang="ts">
import { watch } from "vue";
import { computed } from "vue";
import Flaier from "./Flaier.vue";
import { useFlaierFullscreen } from "../composables/useFlaierFullscreen";
import type { FlaierPanelProps } from "../types";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<FlaierPanelProps>(), {
  autoPlay: false,
  interval: 3000,
  height: "min(72vh, 760px)",
  minHeight: 420,
  zIndex: 1400,
  fullscreenEnabled: true,
});

const { fullscreen, closeFullscreen, toggleFullscreen } = useFlaierFullscreen();

const fullscreenActive = computed(() => props.fullscreenEnabled && fullscreen.value);

const containerStyle = computed<Record<string, string>>(() => {
  const minHeight = Number.isFinite(props.minHeight)
    ? Math.max(280, Math.floor(props.minHeight))
    : 420;

  return {
    "--fn-panel-height":
      typeof props.height === "number"
        ? `${Math.max(280, Math.floor(props.height))}px`
        : props.height,
    "--fn-panel-min-height": `${minHeight}px`,
    "--fn-panel-z-index": String(props.zIndex),
  };
});

watch(
  () => props.fullscreenEnabled,
  (enabled) => {
    if (!enabled && fullscreen.value) {
      closeFullscreen();
    }
  },
);
</script>

<template>
  <Teleport to="body" :disabled="!fullscreenActive">
    <div
      class="fn-panel"
      :class="{ 'fn-panel--fullscreen': fullscreenActive }"
      :style="containerStyle"
      v-bind="$attrs"
    >
      <button
        v-if="fullscreenActive"
        type="button"
        class="fn-panel__backdrop"
        aria-label="Exit fullscreen"
        @click="closeFullscreen"
      />

      <div class="fn-panel__surface">
        <Flaier class="fn-panel__viewer" :src="src" :auto-play="autoPlay" :interval="interval" />

        <button
          v-if="fullscreenEnabled"
          type="button"
          class="fn-panel__toggle"
          :aria-label="fullscreenActive ? 'Exit fullscreen' : 'Enter fullscreen'"
          :title="fullscreenActive ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="toggleFullscreen"
        >
          <svg
            v-if="!fullscreenActive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>

          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="14 10 21 3" />
            <polyline points="10 14 3 21" />
            <polyline points="3 9 3 3 9 3" />
            <polyline points="15 21 21 21 21 15" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.fn-panel {
  --fn-panel-height: min(72vh, 760px);
  --fn-panel-min-height: 420px;
  --fn-panel-z-index: 1400;
  position: relative;
  width: 100%;
}

.fn-panel__surface {
  position: relative;
  width: 100%;
  height: var(--fn-panel-height);
  min-height: var(--fn-panel-min-height);
  overflow: hidden;
  isolation: isolate;
}

.fn-panel__viewer {
  width: 100%;
  height: 100%;
}

.fn-panel__toggle {
  position: absolute;
  left: 0.95rem;
  bottom: 0.95rem;
  width: 2.3rem;
  height: 2.3rem;
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 0.65rem;
  background: rgba(15, 23, 42, 0.82);
  color: rgba(226, 232, 240, 0.95);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 40;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.24);
  transition:
    transform 0.18s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.fn-panel__toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 211, 252, 0.7);
  background: rgba(15, 23, 42, 0.96);
}

.fn-panel__toggle svg {
  width: 1rem;
  height: 1rem;
}

.fn-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--fn-panel-z-index);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.fn-panel__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(2, 6, 23, 0.72);
  cursor: default;
}

.fn-panel--fullscreen .fn-panel__surface {
  width: min(1480px, 100%);
  height: min(94vh, 1020px);
  max-height: 100%;
  z-index: 1;
}

@media (max-width: 900px) {
  .fn-panel--fullscreen {
    padding: 0.55rem;
  }

  .fn-panel--fullscreen .fn-panel__surface {
    width: 100%;
    height: 100%;
  }
}
</style>
