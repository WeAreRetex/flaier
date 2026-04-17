<script setup lang="ts">
import { computed } from "vue";
import type {
  SequenceLayout,
  SequenceLayoutBranch,
  SequenceLayoutGroup,
  SequenceLayoutMessage,
  SequenceLayoutNote,
  SequenceLayoutParticipant,
} from "../../sequence-layout";

const props = defineProps<{
  layout: SequenceLayout;
  currentStep: number;
  showSequenceNumbers?: boolean;
  activeParticipantKeys?: string[];
}>();

const emit = defineEmits<{
  selectStep: [key: string];
  selectParticipant: [key: string];
}>();

const canvasStyle = computed(() => {
  return {
    width: `${props.layout.width}px`,
    height: `${props.layout.height}px`,
  };
});

function isActiveStep(stepIndex: number) {
  return stepIndex === props.currentStep;
}

function isActiveGroup(group: SequenceLayoutGroup) {
  return props.currentStep >= group.startStep && props.currentStep <= group.endStep;
}

function isParticipantActive(participant: SequenceLayoutParticipant) {
  return props.activeParticipantKeys?.includes(participant.key) ?? false;
}

function messagePath(message: SequenceLayoutMessage) {
  if (message.selfMessage) {
    const loopHeight = 24;
    const loopX = message.startX + 56;
    const lowerY = message.y + loopHeight;
    return `M ${message.startX} ${message.y} H ${loopX} V ${lowerY} H ${message.startX}`;
  }

  return `M ${message.startX} ${message.y} H ${message.endX}`;
}

function messageStrokeDasharray(message: SequenceLayoutMessage) {
  return message.kind === "return" ? "6 5" : undefined;
}

function messageLineStyle(message: SequenceLayoutMessage): Record<string, string> {
  if (isActiveStep(message.stepIndex)) {
    return {
      stroke: "var(--color-primary)",
      opacity: "1",
      strokeWidth: "2.6",
    };
  }

  return {
    stroke: "var(--color-foreground)",
    opacity: "1",
    strokeWidth: "2.1",
  };
}

function messageArrowPath(message: SequenceLayoutMessage) {
  const arrowSize = 8;

  if (message.selfMessage) {
    const y = message.y + 24;
    const x = message.startX;
    return message.kind === "sync"
      ? `M ${x} ${y} L ${x + arrowSize} ${y - 4.5} L ${x + arrowSize} ${y + 4.5} Z`
      : `M ${x + arrowSize} ${y - 4.5} L ${x} ${y} L ${x + arrowSize} ${y + 4.5}`;
  }

  const pointsRight = message.endX >= message.startX;
  const x = message.endX;
  const y = message.y;

  if (message.kind === "sync") {
    return pointsRight
      ? `M ${x} ${y} L ${x - arrowSize} ${y - 4.5} L ${x - arrowSize} ${y + 4.5} Z`
      : `M ${x} ${y} L ${x + arrowSize} ${y - 4.5} L ${x + arrowSize} ${y + 4.5} Z`;
  }

  return pointsRight
    ? `M ${x - arrowSize} ${y - 4.5} L ${x} ${y} L ${x - arrowSize} ${y + 4.5}`
    : `M ${x + arrowSize} ${y - 4.5} L ${x} ${y} L ${x + arrowSize} ${y + 4.5}`;
}

