# flow-narrator

Spec-driven flow visualizer for AI-generated codebase storytelling.

## Development

```bash
pnpm install
vp run dev
```

### Run Nuxt viewer layer

```bash
pnpm --dir ./apps/viewer install
pnpm --dir ./apps/viewer dev
```

## AI Artifact Model

`FlowNarrator` accepts:

- a single flow spec object,
- a single flow spec JSON path/URL,
- a multi-flow manifest object,
- or a multi-flow manifest JSON path/URL.

When a manifest is loaded, the viewer shows a dropdown so users can switch between generated flows.

## Rendering Modes

`FlowTimeline.props.mode` controls player behavior:

- `"narrative"` (default): timeline controls, active-node focus, autoplay/step traversal.
- `"architecture"`: static topology exploration with node inspector and full-diagram export controls.

For architecture diagrams, prefer `ArchitectureNode` entries, explicit `props.transitions` labels, and `FlowTimeline.props.zones` + `ArchitectureNode.props.zone` to visualize system boundaries.

## Diagram Export

Use the top-right export button in the renderer to download the **full diagram** as:

- PNG
- PDF

Export captures all laid-out nodes and edges, not just the current viewport.

### Recommended on-disk layout

```text
flow-specs/
  manifest.json
  auth-login.flow.json
  billing-retry.flow.json
  webhook-dispatch.flow.json
```

### Manifest example

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
      "tags": ["auth", "api"],
      "entrypoints": ["apps/web/server/api/login.post.ts"]
    }
  ]
}
```

### Vue usage

```vue
<FlowNarrator src="./flow-specs/manifest.json" :interval="3000" />
```

Relative `src` values inside `manifest.json` are resolved against the manifest file location, so AI harnesses can generate each `*.flow.json` in separate sessions and append/update the manifest incrementally.

### Build manifest from disk

```bash
vp run flows:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

This scans `*.flow.json` files and writes a manifest that the viewer can load directly.

## Packages and apps

- `flow-narrator` (published from `packages/core`): Vue component library + json-render catalog/registry exports.
- `@flow-narrator/nuxt` (`packages/nuxt`): Nuxt/Docus/Nuxt Content integrations and wrapper components.
- `packages/agents`: skill + CLI tools for generating, validating, and packaging flow specs.
- `apps/viewer`: Nuxt app that reads local specs from disk and renders them through `FlowNarrator`.

### Agents package quick start

```bash
pnpm --dir ./packages/agents install
vp run agents:scaffold -- --title "Checkout Flow" --template branching --out ./apps/viewer/flow-specs/checkout.flow.json
vp run agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
vp run agents:validate -- ./apps/viewer/flow-specs/manifest.json
```
