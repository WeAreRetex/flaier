import { createError, defineEventHandler, getRequestURL, readBody } from "h3";
import type { FlowNarratorSource } from "flow-narrator";
import { prepareFlowNarratorSource } from "../prepareFlowNarratorSource";

interface PrepareRequestBody {
  source?: FlowNarratorSource;
  baseUrl?: string;
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as PrepareRequestBody | null;
  const source = body?.source;

  if (source === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "A flow source is required.",
    });
  }

  const baseUrl = toOptionalString(body?.baseUrl) ?? getRequestURL(event).toString();

  try {
    return await prepareFlowNarratorSource(source, {
      baseUrl,
      fetchJson: async (url) => {
        const resolvedUrl = resolveFetchUrl(url, baseUrl);
        return fetchJsonSource(resolvedUrl);
      },
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : "Failed to prepare flow narrator source.",
    });
  }
});

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

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function fetchJsonSource(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`[${response.status}] "${url}": ${response.statusText || "Request failed"}`);
  }

  return (await response.json()) as unknown;
}
