import { describe, expect, it } from "vite-plus/test";
import {
  addEdge,
  addNode,
  addZone,
  deleteNode,
  ensureReachability,
  generateNodeKey,
  getLayoutPositions,
  materializeImplicitTransitions,
  pruneOrphanPositions,
  removeEdge,
  setNodePosition,
  snapshotAllPositions,
  updateEdgeMeta,
  updateNodeProps,
  updateZone,
  removeZone,
} from "../src/spec-edit";
import type { FlaierSpec } from "../src/types";

function createSpec(): FlaierSpec {
  return {
    root: "flow",
    elements: {
      flow: {
        type: "FlowTimeline",
        props: { title: "Demo", mode: "architecture" },
        children: ["a", "b", "c"],
      },
      a: {
        type: "ArchitectureNode",
        props: { label: "A", transitions: [{ to: "b" }] },
      },
      b: {
        type: "ArchitectureNode",
        props: { label: "B", transitions: [{ to: "c", kind: "async" }] },
      },
      c: {
        type: "ArchitectureNode",
        props: { label: "C" },
      },
    },
    state: { currentStep: 0 },
  };
}

/** a → b implicit (linear fallback), b → c explicit. */
function createFallbackSpec(): FlaierSpec {
  return {
    root: "flow",
    elements: {
      flow: {
        type: "FlowTimeline",
        props: { title: "Demo" },
        children: ["a", "b", "c"],
      },
      a: { type: "TriggerNode", props: { label: "A" } },
      b: { type: "DescriptionNode", props: { label: "B", body: "b", transitions: [{ to: "c" }] } },
      c: { type: "DescriptionNode", props: { label: "C", body: "c" } },
    },
  };
}

describe("setNodePosition", () => {
  it("stores rounded positions under root layout.positions", () => {
    const spec = createSpec();
    const next = setNodePosition(spec, "a", { x: 10.4, y: -3.6 });

    expect(getLayoutPositions(next)).toEqual({ a: { x: 10, y: -4 } });
    expect(next.elements.flow?.props.layout).toEqual({ positions: { a: { x: 10, y: -4 } } });
    // input untouched
    expect(spec.elements.flow?.props.layout).toBeUndefined();
  });

  it("ignores the root element and unknown keys", () => {
    const spec = createSpec();
    expect(setNodePosition(spec, "flow", { x: 1, y: 2 })).toBe(spec);
    expect(setNodePosition(spec, "missing", { x: 1, y: 2 })).toBe(spec);
  });
});

describe("snapshotAllPositions", () => {
  it("replaces the stored map, skipping unknown keys", () => {
    const spec = setNodePosition(createSpec(), "a", { x: 1, y: 1 });
    const next = snapshotAllPositions(spec, {
      b: { x: 5, y: 6 },
      ghost: { x: 9, y: 9 },
    });

    expect(getLayoutPositions(next)).toEqual({ b: { x: 5, y: 6 } });
  });
});

describe("pruneOrphanPositions", () => {
  it("drops positions for removed nodes and removes an empty layout prop", () => {
    let spec = createSpec();
    spec = setNodePosition(spec, "a", { x: 1, y: 2 });
    spec.elements.flow!.props.layout = {
      positions: { a: { x: 1, y: 2 }, ghost: { x: 3, y: 4 } },
    };

    const next = pruneOrphanPositions(spec);
    expect(getLayoutPositions(next)).toEqual({ a: { x: 1, y: 2 } });

    delete next.elements.a;
    const emptied = pruneOrphanPositions(next);
    expect(emptied.elements.flow?.props.layout).toBeUndefined();
  });

  it("returns the same spec when nothing is orphaned", () => {
    const spec = setNodePosition(createSpec(), "a", { x: 1, y: 2 });
    expect(pruneOrphanPositions(spec)).toBe(spec);
  });
});

describe("generateNodeKey", () => {
  it("slugifies and dedupes", () => {
    const spec = createSpec();
    expect(generateNodeKey(spec, "API Gateway")).toBe("api-gateway");
    expect(generateNodeKey(spec, "A")).toBe("a-2");
    expect(generateNodeKey(spec, "")).toBe("node");
  });
});

describe("addNode", () => {
  it("appends the element to root children so it renders", () => {
    const next = addNode(createSpec(), {
      type: "ArchitectureNode",
      props: { label: "Cache" },
      position: { x: 100, y: 50 },
    });

    expect(next.elements.cache?.type).toBe("ArchitectureNode");
    expect(next.elements.flow?.children).toEqual(["a", "b", "c", "cache"]);
    expect(getLayoutPositions(next).cache).toEqual({ x: 100, y: 50 });
  });
});

