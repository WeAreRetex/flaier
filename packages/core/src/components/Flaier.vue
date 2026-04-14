<script setup lang="ts">
import { ActionProvider, Renderer, StateProvider, VisibilityProvider } from "@json-render/vue";
import { autoFixSpec, formatSpecIssues, type Spec, validateSpec } from "@json-render/core";
import { computed, provide, ref, toRef, watch } from "vue";
import { flaierRuntimeKey } from "../context";
import { registry } from "../registry";
import type {
  FlaierFlowOption,
  FlaierManifest,
  FlaierManifestFlow,
  FlaierProps,
  FlaierSource,
  FlaierSpec,
} from "../types";

const props = withDefaults(defineProps<FlaierProps>(), {
  autoPlay: false,
  interval: 3000,
});

const emit = defineEmits<{
  loaded: [spec: FlaierSpec];
  "load-error": [message: string];
  "state-change": [changes: Array<{ path: string; value: unknown }>];
}>();

interface ResolvedFlowDocument {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
  entrypoints?: string[];
  source: FlaierSpec | string;
}

const resolvedSpec = ref<FlaierSpec | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const specVersion = ref(0);
const flowDocuments = ref<ResolvedFlowDocument[]>([]);
const flowOptions = ref<FlaierFlowOption[]>([]);
const activeFlowId = ref<string | null>(null);

let sourceRequestId = 0;
let flowRequestId = 0;

provide(flaierRuntimeKey, {
  spec: resolvedSpec,
  interval: toRef(props, "interval"),
  flowOptions,
  activeFlowId,
  setActiveFlow,
});

watch(
  () => props.src,
  () => {
    void loadSourceCollection();
  },
  { immediate: true },
);

const initialState = computed<Record<string, unknown>>(() => {
  const specState = (resolvedSpec.value?.state ?? {}) as Record<string, unknown>;
  const parsedCurrentStep = Number(specState.currentStep);

  return {
    ...specState,
    currentStep: Number.isFinite(parsedCurrentStep)
      ? Math.max(0, Math.floor(parsedCurrentStep))
      : 0,
    playing: props.autoPlay ? true : Boolean(specState.playing),
  };
});

const providerKey = computed(() => {
  const spec = resolvedSpec.value;
  if (!spec) return "flaier-empty";
  return `${specVersion.value}-${spec.root}-${Object.keys(spec.elements).length}-${props.autoPlay ? "auto" : "manual"}`;
});

async function loadSourceCollection() {
  const requestId = ++sourceRequestId;

  loading.value = true;
  loadError.value = null;
  resolvedSpec.value = null;

  try {
    const resolved = await resolveFlowDocuments(props.src);
    if (requestId !== sourceRequestId) return;

    if (resolved.flows.length === 0) {
      throw new Error("No flow specs were found in source.");
    }

    flowDocuments.value = resolved.flows;
    syncFlowOptions();

    const nextActive = pickActiveFlowId(resolved.defaultFlowId);
    activeFlowId.value = nextActive;

    if (!nextActive) {
      resolvedSpec.value = null;
      return;
    }

    await loadFlowSpec(nextActive, requestId);
  } catch (error) {
    if (requestId !== sourceRequestId) return;

    const message = error instanceof Error ? error.message : "Failed to load flaier source.";

    loadError.value = message;
    resolvedSpec.value = null;
    flowDocuments.value = [];
    flowOptions.value = [];
    activeFlowId.value = null;
    emit("load-error", message);
  } finally {
    if (requestId === sourceRequestId) {
      loading.value = false;
    }
  }
}

function pickActiveFlowId(defaultFlowId?: string) {
  if (defaultFlowId && flowDocuments.value.some((flow) => flow.id === defaultFlowId)) {
    return defaultFlowId;
  }

  const current = activeFlowId.value;
  if (current && flowDocuments.value.some((flow) => flow.id === current)) {
    return current;
  }

  return flowDocuments.value[0]?.id ?? null;
}

function setActiveFlow(flowId: string) {
  if (flowId === activeFlowId.value) return;
  if (!flowDocuments.value.some((flow) => flow.id === flowId)) return;

  activeFlowId.value = flowId;
  void activateFlow(flowId);
}

async function activateFlow(flowId: string) {
  const sourceIdAtStart = sourceRequestId;

  loading.value = true;
  loadError.value = null;

  try {
    await loadFlowSpec(flowId, sourceIdAtStart);
  } catch (error) {
    if (sourceIdAtStart !== sourceRequestId) return;

    const message = error instanceof Error ? error.message : `Failed to load flow "${flowId}".`;

    loadError.value = message;
    resolvedSpec.value = null;
    emit("load-error", message);
  } finally {
    if (sourceIdAtStart === sourceRequestId) {
      loading.value = false;
    }
  }
}

