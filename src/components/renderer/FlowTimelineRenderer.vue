<script setup lang="ts">
import dagre from '@dagrejs/dagre'
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

import {
  CODE_NODE_MAX_INLINE_CHARS,
  estimateCodeNodeCharsPerLine,
  estimateCodeNodeWidth,
} from '../../code-node-sizing'
import {
  hasTwoslashHints,
  normalizeTwoslashLanguage,
} from '../../composables/useTwoslash'
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
  layoutEngine?: 'dagre' | 'manual'
  layoutRankSep?: number
  layoutNodeSep?: number
  layoutEdgeSep?: number
}>(), {
  direction: 'horizontal',
  layoutEngine: 'dagre',
})

const TYPE_MAP: Record<string, FlowNodeType> = {
  TriggerNode: 'trigger',
  CodeNode: 'code',
  DescriptionNode: 'description',
  LinkNode: 'link',
}

const DEFAULT_LAYOUT_ENGINE = 'dagre'
const DEFAULT_FALLBACK_GAP = 420
const DEFAULT_DAGRE_RANK_SEP_HORIZONTAL = 260
const DEFAULT_DAGRE_NODE_SEP_HORIZONTAL = 120
const DEFAULT_DAGRE_RANK_SEP_VERTICAL = 220
const DEFAULT_DAGRE_NODE_SEP_VERTICAL = 120
const DEFAULT_DAGRE_EDGE_SEP = 30
const OVERVIEW_ENTER_ZOOM = 0.52
const OVERVIEW_EXIT_ZOOM = 0.62
const FLOW_NARRATOR_THEME_STORAGE_KEY = 'flow-narrator-ui-theme'

interface NodeSize {
  width: number
  height: number
}

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
const availableFlows = computed(() => runtime.flowOptions.value)
const activeFlowId = computed(() => runtime.activeFlowId.value)
const activeFlow = computed(() => {
  const activeId = activeFlowId.value
  if (!activeId) return undefined
  return availableFlows.value.find((flow) => flow.id === activeId)
})
const showFlowSelector = computed(() => availableFlows.value.length > 1)
const overlayTitle = computed(() => activeFlow.value?.title ?? props.title)
const overlayDescription = computed(() => activeFlow.value?.description ?? props.description)
const headerDropdownRef = ref<HTMLDivElement | null>(null)
const headerDropdownOpen = ref(false)
const uiTheme = ref<'dark' | 'light'>('dark')
const isLightTheme = computed(() => uiTheme.value === 'light')
const themeToggleLabel = computed(() => {
  return isLightTheme.value ? 'Switch to dark mode' : 'Switch to light mode'
})

function toggleTheme() {
  uiTheme.value = isLightTheme.value ? 'dark' : 'light'
}

function normalizeTheme(value: unknown): 'dark' | 'light' | null {
  if (value === 'dark' || value === 'light') {
    return value
  }

  return null
}

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return normalizeTheme(window.localStorage.getItem(FLOW_NARRATOR_THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

function getPreferredSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function persistTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(FLOW_NARRATOR_THEME_STORAGE_KEY, theme)
  } catch {
    // no-op when storage is unavailable
  }
}

function toggleHeaderDropdown() {
  if (!showFlowSelector.value) return
  headerDropdownOpen.value = !headerDropdownOpen.value
}

function closeHeaderDropdown() {
  headerDropdownOpen.value = false
}

function handleFlowSelect(flowId: string) {
  if (!flowId) return

  runtime.setActiveFlow(flowId)
  headerDropdownOpen.value = false
}

watch(showFlowSelector, (show) => {
  if (!show) {
    headerDropdownOpen.value = false
  }
})

watch(activeFlowId, () => {
  headerDropdownOpen.value = false
})

watch(uiTheme, (theme) => {
  persistTheme(theme)
})

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

function toOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function codeNodeTwoslashEnabled(element: SpecElement) {
  if (element.type !== 'CodeNode') return false

  if (!normalizeTwoslashLanguage(toOptionalString(element.props.language))) {
    return false
  }

  const requested = toOptionalBoolean(element.props.twoslash)
  if (requested === true) return true
  if (requested === false) return false

  const variants = [
    toRequiredString(element.props.code),
    ...toMagicMoveSteps(element.props.magicMoveSteps).map((step) => step.code),
  ]

  return variants.some((code) => hasTwoslashHints(code))
}

