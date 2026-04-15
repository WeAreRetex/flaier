<script setup lang="ts">
import { FlaierPanel } from "@flaier/core";
import architectureSpec from "../flow-specs/story-architecture.flow.json";
</script>

<template>
  <div class="architecture-flow">
    <div class="architecture-flow__header">
      <h3 class="architecture-flow__title">Incident-to-architecture map</h3>
    </div>

    <div class="architecture-flow__canvas">
      <FlaierPanel
        class="architecture-flow__viewer"
        :src="architectureSpec"
        height="100%"
        :min-height="0"
        :fullscreen-enabled="true"
      />
    </div>
  </div>
</template>

<style scoped>
.architecture-flow {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
}

.architecture-flow__canvas {
  display: flex;
  flex: 1;
  min-height: 0;
  padding-bottom: 0.7rem;
  box-sizing: border-box;
}

.architecture-flow__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.architecture-flow__title {
  margin: 0;
  color: var(--docs-text, #0f172a);
  font-size: 0.94rem;
  font-weight: 700;
  line-height: 1.25;
}

.architecture-flow__viewer:not(.fn-panel--fullscreen) {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}

.architecture-flow__viewer :deep(.flaier) {
  line-height: 1.4;
}

.architecture-flow__viewer:not(.fn-panel--fullscreen) :deep(.fn-panel__surface) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--docs-border, rgba(148, 163, 184, 0.25));
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.65);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.architecture-flow__viewer :deep(.fn-panel__toggle) {
  left: 0.8rem;
  bottom: 0.8rem;
}

.architecture-flow__viewer :deep(.fn-architecture-controls) {
  top: 0.75rem;
  right: 0.75rem;
}

.architecture-flow__viewer :deep(.fn-theme-toggle) {
  width: 2rem;
  height: 2rem;
}

.architecture-flow__viewer :deep(.fn-theme-toggle svg) {
  width: 0.9rem;
  height: 0.9rem;
}

.architecture-flow__viewer :deep(.fn-architecture-inspector) {
  top: 0.75rem;
  bottom: 0.75rem;
  width: min(31vw, 290px);
}

.architecture-flow__viewer :deep(.fn-architecture-inspector__toggle) {
  width: 1.15rem;
  height: 2.25rem;
  gap: 0;
  padding: 0.15rem 0.08rem;
  overflow: hidden;
  font-size: 0;
  letter-spacing: 0;
}

.architecture-flow__viewer :deep(.fn-architecture-inspector__toggle svg) {
  width: 0.62rem;
  height: 0.62rem;
}

.architecture-flow__viewer :deep(.fn-architecture-inspector__toggle span) {
  display: none;
}

.architecture-flow__viewer :deep(.fn-architecture-inspector__panel) {
  border-radius: 1rem;
}

html.dark .architecture-flow__title {
  color: var(--docs-text, #e2e8f0);
}

html.dark .architecture-flow__viewer:not(.fn-panel--fullscreen) :deep(.fn-panel__surface) {
  background: rgba(15, 23, 42, 0.66);
}
</style>
