import { describe, expect, it } from "vite-plus/test";
import { sanitizeSpecForPersistence, serializeSpecToDisk } from "../src/validation/persistence";
import { validateFlaierReadiness } from "../src/validation/flow-ready-validation";
import type { FlaierSpec } from "../src/types";

function createDiskSpec(): FlaierSpec {
  return {
    root: "flow",
    elements: {
      flow: {
        type: "FlowTimeline",
        props: { title: "Demo" },
        children: ["code"],
      },
      code: {
        type: "CodeNode",
        props: { label: "Snippet", code: "const x = 1;\n//    ^?" },
      },
    },
    state: { currentStep: 0, playing: false },
  };
}

function createPreparedSpec(): FlaierSpec {
  const spec = createDiskSpec();
  spec.elements.flow!.props.themeMode = "document";
  spec.elements.code!.props.twoslashHtml = { dark: "<pre/>", light: "<pre/>" };
  return spec;
}

describe("sanitizeSpecForPersistence", () => {
  it("strips runtime-injected twoslashHtml and themeMode", () => {
    const sanitized = sanitizeSpecForPersistence(createPreparedSpec(), createDiskSpec());

    expect(sanitized.elements.code?.props.twoslashHtml).toBeUndefined();
    expect(sanitized.elements.flow?.props.themeMode).toBeUndefined();
  });

  it("round-trips byte-identically when nothing changed", () => {
    const disk = createDiskSpec();
    const sanitized = sanitizeSpecForPersistence(createPreparedSpec(), disk);

    expect(serializeSpecToDisk(sanitized)).toBe(serializeSpecToDisk(disk));
  });

  it("preserves twoslashHtml and themeMode the file authored itself", () => {
    const disk = createDiskSpec();
    disk.elements.flow!.props.themeMode = "local";
    disk.elements.code!.props.twoslashHtml = { dark: "<pre>authored</pre>" };

    const incoming = createPreparedSpec();
    const sanitized = sanitizeSpecForPersistence(incoming, disk);

    expect(sanitized.elements.flow?.props.themeMode).toBe("local");
    expect(sanitized.elements.code?.props.twoslashHtml).toEqual({
      dark: "<pre>authored</pre>",
    });
  });

  it("prunes layout positions for deleted nodes", () => {
    const incoming = createPreparedSpec();
    incoming.elements.flow!.props.layout = {
      positions: { code: { x: 10, y: 20 }, ghost: { x: 1, y: 2 } },
    };

    const sanitized = sanitizeSpecForPersistence(incoming, createDiskSpec());
    expect(sanitized.elements.flow?.props.layout).toEqual({
      positions: { code: { x: 10, y: 20 } },
    });
  });

  it("does not mutate its inputs", () => {
    const incoming = createPreparedSpec();
    const disk = createDiskSpec();
    const before = JSON.stringify(incoming);

    sanitizeSpecForPersistence(incoming, disk);
    expect(JSON.stringify(incoming)).toBe(before);
  });
});

describe("serializeSpecToDisk", () => {
  it("writes 2-space JSON with a trailing newline (agents writeJson format)", () => {
    const output = serializeSpecToDisk(createDiskSpec());
    expect(output.endsWith("}\n")).toBe(true);
    expect(output).toBe(`${JSON.stringify(createDiskSpec(), null, 2)}\n`);
  });
});

describe("validateFlaierReadiness layout prop", () => {
  it("accepts a valid layout.positions map", () => {
    const spec = createDiskSpec();
    spec.elements.flow!.props.layout = { positions: { code: { x: 1, y: 2 } } };

    const result = validateFlaierReadiness(spec);
    expect(result.errors).toEqual([]);
  });

  it("rejects malformed positions", () => {
    const spec = createDiskSpec();
    spec.elements.flow!.props.layout = { positions: { code: { x: "1", y: 2 } } };

    const result = validateFlaierReadiness(spec);
    expect(result.errors.some((error) => error.includes('layout.positions["code"]'))).toBe(true);
  });
});