async function loadFlowSpec(flowId: string, sourceIdAtStart: number) {
  const requestId = ++flowRequestId;
  const flow = flowDocuments.value.find((item) => item.id === flowId);

  if (!flow) {
    throw new Error(`Flow "${flowId}" was not found in loaded manifest.`);
  }

  const incoming = await resolveSpecSource(flow.source);
  if (sourceIdAtStart !== sourceRequestId || requestId !== flowRequestId) {
    return;
  }

  const fixed = autoFixSpec(incoming as Spec);
  const validation = validateSpec(fixed.spec);

  if (!validation.valid) {
    console.warn(`[flaier] Invalid spec:\n${formatSpecIssues(validation.issues)}`);
  }

  const nextSpec = fixed.spec as FlaierSpec;
  resolvedSpec.value = nextSpec;
  specVersion.value += 1;

  patchFlowMetadata(flowId, nextSpec);
  emit("loaded", nextSpec);
}

async function resolveFlowDocuments(source: FlaierSource) {
  if (typeof source !== "string") {
    if (isFlaierManifest(source)) {
      return normalizeManifest(source);
    }

    if (isFlaierSpec(source)) {
      return normalizeSingleSpec(cloneSpec(source));
    }

    throw new Error("Invalid flaier source object.");
  }

  const { payload, resolvedUrl } = await fetchJsonSource(source);

  if (isFlaierManifest(payload)) {
    return normalizeManifest(payload, resolvedUrl);
  }

  if (isFlaierSpec(payload)) {
    return normalizeSingleSpec(cloneSpec(payload));
  }

  throw new Error(`Fetched JSON from "${source}" is neither a flow spec nor a manifest.`);
}

async function resolveSpecSource(source: FlaierSpec | string): Promise<FlaierSpec> {
  if (typeof source !== "string") {
    return cloneSpec(source);
  }

  const { payload } = await fetchJsonSource(source);
  if (!isFlaierSpec(payload)) {
    throw new Error(`Fetched JSON from "${source}" is not a valid flow spec.`);
  }

  return cloneSpec(payload);
}

function normalizeSingleSpec(spec: FlaierSpec) {
  const metadata = getSpecMetadata(spec);

  return {
    flows: [
      {
        id: metadata.id,
        title: metadata.title,
        description: metadata.description,
        source: spec,
      },
    ] satisfies ResolvedFlowDocument[],
    defaultFlowId: metadata.id,
  };
}

function normalizeManifest(manifest: FlaierManifest, baseUrl?: string) {
  const seenIds = new Set<string>();
  const flows: ResolvedFlowDocument[] = [];

  for (const entry of manifest.flows) {
    const normalized = normalizeManifestEntry(entry, baseUrl);
    if (!normalized) continue;

    if (seenIds.has(normalized.id)) {
      throw new Error(`Duplicate flow id "${normalized.id}" in manifest.`);
    }

    seenIds.add(normalized.id);
    flows.push(normalized);
  }

  if (flows.length === 0) {
    throw new Error("Manifest does not contain any valid flows.");
  }

  const defaultFlowId =
    typeof manifest.defaultFlowId === "string" && seenIds.has(manifest.defaultFlowId)
      ? manifest.defaultFlowId
      : flows[0]?.id;

  return {
    flows,
    defaultFlowId,
  };
}

function normalizeManifestEntry(
  entry: FlaierManifestFlow,
  baseUrl?: string,
): ResolvedFlowDocument | null {
  const id = typeof entry.id === "string" ? entry.id.trim() : "";
  if (!id) return null;

  const resolvedSource = normalizeFlowSource(entry.src, baseUrl);
  if (!resolvedSource) {
    throw new Error(`Flow "${id}" has an invalid src value.`);
  }

  return {
    id,
    title: toOptionalString(entry.title),
    description: toOptionalString(entry.description),
    tags: toStringArray(entry.tags),
    entrypoints: toStringArray(entry.entrypoints),
    source: resolvedSource,
  };
}

function normalizeFlowSource(value: unknown, baseUrl?: string): FlaierSpec | string | null {
  if (typeof value === "string") {
    return resolveRelativeSource(value, baseUrl);
  }

  if (isFlaierSpec(value)) {
    return cloneSpec(value);
  }

  return null;
}

function syncFlowOptions() {
  flowOptions.value = flowDocuments.value.map((flow) => ({
    id: flow.id,
    title: flow.title ?? flow.id,
    description: flow.description,
    tags: flow.tags,
    entrypoints: flow.entrypoints,
  }));
}

