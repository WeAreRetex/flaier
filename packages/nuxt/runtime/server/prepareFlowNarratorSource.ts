import { createTransformerFactory, rendererRich } from "@shikijs/twoslash/core";
import { createHighlighter, type HighlighterCore } from "shiki";
import { createTwoslasher } from "twoslash";
import type {
  FlowNarratorManifest,
  FlowNarratorManifestFlow,
  FlowNarratorSource,
  FlowNarratorSpec,
  MagicMoveStep,
  TwoslashHtml,
} from "flow-narrator";

type SupportedTwoslashLanguage = "ts" | "tsx";

interface PrepareFlowNarratorSourceOptions {
  baseUrl?: string;
  fetchJson: (url: string) => Promise<unknown>;
}

const SHIKI_LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "python",
  "json",
  "bash",
  "yaml",
  "go",
  "rust",
];
const SHIKI_THEMES = ["github-dark", "github-light"] as const;
const TWOSLASH_HINT_PATTERN = /(?:\^\?|\^\||@errors\b|@log\b|@warn\b|@annotate\b|@include\b)/m;
const TWOSLASH_LANGUAGE_ALIASES: Record<string, SupportedTwoslashLanguage> = {
  ts: "ts",
  typescript: "ts",
  tsx: "tsx",
};

let highlighterPromise: Promise<HighlighterCore> | null = null;
const twoslasher = createTwoslasher({
  compilerOptions: {
    lib: ["esnext", "dom", "dom.iterable"],
    moduleResolution: 100,
  },
});
const renderedTwoslashCache = new Map<string, Promise<TwoslashHtml>>();

export async function prepareFlowNarratorSource(
  source: FlowNarratorSource,
  options: PrepareFlowNarratorSourceOptions,
): Promise<FlowNarratorSource> {
  if (typeof source === "string") {
    const { payload, resolvedUrl } = await fetchJsonSource(
      source,
      options.baseUrl,
      options.fetchJson,
    );

    if (isFlowNarratorManifest(payload)) {
      return prepareManifest(cloneValue(payload), {
        ...options,
        baseUrl: resolvedUrl,
      });
    }

    if (isFlowNarratorSpec(payload)) {
      return prepareSpec(cloneValue(payload));
    }

    throw new Error(`Fetched JSON from "${source}" is neither a flow spec nor a manifest.`);
  }

  if (isFlowNarratorManifest(source)) {
    return prepareManifest(cloneValue(source), options);
  }

  if (isFlowNarratorSpec(source)) {
    return prepareSpec(cloneValue(source));
  }

  return source;
}

async function prepareManifest(
  manifest: FlowNarratorManifest,
  options: PrepareFlowNarratorSourceOptions,
): Promise<FlowNarratorManifest> {
  const flows = await Promise.all(
    manifest.flows.map((entry) => prepareManifestFlow(entry, options)),
  );

  return {
    ...manifest,
    flows,
  };
}

async function prepareManifestFlow(
  entry: FlowNarratorManifestFlow,
  options: PrepareFlowNarratorSourceOptions,
): Promise<FlowNarratorManifestFlow> {
  if (typeof entry.src !== "string") {
    if (isFlowNarratorSpec(entry.src)) {
      return {
        ...entry,
        src: await prepareSpec(cloneValue(entry.src)),
      };
    }

    return entry;
  }

  const resolvedSource = resolveRelativeSource(entry.src, options.baseUrl);
  const { payload } = await fetchJsonSource(resolvedSource, options.baseUrl, options.fetchJson);

  if (!isFlowNarratorSpec(payload)) {
    throw new Error(`Fetched JSON from "${resolvedSource}" is not a valid flow spec.`);
  }

  return {
    ...entry,
    src: await prepareSpec(cloneValue(payload)),
  };
}

async function prepareSpec(spec: FlowNarratorSpec): Promise<FlowNarratorSpec> {
  const entries = Object.entries(spec.elements);

  for (const [key, element] of entries) {
    if (!isCodeNodeElement(element)) {
      continue;
    }

    const props = { ...element.props };
    const language = normalizeTwoslashLanguage(toOptionalString(props.language));
    if (!language || hasTwoslashHtml(normalizeTwoslashHtml(props.twoslashHtml))) {
      continue;
    }

    const requested = toOptionalBoolean(props.twoslash);
    const variants = [
      toRequiredString(props.code),
      ...toMagicMoveSteps(props.magicMoveSteps).map((step) => step.code),
    ];

    if (requested === false) {
      continue;
    }

    if (requested !== true && !variants.some((code) => hasTwoslashHints(code))) {
      continue;
    }

    try {
      props.twoslashHtml = await renderTwoslashHtmlByTheme(
        variants[variants.length - 1] ?? toRequiredString(props.code),
        language,
      );
      spec.elements[key] = {
        ...element,
        props,
      };
    } catch (error) {
      console.warn(
        `[flow-narrator/nuxt] Failed to pre-render twoslash HTML. ${formatErrorMessage(error)}`,
      );
    }
  }

  return spec;
}