function toPositiveNumber(value: unknown, fallback: number, min = 1) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(min, Math.floor(value))
  }

  return fallback
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

  const magicMoveSteps = toMagicMoveSteps(element.props.magicMoveSteps)
  const baseSteps = Math.max(1, magicMoveSteps.length)

  if (magicMoveSteps.length > 0 && codeNodeTwoslashEnabled(element)) {
    return baseSteps + 1
  }

  return baseSteps
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

function estimateNodeTextLines(value: unknown, charsPerLine: number) {
  const text = toOptionalString(value)
  if (!text) return 0
  return estimateWrappedLines(text, charsPerLine)
}

function estimateCodeNodeSize(element: SpecElement): NodeSize {
  const maxLineLength = getCodeNodeMaxLineLength(element)
  const nodeWidth = estimateCodeNodeWidth(maxLineLength)
  const codeCharsPerLine = estimateCodeNodeCharsPerLine(nodeWidth)
  const autoWrapEnabled = maxLineLength > CODE_NODE_MAX_INLINE_CHARS
  const wrapEnabled = toBoolean(element.props.wrapLongLines) || autoWrapEnabled

  const codeLines = wrapEnabled
    ? getCodeNodeWrappedLines(element, codeCharsPerLine)
    : getCodeNodeMaxLines(element)
  const storyLines = getCodeNodeStoryLines(element)
  const storyHasMeta = hasCodeNodeStoryMeta(element)

  const codeViewportHeight = wrapEnabled
    ? Math.min(400, Math.max(190, 72 + codeLines * 16))
    : Math.min(340, Math.max(160, 84 + codeLines * 17))

  const storyViewportHeight = storyLines > 0
    ? Math.min(220, Math.max(88, (storyHasMeta ? 56 : 34) + storyLines * 18))
    : 0

  return {
    width: nodeWidth,
    height: Math.min(760, Math.max(230, 42 + codeViewportHeight + storyViewportHeight + 14)),
  }
}

function estimateNodeSize(node: OrderedNodeElement): NodeSize {
  const { element } = node

  if (element.type === 'CodeNode') {
    return estimateCodeNodeSize(element)
  }

  if (element.type === 'TriggerNode') {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 24))
    const descriptionLines = estimateNodeTextLines(element.props.description, 30)

    return {
      width: 220,
      height: Math.min(280, Math.max(92, 46 + labelLines * 18 + descriptionLines * 15)),
    }
  }

  if (element.type === 'DescriptionNode') {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 26))
    const bodyLines = Math.max(1, estimateNodeTextLines(element.props.body, 30))

    return {
      width: 240,
      height: Math.min(340, Math.max(110, 44 + labelLines * 18 + bodyLines * 16)),
    }
  }

  if (element.type === 'LinkNode') {
    const labelLines = Math.max(1, estimateNodeTextLines(element.props.label, 24))
    const descriptionLines = estimateNodeTextLines(element.props.description, 30)

    return {
      width: 220,
      height: Math.min(280, Math.max(90, 42 + labelLines * 18 + descriptionLines * 15)),
    }
  }

  return {
    width: 240,
    height: 120,
  }
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

