# Spec Contract

Use this contract when writing `*.flow.json` for `flaier`.

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
        "mode": "narrative",
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

The `root` value does not have to be literally `"timeline"`; it just needs to point to the single `FlowTimeline` element.

## Component Props

- `FlowTimeline`:
  - required: `title` (string)
  - optional: `description`, `mode` (`narrative` | `sequence` | `architecture`), `participants`, `showSequenceNumbers`, `zones`, `direction`, `minHeight`, `layoutEngine`, `layoutRankSep`, `layoutNodeSep`, `layoutEdgeSep`, `edgeShape` (`smoothstep` | `straight` | `bezier`, default `smoothstep`, architecture mode only), `themeMode` (`local` | `document`), `showHeaderOverlay`, `showExportControls`, `showThemeToggle`, `showArchitectureInspector`, `defaultArchitectureInspectorOpen`, `showArchitectureInspectorToggleText`
- `ArchitectureNode`:
  - required: `label`
  - optional: `kind` (`service` | `database` | `queue` | `cache` | `gateway` | `external` | `compute`), `zone`, `status`, `tier`, `technology`, `runtime`, `owner`, `description`, `tags`, `responsibilities`, `capabilities`, `interfaces`, `data`, `security`, `operations`, `links`, `sourceAnchor`, `transitions`
- `TriggerNode`:
  - required: `label`
  - optional: `description`, `color`, `sourceAnchor`, `transitions`
- `CodeNode`:
  - required: `label`, `code`
  - optional: `file`, `language`, `comment`, `story`, `wrapLongLines`, `magicMoveSteps`, `twoslash`, `twoslashHtml`, `sourceAnchor`, `transitions`
  - note: twoslash works with `language: "typescript"` or `"tsx"`; markers like `// ^?` auto-enable twoslash and `twoslash: true` can force it
  - note: keep twoslash snippets self-contained so browser twoslash does not depend on project-global ambient declarations
  - note: when `magicMoveSteps` are present, twoslash renders as an inspection frame after the final step; place markers in the final step code
  - note: `twoslashHtml` is runtime-rendered HTML; agents should omit it
- `DecisionNode`:
  - required: `label`
  - optional: `condition`, `description`, `sourceAnchor`, `transitions`
- `PayloadNode`:
  - required: `label`
  - optional: `payload`, `before`, `after`, `format` (`json` | `yaml` | `text`), `description`, `sourceAnchor`, `transitions`
  - note: include at least one of `payload`, `before`, or `after`
- `ErrorNode`:
  - required: `label`, `message`
  - optional: `code`, `cause`, `mitigation`, `sourceAnchor`, `transitions`
- `DescriptionNode`:
  - required: `label`, `body`
  - optional: `sourceAnchor`, `transitions`
- `LinkNode`:
  - required: `label`, `href`
  - optional: `description`, `sourceAnchor`, `transitions`
- `SequenceParticipant`:
  - required: `label`
  - optional: `kind` (`participant` | `actor` | `boundary` | `control` | `entity` | `database` | `collections` | `queue`), `description`, `sourceAnchor`
- `SequenceMessage`:
  - required: `from`, `to`, `label`
  - optional: `description`, `kind` (`sync` | `async` | `return`), `activate`, `deactivate`, `sourceAnchor`
- `SequenceNote`:
  - required: `body`, `participants`
  - optional: `label`, `placement` (`left-of` | `right-of` | `over`), `sourceAnchor`
- `SequenceGroup`:
  - required: `label`, `kind` (`alt` | `loop` | `opt`)
  - optional: `description`, `sourceAnchor`
- `SequenceBranch`:
  - required: none
  - optional: `label`, `description`, `sourceAnchor`

## Source Anchor Contract

Use `sourceAnchor` on nodes to point to exact code locations.

String form:

```json
{ "sourceAnchor": "src/server/auth.ts:42" }
```

Object form:

```json
{
  "sourceAnchor": {
    "path": "src/server/auth.ts",
    "line": 42,
    "column": 7,
    "label": "auth.ts:42",
    "href": "https://github.com/org/repo/blob/main/src/server/auth.ts#L42"
  }
}
```

- Prefer including line numbers so anchors are precise.
- `href` is optional and useful for clickable repo links.

## Edge Metadata Contract

Use `props.transitions` on any non-root node to attach edge metadata:

```json
{
  "transitions": [
    {
      "to": "next-node-key",
      "label": "Valid payload",
      "description": "Continue with canonicalized request",
      "kind": "success",
      "protocol": "HTTPS",
      "transport": "sync",
      "auth": "service-token",
      "contract": "internal.api.v2",
      "criticality": "high"
    }
  ]
}
```

- `to` is required and must reference an existing element key.
- optional `kind`: `default` | `success` | `error` | `warning` | `retry` | `async`
- optional `shape`: `smoothstep` | `straight` | `bezier` — overrides `FlowTimeline.props.edgeShape` for this single edge (architecture mode only)
- optional architecture metadata: `protocol`, `transport` (`sync` | `async`), `auth`, `contract`, `criticality` (`low` | `medium` | `high`)

## Branching Rules

- Model branches by providing multiple children from one node.
- Prefer `DecisionNode` for explicit branch conditions.
- Add `props.transitions` metadata for branch labels and descriptions.
- Avoid dangling branches; each branch path should converge or terminate intentionally.

## Architecture Mode Rules

- Set `FlowTimeline.props.mode` to `"architecture"` for topology diagrams.
- Define `FlowTimeline.props.zones` when you want named boundaries.
- Prefer `ArchitectureNode` for services, stores, queues, gateways, and external dependencies.
- Assign `ArchitectureNode.props.zone` to group components inside zone containers.

## Sequence Mode Rules

- Set `FlowTimeline.props.mode` to `"sequence"` for interaction timelines.
- Define `FlowTimeline.props.participants` with the ordered ids of `SequenceParticipant` elements.
- Use `FlowTimeline.children` for the ordered top-level statements.
- Use `SequenceMessage` for interactions, `SequenceNote` for inline commentary, and `SequenceGroup` + `SequenceBranch` for `alt`, `loop`, and `opt` blocks.
- Put `SequenceBranch` ids inside `SequenceGroup.children`, then place ordered nested statements inside each branch's `children`.

## Embedded Docs / Slidev Rules

- Prefer `FlowTimeline.props.themeMode: "document"` for docs pages or Slidev decks.
- Set `showHeaderOverlay: false` when the floating title bar wastes vertical space.
- Set `showExportControls: false` when export UI is not useful in an embed.
- Consider `defaultArchitectureInspectorOpen: false` and `showArchitectureInspectorToggleText: false` for compact layouts.

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
