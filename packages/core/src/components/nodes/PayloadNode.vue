<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";

const props = withDefaults(
  defineProps<{
    label: string;
    payload?: string;
    before?: string;
    after?: string;
    format?: "json" | "yaml" | "text";
    description?: string;
    sourceAnchor?: {
      label: string;
      href?: string;
    };
    active?: boolean;
  }>(),
  {
    format: "json",
  },
);

const hasBefore = computed(() => Boolean(props.before));
const hasAfter = computed(() => Boolean(props.after));
const hasDiff = computed(() => hasBefore.value || hasAfter.value);
const singlePayload = computed(() => {
  if (hasDiff.value) return "";
  return props.payload ?? "";
});
</script>

<template>
  <div
    class="fn-node w-[300px] rounded-lg border border-border bg-card overflow-hidden"
    :data-active="active"
  >
    <Handle type="target" :position="Position.Left" />

    <div class="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
      <span class="text-sm font-medium text-foreground">{{ label }}</span>
      <span
        class="rounded-full border border-border/60 bg-muted/45 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {{ format }}
      </span>
    </div>

    <div class="px-3 py-2.5">
      <div v-if="sourceAnchor?.label" class="mb-2 max-w-full">
        <NodeSourceAnchor :label="sourceAnchor.label" :href="sourceAnchor.href" />
      </div>

      <p v-if="description" class="mb-2 text-[11px] text-muted-foreground leading-relaxed">
        {{ description }}
      </p>

      <div v-if="hasDiff" class="space-y-2">
        <div v-if="hasBefore" class="rounded-md border border-border/65 bg-muted/30 p-2">
          <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Before
          </p>
          <pre
            class="nowheel nopan max-h-[132px] overflow-auto text-[11px] leading-relaxed text-foreground whitespace-pre"
          ><code>{{ before }}</code></pre>
        </div>

        <div v-if="hasAfter" class="rounded-md border border-primary/30 bg-primary/8 p-2">
          <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-primary">After</p>
          <pre
            class="nowheel nopan max-h-[132px] overflow-auto text-[11px] leading-relaxed text-foreground whitespace-pre"
          ><code>{{ after }}</code></pre>
        </div>
      </div>

      <div v-else class="rounded-md border border-border/65 bg-muted/25 p-2">
        <pre
          class="nowheel nopan max-h-[220px] overflow-auto text-[11px] leading-relaxed text-foreground whitespace-pre"
        ><code>{{ singlePayload }}</code></pre>
      </div>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>