function findNearestFrameIndex(frames: TimelineFrame[], nodeKey: string, anchor = 0) {
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < frames.length; index += 1) {
    if (frames[index]?.nodeKey !== nodeKey) continue

    const distance = Math.abs(index - anchor)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

function sortOptionsForTraversal(sourceKey: string, options: string[]) {
  const selected = selectedBranchByNode.value[sourceKey]

  return [...options].sort((a, b) => {
    const aSelected = a === selected
    const bSelected = b === selected

    if (aSelected !== bSelected) {
      return aSelected ? -1 : 1
    }

    const aIndex = orderedNodeByKey.value[a]?.index ?? Number.MAX_SAFE_INTEGER
    const bIndex = orderedNodeByKey.value[b]?.index ?? Number.MAX_SAFE_INTEGER

    return aIndex - bIndex
  })
}

function findPathKeysToNode(startKey: string, targetKey: string) {
  if (startKey === targetKey) {
    return [startKey]
  }

  const queue: Array<{ key: string; path: string[]; depth: number }> = [{
    key: startKey,
    path: [startKey],
    depth: 0,
  }]

  const visitedDepth = new Map<string, number>([[startKey, 0]])
  const maxDepth = Math.max(8, orderedNodeElements.value.length + 8)
  const maxIterations = Math.max(80, orderedNodeElements.value.length * orderedNodeElements.value.length * 2)
  let guard = 0

  while (queue.length > 0 && guard < maxIterations) {
    guard += 1

    const current = queue.shift()
    if (!current) continue
    if (current.depth >= maxDepth) continue

    const options = sortOptionsForTraversal(current.key, outgoingNodeKeys.value[current.key] ?? [])

    for (const option of options) {
      if (!orderedNodeByKey.value[option]) continue

      const nextDepth = current.depth + 1
      if (option === targetKey) {
        return [...current.path, option]
      }

      const knownDepth = visitedDepth.get(option)
      if (knownDepth !== undefined && knownDepth <= nextDepth) {
        continue
      }

      visitedDepth.set(option, nextDepth)
      queue.push({
        key: option,
        path: [...current.path, option],
        depth: nextDepth,
      })
    }
  }

  return null
}

function applyBranchSelectionsForPath(pathKeys: string[]) {
  if (pathKeys.length < 2) return

  const nextSelected = { ...selectedBranchByNode.value }

  for (let index = 0; index < pathKeys.length - 1; index += 1) {
    const source = pathKeys[index]
    const target = pathKeys[index + 1]
    if (!source || !target) continue

    const options = outgoingNodeKeys.value[source] ?? []
    if (options.length > 1 && options.includes(target)) {
      nextSelected[source] = target
    }
  }

  selectedBranchByNode.value = nextSelected
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

function jumpToNode(nodeKey: string) {
  if (!orderedNodeByKey.value[nodeKey]) return

  playing.value = false

  const existingIndex = findNearestFrameIndex(pathFrames.value, nodeKey, currentStep.value)
  if (existingIndex >= 0) {
    currentStep.value = existingIndex
    return
  }

  const start = startNodeKey.value
  if (!start) {
    const standaloneFrames = createFramesForNode(nodeKey)
    if (standaloneFrames.length === 0) return

    pathFrames.value = standaloneFrames
    currentStep.value = 0
    return
  }

  const pathKeys = findPathKeysToNode(start, nodeKey)
  if (pathKeys) {
    applyBranchSelectionsForPath(pathKeys)
  }

  const rebuiltFrames = buildGuidedPath(start)
  pathFrames.value = rebuiltFrames.length > 0 ? rebuiltFrames : createFramesForNode(start)

  const rebuiltIndex = findNearestFrameIndex(pathFrames.value, nodeKey, currentStep.value)
  if (rebuiltIndex >= 0) {
    currentStep.value = rebuiltIndex
    return
  }

  const standaloneFrames = createFramesForNode(nodeKey)
  if (standaloneFrames.length === 0) return

  pathFrames.value = standaloneFrames
  currentStep.value = 0
}

const resolvedLayoutEngine = computed<'dagre' | 'manual'>(() => {
  return props.layoutEngine === 'manual' ? 'manual' : DEFAULT_LAYOUT_ENGINE
})

const resolvedLayoutRankSep = computed(() => {
  const fallback = props.direction === 'vertical'
    ? DEFAULT_DAGRE_RANK_SEP_VERTICAL
    : DEFAULT_DAGRE_RANK_SEP_HORIZONTAL

  return toPositiveNumber(props.layoutRankSep, fallback, 80)
})

const resolvedLayoutNodeSep = computed(() => {
  const fallback = props.direction === 'vertical'
    ? DEFAULT_DAGRE_NODE_SEP_VERTICAL
    : DEFAULT_DAGRE_NODE_SEP_HORIZONTAL

  return toPositiveNumber(props.layoutNodeSep, fallback, 40)
})

const resolvedLayoutEdgeSep = computed(() => {
  return toPositiveNumber(props.layoutEdgeSep, DEFAULT_DAGRE_EDGE_SEP, 8)
})

function createFallbackLayoutPositions(nodes: OrderedNodeElement[], rankGap = DEFAULT_FALLBACK_GAP) {
  const mainGap = Math.max(80, rankGap)
  const positions: Record<string, { x: number; y: number }> = {}

  for (const node of nodes) {
    if (props.direction === 'vertical') {
      positions[node.key] = { x: 0, y: node.index * mainGap }
      continue
    }

    positions[node.key] = { x: node.index * mainGap, y: 0 }
  }

  return positions
}

function normalizePositions(positions: Record<string, { x: number; y: number }>) {
  if (Object.keys(positions).length === 0) {
    return positions
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY

  for (const position of Object.values(positions)) {
    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
  }

  for (const key of Object.keys(positions)) {
    const currentPosition = positions[key]
    if (!currentPosition) continue

    positions[key] = {
      x: currentPosition.x - minX,
      y: currentPosition.y - minY,
    }
  }

  return positions
}

function createManualLayoutPositions(
  orderedNodes: OrderedNodeElement[],
  rankGap: number,
  laneGap: number,
) {
  if (orderedNodes.length === 0) return {}

  const depthByKey: Record<string, number> = {}
  for (const node of orderedNodes) {
    depthByKey[node.key] = Number.NEGATIVE_INFINITY
  }

  const startKey = startNodeKey.value ?? orderedNodes[0]?.key
  if (!startKey) {
    return createFallbackLayoutPositions(orderedNodes, rankGap)
  }

  depthByKey[startKey] = 0

  const queue: string[] = [startKey]
  const maxDepth = Math.max(0, orderedNodes.length - 1)
  let guard = 0
  const maxIterations = Math.max(24, orderedNodes.length * orderedNodes.length)

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
  for (const node of orderedNodes) {
    if (Number.isFinite(depthByKey[node.key])) continue

    depthByKey[node.key] = Math.min(maxDepth, fallbackDepth)
    fallbackDepth += 1
  }

  const layers: Record<number, string[]> = {}
  for (const node of orderedNodes) {
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
      laneByKey[key] = (index - (count - 1) / 2) * laneGap
    })
  }

  const positions: Record<string, { x: number; y: number }> = {}

  for (const node of orderedNodes) {
    const depth = depthByKey[node.key] ?? 0
    const lane = laneByKey[node.key] ?? 0

    if (props.direction === 'vertical') {
      positions[node.key] = {
        x: Math.round(lane),
        y: Math.round(depth * rankGap),
      }
      continue
    }

    positions[node.key] = {
      x: Math.round(depth * rankGap),
      y: Math.round(lane),
    }
  }

  return normalizePositions(positions)
}

const nodeSizes = computed<Record<string, NodeSize>>(() => {
  const sizes: Record<string, NodeSize> = {}

  for (const node of orderedNodeElements.value) {
    sizes[node.key] = estimateNodeSize(node)
  }

  return sizes
})

const layoutPositions = computed<Record<string, { x: number; y: number }>>(() => {
  const orderedNodes = orderedNodeElements.value
  if (orderedNodes.length === 0) return {}

  const rankGap = resolvedLayoutRankSep.value
  const nodeGap = resolvedLayoutNodeSep.value
  const edgeGap = resolvedLayoutEdgeSep.value
  const fallback = createFallbackLayoutPositions(orderedNodes, rankGap)

  if (resolvedLayoutEngine.value === 'manual') {
    return createManualLayoutPositions(orderedNodes, rankGap, nodeGap)
  }

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: props.direction === 'vertical' ? 'TB' : 'LR',
    ranker: 'network-simplex',
    acyclicer: 'greedy',
    align: 'UL',
    marginx: 36,
    marginy: 36,
    ranksep: rankGap,
    nodesep: nodeGap,
    edgesep: edgeGap,
  })

  for (const node of orderedNodes) {
    const size = nodeSizes.value[node.key] ?? { width: 240, height: 120 }

    graph.setNode(node.key, {
      width: size.width,
      height: size.height,
    })
  }

  for (const node of orderedNodes) {
    const targets = outgoingNodeKeys.value[node.key] ?? []
    const preferredTarget = resolveNextNode(node.key, targets)

    for (const target of targets) {
      if (!orderedNodeByKey.value[target]) continue

      graph.setEdge(node.key, target, {
        minlen: 1,
        weight: target === preferredTarget ? 3 : 1,
      })
    }
  }

  try {
    dagre.layout(graph)
  } catch {
    return fallback
  }

  const positions: Record<string, { x: number; y: number }> = {}

  for (const node of orderedNodes) {
    const layoutNode = graph.node(node.key)
    if (!layoutNode || typeof layoutNode.x !== 'number' || typeof layoutNode.y !== 'number') {
      continue
    }

    const size = nodeSizes.value[node.key] ?? { width: 240, height: 120 }

    positions[node.key] = {
      x: Math.round(layoutNode.x - size.width / 2),
      y: Math.round(layoutNode.y - size.height / 2),
    }
  }

  if (Object.keys(positions).length === 0) {
    return fallback
  }

  return normalizePositions(positions)
})

