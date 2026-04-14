import { inject } from "vue";
import { flaierRuntimeKey } from "../context";

export function useFlaierRuntime() {
  const context = inject(flaierRuntimeKey);

  if (!context) {
    throw new Error("[flaier] Runtime context not found. Wrap components with <Flaier>.");
  }

  return context;
}
