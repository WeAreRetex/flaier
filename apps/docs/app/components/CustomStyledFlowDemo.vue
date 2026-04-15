<template>
  <div class="docs-styled-demo">
    <FlaierDemo src="/examples/custom-styling.flow.json" :auto-play="true" :interval="2800" :height="580" />
  </div>
</template>

<style scoped>
.docs-styled-demo {
  --docs-accent: oklch(0.76 0.15 18);
  --docs-accent-strong: oklch(0.7 0.19 340);
  --docs-surface: linear-gradient(180deg, rgba(16, 24, 39, 0.98), rgba(34, 14, 45, 0.98));
  margin: 1.5rem 0;
}

.docs-styled-demo :deep(.flaier) {
  --color-background: oklch(0.19 0.03 285);
  --color-card: oklch(0.27 0.04 300);
  --color-border: oklch(0.44 0.08 316);
  --color-foreground: oklch(0.95 0.02 17);
  --color-muted: oklch(0.32 0.03 295);
  --color-muted-foreground: oklch(0.81 0.03 330);
  --color-primary: var(--docs-accent);
  --color-primary-foreground: oklch(0.99 0.01 20);
  --fn-edge-active: var(--docs-accent-strong);
  --fn-panel-toggle-bg: rgba(34, 10, 48, 0.92);
  --fn-panel-toggle-border: rgba(244, 114, 182, 0.36);
  --fn-panel-toggle-hover-border: rgba(251, 113, 133, 0.75);
  --fn-panel-toggle-hover-bg: rgba(49, 12, 70, 0.98);
  --fn-panel-backdrop-bg: rgba(10, 4, 22, 0.76);
}

.docs-styled-demo :deep(.fn-demo .fn-panel__surface) {
  border: 1px solid rgba(244, 114, 182, 0.22);
  background: var(--docs-surface);
  box-shadow:
    inset 0 0 0 1px rgba(251, 113, 133, 0.08),
    0 24px 60px rgba(17, 24, 39, 0.34);
}

.docs-styled-demo :deep(.fn-node[data-node-type="trigger"]) {
  border-color: rgba(251, 113, 133, 0.4);
  background: linear-gradient(180deg, rgba(127, 29, 29, 0.28), rgba(76, 5, 25, 0.28));
}

.docs-styled-demo :deep(.fn-node[data-node-type="code"]) {
  border-color: rgba(244, 114, 182, 0.32);
  box-shadow: 0 18px 42px rgba(91, 33, 182, 0.18);
}

.docs-styled-demo :deep(.fn-node[data-node-type="payload"]) {
  border-color: rgba(251, 146, 60, 0.32);
  background: linear-gradient(180deg, rgba(67, 20, 7, 0.24), rgba(29, 9, 26, 0.18));
}

.docs-styled-demo :deep(.fn-node[data-node-type="callout"]) {
  transform: rotate(-0.45deg);
}

.docs-styled-demo :deep(.fn-node[data-node-type="callout"][data-callout-tone="tip"]) {
  --fn-callout-accent: oklch(0.79 0.16 164);
}

.docs-styled-demo :deep(.fn-node[data-node-type="callout"][data-callout-tone="warning"]) {
  --fn-callout-accent: oklch(0.78 0.14 58);
}

.docs-styled-demo :deep(.vue-flow__edge-path) {
  stroke-width: 2.25;
}

.docs-styled-demo :deep(.vue-flow__edge.edge-kind-async .vue-flow__edge-path) {
  stroke-dasharray: 8 6;
}
</style>
