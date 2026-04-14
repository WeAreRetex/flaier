import { useAsyncData, useRequestFetch, useRequestURL } from "#imports";
import { computed, unref, type Ref } from "vue";
import type { FlowNarratorSource } from "flow-narrator";

const PREPARE_ENDPOINT = "/_flow-narrator/prepare";

function serializeSource(value: FlowNarratorSource) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-flow-source]";
  }
}

export async function usePreparedFlowNarratorSource(source: Ref<FlowNarratorSource>) {
  const requestUrl = import.meta.server ? useRequestURL() : null;
  const requestFetch = import.meta.server ? useRequestFetch() : null;

  const key = computed(() => `flow-narrator:prepared:${serializeSource(unref(source))}`);

  const { data } = await useAsyncData<FlowNarratorSource>(
    key,
    async () => {
      const current = unref(source);

      try {
        if (import.meta.server && requestFetch) {
          const { prepareFlowNarratorSource } = await import("../server/prepareFlowNarratorSource");

          return await prepareFlowNarratorSource(current, {
            baseUrl: requestUrl?.toString(),
            fetchJson: (url) => requestFetch(url),
          });
        }

        return await $fetch<FlowNarratorSource>(PREPARE_ENDPOINT, {
          method: "POST",
          body: {
            source: current,
            baseUrl: typeof window !== "undefined" ? window.location.href : undefined,
          },
        });
      } catch (error) {
        console.warn("[flow-narrator/nuxt] Failed to prepare flow source.", error);
        return current;
      }
    },
    {
      watch: [source],
      default: () => unref(source),
    },
  );

  return computed(() => data.value ?? unref(source));
}
