# Quality Checklist

Use this checklist before finalizing generated flow specs.

## Narrative Quality

- Use a concrete flow title and description tied to real system behavior.
- Start with a clear trigger node (cron, webhook, alarm, user action).
- Keep each node focused on one responsibility.
- Use `DescriptionNode.body` to explain side effects and state changes, not generic filler text.
- Use realistic, minimal code snippets in `CodeNode.code`.
- Use `PayloadNode` for data snapshots/transforms and `ErrorNode` for failure states when those concepts matter to the story.

## Interaction Quality

- Prefer `DecisionNode` when a branch depends on a named condition.
- Add `props.transitions` metadata for branching edges so branch choices have explicit labels/descriptions and semantics (`success`, `error`, etc.).
- Include branch descriptions so keyboard branch selection is understandable.
- Use `magicMoveSteps` only when step-by-step code reveal adds clarity.
- Keep long lines manageable with `wrapLongLines` when needed.
- Use twoslash markers (for example `// ^?`) only on TypeScript/TSX snippets when inline type/error callouts improve understanding; set `twoslash: true` only when you need to force twoslash mode.
- For CodeNodes that combine `magicMoveSteps` and twoslash, keep markers in the final step code so the post-animation twoslash inspection frame has visible callouts.

## Structural Quality

- Keep exactly one root `FlowTimeline` element.
- Ensure all `children` values point to existing element keys.
- Remove unreachable nodes unless intentionally preserved for later generation.
- Keep `state.currentStep` numeric and `state.playing` boolean.
- Prefer one entry root child and build traversal from that node.

## Packaging Quality

- Run `validate` on each spec (or manifest) after edits.
- Run `manifest` after adding/removing `*.flow.json` files.
- Ensure manifest `defaultFlowId` points to an existing flow.
- Keep flow ids stable so viewer links and references do not break.
