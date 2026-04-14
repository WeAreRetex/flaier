import type { InjectionKey, Ref } from "vue";
import type { FlowNarratorFlowOption, FlowNarratorSpec } from "./types";

export interface FlowNarratorRuntimeContext {
  spec: Ref<FlowNarratorSpec | null>;
  interval: Ref<number>;
  flowOptions: Ref<FlowNarratorFlowOption[]>;
  activeFlowId: Ref<string | null>;
  setActiveFlow: (flowId: string) => void;
}

export const flowNarratorRuntimeKey: InjectionKey<FlowNarratorRuntimeContext> =
  Symbol("flow-narrator-runtime");