function messageArrowStyle(message: SequenceLayoutMessage): Record<string, string> {
  const base = messageLineStyle(message);

  if (message.kind === "sync") {
    return {
      fill: base.stroke ?? "var(--color-foreground)",
      opacity: base.opacity ?? "1",
      stroke: "none",
    };
  }

  return {
    fill: "none",
    stroke: base.stroke ?? "var(--color-foreground)",
    opacity: base.opacity ?? "1",
    strokeWidth: "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
}

function messageLabelStyle(message: SequenceLayoutMessage) {
  const metrics = getMessageLabelMetrics(message.label, props.showSequenceNumbers);
  const left = message.selfMessage
    ? message.startX + 14
    : (message.startX + message.endX) / 2 - metrics.width / 2;
  const top = message.y - metrics.height - 10;

  return {
    left: `${Math.max(10, left)}px`,
    top: `${top}px`,
    width: `${metrics.width}px`,
  };
}

function messageButtonClass(message: SequenceLayoutMessage) {
  if (isActiveStep(message.stepIndex)) {
    return "border-primary/55 bg-primary/13 text-foreground shadow-xl shadow-primary/10";
  }

  return "border-border/70 bg-card/90 text-foreground";
}

function participantStyle(participant: SequenceLayoutParticipant) {
  return {
    left: `${participant.x - participant.width / 2}px`,
    top: `${participant.headerY}px`,
    width: `${participant.width}px`,
    minHeight: `${participant.headerHeight}px`,
    visibility: "hidden" as const,
  };
}

function participantClass(participant: SequenceLayoutParticipant) {
  return isParticipantActive(participant)
    ? "border-primary/55 bg-primary/13 text-foreground shadow-xl shadow-primary/10"
    : "border-border/70 bg-card/94 text-foreground/92";
}

function lifelineStyle(participant: SequenceLayoutParticipant) {
  return {
    x1: participant.x,
    x2: participant.x,
    y1: props.layout.lifelineTop,
    y2: props.layout.lifelineBottom,
  };
}

function noteStyle(note: SequenceLayoutNote) {
  return {
    left: `${note.x}px`,
    top: `${note.y - note.height / 2}px`,
    width: `${note.width}px`,
    minHeight: `${note.height}px`,
  };
}

function noteClass(note: SequenceLayoutNote) {
  if (isActiveStep(note.stepIndex)) {
    return "border-amber-400/55 bg-amber-400/12 text-foreground shadow-xl shadow-amber-500/10";
  }

  return "border-border/70 bg-card/88 text-foreground";
}

function groupStyle(group: SequenceLayoutGroup) {
  return {
    left: `${group.left}px`,
    top: `${group.top}px`,
    width: `${group.width}px`,
    height: `${group.height}px`,
  };
}

function groupClass(group: SequenceLayoutGroup) {
  return isActiveGroup(group)
    ? "border-primary/45 bg-primary/7"
    : "border-border/70 bg-muted/[0.045]";
}

function groupBadgeClass(group: SequenceLayoutGroup) {
  return isActiveGroup(group)
    ? "border-primary/45 bg-primary/12 text-primary"
    : "border-border/65 bg-background/82 text-muted-foreground";
}

function branchLabelStyle(branch: SequenceLayoutBranch, group: SequenceLayoutGroup) {
  return {
    top: `${branch.top - group.top + 8}px`,
  };
}

function branchDividerStyle(
  current: SequenceLayoutBranch,
  group: SequenceLayoutGroup,
  next?: SequenceLayoutBranch,
) {
  const y = next ? (current.top + current.height + next.top) / 2 : current.top + current.height;
  return {
    top: `${y - group.top}px`,
  };
}

function getMessageLabelMetrics(label: string, showSequenceNumbers = false) {
  const width = Math.max(144, Math.min(280, label.length * 6.8 + (showSequenceNumbers ? 42 : 26)));
  const reservedWidth = showSequenceNumbers ? 48 : 16;
  const charsPerLine = Math.max(10, Math.floor((width - reservedWidth) / 6.8));
  const lineCount = estimateTextLines(label, charsPerLine);
  const contentHeight = Math.max(showSequenceNumbers ? 20 : 14, lineCount * 14);

  return {
    width,
    height: Math.max(28, contentHeight + 8),
  };
}

function estimateTextLines(value: string, charsPerLine: number) {
  const normalized = value.split(/\r?\n/);

  return normalized.reduce((total, line) => {
    const length = Math.max(1, line.trim().length);
    return total + Math.max(1, Math.ceil(length / Math.max(1, charsPerLine)));
  }, 0);
}

function activationClass(activation: { participantKey: string; depth: number }) {
  if (props.activeParticipantKeys?.includes(activation.participantKey)) {
    return "fill-primary/32 stroke-primary/45";
  }

  return activation.depth > 0
    ? "fill-sky-500/18 stroke-sky-400/28"
    : "fill-primary/18 stroke-border/75";
}

function sequenceBadge(stepIndex: number) {
  return stepIndex + 1;
}
</script>

<template>
  <div
    class="fn-sequence-diagram pointer-events-none absolute left-0 top-0"
    data-sequence-diagram="true"
    :style="canvasStyle"
  >
    <div
      v-for="group in layout.groups"
      :key="group.key"
      class="fn-sequence-group absolute rounded-2xl border border-dashed"
      :class="groupClass(group)"
      :style="groupStyle(group)"
    >
      <div
        class="absolute left-3 top-2 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
        :class="groupBadgeClass(group)"
      >
        <span>{{ group.kind }}</span>
        <span class="text-foreground/90 normal-case tracking-normal">{{ group.label }}</span>
      </div>

      <p
        v-if="group.description"
        class="absolute left-4 right-4 top-11 text-[10px] leading-relaxed text-muted-foreground"
      >
        {{ group.description }}
      </p>

      <template v-for="(branch, index) in group.branches" :key="branch.key">
        <p
          v-if="branch.label"
          class="absolute left-4 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
          :style="branchLabelStyle(branch, group)"
        >
          {{ branch.label }}
        </p>

        <div
          v-if="index < group.branches.length - 1"
          class="absolute left-4 right-4 border-t border-dashed border-border/50"
          :style="branchDividerStyle(branch, group, group.branches[index + 1])"
        />
      </template>
    </div>

    <svg
      class="fn-sequence-lines absolute inset-0 h-full w-full"
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
    >
      <line
        v-for="participant in layout.participants"
        :key="`${participant.key}-lifeline`"
        v-bind="lifelineStyle(participant)"
        stroke="var(--color-border)"
        stroke-opacity="0.82"
        stroke-width="1.5"
        stroke-dasharray="5 7"
      />

      <rect
        v-for="activation in layout.activations"
        :key="`${activation.participantKey}-${activation.top}-${activation.depth}`"
        :x="activation.x"
        :y="activation.top"
        :width="activation.width"
        :height="activation.height"
        rx="6"
        stroke-width="1"
        :class="activationClass(activation)"
      />

      <g v-for="message in layout.messages" :key="`${message.key}-line`">
        <path
          :d="messagePath(message)"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          :stroke-dasharray="messageStrokeDasharray(message)"
          :style="messageLineStyle(message)"
        />
        <path :d="messageArrowPath(message)" :style="messageArrowStyle(message)" />
      </g>
    </svg>

    <button
      v-for="participant in layout.participants"
      :key="participant.key"
      type="button"
      class="fn-sequence-surface pointer-events-none absolute flex flex-col items-center justify-start rounded-2xl border px-3 py-2 text-center shadow-xl backdrop-blur-xl transition-colors"
      data-sequence-participant="true"
      :data-sequence-participant-key="participant.key"
      aria-hidden="true"
      tabindex="-1"
      :class="participantClass(participant)"
      :style="participantStyle(participant)"
      @click="emit('selectParticipant', participant.key)"
    >
      <span
        class="rounded-full border border-border/60 bg-background/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {{ participant.kind }}
      </span>
      <span class="mt-1 text-[12px] font-medium leading-snug text-foreground break-words">{{
        participant.label
      }}</span>
      <span
        v-if="participant.description"
        class="mt-1 text-[10px] leading-relaxed text-muted-foreground break-words"
      >
        {{ participant.description }}
      </span>
    </button>

    <button
      v-for="message in layout.messages"
      :key="`${message.key}-label`"
      type="button"
      class="fn-sequence-step fn-sequence-surface pointer-events-auto absolute rounded-xl border px-2.5 py-1 text-left shadow-xl backdrop-blur-xl transition-colors"
      :class="messageButtonClass(message)"
      :data-step-key="message.key"
      :style="messageLabelStyle(message)"
      @click="emit('selectStep', message.key)"
    >
      <span class="flex items-start gap-1.5">
        <span
          v-if="showSequenceNumbers"
          class="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/65 bg-background/70 px-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
        >
          {{ sequenceBadge(message.stepIndex) }}
        </span>
        <span class="text-[11px] font-medium leading-snug break-words">{{ message.label }}</span>
      </span>
    </button>

    <button
      v-for="note in layout.notes"
      :key="note.key"
      type="button"
      class="fn-sequence-step fn-sequence-surface pointer-events-auto absolute rounded-2xl border px-3 py-2 text-left shadow-xl backdrop-blur-xl transition-colors"
      :class="noteClass(note)"
      :data-step-key="note.key"
      :style="noteStyle(note)"
      @click="emit('selectStep', note.key)"
    >
      <div class="flex items-center gap-2">
        <span
          v-if="showSequenceNumbers"
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/65 bg-background/70 px-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
        >
          {{ sequenceBadge(note.stepIndex) }}
        </span>
        <p
          v-if="note.label"
          class="text-[11px] font-medium leading-snug text-foreground break-words"
        >
          {{ note.label }}
        </p>
        <p
          v-else
          class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          Note
        </p>
      </div>

      <p
        class="mt-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground"
      >
        {{ note.body }}
      </p>
    </button>
  </div>
</template>

<style>
[data-theme="dark"] .fn-sequence-surface {
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.28);
}

[data-theme="dark"] .fn-sequence-lines {
  filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.08));
}
</style>