const nodes = computed<FlowNode[]>(() => {
  const fallbackPositions = createFallbackLayoutPositions(
    orderedNodeElements.value,
    resolvedLayoutRankSep.value,
  )

  return orderedNodeElements.value.map(({ key, nodeType, element, index }) => ({
    id: key,
    type: nodeType,
    position: layoutPositions.value[key]
      ?? fallbackPositions[key]
      ?? (props.direction === 'vertical'
        ? { x: 0, y: index * DEFAULT_FALLBACK_GAP }
        : { x: index * DEFAULT_FALLBACK_GAP, y: 0 }),
    data: {
      key,
      type: nodeType,
      elementType: element.type,
      props: element.props,
      index,
    },
  }))
})

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

  const maxLineLength = getCodeNodeMaxLineLength(node.element)
  const nodeWidth = estimateCodeNodeWidth(maxLineLength)
  const codeCharsPerLine = estimateCodeNodeCharsPerLine(nodeWidth)
  const autoWrapEnabled = maxLineLength > CODE_NODE_MAX_INLINE_CHARS
  const wrapEnabled = toBoolean(node.element.props.wrapLongLines) || autoWrapEnabled

  const codeLines = wrapEnabled
    ? getCodeNodeWrappedLines(node.element, codeCharsPerLine)
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
const {
  fitView,
  onNodeClick,
  onViewportChange,
  viewport,
} = useVueFlow(flowId)
const nodesInitialized = useNodesInitialized()
const paneReady = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
const containerReady = ref(false)
const overviewMode = ref(false)
let resizeObserver: ResizeObserver | null = null