function patchFlowMetadata(flowId: string, spec: FlaierSpec) {
  const metadata = getSpecMetadata(spec);
  let changed = false;

  flowDocuments.value = flowDocuments.value.map((flow) => {
    if (flow.id !== flowId) return flow;

    const nextTitle = flow.title ?? metadata.title;
    const nextDescription = flow.description ?? metadata.description;

    if (nextTitle === flow.title && nextDescription === flow.description) {
      return flow;
    }

    changed = true;
    return {
      ...flow,
      title: nextTitle,
      description: nextDescription,
    };
  });

  if (changed) {
    syncFlowOptions();
  }
}

function getSpecMetadata(spec: FlaierSpec) {
  const rootElement = spec.elements[spec.root];
  const rootProps = isObject(rootElement?.props) ? rootElement.props : {};
  const title = toOptionalString(rootProps.title);
  const description = toOptionalString(rootProps.description);
  const fallbackId = toOptionalString(spec.root) ?? "flow";

  return {
    id: slugifyId(title ?? fallbackId),
    title,
    description,
  };
}

function slugifyId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "flow";
}

function resolveRelativeSource(value: string, baseUrl?: string) {
  if (!baseUrl) return value;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function createFetchCandidates(source: string) {
  const trimmed = source.trim();
  if (!trimmed) return [];

  const hasJsonSuffix = /\.json(?:[?#].*)?$/i.test(trimmed);
  const candidates: string[] = [trimmed];

  if (!hasJsonSuffix && !isLikelyFlowSpecEndpoint(trimmed)) {
    candidates.push(appendManifestJsonPath(trimmed));
  }

  return Array.from(new Set(candidates));
}

function isLikelyFlowSpecEndpoint(value: string) {
  return /\/api\/flows\/spec\/[^/?#]+(?:[?#].*)?$/i.test(value);
}

function appendManifestJsonPath(value: string) {
  const hashSplit = value.split("#", 2);
  const pathAndQuery = hashSplit[0] ?? "";
  const hash = hashSplit[1] ?? "";

  const querySplit = pathAndQuery.split("?", 2);
  const path = querySplit[0] ?? "";
  const query = querySplit[1] ?? "";

  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  const manifestPath = `${normalizedPath}manifest.json`;
  const withQuery = query ? `${manifestPath}?${query}` : manifestPath;

  return hash ? `${withQuery}#${hash}` : withQuery;
}

async function fetchJsonSource(source: string) {
  const candidates = createFetchCandidates(source);

  if (candidates.length === 0) {
    throw new Error("Flow source path cannot be empty.");
  }

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        lastError = new Error(
          `Failed to fetch "${candidate}" (${response.status} ${response.statusText})`,
        );
        continue;
      }

      const payload = (await response.json()) as unknown;

      return {
        payload,
        resolvedUrl: resolveRelativeSource(
          candidate,
          typeof window !== "undefined" ? window.location.href : undefined,
        ),
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(`Failed to load source "${candidate}".`);
    }
  }

  throw lastError ?? new Error(`Failed to load source "${source}".`);
}

function cloneSpec(spec: FlaierSpec): FlaierSpec {
  return JSON.parse(JSON.stringify(spec)) as FlaierSpec;
}

function isFlaierManifest(value: unknown): value is FlaierManifest {
  if (!isObject(value)) return false;
  return Array.isArray(value.flows);
}

function isFlaierSpec(value: unknown): value is FlaierSpec {
  if (!isObject(value)) return false;
  if (typeof value.root !== "string") return false;
  if (!isObject(value.elements)) return false;
  return true;
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const result = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
  return result.length > 0 ? result : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function handleStateChange(changes: Array<{ path: string; value: unknown }>) {
  emit("state-change", changes);
}
</script>

<template>
  <div class="flaier relative h-full w-full min-h-[320px]">
    <div
      v-if="loading"
      class="flex h-full w-full items-center justify-center text-sm text-muted-foreground"
    >
      Loading flow spec...
    </div>

    <div
      v-else-if="loadError"
      class="flex h-full w-full items-center justify-center px-6 text-center text-sm text-red-300"
    >
      {{ loadError }}
    </div>

    <StateProvider
      v-else-if="resolvedSpec"
      :key="providerKey"
      :initial-state="initialState"
      :on-state-change="handleStateChange"
    >
      <ActionProvider>
        <VisibilityProvider>
          <Renderer :spec="resolvedSpec" :registry="registry" />
        </VisibilityProvider>
      </ActionProvider>
    </StateProvider>
  </div>
</template>
