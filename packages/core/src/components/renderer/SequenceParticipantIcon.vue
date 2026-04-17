<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue/dist/offline";
import type { SequenceParticipantKind } from "../../types";
import { resolveSequenceParticipantIcon } from "./sequence-icons";

const props = withDefaults(
  defineProps<{
    kind: SequenceParticipantKind;
    icon?: string;
    size?: number;
    title?: string;
  }>(),
  {
    size: 16,
    title: undefined,
  },
);

const iconName = computed(() => {
  return resolveSequenceParticipantIcon(props.kind, props.icon);
});
</script>

<template>
  <Icon :icon="iconName" :width="size" :height="size" :title="title ?? kind" aria-hidden="true" />
</template>
