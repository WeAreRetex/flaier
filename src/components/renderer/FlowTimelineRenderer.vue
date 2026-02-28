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

const HORIZONTAL_LAYER_GAP = 500
const VERTICAL_LAYER_GAP = 320
const BRANCH_LANE_GAP = 290

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

interface BranchChoice {
  id: string
  label: string
  description?: string
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
  const queue = [...root.children]
  const seen = new Set<string>()

  while (queue.length > 0) {
    const key = queue.shift()
    if (!key || seen.has(key)) continue

    const element = activeSpec.elements[key]
    if (!element) continue

    const nodeType = TYPE_MAP[element.type]
    if (!nodeType) continue

    seen.add(key)
    result.push({ key, index: result.length, nodeType, element })

    for (const childKey of element.children ?? []) {
      if (!seen.has(childKey)) {
        queue.push(childKey)
      }
    }
  }

  return result
})

const orderedNodeByKey = computed<Record<string, OrderedNodeElement>>(() => {
  const map: Record<string, OrderedNodeElement> = {}

  for (const node of orderedNodeElements.value) {
    map[node.key] = node
  }

  return map
})

const rootLinearNextByKey = computed<Record<string, string>>(() => {
  const root = rootElement.value
  if (!root?.children?.length) return {}
  const rootChildren = root.children

  const map: Record<string, string> = {}

  rootChildren.forEach((key, index) => {
    const nextKey = rootChildren[index + 1]
    if (!nextKey) return

    if (orderedNodeByKey.value[key] && orderedNodeByKey.value[nextKey]) {
      map[key] = nextKey
    }
  })

  return map
})

const outgoingNodeKeys = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {}

  for (const node of orderedNodeElements.value) {
    const explicit = (node.element.children ?? [])
      .filter((key) => Boolean(orderedNodeByKey.value[key]))

    if (explicit.length > 0) {
      map[node.key] = explicit
      continue
    }

    const fallback = rootLinearNextByKey.value[node.key]
    map[node.key] = fallback ? [fallback] : []
  }

  return map
})

const incomingNodeKeys = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {}

  for (const node of orderedNodeElements.value) {
    map[node.key] = []
  }

  for (const [source, targets] of Object.entries(outgoingNodeKeys.value)) {
    for (const target of targets) {
      if (!map[target]) continue
      map[target].push(source)
    }
  }

  return map
})

