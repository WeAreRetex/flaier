<script setup lang="ts">
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from "@vue-flow/core";
import { computed } from "vue";
import type { EdgeShape } from "../../types";

interface ArchitectureEdgeData {
  shape?: EdgeShape;
}

const props = withDefaults(defineProps<EdgeProps<ArchitectureEdgeData>>(), {
  interactionWidth: 28,
});

const shape = computed<EdgeShape>(() => props.data?.shape ?? "smoothstep");

const pathDefinition = computed<[string, number, number]>(() => {
  const sourceX = props.sourceX;
  const sourceY = props.sourceY;
  const targetX = props.targetX;
  const targetY = props.targetY;
  const sourcePosition = props.sourcePosition;
  const targetPosition = props.targetPosition;

  if (shape.value === "straight") {
    const [path, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    return [path, labelX, labelY];
  }

  if (shape.value === "bezier") {
    const [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    return [path, labelX, labelY];
  }

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset: 42,
    borderRadius: 14,
  });
  return [path, labelX, labelY];
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
