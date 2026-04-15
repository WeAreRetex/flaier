import { defineComponent, markRaw, type Component } from "vue";
import type { FlaierCustomNodeDefinition, FlaierCustomNodeDefinitions } from "./types";

const RESERVED_FLAIER_NODE_NAMES = new Set([
  "FlowTimeline",
  "ArchitectureNode",
  "TriggerNode",
  "CodeNode",
  "DecisionNode",
  "PayloadNode",
  "ErrorNode",
  "DescriptionNode",
  "LinkNode",
]);

const FlaierNullNode = defineComponent({
  name: "FlaierNullNode",
  setup() {
    return () => null;
  },
});

function normalizeFlaierCustomNodeDefinition(
  definition: FlaierCustomNodeDefinition,
): FlaierCustomNodeDefinition {
  return {
    ...definition,
    component: markRaw(definition.component) as Component,
  };
}

export function normalizeFlaierCustomNodes(
  nodes?: FlaierCustomNodeDefinitions,
): FlaierCustomNodeDefinitions {
  if (!nodes) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(nodes)
      .filter(([name]) => {
        if (!RESERVED_FLAIER_NODE_NAMES.has(name)) {
          return true;
        }

        console.warn(`[flaier] Ignoring custom node "${name}" because the name is reserved.`);
        return false;
      })
      .map(([name, definition]) => [name, normalizeFlaierCustomNodeDefinition(definition)]),
  );
}

export function mergeFlaierCustomNodes(
  ...sources: Array<FlaierCustomNodeDefinitions | undefined>
): FlaierCustomNodeDefinitions {
  return sources.reduce<FlaierCustomNodeDefinitions>((result, source) => {
    if (!source) {
      return result;
    }

    return {
      ...result,
      ...normalizeFlaierCustomNodes(source),
    };
  }, {});
}

export function createFlaierCustomCatalogComponents(nodes?: FlaierCustomNodeDefinitions) {
  const normalizedNodes = normalizeFlaierCustomNodes(nodes);

  if (Object.keys(normalizedNodes).length === 0) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(normalizedNodes).map(([name, definition]) => [
      name,
      {
        props: definition.props,
        description: definition.description,
      },
    ]),
  );
}

export function createFlaierCustomRegistryComponents(nodes?: FlaierCustomNodeDefinitions) {
  const normalizedNodes = normalizeFlaierCustomNodes(nodes);

  if (Object.keys(normalizedNodes).length === 0) {
    return {};
  }

  return Object.fromEntries(Object.keys(normalizedNodes).map((name) => [name, FlaierNullNode])) as Record<
    string,
    Component
  >;
}