const startNodeKey = computed(() => {
  const root = rootElement.value
  if (!root?.children?.length) return undefined

  return root.children.find((key) => Boolean(orderedNodeByKey.value[key]))
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

const selectedBranchByNode = ref<Record<string, string>>({})
const pathFrames = ref<TimelineFrame[]>([])

function createFramesForNode(nodeKey: string): TimelineFrame[] {
  const node = orderedNodeByKey.value[nodeKey]
  if (!node) return []

  const totalLocalSteps = getNodeFrameCount(node.element)

  return Array.from({ length: totalLocalSteps }, (_, localStep) => ({
    nodeIndex: node.index,
    nodeKey,
    localStep,
    totalLocalSteps,
  }))
}

function resolveNextNode(nodeKey: string, options: string[]) {
  const selected = selectedBranchByNode.value[nodeKey]
  if (selected && options.includes(selected)) {
    return selected
  }

  return options[0]
}

function buildGuidedPath(startKey: string, maxFrames = 450): TimelineFrame[] {
  const frames: TimelineFrame[] = []
  const visitedEdges = new Map<string, number>()
  let currentKey: string | undefined = startKey

  while (currentKey && frames.length < maxFrames) {
    const nodeFrames = createFramesForNode(currentKey)
    if (nodeFrames.length === 0) break

    frames.push(...nodeFrames)

    const options = outgoingNodeKeys.value[currentKey] ?? []
    if (options.length === 0) break

    const nextKey = resolveNextNode(currentKey, options)
    if (!nextKey) break

    const edgeKey = `${currentKey}->${nextKey}`
    const edgeVisits = (visitedEdges.get(edgeKey) ?? 0) + 1
    visitedEdges.set(edgeKey, edgeVisits)
    if (edgeVisits > 2) break

    currentKey = nextKey
  }

  return frames
}

const totalSteps = computed(() => pathFrames.value.length)
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

watch([startNodeKey, orderedNodeElements], ([start]) => {
  selectedBranchByNode.value = {}

  if (!start) {
    pathFrames.value = []
    currentStep.value = 0
    return
  }

  const built = buildGuidedPath(start)
  pathFrames.value = built.length > 0 ? built : createFramesForNode(start)
  currentStep.value = clampStep(Number(currentStepState.value ?? 0))
}, { immediate: true })

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

function next() {
  if (currentStep.value >= totalSteps.value - 1) {
    return false
  }

  currentStep.value += 1
  return true
}

watch([playing, totalSteps, intervalMs], ([isPlaying, steps, interval]) => {
  clearTimer()

  if (!isPlaying || steps <= 1) return

  timer = setInterval(() => {
    const advanced = next()
    if (!advanced) {
      playing.value = false
    }
  }, interval)
}, { immediate: true })

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

const activeFrame = computed(() => pathFrames.value[currentStep.value])
const nextPlannedNodeKey = computed(() => pathFrames.value[currentStep.value + 1]?.nodeKey)

const layoutPositions = computed<Record<string, { x: number; y: number }>>(() => {
  const nodes = orderedNodeElements.value
  if (nodes.length === 0) return {}

  const depthByKey: Record<string, number> = {}
  for (const node of nodes) {
    depthByKey[node.key] = Number.NEGATIVE_INFINITY
  }

  const startKey = startNodeKey.value ?? nodes[0]?.key
  if (!startKey) return {}
  depthByKey[startKey] = 0

  const queue: string[] = [startKey]
  const maxDepth = Math.max(0, nodes.length - 1)
  let guard = 0
  const maxIterations = Math.max(16, nodes.length * nodes.length)

  while (queue.length > 0 && guard < maxIterations) {
    guard += 1

    const key = queue.shift()
    if (!key) continue

    const baseDepth = depthByKey[key] ?? Number.NEGATIVE_INFINITY
    if (!Number.isFinite(baseDepth)) continue

    for (const target of outgoingNodeKeys.value[key] ?? []) {
      if (!(target in depthByKey)) continue

      const candidateDepth = Math.min(maxDepth, baseDepth + 1)
      const currentDepth = depthByKey[target] ?? Number.NEGATIVE_INFINITY
      if (candidateDepth > currentDepth) {
        depthByKey[target] = candidateDepth
        queue.push(target)
      }
    }
  }

  let fallbackDepth = 0
  for (const node of nodes) {
    if (Number.isFinite(depthByKey[node.key])) continue

    depthByKey[node.key] = Math.min(maxDepth, fallbackDepth)
    fallbackDepth += 1
  }

  const layers: Record<number, string[]> = {}
  for (const node of nodes) {
    const depth = depthByKey[node.key] ?? 0
    if (!layers[depth]) {
      layers[depth] = []
    }

    layers[depth].push(node.key)
  }

  const laneByKey: Record<string, number> = {}
  const sortedDepths = Object.keys(layers)
    .map(Number)
    .sort((a, b) => a - b)

  for (const depth of sortedDepths) {
    const layerKeys = [...(layers[depth] ?? [])]

    layerKeys.sort((a, b) => {
      const aParents = (incomingNodeKeys.value[a] ?? [])
        .filter((parent) => {
          const parentDepth = depthByKey[parent] ?? Number.NEGATIVE_INFINITY
          return Number.isFinite(parentDepth) && parentDepth < depth
        })
      const bParents = (incomingNodeKeys.value[b] ?? [])
        .filter((parent) => {
          const parentDepth = depthByKey[parent] ?? Number.NEGATIVE_INFINITY
          return Number.isFinite(parentDepth) && parentDepth < depth
        })

      const aAnchor = aParents.length > 0
        ? aParents.reduce((sum, parent) => sum + (laneByKey[parent] ?? 0), 0) / aParents.length
        : 0
      const bAnchor = bParents.length > 0
        ? bParents.reduce((sum, parent) => sum + (laneByKey[parent] ?? 0), 0) / bParents.length
        : 0

      if (aAnchor === bAnchor) {
        const aIndex = orderedNodeByKey.value[a]?.index ?? 0
        const bIndex = orderedNodeByKey.value[b]?.index ?? 0
        return aIndex - bIndex
      }

      return aAnchor - bAnchor
    })

    const count = layerKeys.length
    layerKeys.forEach((key, index) => {
      laneByKey[key] = (index - (count - 1) / 2) * BRANCH_LANE_GAP
    })
  }

  const positions: Record<string, { x: number; y: number }> = {}

  for (const node of nodes) {
    const depth = depthByKey[node.key] ?? 0
    const lane = laneByKey[node.key] ?? 0

    if (props.direction === 'vertical') {
      positions[node.key] = {
        x: lane,
        y: depth * VERTICAL_LAYER_GAP,
      }
      continue
    }

    positions[node.key] = {
      x: depth * HORIZONTAL_LAYER_GAP,
      y: lane,
    }
  }

  return positions
})

const nodes = computed<FlowNode[]>(() =>
  orderedNodeElements.value.map(({ key, nodeType, element, index }) => ({
    id: key,
    type: nodeType,
    position: layoutPositions.value[key] ?? { x: index * HORIZONTAL_LAYER_GAP, y: 0 },
    data: {
      key,
      type: nodeType,
      elementType: element.type,
      props: element.props,
      index,
    },
  })),
)

const edges = computed<FlowEdge[]>(() => {
  const result: FlowEdge[] = []

  for (const node of orderedNodeElements.value) {
    const targets = outgoingNodeKeys.value[node.key] ?? []

    for (const target of targets) {
      if (!orderedNodeByKey.value[target]) continue

      const isActiveEdge = activeFrame.value?.nodeKey === node.key && nextPlannedNodeKey.value === target

      result.push({
        id: `e-${node.key}-${target}`,
        source: node.key,
        target,
        type: 'smoothstep',
        animated: true,
        class: isActiveEdge ? 'active-edge' : undefined,
      })
    }
  }

  return result
})

function isActive(nodeKey: string) {
  return activeFrame.value?.nodeKey === nodeKey
}

function codeStepIndex(nodeKey: string) {
  if (activeFrame.value?.nodeKey !== nodeKey) {
    return 0
  }

  return activeFrame.value.localStep
}

const activeNode = computed(() => {
  const key = activeFrame.value?.nodeKey
  if (!key) return undefined
  return orderedNodeByKey.value[key]
})

const activeLocalStep = computed(() => activeFrame.value?.localStep ?? 0)

const activeLabel = computed(() => {
  const node = activeNode.value
  if (!node) return ''

  const base = toOptionalString(node.element.props.label) ?? ''

  if (node.element.type !== 'CodeNode') {
    return base
  }

  const steps = toMagicMoveSteps(node.element.props.magicMoveSteps)
  if (steps.length === 0) return base

  const title = steps[Math.min(activeLocalStep.value, steps.length - 1)]?.title
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
      const beat = steps[Math.min(activeLocalStep.value, steps.length - 1)]

      return beat?.story ?? beat?.comment ?? defaultStory ?? ''
    }

    return defaultStory ?? ''
  }

  if (node.element.type === 'DescriptionNode') {
    return toOptionalString(node.element.props.body) ?? ''
  }

  return toOptionalString(node.element.props.description) ?? ''
})

