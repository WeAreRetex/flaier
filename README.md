# flow-narrator

Spec-driven flow visualizer for AI-generated codebase storytelling.

## Development

```bash
bun install
bun run dev
```

### Run Nuxt viewer layer

```bash
bun --cwd ./apps/viewer install
bun run viewer:dev
```

## AI Artifact Model

`FlowNarrator` accepts:

- a single flow spec object,
- a single flow spec JSON path/URL,
- a multi-flow manifest object,
- or a multi-flow manifest JSON path/URL.

When a manifest is loaded, the viewer shows a dropdown so users can switch between generated flows.

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
bun run flows:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

This scans `*.flow.json` files and writes a manifest that the viewer can load directly.

## Packages and apps

- `flow-narrator` (this package): Vue component library + json-render catalog/registry exports.
- `packages/agents`: skill + CLI tools for generating, validating, and packaging flow specs.
- `apps/viewer`: Nuxt layer/app that reads local specs from disk and renders them through `FlowNarrator`.

### Agents package quick start

```bash
bun --cwd ./packages/agents install
bun run agents:scaffold -- --title "Checkout Flow" --template branching --out ./dev/flow-specs/checkout.flow.json
bun run agents:manifest -- --dir ./dev/flow-specs --out ./dev/flow-specs/manifest.json
bun run agents:validate -- ./dev/flow-specs/manifest.json
```
