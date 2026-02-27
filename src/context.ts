import type { InjectionKey, Ref } from 'vue'
import type { FlowNarratorSpec } from './types'

export interface FlowNarratorRuntimeContext {
  spec: Ref<FlowNarratorSpec | null>
  interval: Ref<number>
}

export const flowNarratorRuntimeKey: InjectionKey<FlowNarratorRuntimeContext> = Symbol('flow-narrator-runtime')
