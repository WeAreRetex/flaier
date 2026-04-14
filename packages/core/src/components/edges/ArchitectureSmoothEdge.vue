<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@vue-flow/core";
import { computed } from "vue";

const props = withDefaults(defineProps<EdgeProps>(), {
  interactionWidth: 28,
});

const pathDefinition = computed(() => {
  return getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    offset: 42,
    borderRadius: 14,
  });
});

const edgePath = computed(() => pathDefinition.value[0]);
const labelX = computed(() => pathDefinition.value[1]);
const labelY = computed(() => pathDefinition.value[2]);
const labelText = computed(() => (typeof props.label === "string" ? props.label : ""));
const labelPositionStyle = computed(() => ({
  transform: `translate(-50%, -50%) translate(${labelX.value}px, ${labelY.value}px)`,
}));
</script>

<template>
  <BaseEdge
    :id="id"
    :path="edgePath"
    :marker-start="markerStart"
    :marker-end="markerEnd"
    :interaction-width="interactionWidth"
  />

  <EdgeLabelRenderer>
    <div v-if="labelText" class="fn-edge-html-label nodrag nopan" :style="labelPositionStyle">
      {{ labelText }}
    </div>
  </EdgeLabelRenderer>
</template>
