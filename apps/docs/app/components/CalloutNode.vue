<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";

const props = withDefaults(
  defineProps<{
    label: string;
    body: string;
    tone?: "info" | "tip" | "warning";
    sourceAnchor?: {
      label: string;
      href?: string;
    };
    active?: boolean;
  }>(),
  {
    tone: "info",
  },
);

const toneLabel = computed(() => {
  if (props.tone === "tip") return "AI aware";
  if (props.tone === "warning") return "Nuxt plugin";
  return "Runtime";
});
</script>

<template>
  <div class="fn-node fn-callout-node" :data-active="active" data-node-type="callout" :data-callout-tone="tone">
    <Handle type="target" :position="Position.Left" />

    <div class="fn-callout-node__header">
      <span class="fn-callout-node__tone">{{ toneLabel }}</span>
      <span class="fn-callout-node__meta">Custom node</span>
    </div>

    <p class="fn-callout-node__title">{{ label }}</p>
    <p class="fn-callout-node__body">{{ body }}</p>

    <a
      v-if="sourceAnchor?.href"
      :href="sourceAnchor.href"
      target="_blank"
      rel="noopener noreferrer"
      class="fn-callout-node__anchor"
    >
      {{ sourceAnchor.label }}
    </a>

    <p v-else-if="sourceAnchor?.label" class="fn-callout-node__anchor">
      {{ sourceAnchor.label }}
    </p>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.fn-callout-node {
  --fn-callout-accent: var(--color-primary);
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in oklch, var(--fn-callout-accent) 40%, var(--color-border));
  background:
    linear-gradient(
      180deg,
      color-mix(in oklch, var(--color-card) 92%, var(--fn-callout-accent) 8%),
      color-mix(in oklch, var(--color-card) 97%, black 3%)
    );
  box-shadow:
    inset 0 0 0 1px color-mix(in oklch, var(--fn-callout-accent) 12%, transparent),
    0 12px 28px rgba(15, 23, 42, 0.14);
  color: var(--color-foreground);
}

.fn-callout-node[data-callout-tone="tip"] {
  --fn-callout-accent: oklch(0.73 0.13 165);
}

.fn-callout-node[data-callout-tone="warning"] {
  --fn-callout-accent: oklch(0.77 0.12 92);
}

.fn-callout-node__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.fn-callout-node__tone,
.fn-callout-node__meta {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fn-callout-node__tone {
  border: 1px solid color-mix(in oklch, var(--fn-callout-accent) 55%, transparent);
  background: color-mix(in oklch, var(--fn-callout-accent) 18%, transparent);
  color: var(--fn-callout-accent);
}

.fn-callout-node__meta {
  border: 1px solid color-mix(in oklch, var(--color-border) 70%, transparent);
  background: color-mix(in oklch, var(--color-muted) 55%, transparent);
  color: var(--color-muted-foreground);
}

.fn-callout-node__title {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.3;
}

.fn-callout-node__body {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--color-muted-foreground);
}

.fn-callout-node__anchor {
  margin-top: 0.1rem;
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  align-self: flex-start;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in oklch, var(--color-border) 75%, transparent);
  background: color-mix(in oklch, var(--color-muted) 40%, transparent);
  padding: 0.28rem 0.5rem;
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--color-muted-foreground);
  text-decoration: none;
}

.fn-callout-node__anchor:hover {
  color: var(--color-foreground);
  border-color: color-mix(in oklch, var(--fn-callout-accent) 45%, var(--color-border));
}
</style>
