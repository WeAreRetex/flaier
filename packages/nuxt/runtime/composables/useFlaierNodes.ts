import { computed, unref, type MaybeRefOrGetter } from "vue";
import { useNuxtApp } from "#imports";
import { mergeFlaierCustomNodes, type FlaierCustomNodeDefinitions } from "@flaier/core";

type FlaierNuxtApp = ReturnType<typeof useNuxtApp> & {
  _flaierNodes?: FlaierCustomNodeDefinitions;
};

function getNuxtNodeStore() {
  const nuxtApp = useNuxtApp() as FlaierNuxtApp;

  if (!nuxtApp._flaierNodes) {
    nuxtApp._flaierNodes = {};
  }

  return nuxtApp;
}

export function registerFlaierNodes(nodes: FlaierCustomNodeDefinitions) {
  const nuxtApp = getNuxtNodeStore();
  nuxtApp._flaierNodes = mergeFlaierCustomNodes(nuxtApp._flaierNodes, nodes);
  return nuxtApp._flaierNodes;
}

export function useRegisteredFlaierNodes() {
  return getNuxtNodeStore()._flaierNodes ?? {};
}

export function useMergedFlaierNodes(
  nodes?: MaybeRefOrGetter<FlaierCustomNodeDefinitions | undefined>,
) {
  const registeredNodes = useRegisteredFlaierNodes();

  return computed(() => mergeFlaierCustomNodes(registeredNodes, unref(nodes)));
}
