import { resolve, sep } from "node:path";

export interface ResolveSaveTargetSuccess {
  ok: true;
  /** Absolute candidate paths, one per configured save directory, in order. */
  candidates: string[];
}

export interface ResolveSaveTargetFailure {
  ok: false;
  statusCode: number;
  message: string;
}

export type ResolveSaveTargetResult = ResolveSaveTargetSuccess | ResolveSaveTargetFailure;

function failure(statusCode: number, message: string): ResolveSaveTargetFailure {
  return { ok: false, statusCode, message };
}

/**
 * Map an editor `src` (the public URL path a flow spec was loaded from) to the
 * on-disk files it may correspond to. Pure path logic — existence checks are
 * the caller's job. Every result is guaranteed to live inside one of the
 * configured save directories.
 */
export function resolveSaveTarget(src: unknown, saveDirs: string[]): ResolveSaveTargetResult {
  if (typeof src !== "string" || src.trim().length === 0) {
    return failure(400, "A string flow source path is required.");
  }

  const trimmed = src.trim();

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
    return failure(400, "Remote flow sources cannot be saved.");
  }

  const pathname = trimmed.split(/[?#]/, 1)[0] ?? "";

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return failure(400, "Flow source path is not valid URI-encoded text.");
  }

  if (!decoded.endsWith(".flow.json")) {
    return failure(400, "Only .flow.json sources can be saved.");
  }

  if (decoded.includes("\0")) {
    return failure(400, "Flow source path contains invalid characters.");
  }

  const relativePath = decoded.replace(/^\/+/, "");
  if (relativePath.length === 0) {
    return failure(400, "Flow source path is empty.");
  }

  const candidates: string[] = [];

  for (const saveDir of saveDirs) {
    if (typeof saveDir !== "string" || saveDir.length === 0) continue;

    const base = resolve(saveDir);
    const candidate = resolve(base, relativePath);

    if (!candidate.startsWith(`${base}${sep}`)) {
      continue;
    }

    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    return failure(403, "Flow source path resolves outside the allowed save directories.");
  }

  return { ok: true, candidates };
}
