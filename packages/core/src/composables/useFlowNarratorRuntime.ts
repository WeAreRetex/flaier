import { inject } from "vue";
import { flowNarratorRuntimeKey } from "../context";

export function useFlowNarratorRuntime() {
  const context = inject(flowNarratorRuntimeKey);

  if (!context) {
    throw new Error(
      "[flow-narrator] Runtime context not found. Wrap components with <FlowNarrator>.",
    );
  }

  return context;
}