function handleDocumentPointerDown(event: PointerEvent) {
  if (!headerDropdownOpen.value) return

  const target = event.target as Node | null
  if (!target) return
  if (headerDropdownRef.value?.contains(target)) return

  closeHeaderDropdown()
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true
  }

  return Boolean(target.closest('[contenteditable="true"]'))
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeHeaderDropdown()
    return
  }

  if (event.defaultPrevented) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (isEditableTarget(event.target)) return

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    next()
    return
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    prev()
    return
  }

  if (/^[1-9]$/.test(event.key)) {
    const index = Number(event.key) - 1
    const choice = branchChoices.value[index]
    if (!choice) return

    event.preventDefault()
    chooseChoice(choice.id)
  }
}

function syncOverviewModeFromZoom(zoom: number) {
  if (overviewMode.value) {
    if (zoom >= OVERVIEW_EXIT_ZOOM) {
      overviewMode.value = false
    }

    return
  }

  if (zoom <= OVERVIEW_ENTER_ZOOM) {
    overviewMode.value = true
  }
}

watch(() => viewport.value.zoom, (zoom) => {
  if (!Number.isFinite(zoom)) return

  syncOverviewModeFromZoom(zoom)
}, { immediate: true })

onViewportChange((transform) => {
  if (!Number.isFinite(transform.zoom)) return

  syncOverviewModeFromZoom(transform.zoom)
})

