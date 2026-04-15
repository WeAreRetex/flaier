# Flaier

[![CI](https://img.shields.io/github/actions/workflow/status/WeAreRetex/flaier/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/WeAreRetex/flaier/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/WeAreRetex/flaier?style=flat-square)](https://github.com/WeAreRetex/flaier/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/%40flaier%2Fcore?style=flat-square&label=%40flaier%2Fcore)](https://www.npmjs.com/package/@flaier/core)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fcore?style=flat-square)](https://www.npmjs.com/package/@flaier/core)
[![npm version](https://img.shields.io/npm/v/%40flaier%2Fnuxt?style=flat-square&label=%40flaier%2Fnuxt)](https://www.npmjs.com/package/@flaier/nuxt)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fnuxt?style=flat-square)](https://www.npmjs.com/package/@flaier/nuxt)

Flaier turns structured JSON specs into interactive code walkthroughs, architecture diagrams, and embeddable demos for Vue and Nuxt apps.

## Packages

| Package | What it does |
| --- | --- |
| [`@flaier/core`](https://www.npmjs.com/package/@flaier/core) | Vue renderer, catalog helpers, CSS, export controls, and built-in node renderers |
| [`@flaier/nuxt`](https://www.npmjs.com/package/@flaier/nuxt) | Nuxt module plus Docus/Nuxt Content-friendly wrapper components |
| [`apps/viewer`](https://github.com/WeAreRetex/flaier/tree/main/apps/viewer) | Local viewer app and reusable Nuxt layer for manifests and on-disk specs |
| [`apps/slides`](https://github.com/WeAreRetex/flaier/tree/main/apps/slides) | Slidev example deck that embeds Flaier panels in presentation layouts |
| [`apps/docs`](https://github.com/WeAreRetex/flaier/tree/main/apps/docs) | Documentation source for API, embeds, and examples |

## Quick Start

Install the core Vue package:

```bash
npm i @flaier/core
```

Render a flow or manifest:

```vue
<script setup lang="ts">
import { Flaier } from "@flaier/core";
import "@flaier/core/style.css";
</script>

<template>
  <Flaier src="./flow-specs/manifest.json" :interval="3000" />
</template>
```

If you are in Nuxt, install the module too:

```bash
npm i @flaier/core @flaier/nuxt
```

```ts
export default defineNuxtConfig({
  modules: ["@flaier/nuxt"],
});
```

## What Flaier Supports

- Narrative playback with timeline controls, autoplay, and active-step focus.
- Architecture mode with zones, inspector panels, and topology-first layouts.
- Manifest-driven multi-flow browsing for AI-generated spec collections.
- Full-diagram PNG and PDF export instead of viewport-only snapshots.
- Nuxt, Docus, Nuxt Content, and Slidev embedding patterns in the repo examples.

## Repo Layout

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
- `apps/docs` and `apps/viewer` resolve `@flaier/core` directly from source during dev so component edits land without a manual rebuild.
- `apps/slides` resolves live source JS from `@flaier/core` and keeps using built CSS.

## Examples And Docs

- Repository: https://github.com/WeAreRetex/flaier
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Viewer app: https://github.com/WeAreRetex/flaier/tree/main/apps/viewer
- Slidev example: https://github.com/WeAreRetex/flaier/tree/main/apps/slides
- Core package: https://github.com/WeAreRetex/flaier/tree/main/packages/core
- Nuxt package: https://github.com/WeAreRetex/flaier/tree/main/packages/nuxt

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

Use the top-right export button in the renderer to download the full diagram as:

- PNG
- PDF

Export captures all laid-out nodes and edges, not just the current viewport.

When embedding architecture diagrams in docs pages or slide decks, you can tune the chrome directly on `FlowTimeline.props`:

- `themeMode: "document"` to follow the surrounding document theme.
- `showHeaderOverlay: false` to reclaim vertical space.
- `showExportControls: false` when export UI would distract in a constrained embed.
- `defaultArchitectureInspectorOpen: false` and `showArchitectureInspectorToggleText: false` for compact deck layouts.

### Recommended On-Disk Layout

```text
flow-specs/
  manifest.json
  auth-login.flow.json
  billing-retry.flow.json
  webhook-dispatch.flow.json
```

### Manifest Example

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

### Vue Usage

```vue
<Flaier src="./flow-specs/manifest.json" :interval="3000" />
```

Relative `src` values inside `manifest.json` are resolved against the manifest file location, so AI harnesses can generate each `*.flow.json` in separate sessions and append/update the manifest incrementally.

### Build Manifest From Disk

```bash
pnpm agents:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

This scans `*.flow.json` files and writes a manifest that the viewer can load directly.

## Agents Package Quick Start

```bash
pnpm agents:scaffold -- --title "Checkout Flow" --template branching --out ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
pnpm agents:validate -- ./apps/viewer/flow-specs/manifest.json
pnpm agents:scaffold -- --title "Support Story Architecture" --template architecture --out ./apps/slides/flow-specs/story-architecture.flow.json
```

The Slidev example in `apps/slides` shows how to present an architecture spec with `FlaierPanel` and document-aware theme settings.
