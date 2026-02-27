<script setup lang="ts">
import { useStateStore, useStateValue } from '@json-render/vue'
import { VueFlow, useNodesInitialized, useVueFlow } from '@vue-flow/core'
import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import { useFlowNarratorRuntime } from '../../composables/useFlowNarratorRuntime'
import type {
  FlowEdge,
  FlowNode,
  FlowNodeType,
  MagicMoveStep,
  SpecElement,
} from '../../types'
import TimelineControls from '../controls/TimelineControls.vue'
import CodeNodeVue from '../nodes/CodeNode.vue'
import DescriptionNodeVue from '../nodes/DescriptionNode.vue'
import LinkNodeVue from '../nodes/LinkNode.vue'
import TriggerNodeVue from '../nodes/TriggerNode.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  direction?: 'horizontal' | 'vertical'
  minHeight?: number
}>(), {
  direction: 'horizontal',
})

const TYPE_MAP: Record<string, FlowNodeType> = {
  TriggerNode: 'trigger',
  CodeNode: 'code',
  DescriptionNode: 'description',
  LinkNode: 'link',
}

const HORIZONTAL_NODE_GAP = 520
const VERTICAL_NODE_GAP = 280

interface OrderedNodeElement {
  key: string
  index: number
  nodeType: FlowNodeType
  element: SpecElement
}

interface TimelineFrame {
  nodeIndex: number
  nodeKey: string
  localStep: number
  totalLocalSteps: number
}

interface NodeFrameRange {
  start: number
  end: number
  totalLocalSteps: number
}

const runtime = useFlowNarratorRuntime()
const spec = computed(() => runtime.spec.value)
const rootElement = computed(() => {
  const activeSpec = spec.value
  if (!activeSpec) return undefined
  return activeSpec.elements[activeSpec.root]
})

const orderedNodeElements = computed<OrderedNodeElement[]>(() => {
  const activeSpec = spec.value
  const root = rootElement.value

  if (!activeSpec || !root?.children?.length) return []

  const result: OrderedNodeElement[] = []

  root.children.forEach((key) => {
    const element = activeSpec.elements[key]
    if (!element) return

    const nodeType = TYPE_MAP[element.type]
    if (!nodeType) return

    result.push({ key, index: result.length, nodeType, element })
  })

  return result
})

function toOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function toRequiredString(value: unknown) {
  return toOptionalString(value) ?? ''
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function toMagicMoveSteps(value: unknown): MagicMoveStep[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is MagicMoveStep => {
      if (!item || typeof item !== 'object') return false

      const record = item as Record<string, unknown>
      if (typeof record.code !== 'string') return false

      const optionalKeys: Array<'title' | 'comment' | 'story' | 'speaker'> = [
        'title',
        'comment',
        'story',
        'speaker',
      ]

      return optionalKeys.every((key) => {
        const current = record[key]
        return current === undefined || typeof current === 'string'
      })
    })
    .map((item) => ({
      code: item.code,
      title: toOptionalString(item.title),
      comment: toOptionalString(item.comment),
      story: toOptionalString(item.story),
      speaker: toOptionalString(item.speaker),
    }))
}

function getNodeFrameCount(element: SpecElement) {
  if (element.type !== 'CodeNode') return 1
  return Math.max(1, toMagicMoveSteps(element.props.magicMoveSteps).length)
}

function getCodeNodeMaxLines(element: SpecElement) {
  const rootCodeLines = toRequiredString(element.props.code).split('\n').length
  const stepLines = toMagicMoveSteps(element.props.magicMoveSteps)
    .map((step) => step.code.split('\n').length)

  return Math.max(rootCodeLines, ...stepLines)
}

function getCodeNodeMaxLineLength(element: SpecElement) {
  const variants = [
    toRequiredString(element.props.code),
    ...toMagicMoveSteps(element.props.magicMoveSteps).map((step) => step.code),
  ]

  return variants.reduce((max, code) => {
    const lineMax = code
      .split('\n')
      .reduce((lineLengthMax, line) => Math.max(lineLengthMax, line.length), 0)

    return Math.max(max, lineMax)
  }, 0)
}

function estimateWrappedLines(text: string, charsPerLine = 48) {
  return text
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
}

