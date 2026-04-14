# Prompt Template

Use this prompt when asking an LLM to generate a new flow spec from code context.

```text
Generate a single `flow-narrator` flow spec JSON file.

Requirements:
- Output only JSON.
- Root must be `FlowTimeline`.
- Allowed node types: ArchitectureNode, TriggerNode, CodeNode, DecisionNode, PayloadNode, ErrorNode, DescriptionNode, LinkNode.
- Include `state.currentStep` (number) and `state.playing` (boolean).
- For topology/system diagrams, set `FlowTimeline.props.mode` to `architecture` and prefer `ArchitectureNode` for services/stores/queues/gateways.
- When boundaries matter, define `FlowTimeline.props.zones` and set `ArchitectureNode.props.zone` references.
- If the flow is intended for docs pages or a Slidev deck, prefer `FlowTimeline.props.themeMode: "document"` and trim chrome with `showHeaderOverlay`, `showExportControls`, `defaultArchitectureInspectorOpen`, and `showArchitectureInspectorToggleText` when appropriate.
- For architecture nodes, include operational metadata when known (`owner`, `status`, `tier`, `interfaces`, `data`, `security`, `operations`, `links`).
- Include realistic code snippets for each CodeNode.
- Prefer `DecisionNode` for branch points and add edge metadata in `props.transitions` (`to`, `label`, `description`, `kind`) on branching nodes.
- Use `PayloadNode` when before/after payload snapshots help explain transformations.
- Use `ErrorNode` for failure paths with concrete `message`, `cause`, and `mitigation`.
- Add `sourceAnchor` to key nodes using `path:line` strings (or `{ path, line, column, href }` object form) when source locations are known.
- For TypeScript/TSX callouts, include twoslash markers like `// ^?`; optionally set `CodeNode.props.twoslash: true` to force twoslash mode.
- Do not generate `twoslashHtml`; the renderer derives that from source code and twoslash markers.
- Keep twoslash snippets self-contained (inline small helper types/interfaces when needed) so browser rendering does not depend on external ambient typings.
- If a CodeNode includes `magicMoveSteps`, place twoslash markers in the **final** step code (the twoslash inspection frame appears after the last transform).
- Model branches with `children` arrays when decisions/fallbacks exist.
- Keep every child key resolvable in `elements`.

Flow goal:
<describe the scenario>

Entrypoints:
<list files/functions>

Desired narrative depth:
<short | medium | deep>
```

After generation, run package validation commands before accepting output.