onNodeClick(({ node }) => {
  jumpToNode(node.id)
})

function updateContainerReady() {
  const element = containerRef.value
  containerReady.value = Boolean(element && element.clientWidth > 0 && element.clientHeight > 0)
}

onMounted(() => {
  uiTheme.value = readStoredTheme() ?? getPreferredSystemTheme()

  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleDocumentKeydown)
  }

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

  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handleDocumentPointerDown)
    document.removeEventListener('keydown', handleDocumentKeydown)
  }

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
    :data-focus-mode="overviewMode ? 'overview' : 'focus'"
    :data-theme="uiTheme"
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
          :twoslash="toOptionalBoolean(data.props.twoslash)"
          :ui-theme="uiTheme"
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

    <div
      v-if="showFlowSelector || overlayTitle || overlayDescription"
      ref="headerDropdownRef"
      class="absolute top-4 left-4 z-20 w-[min(90vw,430px)]"
    >
      <div class="relative">
        <button
          type="button"
          class="group w-full rounded-lg border border-border/70 bg-card/85 px-3 py-2 text-left text-xs shadow-lg backdrop-blur-md transition-colors"
          :class="showFlowSelector ? 'cursor-pointer hover:border-primary/45' : 'cursor-default'"
          :disabled="!showFlowSelector"
          :aria-expanded="showFlowSelector ? headerDropdownOpen : undefined"
          aria-haspopup="listbox"
          @click="toggleHeaderDropdown"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {{ showFlowSelector ? 'Flow' : 'Narrative' }}
              </p>
              <p v-if="overlayTitle" class="mt-1 truncate text-sm font-medium text-foreground">
                {{ overlayTitle }}
              </p>
              <p v-if="overlayDescription" class="mt-0.5 text-[11px] leading-relaxed text-muted-foreground break-words">
                {{ overlayDescription }}
              </p>
            </div>

            <svg
              v-if="showFlowSelector"
              class="mt-0.5 h-4 w-4 shrink-0 transition-all"
              :class="headerDropdownOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground group-hover:text-foreground'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>

        <div
          v-if="showFlowSelector && headerDropdownOpen"
          class="absolute inset-x-0 top-[calc(100%+8px)] rounded-lg border border-border/70 bg-card/95 p-1 shadow-2xl backdrop-blur-md"
          role="listbox"
        >
          <button
            v-for="flow in availableFlows"
            :key="flow.id"
            type="button"
            class="w-full rounded-md px-2.5 py-2 text-left transition-colors"
            :class="flow.id === activeFlowId ? 'bg-primary/14 text-foreground' : 'text-foreground/90 hover:bg-muted/70'"
            @click="handleFlowSelect(flow.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-medium">{{ flow.title }}</p>
              <span
                v-if="flow.id === activeFlowId"
                class="rounded-full border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary"
              >
                Active
              </span>
            </div>
            <p v-if="flow.description" class="mt-0.5 text-[11px] leading-relaxed text-muted-foreground break-words">
              {{ flow.description }}
            </p>
          </button>
        </div>
      </div>
    </div>

    <div class="absolute top-4 right-4 z-20">
      <button
        type="button"
        class="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/85 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:text-foreground"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        @click="toggleTheme"
      >
        <svg
          v-if="isLightTheme"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Z" />
          <path d="M18.36 5.64a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.7a1 1 0 0 1 0-1.42Z" />
          <path d="M20 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1Z" />
          <path d="M18.36 18.36a1 1 0 0 1 0-1.41l.71-.71a1 1 0 0 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42 0Z" />
          <path d="M12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
          <path d="M5.64 18.36a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 1 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42Z" />
          <path d="M5 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2h1Z" />
          <path d="M5.64 5.64a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0Z" />
          <circle cx="12" cy="12" r="4" />
        </svg>

        <svg
          v-else
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z" />
        </svg>
      </button>
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