const branchChoices = computed<BranchChoice[]>(() => {
  const node = activeNode.value
  const frame = activeFrame.value
  if (!node || !frame) return []

  if (frame.localStep < frame.totalLocalSteps - 1) {
    return []
  }

  const options = outgoingNodeKeys.value[node.key] ?? []
  if (options.length <= 1) return []

  const result: BranchChoice[] = []

  for (const id of options) {
    const target = orderedNodeByKey.value[id]
    if (!target) continue

    const label = toOptionalString(target.element.props.label) ?? id
    const description = target.element.type === 'DescriptionNode'
      ? toOptionalString(target.element.props.body)
      : toOptionalString(target.element.props.description)

    result.push({
      id,
      label,
      description,
    })
  }

  return result
})

const selectedBranchChoiceId = computed(() => {
  const node = activeNode.value
  if (!node || branchChoices.value.length === 0) return undefined

  const selected = selectedBranchByNode.value[node.key]
  if (selected) return selected

  return nextPlannedNodeKey.value
})

function chooseChoice(choiceId: string) {
  const node = activeNode.value
  if (!node) return

  const options = outgoingNodeKeys.value[node.key] ?? []
  if (!options.includes(choiceId)) return

  selectedBranchByNode.value = {
    ...selectedBranchByNode.value,
    [node.key]: choiceId,
  }

  const prefix = pathFrames.value.slice(0, currentStep.value + 1)
  const suffix = buildGuidedPath(choiceId)

  pathFrames.value = [...prefix, ...suffix]

  if (pathFrames.value.length > currentStep.value + 1) {
    currentStep.value += 1
  }
}

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
          :active="isActive(data.key)"
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
          :active="isActive(data.key)"
          :step-index="codeStepIndex(data.key)"
        />
      </template>

      <template #node-description="{ data }">
        <DescriptionNodeVue
          :label="toRequiredString(data.props.label)"
          :body="toRequiredString(data.props.body)"
          :active="isActive(data.key)"
        />
      </template>

      <template #node-link="{ data }">
        <LinkNodeVue
          :label="toRequiredString(data.props.label)"
          :href="toRequiredString(data.props.href)"
          :description="toOptionalString(data.props.description)"
          :active="isActive(data.key)"
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
          :choices="branchChoices"
          :selected-choice-id="selectedBranchChoiceId"
          @next="next"
          @prev="prev"
          @go-to="goTo"
          @toggle-play="togglePlay"
          @choose-choice="chooseChoice"
        />
      </div>
    </div>
  </div>
</template>