function getCodeNodeWrappedLines(element: SpecElement, charsPerLine = 44) {
  const variants = [
    toRequiredString(element.props.code),
    ...toMagicMoveSteps(element.props.magicMoveSteps).map((step) => step.code),
  ]

  return variants.reduce((max, code) => {
    return Math.max(max, estimateWrappedLines(code, charsPerLine))
  }, 1)
}

function hasCodeNodeStoryMeta(element: SpecElement) {
  return toMagicMoveSteps(element.props.magicMoveSteps).some((step) => step.title || step.speaker)
}

function getCodeNodeStoryLines(element: SpecElement) {
  const variants = [
    toOptionalString(element.props.story),
    toOptionalString(element.props.comment),
    ...toMagicMoveSteps(element.props.magicMoveSteps).flatMap((step) => [step.story, step.comment]),
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)

  if (variants.length === 0) return 0

  return variants.reduce((max, current) => Math.max(max, estimateWrappedLines(current)), 1)
}

const timelineFrames = computed<TimelineFrame[]>(() => {
  const frames: TimelineFrame[] = []

  orderedNodeElements.value.forEach((node) => {
    const totalLocalSteps = getNodeFrameCount(node.element)

    for (let localStep = 0; localStep < totalLocalSteps; localStep += 1) {
      frames.push({
        nodeIndex: node.index,
        nodeKey: node.key,
        localStep,
        totalLocalSteps,
      })
    }
  })

  return frames
})

const nodeFrameRanges = computed<Record<number, NodeFrameRange>>(() => {
  const ranges: Record<number, NodeFrameRange> = {}
  let cursor = 0

  orderedNodeElements.value.forEach((node) => {
    const totalLocalSteps = getNodeFrameCount(node.element)
    ranges[node.index] = {
      start: cursor,
      end: cursor + totalLocalSteps - 1,
      totalLocalSteps,
    }
    cursor += totalLocalSteps
  })

  return ranges
})

const totalSteps = computed(() => timelineFrames.value.length)
const maxStepIndex = computed(() => Math.max(0, totalSteps.value - 1))

const { set } = useStateStore()
const currentStepState = useStateValue<number>('/currentStep')
const playingState = useStateValue<boolean>('/playing')

function clampStep(value: number) {
  if (!Number.isFinite(value)) return 0
  const step = Math.floor(value)
  return Math.max(0, Math.min(step, maxStepIndex.value))
}

const currentStep = computed<number>({
  get() {
    return clampStep(Number(currentStepState.value ?? 0))
  },
  set(value: number) {
    set('/currentStep', clampStep(value))
  },
})

const playing = computed<boolean>({
  get() {
    return Boolean(playingState.value ?? false)
  },
  set(value: boolean) {
    set('/playing', value)
  },
})

watch(totalSteps, () => {
  currentStep.value = clampStep(currentStep.value)
})

const intervalMs = computed(() => {
  const value = Number(runtime.interval.value)
  if (!Number.isFinite(value) || value <= 0) return 3000
  return Math.max(250, Math.floor(value))
})

let timer: ReturnType<typeof setInterval> | null = null

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch([playing, totalSteps, intervalMs], ([isPlaying, steps, interval]) => {
  clearTimer()

  if (!isPlaying || steps <= 1) return

  timer = setInterval(() => {
    if (currentStep.value < steps - 1) {
      currentStep.value += 1
      return
    }

    playing.value = false
  }, interval)
}, { immediate: true })

function next() {
  if (currentStep.value < totalSteps.value - 1) {
    currentStep.value += 1
  }
}

function prev() {
  if (currentStep.value > 0) {
    currentStep.value -= 1
  }
}

function goTo(step: number) {
  currentStep.value = clampStep(step)
}

function togglePlay() {
  if (totalSteps.value <= 1) {
    playing.value = false
    return
  }

  playing.value = !playing.value
}

const activeFrame = computed(() => timelineFrames.value[currentStep.value])

const nodes = computed<FlowNode[]>(() =>
  orderedNodeElements.value.map(({ key, nodeType, element, index }) => ({
    id: key,
    type: nodeType,
    position: props.direction === 'vertical'
      ? { x: 0, y: index * VERTICAL_NODE_GAP }
      : { x: index * HORIZONTAL_NODE_GAP, y: 0 },
    data: {
      type: nodeType,
      elementType: element.type,
      props: element.props,
      index,
    },
  })),
)

