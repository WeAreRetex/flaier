<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { FlowNarrator } from 'flow-narrator'
import type { FlowNarratorSource } from 'flow-narrator'

const props = withDefaults(defineProps<{
  src: FlowNarratorSource
  interval?: number
  autoPlay?: boolean
  height?: string
  minHeight?: number
  zIndex?: number
}>(), {
  interval: 3200,
  autoPlay: false,
  height: 'min(72vh, 760px)',
  minHeight: 420,
  zIndex: 1400,
})

const fullscreen = ref(false)
let previousBodyOverflow = ''

const containerStyle = computed<Record<string, string>>(() => {
  const minHeight = Number.isFinite(props.minHeight)
    ? Math.max(280, Math.floor(props.minHeight))
    : 420

  return {
    '--fn-mdc-height': props.height,
    '--fn-mdc-min-height': `${minHeight}px`,
    '--fn-mdc-z-index': String(props.zIndex),
  }
})

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

function closeFullscreen() {
  fullscreen.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closeFullscreen()
}

watch(fullscreen, (active) => {
  if (typeof document === 'undefined') return

  if (active) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
    return
  }

  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return

  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Teleport to="body" :disabled="!fullscreen">
    <div
      class="fn-mdc"
      :class="{ 'fn-mdc--fullscreen': fullscreen }"
      :style="containerStyle"
    >
      <button
        v-if="fullscreen"
        type="button"
        class="fn-mdc__backdrop"
        aria-label="Exit fullscreen"
        @click="closeFullscreen"
      />

      <div class="fn-mdc__panel">
        <ClientOnly>
          <FlowNarrator
            class="fn-mdc__viewer"
            :src="src"
            :interval="interval"
            :auto-play="autoPlay"
          />

          <template #fallback>
            <div class="fn-mdc__loading">
              Loading flow visualizer...
            </div>
          </template>
        </ClientOnly>

        <button
          type="button"
          class="fn-mdc__toggle"
          :aria-label="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          :title="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="toggleFullscreen"
        >
          <svg
            v-if="!fullscreen"
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
.fn-mdc {
  --fn-mdc-height: min(72vh, 760px);
  --fn-mdc-min-height: 420px;
  --fn-mdc-z-index: 1400;
  position: relative;
  width: 100%;
  margin: 1.4rem 0;
}

.fn-mdc__panel {
  position: relative;
  width: 100%;
  height: var(--fn-mdc-height);
  min-height: var(--fn-mdc-min-height);
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.9));
  overflow: hidden;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.24);
}

.fn-mdc__viewer {
  width: 100%;
  height: 100%;
}

.fn-mdc__loading {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
  background: radial-gradient(circle at 18% 12%, rgba(30, 41, 59, 0.85), rgba(2, 6, 23, 0.95));
}

.fn-mdc__toggle {
  position: absolute;
  right: 0.95rem;
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
  z-index: 6;
  transition: transform 0.18s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.fn-mdc__toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 211, 252, 0.7);
  background: rgba(15, 23, 42, 0.96);
}

.fn-mdc__toggle svg {
  width: 1rem;
  height: 1rem;
}

.fn-mdc--fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--fn-mdc-z-index);
  margin: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.fn-mdc__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(2, 6, 23, 0.72);
  cursor: default;
}

.fn-mdc--fullscreen .fn-mdc__panel {
  width: min(1480px, 100%);
  height: min(94vh, 1020px);
  max-height: 100%;
  border-radius: 1.1rem;
  border-color: rgba(148, 163, 184, 0.42);
  box-shadow: 0 36px 120px rgba(2, 6, 23, 0.56);
  z-index: 1;
}

@media (max-width: 900px) {
  .fn-mdc {
    margin: 1rem 0;
  }

  .fn-mdc__panel {
    height: max(58vh, var(--fn-mdc-min-height));
    border-radius: 0.9rem;
  }

  .fn-mdc--fullscreen {
    padding: 0.55rem;
  }

  .fn-mdc--fullscreen .fn-mdc__panel {
    width: 100%;
    height: 100%;
    border-radius: 0.75rem;
  }
}
</style>
