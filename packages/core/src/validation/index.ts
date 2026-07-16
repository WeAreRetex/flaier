// Pure, Vue-free entry (@flaier/core/validation) safe to import from Node
// contexts such as nitro server handlers and the agents CLI.
export { validateFlaierReadiness, type FlowReadinessResult } from "./flow-ready-validation";
export {
  isFlowSpecPayload,
  sanitizeSpecForPersistence,
  serializeSpecToDisk,
  validateSpecForPersistence,
  type SpecPersistenceValidation,
} from "./persistence";
export {
  addEdge,
  addNode,
  addZone,
  deleteNode,
  ensureReachability,
  generateNodeKey,
  getLayoutPositions,
  materializeImplicitTransitions,
  pruneOrphanPositions,
  removeEdge,
  setNodePosition,
  snapshotAllPositions,
  updateEdgeMeta,
  updateNodeProps,
  updateZone,
  removeZone,
  type AddEdgeMeta,
  type AddNodeInput,
  type AddZoneInput,
  type FlowLayoutPosition,
  type FlowLayoutPositions,
} from "../spec-edit";
export type { FlaierSpec, SpecElement } from "../types";
