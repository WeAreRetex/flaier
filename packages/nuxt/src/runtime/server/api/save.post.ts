import { access, readFile, writeFile } from "node:fs/promises";
import { createError, defineEventHandler, readBody } from "h3";
import { useRuntimeConfig } from "#imports";
import {
  isFlowSpecPayload,
  sanitizeSpecForPersistence,
  serializeSpecToDisk,
  validateSpecForPersistence,
} from "@flaier/core/validation";
import { resolveSaveTarget } from "../resolveSaveTarget";

interface SaveRequestBody {
  src?: unknown;
  spec?: unknown;
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as SaveRequestBody | null;
  const src = body?.src;
  const spec = body?.spec;

  if (!isFlowSpecPayload(spec)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body must include a valid flow spec.",
    });
  }

  const runtimeConfig = useRuntimeConfig(event);
  const flaierConfig = runtimeConfig.flaier as { saveDirs?: string[] } | undefined;
  const saveDirs = Array.isArray(flaierConfig?.saveDirs) ? flaierConfig.saveDirs : [];

  const target = resolveSaveTarget(src, saveDirs);
  if (!target.ok) {
    throw createError({ statusCode: target.statusCode, statusMessage: target.message });
  }

  // The editor can only update specs that already exist on disk; it never
  // creates files.
  let path: string | null = null;
  for (const candidate of target.candidates) {
    try {
      await access(candidate);
      path = candidate;
      break;
    } catch {
      // try the next save directory
    }
  }

  if (!path) {
    throw createError({
      statusCode: 404,
      statusMessage: "Flow spec file was not found in any save directory.",
    });
  }

  let original: unknown;
  try {
    original = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw createError({
      statusCode: 422,
      statusMessage: "Existing flow spec file could not be parsed as JSON.",
    });
  }

  if (!isFlowSpecPayload(original)) {
    throw createError({
      statusCode: 422,
      statusMessage: "Existing file is not a valid flow spec.",
    });
  }

  const sanitized = sanitizeSpecForPersistence(spec, original);
  const validation = validateSpecForPersistence(sanitized);

  if (!validation.ok) {
    throw createError({
      statusCode: 422,
      statusMessage: "Flow spec failed validation.",
      data: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  }

  await writeFile(path, serializeSpecToDisk(sanitized), "utf8");

  return {
    ok: true,
    path,
    warnings: validation.warnings,
  };
});
