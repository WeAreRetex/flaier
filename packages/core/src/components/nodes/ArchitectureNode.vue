<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import NodeSourceAnchor from "./NodeSourceAnchor.vue";

type ArchitectureKind =
  | "service"
  | "database"
  | "queue"
  | "cache"
  | "gateway"
  | "external"
  | "compute";
type ArchitectureTier = "edge" | "application" | "integration" | "data" | "platform" | "external";
type ArchitectureStatus = "planned" | "active" | "degraded" | "retired";

const props = withDefaults(
  defineProps<{
    label: string;
    kind?: ArchitectureKind;
    technology?: string;
    runtime?: string;
    owner?: string;
    tier?: ArchitectureTier;
    status?: ArchitectureStatus;
    tags?: string[];
    capabilities?: string[];
    description?: string;
    sourceAnchor?: {
      label: string;
      href?: string;
    };
    active?: boolean;
  }>(),
  {
    kind: "service",
  },
);

const kindMeta = computed(() => {
  switch (props.kind) {
    case "database":
      return {
        tag: "Database",
        short: "DB",
        cardClass: "border-emerald-500/40",
        iconClass: "border-emerald-500/45 bg-emerald-500/12 text-emerald-500",
        tagClass: "border-emerald-500/35 bg-emerald-500/12 text-emerald-500",
      };
    case "queue":
      return {
        tag: "Queue",
        short: "Q",
        cardClass: "border-amber-500/45",
        iconClass: "border-amber-500/45 bg-amber-500/12 text-amber-500",
        tagClass: "border-amber-500/35 bg-amber-500/12 text-amber-500",
      };
    case "cache":
      return {
        tag: "Cache",
        short: "C",
        cardClass: "border-cyan-500/45",
        iconClass: "border-cyan-500/45 bg-cyan-500/12 text-cyan-500",
        tagClass: "border-cyan-500/35 bg-cyan-500/12 text-cyan-500",
      };
    case "gateway":
      return {
        tag: "Gateway",
        short: "GW",
        cardClass: "border-indigo-500/45",
        iconClass: "border-indigo-500/45 bg-indigo-500/12 text-indigo-400",
        tagClass: "border-indigo-500/35 bg-indigo-500/12 text-indigo-400",
      };
    case "external":
      return {
        tag: "External",
        short: "EXT",
        cardClass: "border-slate-500/45",
        iconClass: "border-slate-500/45 bg-slate-500/12 text-slate-300",
        tagClass: "border-slate-500/35 bg-slate-500/12 text-slate-300",
      };
    case "compute":
      return {
        tag: "Compute",
        short: "CPU",
        cardClass: "border-rose-500/45",
        iconClass: "border-rose-500/45 bg-rose-500/12 text-rose-400",
        tagClass: "border-rose-500/35 bg-rose-500/12 text-rose-400",
      };
    case "service":
    default:
      return {
        tag: "Service",
        short: "API",
        cardClass: "border-sky-500/45",
        iconClass: "border-sky-500/45 bg-sky-500/12 text-sky-400",
        tagClass: "border-sky-500/35 bg-sky-500/12 text-sky-400",
      };
  }
});

const statusMeta = computed(() => {
  switch (props.status) {
    case "planned":
      return {
        label: "Planned",
        className: "border-blue-400/35 bg-blue-400/12 text-blue-200",
      };
    case "degraded":
      return {
        label: "Degraded",
        className: "border-amber-400/35 bg-amber-400/12 text-amber-200",
      };
    case "retired":
      return {
        label: "Retired",
        className: "border-slate-400/35 bg-slate-400/12 text-slate-300",
      };
    case "active":
    default:
      return {
        label: "Active",
        className: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
      };
  }
});

const tierLabel = computed(() => {
  if (!props.tier) {
    return undefined;
  }

  return props.tier.charAt(0).toUpperCase() + props.tier.slice(1);
});

const compactCapabilities = computed(() => (props.capabilities ?? []).slice(0, 2));
const compactTags = computed(() => (props.tags ?? []).slice(0, 3));
</script>

<template>
  <div
    class="fn-node w-[270px] rounded-xl border bg-card/95 px-4 py-3 shadow-sm"
    :class="kindMeta.cardClass"
    :data-active="active"
  >
    <Handle type="target" :position="Position.Left" />

    <div class="flex items-start gap-2.5">
      <div
        class="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1 text-[10px] font-semibold uppercase tracking-wide"
        :class="kindMeta.iconClass"
      >
        {{ kindMeta.short }}
      </div>

      <div class="min-w-0 flex-1">
        <p
          class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider"
          :class="kindMeta.tagClass"
        >
          {{ kindMeta.tag }}
        </p>

        <p class="mt-1 text-sm font-semibold text-foreground leading-snug break-words">
          {{ label }}
        </p>

        <p v-if="technology" class="mt-0.5 text-[11px] font-mono text-muted-foreground break-words">
          {{ technology }}
        </p>

        <div class="mt-1 flex flex-wrap items-center gap-1">
          <span
            class="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            :class="statusMeta.className"
          >
            {{ statusMeta.label }}
          </span>

          <span
            v-if="tierLabel"
            class="inline-flex items-center rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {{ tierLabel }}
          </span>
        </div>

        <p v-if="owner" class="mt-1 text-[10px] text-muted-foreground break-words">
          Owner: {{ owner }}
        </p>

        <p v-if="runtime" class="text-[10px] font-mono text-muted-foreground break-words">
          Runtime: {{ runtime }}
        </p>
      </div>
    </div>

    <div v-if="compactCapabilities.length > 0" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="capability in compactCapabilities"
        :key="capability"
        class="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
      >
        {{ capability }}
      </span>
    </div>

    <div v-if="compactTags.length > 0" class="mt-1 flex flex-wrap gap-1">
      <span
        v-for="tag in compactTags"
        :key="tag"
        class="inline-flex items-center rounded border border-border/70 bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
      >
        #{{ tag }}
      </span>
    </div>

    <p
      v-if="description"
      class="mt-2 text-[11px] text-muted-foreground leading-relaxed break-words"
    >
      {{ description }}
    </p>

    <div v-if="sourceAnchor?.label" class="mt-2 max-w-full">
      <NodeSourceAnchor :label="sourceAnchor.label" :href="sourceAnchor.href" />
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>