const edges = computed<FlowEdge[]>(() =>
  orderedNodeElements.value.slice(0, -1).map((entry, index) => {
    const target = orderedNodeElements.value[index + 1]
    return {
      id: `e-${entry.key}-${target?.key ?? String(index)}`,
      source: entry.key,
      target: target?.key ?? entry.key,
      type: 'smoothstep',
      animated: true,
      class: target?.index === activeFrame.value?.nodeIndex ? 'active-edge' : undefined,
    }
  }),
)

function isActive(index: number) {
  return activeFrame.value?.nodeIndex === index
}

function codeStepIndex(index: number) {
  const range = nodeFrameRanges.value[index]
  if (!range) return 0

  if (currentStep.value < range.start) return 0
  if (currentStep.value > range.end) return range.totalLocalSteps - 1

  return currentStep.value - range.start
}

const activeNode = computed(() => {
  const frame = activeFrame.value
  if (!frame) return undefined
  return orderedNodeElements.value[frame.nodeIndex]
})

const activeLabel = computed(() => {
  const node = activeNode.value
  if (!node) return ''

  const base = toOptionalString(node.element.props.label) ?? ''

  if (node.element.type !== 'CodeNode') {
    return base
  }

  const steps = toMagicMoveSteps(node.element.props.magicMoveSteps)
  if (steps.length === 0) return base

  const localStep = activeFrame.value?.nodeIndex === node.index
    ? activeFrame.value.localStep
    : codeStepIndex(node.index)

  const title = steps[Math.min(localStep, steps.length - 1)]?.title
  return title ? `${base} - ${title}` : base
})

const activeDescription = computed(() => {
  const node = activeNode.value
  if (!node) return ''

  if (node.element.type === 'CodeNode') {
    const steps = toMagicMoveSteps(node.element.props.magicMoveSteps)
    const defaultStory = toOptionalString(node.element.props.story)
      ?? toOptionalString(node.element.props.comment)

    if (steps.length > 0) {
      const localStep = activeFrame.value?.nodeIndex === node.index
        ? activeFrame.value.localStep
        : codeStepIndex(node.index)
      const beat = steps[Math.min(localStep, steps.length - 1)]

      return beat?.story ?? beat?.comment ?? defaultStory ?? ''
    }

    return defaultStory ?? ''
  }

  if (node.element.type === 'DescriptionNode') {
    return toOptionalString(node.element.props.body) ?? ''
  }

  return toOptionalString(node.element.props.description) ?? ''
})

const containerMinHeight = computed(() => {
  const provided = Number(props.minHeight)
  if (Number.isFinite(provided) && provided >= 320) {
    return Math.floor(provided)
  }

  const node = activeNode.value ?? orderedNodeElements.value[0]
  if (!node || node.element.type !== 'CodeNode') {
    return 520
  }

  const autoWrapEnabled = getCodeNodeMaxLineLength(node.element) > 58
  const wrapEnabled = toBoolean(node.element.props.wrapLongLines) || autoWrapEnabled

  const codeLines = wrapEnabled
    ? getCodeNodeWrappedLines(node.element)
    : getCodeNodeMaxLines(node.element)
  const storyLines = getCodeNodeStoryLines(node.element)
  const storyHasMeta = hasCodeNodeStoryMeta(node.element)

  const codeViewportHeight = wrapEnabled
    ? Math.min(400, Math.max(190, 72 + codeLines * 16))
    : Math.min(340, Math.max(160, 84 + codeLines * 17))

  const storyViewportHeight = storyLines > 0
    ? Math.min(220, Math.max(88, (storyHasMeta ? 56 : 34) + storyLines * 18))
    : 0

  return Math.min(880, Math.max(560, codeViewportHeight + storyViewportHeight + 300))
})

const instance = getCurrentInstance()
const flowId = `flow-narrator-${instance?.uid ?? 0}`
const { fitView } = useVueFlow(flowId)
const nodesInitialized = useNodesInitialized()
const paneReady = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
const containerReady = ref(false)
let resizeObserver: ResizeObserver | null = null

