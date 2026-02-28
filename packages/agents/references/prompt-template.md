# Prompt Template

Use this prompt when asking an LLM to generate a new flow spec from code context.

```text
Generate a single `flow-narrator` flow spec JSON file.

Requirements:
- Output only JSON.
- Root must be `FlowTimeline`.
- Allowed node types: TriggerNode, CodeNode, DescriptionNode, LinkNode.
- Include `state.currentStep` (number) and `state.playing` (boolean).
- Include realistic code snippets for each CodeNode.
- For TypeScript/TSX callouts, include twoslash markers like `// ^?`; optionally set `CodeNode.props.twoslash: true` to force twoslash mode.
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