describe("addEdge", () => {
  it("pushes transition metadata and dedupes by target", () => {
    const next = addEdge(createSpec(), "a", "c", { label: "reads" });
    expect(next.elements.a?.props.transitions).toEqual([{ to: "b" }, { to: "c", label: "reads" }]);

    const deduped = addEdge(next, "a", "c");
    expect(deduped).toBe(next);
  });

  it("does not touch children arrays", () => {
    const next = addEdge(createSpec(), "a", "c");
    expect(next.elements.a?.children).toBeUndefined();
  });

  it("materializes the source fallback edge before adding a new explicit one", () => {
    const next = addEdge(createFallbackSpec(), "a", "c");
    // a relied on the implicit a→b fallback; the explicit transition would have
    // suppressed it, so it is preserved explicitly.
    expect(next.elements.a?.props.transitions).toEqual([{ to: "b" }, { to: "c" }]);
  });

  it("rejects self-edges and root edges", () => {
    const spec = createSpec();
    expect(addEdge(spec, "a", "a")).toBe(spec);
    expect(addEdge(spec, "flow", "a")).toBe(spec);
  });
});

describe("removeEdge", () => {
  it("removes the transition and keeps reachability via root children", () => {
    const next = removeEdge(createSpec(), "b", "c");
    expect(next.elements.b?.props.transitions).toBeUndefined();
    // c stays reachable because it is already a root child
    expect(next.elements.flow?.children).toContain("c");
  });

  it("removes edge targets from children arrays too", () => {
    const spec = createSpec();
    spec.elements.a!.children = ["b"];
    const next = removeEdge(spec, "a", "b");
    expect(next.elements.a?.children).toBeUndefined();
  });

  it("re-appends nodes that become unreachable", () => {
    const spec: FlaierSpec = {
      root: "flow",
      elements: {
        flow: { type: "FlowTimeline", props: { title: "t" }, children: ["a"] },
        a: { type: "TriggerNode", props: { label: "A" }, children: ["b"] },
        b: { type: "DescriptionNode", props: { label: "B", body: "b" } },
      },
    };

    const next = removeEdge(spec, "a", "b");
    expect(next.elements.flow?.children).toContain("b");
  });

  it("materializes implicit edges so removing one is representable", () => {
    const next = removeEdge(createFallbackSpec(), "a", "b");

    // a had only the implicit a→b edge; after removal it must not regain it
    // through the linear fallback (it is moved to the end of root children).
    expect(next.elements.a?.props.transitions).toBeUndefined();
    const rootChildren = next.elements.flow?.children ?? [];
    expect(rootChildren[rootChildren.length - 1]).toBe("a");
    // b keeps its explicit edge to c
    expect(next.elements.b?.props.transitions).toEqual([{ to: "c" }]);
  });
});

describe("deleteNode", () => {
  it("removes the element and every reference to it", () => {
    let spec = createSpec();
    spec = setNodePosition(spec, "b", { x: 5, y: 5 });

    const next = deleteNode(spec, "b");

    expect(next.elements.b).toBeUndefined();
    expect(next.elements.flow?.children).not.toContain("b");
    expect(next.elements.a?.props.transitions).toBeUndefined();
    expect(getLayoutPositions(next).b).toBeUndefined();
  });

  it("materializes fallback edges before deleting so survivors keep their edges", () => {
    const next = deleteNode(createFallbackSpec(), "c");

    // a's implicit a→b edge is materialized, so deleting c cannot re-route a→b→(gone)
    expect(next.elements.a?.props.transitions).toEqual([{ to: "b" }]);
    expect(next.elements.b?.props.transitions).toBeUndefined();
  });

  it("refuses to delete the root", () => {
    const spec = createSpec();
    expect(deleteNode(spec, "flow")).toBe(spec);
  });
});

describe("updateNodeProps", () => {
  it("merges patches and deletes undefined keys", () => {
    const next = updateNodeProps(createSpec(), "a", {
      label: "A2",
      zone: "edge",
      transitions: undefined,
    });

    expect(next.elements.a?.props).toEqual({ label: "A2", zone: "edge" });
  });
});

