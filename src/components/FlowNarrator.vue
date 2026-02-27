<script setup lang="ts">
import {
  ActionProvider,
  Renderer,
  StateProvider,
  VisibilityProvider,
} from '@json-render/vue'
import {
  autoFixSpec,
  formatSpecIssues,
  type Spec,
  validateSpec,
} from '@json-render/core'
import { computed, provide, ref, toRef, watch } from 'vue'
import { flowNarratorRuntimeKey } from '../context'
import { registry } from '../registry'
import type { FlowNarratorProps, FlowNarratorSpec } from '../types'

const props = withDefaults(defineProps<FlowNarratorProps>(), {
  autoPlay: false,
  interval: 3000,
})

const emit = defineEmits<{
  loaded: [spec: FlowNarratorSpec]
  'load-error': [message: string]
  'state-change': [changes: Array<{ path: string; value: unknown }>]
}>()

const resolvedSpec = ref<FlowNarratorSpec | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const specVersion = ref(0)

provide(flowNarratorRuntimeKey, {
  spec: resolvedSpec,
  interval: toRef(props, 'interval'),
})

watch(
  () => props.src,
  () => {
    void loadSpec()
  },
  { immediate: true },
)

const initialState = computed<Record<string, unknown>>(() => {
  const specState = (resolvedSpec.value?.state ?? {}) as Record<string, unknown>
  const parsedCurrentStep = Number(specState.currentStep)

  return {
    ...specState,
    currentStep: Number.isFinite(parsedCurrentStep)
      ? Math.max(0, Math.floor(parsedCurrentStep))
      : 0,
    playing: props.autoPlay ? true : Boolean(specState.playing),
  }
})

const providerKey = computed(() => {
  const spec = resolvedSpec.value
  if (!spec) return 'flow-narrator-empty'
  return `${specVersion.value}-${spec.root}-${Object.keys(spec.elements).length}-${props.autoPlay ? 'auto' : 'manual'}`
})

async function loadSpec() {
  loading.value = true
  loadError.value = null

  try {
    const incoming = await resolveSource(props.src)
    const fixed = autoFixSpec(incoming as Spec)
    const validation = validateSpec(fixed.spec)

    if (!validation.valid) {
      console.warn(`[flow-narrator] Invalid spec:\n${formatSpecIssues(validation.issues)}`)
    }

    resolvedSpec.value = fixed.spec as FlowNarratorSpec
    specVersion.value += 1
    emit('loaded', resolvedSpec.value)
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Failed to load flow narrator source.'

    loadError.value = message
    resolvedSpec.value = null
    emit('load-error', message)
  } finally {
    loading.value = false
  }
}

async function resolveSource(source: FlowNarratorProps['src']): Promise<FlowNarratorSpec> {
  if (typeof source !== 'string') {
    return cloneSpec(source)
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(`Failed to fetch spec from "${source}" (${response.status} ${response.statusText})`)
  }

  const payload = (await response.json()) as unknown
  if (!isFlowNarratorSpec(payload)) {
    throw new Error('Fetched JSON is not a valid flow-narrator spec.')
  }

  return cloneSpec(payload)
}

function cloneSpec(spec: FlowNarratorSpec): FlowNarratorSpec {
  if (typeof structuredClone === 'function') {
    return structuredClone(spec)
  }

  return JSON.parse(JSON.stringify(spec)) as FlowNarratorSpec
}

function isFlowNarratorSpec(value: unknown): value is FlowNarratorSpec {
  if (!isObject(value)) return false
  if (typeof value.root !== 'string') return false
  if (!isObject(value.elements)) return false
  return true
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function handleStateChange(changes: Array<{ path: string; value: unknown }>) {
  emit('state-change', changes)
}
</script>

<template>
  <div class="relative h-full w-full">
    <div v-if="loading" class="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading flow spec...
    </div>

    <div
      v-else-if="loadError"
      class="flex h-full w-full items-center justify-center px-6 text-center text-sm text-red-300"
    >
      {{ loadError }}
    </div>

    <StateProvider
      v-else-if="resolvedSpec"
      :key="providerKey"
      :initial-state="initialState"
      :on-state-change="handleStateChange"
    >
      <ActionProvider>
        <VisibilityProvider>
          <Renderer :spec="resolvedSpec" :registry="registry" />
        </VisibilityProvider>
      </ActionProvider>
    </StateProvider>
  </div>
</template>
