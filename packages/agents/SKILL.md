---
name: flow-visualizer-flow-generator
description: Generate, repair, and validate flow-visualizer ready flows for flow-narrator. Use when converting code paths into `*.flow.json` specs, scaffolding new flow files, fixing invalid flow specs, adding branching narrative paths, modeling architecture diagrams, or producing/updating `manifest.json` for disk-based viewer workflows.
---

# Flow Visualizer Flow Generator

Use this package to create and enforce high-quality `flow-narrator` artifacts on disk.

## Fast Path

Run from repo root:

```bash
bun run agents:scaffold -- --title "Checkout Flow" --template branching --out ./flow-specs/checkout.flow.json
bun run agents:scaffold -- --title "Platform Architecture" --template architecture --out ./flow-specs/platform-architecture.flow.json
bun run agents:validate -- ./flow-specs/checkout.flow.json
bun run agents:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

Run directly inside this folder:

```bash
bun run scaffold -- --title "Checkout Flow" --template branching --out ./flow-specs/checkout.flow.json
bun run scaffold -- --title "Platform Architecture" --template architecture --out ./flow-specs/platform-architecture.flow.json
bun run validate -- ./flow-specs/checkout.flow.json
bun run manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

## Workflow

1. Create a scaffold with `scaffold` (`linear` or `branching`) and realistic flow title.
2. Replace placeholders with real node labels, code snippets, descriptions, links, and branch paths from the target codebase.
3. Keep one `FlowTimeline` root; for architecture diagrams set `FlowTimeline.props.mode` to `"architecture"` and prefer `ArchitectureNode` for infrastructure components.
4. Add edge metadata with `props.transitions` on branching nodes to label branch choices (`label`, `description`) and semantics (`kind`: `success`, `error`, `warning`, `retry`, `async`, `default`).
5. Add `sourceAnchor` on key nodes so readers can jump from story to exact code locations (`path:line` or `{ path, line, column, href }`).
6. Validate each generated spec or full manifest with `validate`.
7. Build or refresh `manifest.json` with `manifest` after adding/removing flow files.

## Non-Negotiable Output Rules

- Keep root element type as `FlowTimeline`.
- Keep node types limited to `ArchitectureNode`, `TriggerNode`, `CodeNode`, `DecisionNode`, `PayloadNode`, `ErrorNode`, `DescriptionNode`, and `LinkNode`.
- Ensure every child reference points to an existing element key.
- Include `state.currentStep` and `state.playing`.
- Ensure branch labels and descriptions are explicit enough for keyboard branch selection (prefer `props.transitions` metadata on branching nodes).
- Prefer adding `sourceAnchor` on Trigger/Code/Decision/Error nodes; include line numbers when possible.

## Twoslash Authoring Rules (CodeNode)

- Twoslash callouts are for TypeScript/TSX snippets (`language: "typescript"`, `"ts"`, or `"tsx"`).
- Prefer marker-based auto mode (`// ^?`, `// ^|`, `@errors`) over forcing `twoslash: true`.
- Keep snippets self-contained so twoslash has deterministic context (include key type aliases/interfaces in the snippet when needed).
- Avoid depending on ambient stage-proposal libs for callouts; if you must reference one, add a minimal inline declaration instead of relying on global `esnext` typings.
- If `magicMoveSteps` is present, place twoslash markers in the **final** step code.
- When `magicMoveSteps` + twoslash are used together, the player includes an extra inspection frame after the last code transform.
- Keep callouts intentional (usually 1-3 markers per node) and tied to meaningful type/error teaching moments.

## References

- Read `references/spec-contract.md` for exact shape, props, and manifest rules.
- Read `references/quality-checklist.md` before finalizing generated flows.
- Read `references/prompt-template.md` when prompting another model to draft specs.
