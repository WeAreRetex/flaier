import type { InjectionKey, Ref } from "vue";
import type { FlaierFlowOption, FlaierSpec } from "./types";

export interface FlaierRuntimeContext {
  spec: Ref<FlaierSpec | null>;
  interval: Ref<number>;
  flowOptions: Ref<FlaierFlowOption[]>;
  activeFlowId: Ref<string | null>;
  setActiveFlow: (flowId: string) => void;
}

export const flaierRuntimeKey: InjectionKey<FlaierRuntimeContext> = Symbol("flaier-runtime");
