---
name: flow-visualizer-flow-generator
description: Generate, repair, and validate flow-visualizer ready flows for flow-narrator. Use when converting code paths into `*.flow.json` specs, scaffolding new flow files, fixing invalid flow specs, adding branching narrative paths, or producing/updating `manifest.json` for disk-based viewer workflows.
---

# Flow Visualizer Flow Generator

Use this package to create and enforce high-quality `flow-narrator` artifacts on disk.

## Fast Path

Run from repo root:

```bash
bun run agents:scaffold -- --title "Checkout Flow" --template branching --out ./flow-specs/checkout.flow.json
bun run agents:validate -- ./flow-specs/checkout.flow.json
bun run agents:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

Run directly inside this folder:

```bash
bun run scaffold -- --title "Checkout Flow" --template branching --out ./flow-specs/checkout.flow.json
bun run validate -- ./flow-specs/checkout.flow.json
bun run manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

## Workflow

1. Create a scaffold with `scaffold` (`linear` or `branching`) and realistic flow title.
2. Replace placeholders with real node labels, code snippets, descriptions, links, and branch paths from the target codebase.
3. Keep one `FlowTimeline` root, start from a concrete `TriggerNode`, and model choices with multiple children on one node.
4. Validate each generated spec or full manifest with `validate`.
5. Build or refresh `manifest.json` with `manifest` after adding/removing flow files.

## Non-Negotiable Output Rules

- Keep root element type as `FlowTimeline`.
- Keep node types limited to `TriggerNode`, `CodeNode`, `DescriptionNode`, and `LinkNode`.
- Ensure every child reference points to an existing element key.
- Include `state.currentStep` and `state.playing`.
- Ensure branch labels and descriptions are explicit enough for keyboard branch selection.

## Twoslash Authoring Rules (CodeNode)

- Twoslash callouts are for TypeScript/TSX snippets (`language: "typescript"`, `"ts"`, or `"tsx"`).
- Prefer marker-based auto mode (`// ^?`, `// ^|`, `@errors`) over forcing `twoslash: true`.
- If `magicMoveSteps` is present, place twoslash markers in the **final** step code.
- When `magicMoveSteps` + twoslash are used together, the player includes an extra inspection frame after the last code transform.
- Keep callouts intentional (usually 1-3 markers per node) and tied to meaningful type/error teaching moments.

## References

- Read `references/spec-contract.md` for exact shape, props, and manifest rules.
- Read `references/quality-checklist.md` before finalizing generated flows.
- Read `references/prompt-template.md` when prompting another model to draft specs.
