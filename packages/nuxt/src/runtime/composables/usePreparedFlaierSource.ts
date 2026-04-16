import { useAsyncData, useRequestURL } from "#imports";
import { computed, unref, type Ref } from "vue";
import type { FlaierSource } from "@flaier/core";

const PREPARE_ENDPOINT = "/_flaier/prepare";

function serializeSource(value: FlaierSource) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-flow-source]";
  }
}

export async function usePreparedFlaierSource(source: Ref<FlaierSource>) {
  const requestUrl = import.meta.server ? useRequestURL() : null;
  const serverBaseUrl = import.meta.server ? requestUrl?.toString() : undefined;

  const key = computed(() => `flaier:prepared:${serializeSource(unref(source))}`);

  const { data } = await useAsyncData<FlaierSource>(
    key,
    async () => {
      const current = unref(source);

      try {
        if (import.meta.server) {
          const { prepareFlaierSource } = await import("../server/prepareFlaierSource");

          return await prepareFlaierSource(current, {
            baseUrl: serverBaseUrl,
            fetchJson: (url) => fetchJsonSource(resolveFetchUrl(url, serverBaseUrl)),
          });
        }

        return await $fetch<FlaierSource>(PREPARE_ENDPOINT, {
          method: "POST",
          body: {
            source: current,
            baseUrl: typeof window !== "undefined" ? window.location.href : undefined,
          },
        });
      } catch (error) {
        console.warn(`[flaier/nuxt] Failed to prepare flow source. ${formatErrorMessage(error)}`);
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

async function fetchJsonSource(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`[${response.status}] "${url}": ${response.statusText || "Request failed"}`);
  }

  return (await response.json()) as FlaierSource;
}

function resolveFetchUrl(value: string, baseUrl?: string) {
  if (!baseUrl) {
    return value;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
