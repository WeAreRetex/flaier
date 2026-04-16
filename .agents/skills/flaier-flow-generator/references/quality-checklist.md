# Quality Checklist

Use this checklist before finalizing generated flow specs.

## Narrative Quality

- Use a concrete flow title and description tied to real system behavior.
- Start with a clear trigger node.
- Keep each node focused on one responsibility.
- Use `DescriptionNode.body` to explain side effects and state changes.
- Use realistic, minimal code snippets in `CodeNode.code`.
- For topology overviews, set `FlowTimeline.props.mode` to `architecture` and use `ArchitectureNode`.
- Define `FlowTimeline.props.zones` and assign `ArchitectureNode.props.zone` when domains or trust boundaries matter.
- Use `PayloadNode` for data snapshots and `ErrorNode` for failure states when those concepts matter.
- Add `sourceAnchor` to key nodes, preferably `path:line`.

## Interaction Quality

- Prefer `DecisionNode` when a branch depends on a named condition.
- Add `props.transitions` metadata so branch choices have explicit labels, descriptions, and semantics.
- Use `magicMoveSteps` only when step-by-step code reveal adds clarity.
- Keep long lines manageable with `wrapLongLines` when needed.
- Use twoslash markers only on TypeScript or TSX snippets when inline type or error callouts improve understanding.
- Keep twoslash snippets self-contained.
- For CodeNodes that combine `magicMoveSteps` and twoslash, keep markers in the final step code.
- For architecture mode, use explicit edge labels for critical links.
- Add architecture metadata where useful: `owner`, `status`, `tier`, `interfaces`, `data`, `security`, and `operations`.
- For docs pages or slide decks, prefer `themeMode: "document"` and hide chrome when the canvas is tight.

## Structural Quality

- Keep exactly one root `FlowTimeline` element.
- Ensure all `children` values point to existing element keys.
- Remove unreachable nodes unless intentionally preserved.
- Keep `state.currentStep` numeric and `state.playing` boolean.
- Prefer one entry root child and build traversal from that node.
- Validate `sourceAnchor` references are plausible and include line numbers where available.

## Packaging Quality

- Run `validate` on each spec or manifest after edits.
- Run `manifest` after adding or removing `*.flow.json` files.
- Ensure manifest `defaultFlowId` points to an existing flow.
- Keep flow ids stable so viewer links and references do not break.
