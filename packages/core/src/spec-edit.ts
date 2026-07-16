import type { ArchitectureZone, EdgeTransition, FlaierSpec, SpecElement } from "./types";

/** A single stored node position inside FlowTimeline props.layout */
export interface FlowLayoutPosition {
  x: number;
  y: number;
}

export type FlowLayoutPositions = Record<string, FlowLayoutPosition>;

export interface AddNodeInput {
  key?: string;
  type: string;
  props: Record<string, unknown>;
  position?: FlowLayoutPosition;
}

export type AddEdgeMeta = Partial<Omit<EdgeTransition, "to">>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneSpec(spec: FlaierSpec): FlaierSpec {
  return JSON.parse(JSON.stringify(spec)) as FlaierSpec;
}

function getRootElement(spec: FlaierSpec): SpecElement | undefined {
  return spec.elements[spec.root];
}

function roundPosition(position: FlowLayoutPosition): FlowLayoutPosition {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

function isValidPosition(value: unknown): value is FlowLayoutPosition {
  return (
    isObject(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

/** Read the persisted manual positions from the root FlowTimeline layout prop. */
export function getLayoutPositions(spec: FlaierSpec): FlowLayoutPositions {
  const root = getRootElement(spec);
  if (!root || !isObject(root.props)) return {};

  const layout = root.props.layout;
  if (!isObject(layout)) return {};

  const positions = layout.positions;
  if (!isObject(positions)) return {};

  const result: FlowLayoutPositions = {};
  for (const [key, value] of Object.entries(positions)) {
    if (isValidPosition(value)) {
      result[key] = { x: value.x, y: value.y };
    }
  }

  return result;
}

function writeLayoutPositions(spec: FlaierSpec, positions: FlowLayoutPositions): FlaierSpec {
  const root = getRootElement(spec);
  if (!root) return spec;

  const layout = isObject(root.props.layout) ? { ...root.props.layout } : {};

  if (Object.keys(positions).length === 0) {
    delete layout.positions;
  } else {
    layout.positions = positions;
  }

  const nextProps = { ...root.props };
  if (Object.keys(layout).length === 0) {
    delete nextProps.layout;
  } else {
    nextProps.layout = layout;
  }

  return {
    ...spec,
    elements: {
      ...spec.elements,
      [spec.root]: { ...root, props: nextProps },
    },
  };
}

/** Pin a single node to an explicit position. */
export function setNodePosition(
  spec: FlaierSpec,
  nodeKey: string,
  position: FlowLayoutPosition,
): FlaierSpec {
  if (!spec.elements[nodeKey] || nodeKey === spec.root) return spec;
  if (!isValidPosition(position)) return spec;

  const positions = { ...getLayoutPositions(spec), [nodeKey]: roundPosition(position) };
  return writeLayoutPositions(spec, positions);
}

/**
 * Persist every rendered node position at once. Called on save so dagre only
 * ever places nodes an AI adds later without positions.
 */
export function snapshotAllPositions(spec: FlaierSpec, positions: FlowLayoutPositions): FlaierSpec {
  const next: FlowLayoutPositions = {};

  for (const [key, position] of Object.entries(positions)) {
    if (!spec.elements[key] || key === spec.root) continue;
    if (!isValidPosition(position)) continue;
    next[key] = roundPosition(position);
  }

  return writeLayoutPositions(spec, next);
}

/** Drop stored positions whose node no longer exists. */
export function pruneOrphanPositions(spec: FlaierSpec): FlaierSpec {
  const positions = getLayoutPositions(spec);
  const pruned: FlowLayoutPositions = {};
  let changed = false;

  for (const [key, position] of Object.entries(positions)) {
    if (spec.elements[key] && key !== spec.root) {
      pruned[key] = position;
    } else {
      changed = true;
    }
  }

  if (!changed) return spec;
  return writeLayoutPositions(spec, pruned);
}

function slugifyKey(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "node";
}

/** Generate a unique element key from a label or type name. */
export function generateNodeKey(spec: FlaierSpec, base: string): string {
  const baseKey = slugifyKey(base);
  if (!spec.elements[baseKey]) return baseKey;

  let suffix = 2;
  while (spec.elements[`${baseKey}-${suffix}`]) {
    suffix += 1;
  }

  return `${baseKey}-${suffix}`;
}

function getTransitions(element: SpecElement): EdgeTransition[] {
  const transitions = element.props.transitions;
  if (!Array.isArray(transitions)) return [];

  return transitions.filter(
    (transition): transition is EdgeTransition =>
      isObject(transition) && typeof transition.to === "string" && transition.to.length > 0,
  );
}

/** Keys reachable from root children by following element children arrays (render order). */
function collectRenderedKeys(spec: FlaierSpec): string[] {
  const root = getRootElement(spec);
  if (!root?.children?.length) return [];

  const ordered: string[] = [];
  const seen = new Set<string>();
  const queue = [...root.children];

  while (queue.length > 0) {
    const key = queue.shift();
    if (!key || seen.has(key) || key === spec.root) continue;

    const element = spec.elements[key];
    if (!element) continue;

    seen.add(key);
    ordered.push(key);

    for (const child of element.children ?? []) {
      if (!seen.has(child)) queue.push(child);
    }
  }

  return ordered;
}

function explicitOutgoing(spec: FlaierSpec, key: string, rendered: Set<string>): string[] {
  const element = spec.elements[key];
  if (!element) return [];

  const targets: string[] = [];
  const seen = new Set<string>();

  for (const transition of getTransitions(element)) {
    if (rendered.has(transition.to) && !seen.has(transition.to)) {
      seen.add(transition.to);
      targets.push(transition.to);
    }
  }

  for (const child of element.children ?? []) {
    if (rendered.has(child) && !seen.has(child)) {
      seen.add(child);
      targets.push(child);
    }
  }

  return targets;
}

/** Map of implicit linear-next fallback edges (consecutive rendered root children). */
function collectImplicitFallbackEdges(spec: FlaierSpec): Map<string, string> {
  const root = getRootElement(spec);
  const fallbacks = new Map<string, string>();
  if (!root?.children?.length) return fallbacks;

  const rendered = new Set(collectRenderedKeys(spec));
  const renderedRootChildren = root.children.filter((key) => rendered.has(key));

  for (let index = 0; index < renderedRootChildren.length - 1; index += 1) {
    const key = renderedRootChildren[index];
    const nextKey = renderedRootChildren[index + 1];
    if (!key || !nextKey) continue;

    if (explicitOutgoing(spec, key, rendered).length === 0) {
      fallbacks.set(key, nextKey);
    }
  }

  return fallbacks;
}

function isSequenceSpec(spec: FlaierSpec) {
  const root = getRootElement(spec);
  return root?.props.mode === "sequence";
}

/**
 * Turn every implicit linear-next fallback edge into an explicit transition so
 * structural edits cannot silently re-route the flow.
 */
export function materializeImplicitTransitions(spec: FlaierSpec): FlaierSpec {
  if (isSequenceSpec(spec)) return spec;

  const fallbacks = collectImplicitFallbackEdges(spec);
  if (fallbacks.size === 0) return spec;

  const next = cloneSpec(spec);

  for (const [source, target] of fallbacks) {
    const element = next.elements[source];
    if (!element) continue;

    const transitions = Array.isArray(element.props.transitions)
      ? [...(element.props.transitions as EdgeTransition[])]
      : [];
    transitions.push({ to: target });
    element.props.transitions = transitions;
  }

  return next;
}

/**
 * Re-append any element that is no longer reachable from root children so it
 * keeps rendering after structural edits.
 */
export function ensureReachability(spec: FlaierSpec): FlaierSpec {
  if (isSequenceSpec(spec)) return spec;

  const root = getRootElement(spec);
  if (!root) return spec;

  const reachable = new Set(collectRenderedKeys(spec));
  const unreachable = Object.keys(spec.elements).filter(
    (key) => key !== spec.root && !reachable.has(key),
  );

  if (unreachable.length === 0) return spec;

  const next = cloneSpec(spec);
  const nextRoot = next.elements[next.root];
  if (!nextRoot) return spec;

  nextRoot.children = [...(nextRoot.children ?? []), ...unreachable];
  return next;
}

/** Create a node and register it on the root so it is guaranteed to render. */
export function addNode(spec: FlaierSpec, input: AddNodeInput): FlaierSpec {
  const root = getRootElement(spec);
  if (!root) return spec;

  const baseKey = input.key ?? (typeof input.props.label === "string" ? input.props.label : "");
  const key = generateNodeKey(spec, baseKey || input.type);

  let next = cloneSpec(spec);
  next.elements[key] = {
    type: input.type,
    props: { ...input.props },
  };

  const nextRoot = next.elements[next.root];
  if (nextRoot) {
    nextRoot.children = [...(nextRoot.children ?? []), key];
  }

  if (input.position) {
    next = setNodePosition(next, key, input.position);
  }

  return next;
}

/**
 * Delete a node and strip every reference to it (children, transitions, stored
 * positions). Implicit fallback edges are materialized first so surviving
 * edges do not silently re-route.
 */
export function deleteNode(spec: FlaierSpec, nodeKey: string): FlaierSpec {
  if (nodeKey === spec.root || !spec.elements[nodeKey]) return spec;

  const next = cloneSpec(materializeImplicitTransitions(spec));
  delete next.elements[nodeKey];

  for (const element of Object.values(next.elements)) {
    if (Array.isArray(element.children)) {
      element.children = element.children.filter((child) => child !== nodeKey);
      if (element.children.length === 0) {
        delete element.children;
      }
    }

    if (Array.isArray(element.props.transitions)) {
      const transitions = (element.props.transitions as EdgeTransition[]).filter(
        (transition) => !isObject(transition) || transition.to !== nodeKey,
      );

      if (transitions.length === 0) {
        delete element.props.transitions;
      } else {
        element.props.transitions = transitions;
      }
    }

    if (Array.isArray(element.props.participants)) {
      element.props.participants = (element.props.participants as string[]).filter(
        (participant) => participant !== nodeKey,
      );
    }
  }

  return ensureReachability(pruneOrphanPositions(next));
}

/** Create an edge by pushing transition metadata onto the source node (dedup by target). */
export function addEdge(
  spec: FlaierSpec,
  from: string,
  to: string,
  meta: AddEdgeMeta = {},
): FlaierSpec {
  if (from === to) return spec;
  if (!spec.elements[from] || !spec.elements[to]) return spec;
  if (from === spec.root || to === spec.root) return spec;

  const rendered = new Set(collectRenderedKeys(spec));
  const existing = explicitOutgoing(spec, from, rendered);
  if (existing.includes(to)) return spec;

  // Preserve the source's current implicit edge before an explicit transition
  // would suppress the linear-next fallback.
  const fallbacks = collectImplicitFallbackEdges(spec);
  const fallbackTarget = fallbacks.get(from);

  const next = cloneSpec(spec);
  const element = next.elements[from];
  if (!element) return spec;

  const transitions = Array.isArray(element.props.transitions)
    ? [...(element.props.transitions as EdgeTransition[])]
    : [];

  if (fallbackTarget && fallbackTarget !== to) {
    transitions.push({ to: fallbackTarget });
  }

  transitions.push({ to, ...meta });
  element.props.transitions = transitions;

  return next;
}

/**
 * Remove an edge from both transitions and children. Implicit fallback edges
 * are materialized first so removal of an implicit edge is representable.
 */
export function removeEdge(spec: FlaierSpec, from: string, to: string): FlaierSpec {
  if (!spec.elements[from] || !spec.elements[to]) return spec;

  const next = cloneSpec(materializeImplicitTransitions(spec));
  const element = next.elements[from];
  if (!element) return spec;

  if (Array.isArray(element.props.transitions)) {
    const transitions = (element.props.transitions as EdgeTransition[]).filter(
      (transition) => !isObject(transition) || transition.to !== to,
    );

    if (transitions.length === 0) {
      delete element.props.transitions;
    } else {
      element.props.transitions = transitions;
    }
  }

  if (Array.isArray(element.children)) {
    element.children = element.children.filter((child) => child !== to);
    if (element.children.length === 0) {
      delete element.children;
    }
  }

  // With no explicit outgoing edges left, the linear-next fallback would
  // recreate an implicit edge for a mid-sequence root child. Moving the node
  // to the end of the root children list keeps "no outgoing" representable.
  const rendered = new Set(collectRenderedKeys(next));
  const rootElement = next.elements[next.root];

  if (
    rootElement?.children &&
    explicitOutgoing(next, from, rendered).length === 0 &&
    collectImplicitFallbackEdges(next).has(from)
  ) {
    rootElement.children = [...rootElement.children.filter((child) => child !== from), from];
  }

  return ensureReachability(next);
}

function getZones(spec: FlaierSpec): ArchitectureZone[] {
  const root = getRootElement(spec);
  const zones = root?.props.zones;
  if (!Array.isArray(zones)) return [];

  return zones.filter(
    (zone): zone is ArchitectureZone =>
      isObject(zone) && typeof zone.id === "string" && zone.id.length > 0,
  );
}

export interface AddZoneInput {
  id?: string;
  label: string;
  description?: string;
  color?: string;
  padding?: number;
}

/** Declare a new architecture zone on the root FlowTimeline. */
export function addZone(spec: FlaierSpec, input: AddZoneInput): FlaierSpec {
  const root = getRootElement(spec);
  if (!root) return spec;

  const existing = getZones(spec);
  const usedIds = new Set(existing.map((zone) => zone.id));

  let id = slugifyKey(input.id ?? input.label);
  if (usedIds.has(id)) {
    let suffix = 2;
    while (usedIds.has(`${id}-${suffix}`)) suffix += 1;
    id = `${id}-${suffix}`;
  }

  const zone: ArchitectureZone = { id, label: input.label };
  if (input.description !== undefined) zone.description = input.description;
  if (input.color !== undefined) zone.color = input.color;
  if (input.padding !== undefined) zone.padding = input.padding;

  const next = cloneSpec(spec);
  const nextRoot = next.elements[next.root];
  if (!nextRoot) return spec;

  const zones = Array.isArray(nextRoot.props.zones) ? [...nextRoot.props.zones] : [];
  zones.push(zone);
  nextRoot.props.zones = zones;

  return next;
}

/** Patch a zone's metadata (label/description/color/padding); undefined deletes keys. */
export function updateZone(
  spec: FlaierSpec,
  zoneId: string,
  patch: Partial<Omit<ArchitectureZone, "id">>,
): FlaierSpec {
  const zones = getZones(spec);
  if (!zones.some((zone) => zone.id === zoneId)) return spec;

  const next = cloneSpec(spec);
  const nextRoot = next.elements[next.root];
  if (!nextRoot || !Array.isArray(nextRoot.props.zones)) return spec;

  nextRoot.props.zones = (nextRoot.props.zones as ArchitectureZone[]).map((zone) => {
    if (!isObject(zone) || zone.id !== zoneId) return zone;

    const merged: Record<string, unknown> = { ...zone };
    for (const [key, value] of Object.entries(patch)) {
      if (key === "id") continue;
      if (value === undefined) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    return merged as unknown as ArchitectureZone;
  });

  return next;
}

/** Remove a zone declaration and unassign every node that referenced it. */
export function removeZone(spec: FlaierSpec, zoneId: string): FlaierSpec {
  const zones = getZones(spec);
  if (!zones.some((zone) => zone.id === zoneId)) return spec;

  const next = cloneSpec(spec);
  const nextRoot = next.elements[next.root];
  if (!nextRoot) return spec;

  const remaining = (
    Array.isArray(nextRoot.props.zones) ? (nextRoot.props.zones as ArchitectureZone[]) : []
  ).filter((zone) => !isObject(zone) || zone.id !== zoneId);

  if (remaining.length === 0) {
    delete nextRoot.props.zones;
  } else {
    nextRoot.props.zones = remaining;
  }

  for (const element of Object.values(next.elements)) {
    if (element.props.zone === zoneId) {
      delete element.props.zone;
    }
  }

  return next;
}

/** Shallow-merge a props patch onto a node; undefined values delete keys. */
export function updateNodeProps(
  spec: FlaierSpec,
  nodeKey: string,
  patch: Record<string, unknown>,
): FlaierSpec {
  const element = spec.elements[nodeKey];
  if (!element) return spec;

  const next = cloneSpec(spec);
  const target = next.elements[nodeKey];
  if (!target) return spec;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete target.props[key];
    } else {
      target.props[key] = value;
    }
  }

  return next;
}

/** Update transition metadata for an existing edge, materializing it if implicit. */
export function updateEdgeMeta(
  spec: FlaierSpec,
  from: string,
  to: string,
  meta: AddEdgeMeta,
): FlaierSpec {
  if (!spec.elements[from] || !spec.elements[to]) return spec;

  const next = cloneSpec(spec);
  const element = next.elements[from];
  if (!element) return spec;

  const transitions = Array.isArray(element.props.transitions)
    ? [...(element.props.transitions as EdgeTransition[])]
    : [];

  const index = transitions.findIndex((transition) => isObject(transition) && transition.to === to);

  const base = index >= 0 ? transitions[index] : { to };
  const merged = { ...base, ...meta, to } as EdgeTransition & Record<string, unknown>;

  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) {
      delete merged[key];
    }
  }

  if (index >= 0) {
    transitions[index] = merged;
  } else {
    // Only materialize metadata for edges that actually exist (explicit child
    // link or implicit fallback edge).
    const rendered = new Set(collectRenderedKeys(spec));
    const isChildEdge = (element.children ?? []).includes(to) && rendered.has(to);
    const isImplicit = collectImplicitFallbackEdges(spec).get(from) === to;
    if (!isChildEdge && !isImplicit) return spec;

    transitions.push(merged);
  }

  element.props.transitions = transitions;
  return next;
}
