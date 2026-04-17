# Prompt Template

Use this prompt when asking an LLM to generate a new flow spec from code context.

```text
Generate a single `flaier` flow spec JSON file.

Requirements:
- Output only JSON.
- Root must be `FlowTimeline`.
- Allowed node types: ArchitectureNode, TriggerNode, CodeNode, DecisionNode, PayloadNode, ErrorNode, DescriptionNode, LinkNode, SequenceParticipant, SequenceMessage, SequenceNote, SequenceGroup, SequenceBranch.
- Include `state.currentStep` (number) and `state.playing` (boolean).
- For topology or system diagrams, set `FlowTimeline.props.mode` to `architecture` and prefer `ArchitectureNode`.
- For interaction timelines, set `FlowTimeline.props.mode` to `sequence`, define `FlowTimeline.props.participants`, and use `SequenceParticipant`, `SequenceMessage`, `SequenceNote`, `SequenceGroup`, and `SequenceBranch`.
- When boundaries matter, define `FlowTimeline.props.zones` and set `ArchitectureNode.props.zone` references.
- If the flow is intended for docs pages or a Slidev deck, prefer `FlowTimeline.props.themeMode: "document"` and trim chrome when appropriate.
- For architecture nodes, include operational metadata when known (`owner`, `status`, `tier`, `interfaces`, `data`, `security`, `operations`, `links`).
- Include realistic code snippets for each `CodeNode`.
- Prefer `DecisionNode` for branch points and add edge metadata in `props.transitions`.
- Use `PayloadNode` when before or after payload snapshots help explain transformations.
- In sequence mode, keep `FlowTimeline.children` as ordered top-level statements and use `SequenceGroup.children` for `SequenceBranch` ids.
- Use `ErrorNode` for failure paths with concrete `message`, `cause`, and `mitigation`.
- Add `sourceAnchor` to key nodes using `path:line` strings or `{ path, line, column, href }`.
- For TypeScript or TSX callouts, include twoslash markers like `// ^?`.
- Do not generate `twoslashHtml`.
- Keep twoslash snippets self-contained.
- If a `CodeNode` includes `magicMoveSteps`, place twoslash markers in the final step code.
- Model branches with `children` arrays when decisions or fallbacks exist.
- Keep every child key resolvable in `elements`.

Flow goal:
<describe the scenario>

Entrypoints:
<list files/functions>

Desired narrative depth:
<short | medium | deep>
```

After generation, run the package validation commands before accepting output.
