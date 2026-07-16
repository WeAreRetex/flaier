import { autoFixSpec, formatSpecIssues, validateSpec, type Spec } from "@json-render/core";
import { pruneOrphanPositions } from "../spec-edit";
import type { FlaierSpec } from "../types";
import { validateFlaierReadiness } from "./flow-ready-validation";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneSpec(spec: FlaierSpec): FlaierSpec {
  return JSON.parse(JSON.stringify(spec)) as FlaierSpec;
}

/** Structural guard for payloads arriving over the wire. */
export function isFlowSpecPayload(value: unknown): value is FlaierSpec {
  return isObject(value) && typeof value.root === "string" && isObject(value.elements);
}

/**
 * Derived-field firewall applied before writing a spec back to disk. The
 * editor edits the *prepared* spec (twoslash HTML pre-rendered, themeMode
 * runtime-injected); persisting must restore what the file on disk owns:
 *
 * - props.twoslashHtml is stripped unless the on-disk original authored it
 * - root themeMode is restored from (or removed to match) the original
 * - stored layout positions pointing at deleted nodes are pruned
 */
export function sanitizeSpecForPersistence(
  incoming: FlaierSpec,
  originalOnDisk: FlaierSpec,
): FlaierSpec {
  const next = cloneSpec(incoming);

  for (const [key, element] of Object.entries(next.elements)) {
    if (!isObject(element.props)) continue;

    if ("twoslashHtml" in element.props) {
      const original = originalOnDisk.elements[key];
      const originalTwoslashHtml =
        original && isObject(original.props) ? original.props.twoslashHtml : undefined;

      if (originalTwoslashHtml === undefined) {
        delete element.props.twoslashHtml;
      } else {
        element.props.twoslashHtml = JSON.parse(JSON.stringify(originalTwoslashHtml));
      }
    }
  }

  const root = next.elements[next.root];
  const originalRoot = originalOnDisk.elements[originalOnDisk.root];

  if (root && isObject(root.props)) {
    const originalThemeMode =
      originalRoot && isObject(originalRoot.props) ? originalRoot.props.themeMode : undefined;

    if (originalThemeMode === undefined) {
      delete root.props.themeMode;
    } else {
      root.props.themeMode = originalThemeMode;
    }
  }

  return pruneOrphanPositions(next);
}

/** Canonical on-disk format shared with the agents CLI: 2-space JSON + trailing newline. */
export function serializeSpecToDisk(spec: FlaierSpec): string {
  return `${JSON.stringify(spec, null, 2)}\n`;
}

export interface SpecPersistenceValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Two-layer validation gate for writes: json-render schema validation
 * (autoFixSpec + validateSpec) followed by Flaier readiness checks.
 */
export function validateSpecForPersistence(spec: FlaierSpec): SpecPersistenceValidation {
  const fixed = autoFixSpec(spec as unknown as Spec);
  const normalized = fixed.spec as FlaierSpec;
  const schemaValidation = validateSpec(fixed.spec);

  if (!schemaValidation.valid) {
    return {
      ok: false,
      errors: formatSpecIssues(schemaValidation.issues)
        .split("\n")
        .filter((line) => line.trim().length > 0),
      warnings: [],
    };
  }

  const readiness = validateFlaierReadiness(normalized);

  return {
    ok: readiness.errors.length === 0,
    errors: readiness.errors,
    warnings: readiness.warnings,
  };
}
