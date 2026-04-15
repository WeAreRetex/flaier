# Flaier

Spec-driven flow visualizer for AI-generated codebase storytelling.

## Workspace

```text
apps/docs       Docus-powered documentation site
apps/slides     Slidev example deck built with Flaier
apps/viewer     Nuxt viewer for local flow specs and manifests
packages/core   Published `@flaier/core` Vue package
packages/nuxt   `@flaier/nuxt` module and wrapper components
packages/agents CLI tools and shipped flow-generation skill
```

## Development

```bash
pnpm install
pnpm dev
pnpm docs:dev
pnpm viewer:dev
pnpm slides:dev
```

- `pnpm dev` opens the local viewer app.
- `pnpm docs:dev` runs the docs site.
- `pnpm slides:dev` runs the Slidev example deck.

## Release

```bash
pnpm release
pnpm release:minor
pnpm release:major
```

These commands use `changelogen` to bump the root version and changelog, sync the same version into every workspace app/package, create a `chore(release): vX.Y.Z` commit, and tag `vX.Y.Z`. Pushing that tag triggers the npm release workflow for `@flaier/core` and `@flaier/nuxt`.

## Netlify

- `apps/docs` deploys with `pnpm --dir apps/docs build`. On Netlify, Nitro detects the platform automatically. Set the Netlify package directory to `apps/docs`.
- `apps/slides` ships an app-local `netlify.toml` that builds the Slidev deck to `apps/slides/dist`.
- For each Netlify site, set the app directory as the package directory and leave the base directory at the repo root.

## AI Artifact Model

`Flaier` accepts:

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

When embedding architecture diagrams in docs pages or slide decks, you can tune the chrome directly on `FlowTimeline.props`:

- `themeMode: "document"` to follow the surrounding document theme.
- `showHeaderOverlay: false` to reclaim vertical space.
- `showExportControls: false` when export UI would distract in a constrained embed.
- `defaultArchitectureInspectorOpen: false` and `showArchitectureInspectorToggleText: false` for compact deck layouts.

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
<Flaier src="./flow-specs/manifest.json" :interval="3000" />
```

Relative `src` values inside `manifest.json` are resolved against the manifest file location, so AI harnesses can generate each `*.flow.json` in separate sessions and append/update the manifest incrementally.

### Build manifest from disk

```bash
pnpm agents:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

This scans `*.flow.json` files and writes a manifest that the viewer can load directly.

## Packages and apps

- `@flaier/core` (`packages/core`): Vue component library + json-render catalog/registry exports.
- `@flaier/nuxt` (`packages/nuxt`): Nuxt/Docus/Nuxt Content integrations and wrapper components.
- `packages/agents`: skill + CLI tools for generating, validating, and packaging flow specs.
- `apps/docs`: docs site that exercises the Nuxt module and demo wrapper components.
- `apps/slides`: Slidev example that embeds `FlaierPanel` inside a deck.
- `apps/viewer`: Nuxt app that reads local specs from disk and renders them through `Flaier`.

### Agents package quick start

```bash
pnpm agents:scaffold -- --title "Checkout Flow" --template branching --out ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
pnpm agents:validate -- ./apps/viewer/flow-specs/manifest.json
pnpm agents:scaffold -- --title "Support Story Architecture" --template architecture --out ./apps/slides/flow-specs/story-architecture.flow.json
```

The Slidev example in `apps/slides` shows how to present an architecture spec with `FlaierPanel` and document-aware theme settings.