describe("updateEdgeMeta", () => {
  it("merges metadata onto an existing transition", () => {
    const next = updateEdgeMeta(createSpec(), "b", "c", { label: "done", kind: undefined });
    expect(next.elements.b?.props.transitions).toEqual([{ to: "c", label: "done" }]);
  });

  it("materializes a children-based edge when metadata is added", () => {
    const spec = createSpec();
    spec.elements.a!.children = ["c"];
    const next = updateEdgeMeta(spec, "a", "c", { label: "jump" });
    expect(next.elements.a?.props.transitions).toEqual([{ to: "b" }, { to: "c", label: "jump" }]);
  });

  it("ignores edges that do not exist", () => {
    const spec = createSpec();
    expect(updateEdgeMeta(spec, "c", "a", { label: "nope" })).toBe(spec);
  });
});

describe("materializeImplicitTransitions", () => {
  it("freezes linear fallback edges as explicit transitions", () => {
    const next = materializeImplicitTransitions(createFallbackSpec());
    expect(next.elements.a?.props.transitions).toEqual([{ to: "b" }]);
    // b already explicit — untouched
    expect(next.elements.b?.props.transitions).toEqual([{ to: "c" }]);
  });

  it("returns the same spec when nothing is implicit", () => {
    const spec = createSpec();
    expect(materializeImplicitTransitions(spec)).toBe(spec);
  });
});

describe("ensureReachability", () => {
  it("appends unreachable elements to root children", () => {
    const spec: FlaierSpec = {
      root: "flow",
      elements: {
        flow: { type: "FlowTimeline", props: { title: "t" }, children: ["a"] },
        a: { type: "TriggerNode", props: { label: "A" } },
        island: { type: "DescriptionNode", props: { label: "I", body: "i" } },
      },
    };

    const next = ensureReachability(spec);
    expect(next.elements.flow?.children).toEqual(["a", "island"]);
  });

  it("leaves sequence specs untouched", () => {
    const spec: FlaierSpec = {
      root: "flow",
      elements: {
        flow: {
          type: "FlowTimeline",
          props: { title: "t", mode: "sequence", participants: ["p1"] },
          children: [],
        },
        p1: { type: "SequenceParticipant", props: { label: "P1" } },
      },
    };

    expect(ensureReachability(spec)).toBe(spec);
  });
});

describe("zones", () => {
  function createZonedSpec(): FlaierSpec {
    return {
      root: "flow",
      elements: {
        flow: {
          type: "FlowTimeline",
          props: {
            title: "Demo",
            mode: "architecture",
            zones: [
              { id: "edge", label: "Edge", color: "#0ea5e9" },
              { id: "data", label: "Data plane" },
            ],
          },
          children: ["a", "b"],
        },
        a: { type: "ArchitectureNode", props: { label: "A", zone: "edge" } },
        b: { type: "ArchitectureNode", props: { label: "B", zone: "data" } },
      },
    };
  }

  it("addZone appends with a slugified, deduped id", () => {
    const next = addZone(createZonedSpec(), { label: "Edge", color: "#f00" });
    const zones = next.elements.flow?.props.zones as Array<{ id: string }>;

    expect(zones.map((zone) => zone.id)).toEqual(["edge", "data", "edge-2"]);
    expect(zones[2]).toEqual({ id: "edge-2", label: "Edge", color: "#f00" });
  });

  it("updateZone merges patches and deletes undefined keys", () => {
    const next = updateZone(createZonedSpec(), "edge", {
      label: "Edge services",
      color: undefined,
      description: "Public ingress",
    });

    const zones = next.elements.flow?.props.zones as Array<Record<string, unknown>>;
    expect(zones[0]).toEqual({
      id: "edge",
      label: "Edge services",
      description: "Public ingress",
    });
    // other zones untouched
    expect(zones[1]).toEqual({ id: "data", label: "Data plane" });
  });

  it("updateZone ignores unknown zones and id overwrites", () => {
    const spec = createZonedSpec();
    expect(updateZone(spec, "nope", { label: "x" })).toBe(spec);
  });

  it("removeZone strips the declaration and node assignments", () => {
    const next = removeZone(createZonedSpec(), "edge");

    const zones = next.elements.flow?.props.zones as Array<{ id: string }>;
    expect(zones.map((zone) => zone.id)).toEqual(["data"]);
    expect(next.elements.a?.props.zone).toBeUndefined();
    expect(next.elements.b?.props.zone).toBe("data");
  });

  it("removeZone deletes the zones prop when the last zone goes", () => {
    let spec = removeZone(createZonedSpec(), "edge");
    spec = removeZone(spec, "data");
    expect(spec.elements.flow?.props.zones).toBeUndefined();
  });
});