function updateContainerReady() {
  const element = containerRef.value
  containerReady.value = Boolean(element && element.clientWidth > 0 && element.clientHeight > 0)
}

onMounted(() => {
  nextTick(() => {
    updateContainerReady()

    if (typeof ResizeObserver === 'undefined') return

    resizeObserver = new ResizeObserver(() => {
      updateContainerReady()
    })

    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }
  })
})

function onInit() {
  paneReady.value = true
}

const viewportReady = computed(() =>
  paneReady.value
  && nodesInitialized.value
  && containerReady.value
  && nodes.value.length > 0,
)

const hasInitialFocus = ref(false)
const lastFocusedNodeKey = ref<string | null>(null)

watch([viewportReady, activeFrame], ([ready, frame]) => {
  if (!ready || !frame) return

  const shouldFocusNode = !hasInitialFocus.value || lastFocusedNodeKey.value !== frame.nodeKey
  if (!shouldFocusNode) return

  nextTick(() => {
    void fitView({
      nodes: [frame.nodeKey],
      duration: hasInitialFocus.value ? 650 : 280,
      padding: 0.6,
      maxZoom: 1.2,
    })

    hasInitialFocus.value = true
    lastFocusedNodeKey.value = frame.nodeKey
  })
}, { immediate: true })

onUnmounted(() => {
  clearTimer()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="flow-narrator relative h-full w-full font-sans antialiased bg-background transition-[min-height] duration-300 ease-out"
    :style="{ minHeight: `${containerMinHeight}px` }"
  >
    <VueFlow
      v-if="containerReady"
      :id="flowId"
      :nodes="nodes"
      :edges="edges"
      :fit-view-on-init="false"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :pan-on-drag="true"
      :pan-on-scroll="true"
      :min-zoom="0.15"
      :max-zoom="2"
      :prevent-scrolling="true"
      class="h-full w-full"
      @init="onInit"
    >
      <template #node-trigger="{ data }">
        <TriggerNodeVue
          :label="toRequiredString(data.props.label)"
          :description="toOptionalString(data.props.description)"
          :color="toOptionalString(data.props.color)"
          :active="isActive(data.index)"
        />
      </template>

      <template #node-code="{ data }">
        <CodeNodeVue
          :label="toRequiredString(data.props.label)"
          :file="toOptionalString(data.props.file)"
          :language="toOptionalString(data.props.language)"
          :code="toRequiredString(data.props.code)"
          :comment="toOptionalString(data.props.comment)"
          :story="toOptionalString(data.props.story)"
          :wrap-long-lines="toBoolean(data.props.wrapLongLines)"
          :magic-move-steps="toMagicMoveSteps(data.props.magicMoveSteps)"
          :active="isActive(data.index)"
          :step-index="codeStepIndex(data.index)"
        />
      </template>

      <template #node-description="{ data }">
        <DescriptionNodeVue
          :label="toRequiredString(data.props.label)"
          :body="toRequiredString(data.props.body)"
          :active="isActive(data.index)"
        />
      </template>

      <template #node-link="{ data }">
        <LinkNodeVue
          :label="toRequiredString(data.props.label)"
          :href="toRequiredString(data.props.href)"
          :description="toOptionalString(data.props.description)"
          :active="isActive(data.index)"
        />
      </template>
    </VueFlow>

    <div v-else class="h-full w-full" />

    <div v-if="title || description" class="absolute top-4 left-4 z-20">
      <div class="rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
        <p v-if="title" class="font-medium text-foreground">{{ title }}</p>
        <p v-if="description" class="mt-0.5 text-[11px] text-muted-foreground">{{ description }}</p>
      </div>
    </div>

    <div
      class="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-3"
      style="padding-bottom: max(env(safe-area-inset-bottom), 0px);"
    >
      <div class="pointer-events-auto w-full max-w-[980px]">
        <TimelineControls
          :current-step="currentStep"
          :total-steps="totalSteps"
          :playing="playing"
          :label="activeLabel"
          :description="activeDescription"
          @next="next"
          @prev="prev"
          @go-to="goTo"
          @toggle-play="togglePlay"
        />
      </div>
    </div>
  </div>
</template>
