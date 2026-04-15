import type { InjectionKey, Ref } from "vue";
import type { FlaierCustomNodeDefinitions, FlaierFlowOption, FlaierSpec } from "./types";

export interface FlaierRuntimeContext {
  spec: Ref<FlaierSpec | null>;
  interval: Ref<number>;
  nodes: Ref<FlaierCustomNodeDefinitions>;
  flowOptions: Ref<FlaierFlowOption[]>;
  activeFlowId: Ref<string | null>;
  viewportResetToken: Ref<number>;
  setActiveFlow: (flowId: string) => void;
}

export const flaierRuntimeKey: InjectionKey<FlaierRuntimeContext> = Symbol("flaier-runtime");
