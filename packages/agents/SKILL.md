---
name: flaier-flow-generator
description: Generate, repair, and validate Flaier-ready flows for flaier. Use when converting code paths into `*.flow.json` specs, scaffolding new flow files, fixing invalid flow specs, adding branching narrative paths, modeling architecture diagrams, tuning specs for docs or Slidev embeds, or producing/updating `manifest.json` for disk-based viewer workflows.
---

# Flaier Flow Generator

Use this package to create and enforce high-quality `flaier` artifacts on disk.

## Fast Path

Run from repo root:

```bash
pnpm agents:scaffold -- --title "Checkout Flow" --template branching --out ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:scaffold -- --title "Platform Architecture" --template architecture --out ./apps/viewer/flow-specs/platform-architecture.flow.json
pnpm agents:scaffold -- --title "Story Architecture" --template architecture --out ./apps/slides/flow-specs/story-architecture.flow.json
pnpm agents:scaffold -- --title "Login Flow" --template sequence --out ./apps/viewer/flow-specs/login-sequence.flow.json
pnpm agents:validate -- ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
```

Run directly inside this folder:

```bash
pnpm run scaffold -- --title "Checkout Flow" --template branching --out ./flow-specs/checkout.flow.json
pnpm run scaffold -- --title "Platform Architecture" --template architecture --out ./flow-specs/platform-architecture.flow.json
pnpm run scaffold -- --title "Story Architecture" --template architecture --out ./apps/slides/flow-specs/story-architecture.flow.json
pnpm run scaffold -- --title "Login Flow" --template sequence --out ./flow-specs/login-sequence.flow.json
pnpm run validate -- ./flow-specs/checkout.flow.json
pnpm run manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

## Workflow

1. Create a scaffold with `scaffold` (`linear`, `branching`, `architecture`, or `sequence`) and realistic flow title.
2. Replace placeholders with real node labels, code snippets, descriptions, links, and branch paths from the target codebase.
3. Keep one `FlowTimeline` root; for architecture diagrams set `FlowTimeline.props.mode` to `"architecture"` and prefer `ArchitectureNode` for infrastructure components.
4. Use `FlowTimeline.props.zones` + `ArchitectureNode.props.zone` when you need explicit group containers (edge/core/data/ops boundaries).
5. When the target is a docs page or Slidev deck, prefer `FlowTimeline.props.themeMode: "document"` and trim chrome with `showHeaderOverlay`, `showExportControls`, `defaultArchitectureInspectorOpen`, and `showArchitectureInspectorToggleText` as needed.
6. Add edge metadata with `props.transitions` on branching nodes to label branch choices (`label`, `description`) and semantics (`kind`: `success`, `error`, `warning`, `retry`, `async`, `default`).
7. Add `sourceAnchor` on key nodes so readers can jump from story to exact code locations (`path:line` or `{ path, line, column, href }`).
8. For architecture nodes, include operational metadata where available (`owner`, `status`, `tier`, `interfaces`, `data`, `security`, `operations`, `links`).
9. Validate each generated spec or full manifest with `validate`.
10. Build or refresh `manifest.json` with `manifest` after adding/removing flow files.

## Sequence Diagrams

Use `sequence` mode to model interactions between actors, services, and data stores over time.

- Set `FlowTimeline.props.mode` to `"sequence"` and list participants in `FlowTimeline.props.participants` in the left-to-right order you want them rendered.
- Define each participant as a `SequenceParticipant` element with `label`, optional `kind` (`actor`, `boundary`, `control`, `entity`, `database`, `queue`, `collections`), and `description`.
- Model steps with `SequenceMessage` (required: `from`, `to`, `label`; optional: `description`, `kind` (`sync` | `async` | `return`), `activate`, `deactivate`, `sourceAnchor`). Messages are listed as root children (or nested inside branches).
- Use `SequenceGroup` (`kind: "alt"`, `"loop"`, or `"opt"`) with child `SequenceBranch` elements to model conditionals, loops, and optional paths. `alt` groups should usually have at least two branches; `loop` and `opt` should have exactly one branch.
- Use `SequenceNote` to place annotations (`placement`: `"left-of"`, `"right-of"`, or `"over"`) tied to one or two participants.
- Turn on `FlowTimeline.props.showSequenceNumbers` to add numbered step labels for easier narration in documentation or presentations.
- `SequenceMessage` and `SequenceNote` must reference participant ids declared in `FlowTimeline.props.participants` in their `from`/`to`/`participants` props.

## Non-Negotiable Output Rules

- Keep root element type as `FlowTimeline`.
- The `root` key may be any string, but it must point at the single `FlowTimeline` element.
- Narrative and architecture specs: keep node types limited to `ArchitectureNode`, `TriggerNode`, `CodeNode`, `DecisionNode`, `PayloadNode`, `ErrorNode`, `DescriptionNode`, and `LinkNode`.
- Sequence specs: keep node types limited to `SequenceParticipant`, `SequenceMessage`, `SequenceNote`, `SequenceGroup`, and `SequenceBranch`.
- Ensure every child reference points to an existing element key.
- Include `state.currentStep` and `state.playing`.
- Ensure branch labels and descriptions are explicit enough for keyboard branch selection (prefer `props.transitions` metadata on branching nodes; in sequence mode, branch labels come from `SequenceBranch.props.label`).
- Prefer adding `sourceAnchor` on Trigger/Code/Decision/Error nodes and on SequenceMessage/SequenceNote/SequenceGroup nodes; include line numbers when possible.
- In sequence mode, `FlowTimeline.props.participants` must list every `SequenceParticipant` id exactly once.

## Twoslash Authoring Rules (CodeNode)

- Twoslash callouts are for TypeScript/TSX snippets (`language: "typescript"`, `"ts"`, or `"tsx"`).
- Prefer marker-based auto mode (`// ^?`, `// ^|`, `@errors`) over forcing `twoslash: true`.
- Keep snippets self-contained so twoslash has deterministic context (include key type aliases/interfaces in the snippet when needed).
- Avoid depending on ambient stage-proposal libs for callouts; if you must reference one, add a minimal inline declaration instead of relying on global `esnext` typings.
- If `magicMoveSteps` is present, place twoslash markers in the **final** step code.
- When `magicMoveSteps` + twoslash are used together, the player includes an extra inspection frame after the last code transform.
- Keep callouts intentional (usually 1-3 markers per node) and tied to meaningful type/error teaching moments.
- Do not hand-author `twoslashHtml`; it is renderer output, not source input.

## References

- Read `references/spec-contract.md` for exact shape, props, and manifest rules.
- Read `references/quality-checklist.md` before finalizing generated flows.
- Read `references/prompt-template.md` when prompting another model to draft specs.

In this repo, browser-viewer specs usually live in `apps/viewer/flow-specs`, while deck-oriented architecture specs can live in `apps/slides/flow-specs`.