async function renderTwoslashHtmlByTheme(code: string, language: SupportedTwoslashLanguage) {
  const cacheKey = `${language}\u0000${code}`;
  const cached = renderedTwoslashCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const highlighter = await getHighlighter();
    const render = async (theme: (typeof SHIKI_THEMES)[number]) => {
      const transformerTwoslash = createTransformerFactory(
        twoslasher,
        rendererRich(),
      )({
        throws: false,
        langs: [language],
        filter: () => true,
      });

      return highlighter.codeToHtml(code, {
        lang: language,
        theme,
        transformers: [transformerTwoslash],
      });
    };

    const [dark, light] = await Promise.all([render("github-dark"), render("github-light")]);
    return { dark, light } satisfies TwoslashHtml;
  })();

  renderedTwoslashCache.set(cacheKey, pending);
  return pending;
}

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: Array.from(new Set(SHIKI_THEMES)),
      langs: SHIKI_LANGS,
    });
  }

  return highlighterPromise;
}

function hasTwoslashHints(code: string) {
  return TWOSLASH_HINT_PATTERN.test(code);
}

function normalizeTwoslashLanguage(language?: string): SupportedTwoslashLanguage | null {
  const normalized = (language ?? "typescript").trim().toLowerCase();
  return TWOSLASH_LANGUAGE_ALIASES[normalized] ?? null;
}

function normalizeTwoslashHtml(value: unknown): TwoslashHtml | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const dark = typeof record.dark === "string" && record.dark.length > 0 ? record.dark : undefined;
  const light =
    typeof record.light === "string" && record.light.length > 0 ? record.light : undefined;

  if (!dark && !light) {
    return undefined;
  }

  return { dark, light };
}

function hasTwoslashHtml(value: TwoslashHtml | undefined) {
  return Boolean(value?.dark || value?.light);
}

function isCodeNodeElement(value: unknown): value is FlowNarratorSpec["elements"][string] & {
  type: "CodeNode";
  props: Record<string, unknown>;
} {
  return isObject(value) && value.type === "CodeNode" && isObject(value.props);
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toRequiredString(value: unknown) {
  return toOptionalString(value) ?? "";
}

function toOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function toMagicMoveSteps(value: unknown): MagicMoveStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is MagicMoveStep => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const record = item as Record<string, unknown>;
      if (typeof record.code !== "string") {
        return false;
      }

      return [record.title, record.comment, record.story, record.speaker].every(
        (entry) => entry === undefined || typeof entry === "string",
      );
    })
    .map((item) => ({
      code: item.code,
      title: toOptionalString(item.title),
      comment: toOptionalString(item.comment),
      story: toOptionalString(item.story),
      speaker: toOptionalString(item.speaker),
    }));
}

function createFetchCandidates(source: string) {
  const trimmed = source.trim();
  if (!trimmed) {
    return [];
  }

  const hasJsonSuffix = /\.json(?:[?#].*)?$/i.test(trimmed);
  const candidates = [trimmed];

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

async function fetchJsonSource(
  source: string,
  baseUrl: string | undefined,
  fetchJson: (url: string) => Promise<unknown>,
) {
  const candidates = createFetchCandidates(source);
  if (candidates.length === 0) {
    throw new Error("Flow source path cannot be empty.");
  }

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(candidate);
      return {
        payload,
        resolvedUrl: resolveRelativeSource(candidate, baseUrl),
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(`Failed to load source "${candidate}".`);
    }
  }

  throw lastError ?? new Error(`Failed to load source "${source}".`);
}

function resolveRelativeSource(value: string, baseUrl?: string) {
  if (!baseUrl) {
    return value;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function isFlowNarratorManifest(value: unknown): value is FlowNarratorManifest {
  return isObject(value) && Array.isArray(value.flows);
}

function isFlowNarratorSpec(value: unknown): value is FlowNarratorSpec {
  return isObject(value) && typeof value.root === "string" && isObject(value.elements);
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
