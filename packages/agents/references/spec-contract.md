# Spec Contract

Use this contract when writing `*.flow.json` for `flow-narrator`.

## Minimal Valid Shape

```json
{
  "root": "timeline",
  "state": {
    "currentStep": 0,
    "playing": false
  },
  "elements": {
    "timeline": {
      "type": "FlowTimeline",
      "props": {
        "title": "Example Flow",
        "description": "Optional subtitle",
        "layoutEngine": "dagre",
        "layoutRankSep": 260,
        "layoutNodeSep": 170,
        "layoutEdgeSep": 34
      },
      "children": ["trigger-1"]
    },
    "trigger-1": {
      "type": "TriggerNode",
      "props": {
        "label": "Webhook",
        "description": "Entry point"
      },
      "children": ["code-1"]
    },
    "code-1": {
      "type": "CodeNode",
      "props": {
        "label": "Parse payload",
        "language": "typescript",
        "code": "export function parse() {}"
      }
    }
  }
}
```

## Component Props

- `FlowTimeline`:
  - required: `title` (string)
  - optional: `description`, `direction`, `minHeight`, `layoutEngine`, `layoutRankSep`, `layoutNodeSep`, `layoutEdgeSep`
- `TriggerNode`:
  - required: `label`
  - optional: `description`, `color`, `transitions`
- `CodeNode`:
  - required: `label`, `code`
  - optional: `file`, `language`, `comment`, `story`, `wrapLongLines`, `magicMoveSteps`, `twoslash`, `transitions`
  - note: twoslash works with `language: "typescript"` or `"tsx"`; markers like `// ^?` auto-enable twoslash and `twoslash: true` can force it
  - note: when `magicMoveSteps` are present, twoslash renders as an inspection frame after the final step; place markers in the final step code
- `DecisionNode`:
  - required: `label`
  - optional: `condition`, `description`, `transitions`
- `PayloadNode`:
  - required: `label`
  - optional: `payload`, `before`, `after`, `format` (`json` | `yaml` | `text`), `description`, `transitions`
  - note: include at least one of `payload`, `before`, or `after`
- `ErrorNode`:
  - required: `label`, `message`
  - optional: `code`, `cause`, `mitigation`, `transitions`
- `DescriptionNode`:
  - required: `label`, `body`
  - optional: `transitions`
- `LinkNode`:
  - required: `label`, `href`
  - optional: `description`, `transitions`

## Edge Metadata Contract

Use `props.transitions` on any non-root node to attach edge metadata:

```json
{
  "transitions": [
    {
      "to": "next-node-key",
      "label": "Valid payload",
      "description": "Continue with canonicalized request",
      "kind": "success"
    }
  ]
}
```

- `to` is required and must reference an existing element key.
- optional `kind`: `default` | `success` | `error` | `warning` | `retry` | `async`.
- Keep `children` for traversal; `transitions` enriches labels/descriptions/styles (and can define ordering).

## Branching Rules

- Model branches by providing multiple children from one node.
- Prefer `DecisionNode` for explicit branch conditions.
- Add `props.transitions` metadata for branch labels and descriptions; branch buttons use these values when present.
- Keep branch target labels explicit; branch buttons use target labels in the UI.
- Avoid dangling branches; each branch path should converge or terminate intentionally.

## Manifest Contract

Use `manifest.json` to load multiple flows:

```json
{
  "version": 1,
  "defaultFlowId": "auth-login",
  "flows": [
    {
      "id": "auth-login",
      "title": "Auth Login",
      "description": "Request to session issuance",
      "src": "./auth-login.flow.json",
      "tags": ["auth"],
      "entrypoints": ["apps/web/server/api/login.post.ts"]
    }
  ]
}
```

- Keep `id` unique across `flows`.
- Keep `src` relative to `manifest.json` when using local files.
- Set `defaultFlowId` to one of the listed flow ids.
