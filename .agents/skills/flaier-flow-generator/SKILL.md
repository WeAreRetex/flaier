---
name: flaier-flow-generator
description: Generate, repair, and validate Flaier-ready flows for flaier. Use when converting code paths into `*.flow.json` specs, scaffolding new flow files, fixing invalid flow specs, adding branching narrative paths, modeling architecture diagrams, tuning specs for docs or Slidev embeds, or producing/updating `manifest.json` for disk-based viewer workflows.
---

# Flaier Flow Generator

Create and maintain `flaier` flow specs on disk.

## Fast Path

Run from repo root:

```bash
pnpm agents:scaffold -- --title "Checkout Flow" --template branching --out ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:validate -- ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
```

Run inside `packages/agents`:

```bash
pnpm run scaffold -- --title "Checkout Flow" --template branching --out ./flow-specs/checkout.flow.json
pnpm run validate -- ./flow-specs/checkout.flow.json
pnpm run manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

## Workflow

1. Scaffold with `linear`, `branching`, or `architecture`.
2. Replace placeholders with real labels, code, descriptions, links, and branch paths from the codebase.
3. Keep one `FlowTimeline` root.
4. Use `FlowTimeline.props.mode: "architecture"` and `ArchitectureNode` for topology diagrams.
5. Use `FlowTimeline.props.themeMode: "document"` for docs pages and Slidev embeds.
6. Add `props.transitions` on branching nodes for explicit edge labels and semantics.
7. Add `sourceAnchor` on key nodes, ideally with line numbers.
8. Validate each spec or manifest.
9. Rebuild `manifest.json` after adding or removing flow files.

## Non-Negotiable Rules

- Keep the root element type as `FlowTimeline`.
- Keep node types limited to `ArchitectureNode`, `TriggerNode`, `CodeNode`, `DecisionNode`, `PayloadNode`, `ErrorNode`, `DescriptionNode`, and `LinkNode`.
- Ensure every child reference points to an existing element key.
- Include `state.currentStep` and `state.playing`.
- Prefer explicit branch labels and descriptions via `props.transitions`.
- Prefer `sourceAnchor` on Trigger, Code, Decision, and Error nodes.
- Do not hand-author `twoslashHtml`; it is renderer output.

## References

- Read `references/spec-contract.md` for the exact spec and manifest contract.
- Read `references/quality-checklist.md` before finalizing output.
- Read `references/prompt-template.md` when prompting another model to draft a spec.

In this repo, browser-viewer specs usually live in `apps/viewer/flow-specs`, while deck-oriented architecture specs can live in `apps/slides/flow-specs`.
