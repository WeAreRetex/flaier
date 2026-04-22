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
  parallelOffset?: number;
  labelBias?: number;
}

const props = withDefaults(defineProps<EdgeProps<ArchitectureEdgeData>>(), {
  interactionWidth: 28,
});

const PARALLEL_OFFSET_DISTANCE = 18;

const shape = computed<EdgeShape>(() => props.data?.shape ?? "smoothstep");

const offsetEndpoints = computed(() => {
  const parallel = props.data?.parallelOffset;
  const dx = props.targetX - props.sourceX;
  const dy = props.targetY - props.sourceY;
  const length = Math.hypot(dx, dy);

  if (!parallel || length === 0) {
    return {
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
    };
  }

  const offset = parallel * PARALLEL_OFFSET_DISTANCE;
  const perpX = -dy / length;
  const perpY = dx / length;

  return {
    sourceX: props.sourceX + perpX * offset,
    sourceY: props.sourceY + perpY * offset,
    targetX: props.targetX + perpX * offset,
    targetY: props.targetY + perpY * offset,
  };
});

const pathDefinition = computed<[string, number, number]>(() => {
  const { sourceX, sourceY, targetX, targetY } = offsetEndpoints.value;
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
const labelX = computed(() => {
  const bias = props.data?.labelBias;
  if (typeof bias === "number") {
    const { sourceX, targetX } = offsetEndpoints.value;
    return sourceX + (targetX - sourceX) * bias;
  }
  return pathDefinition.value[1];
});
const labelY = computed(() => {
  const bias = props.data?.labelBias;
  if (typeof bias === "number") {
    const { sourceY, targetY } = offsetEndpoints.value;
    return sourceY + (targetY - sourceY) * bias;
  }
  return pathDefinition.value[2];
});
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
