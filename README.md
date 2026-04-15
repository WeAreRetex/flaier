# Flaier ✨

[![CI](https://img.shields.io/github/actions/workflow/status/WeAreRetex/flaier/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/WeAreRetex/flaier/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/WeAreRetex/flaier?style=flat-square)](https://github.com/WeAreRetex/flaier/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/%40flaier%2Fcore?style=flat-square&label=%40flaier%2Fcore)](https://www.npmjs.com/package/@flaier/core)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fcore?style=flat-square)](https://www.npmjs.com/package/@flaier/core)
[![npm version](https://img.shields.io/npm/v/%40flaier%2Fnuxt?style=flat-square&label=%40flaier%2Fnuxt)](https://www.npmjs.com/package/@flaier/nuxt)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fnuxt?style=flat-square)](https://www.npmjs.com/package/@flaier/nuxt)

**From JSON spec to living system story.**

Flaier turns structured JSON into animated walkthroughs, architecture diagrams, and embeddable developer demos.

It is built for the moment when a static diagram is not enough: you want to show how a request moves through a system, how services connect, or how an AI-generated flow spec actually behaves when someone explores it step by step.

- Show flows as something people can play, scrub, inspect, and export.
- Embed technical storytelling directly inside Vue apps, Nuxt docs, and presentations.
- Keep specs machine-friendly for generation pipelines without sacrificing human readability.

## 🎯 What Flaier Is For

- Explaining backend, frontend, and infra flows without recording a video every time the system changes.
- Turning AI-generated specs into something teams can browse, review, and ship in docs.
- Embedding interactive diagrams in Vue apps, Nuxt docs portals, and Slidev presentations.
- Exporting polished system views for async reviews, tickets, docs, and stakeholder decks.

## 🌟 Feature Highlights

- 🎬 Narrative mode for timeline playback, active-step focus, autoplay, and guided walkthroughs.
- 🏗 Architecture mode for topology-first diagrams, zones, inspector panels, and static exploration.
- 🗂 Manifest support so one URL or file can expose a whole collection of related flows.
- 📤 Full-diagram PNG and PDF export instead of viewport-only screenshots.
- 🧩 Vue, Nuxt, Nuxt Content, Docus, and Slidev-friendly embedding patterns.
- 🤖 JSON-first artifact model that works well with codegen, CLIs, and LLM-driven authoring.

## 📦 Projects In This Repo

| Project | Used for |
| --- | --- |
| [`@flaier/core`](https://www.npmjs.com/package/@flaier/core) | The main Vue renderer with components, styles, export controls, and built-in node renderers |
| [`@flaier/nuxt`](https://www.npmjs.com/package/@flaier/nuxt) | Nuxt module and wrappers for app pages, docs sites, and MDC content embeds |
| [`apps/viewer`](https://github.com/WeAreRetex/flaier/tree/main/apps/viewer) | Local playground for browsing manifests and `*.flow.json` files while authoring or debugging |
| [`apps/slides`](https://github.com/WeAreRetex/flaier/tree/main/apps/slides) | Slidev example deck showing how Flaier can power architecture talks and demos |
| [`apps/docs`](https://github.com/WeAreRetex/flaier/tree/main/apps/docs) | Documentation source for API usage, examples, and embed patterns |
| [`packages/agents`](https://github.com/WeAreRetex/flaier/tree/main/packages/agents) | CLI helpers for scaffolding, validating, and manifesting flow specs |

## 🚀 Quick Start

If you just want to render a flow in Vue, start with `@flaier/core`:

```bash
npm i @flaier/core
```

```vue
<script setup lang="ts">
import { Flaier } from "@flaier/core";
import "@flaier/core/style.css";
</script>

<template>
  <Flaier src="./flow-specs/manifest.json" :interval="3000" />
</template>
```

If you are in Nuxt, add the module too:

```bash
npm i @flaier/core @flaier/nuxt
```

```ts
export default defineNuxtConfig({
  modules: ["@flaier/nuxt"],
});
```

If you want a local playground for specs and manifests, run the viewer app from this repo:

```bash
pnpm install
pnpm viewer:dev
```

## 🧭 Common Use Cases

**Docs Teams**

Replace static screenshots and one-off screen recordings with diagrams readers can scrub, replay, inspect, and fullscreen directly inside your docs site.

**AI Pipelines**

Generate `*.flow.json` artifacts from agents or code analysis, validate them, group them with manifests, and hand the result to humans in a renderer that is actually reviewable.

**Architecture Reviews**

Use architecture mode to discuss zones, transitions, and service boundaries in design reviews, then export the same view as PNG or PDF for tickets and follow-up notes.

## 🧠 What You Can Render

`Flaier` accepts:

- a single flow spec object,
- a single flow spec JSON path or URL,
- a multi-flow manifest object,
- or a multi-flow manifest JSON path or URL.

When a manifest is loaded, the renderer exposes a flow picker so users can jump between generated flows without changing the host page.

## 🎛 Rendering Modes

`FlowTimeline.props.mode` controls how people explore the diagram:

- `"narrative"` (default): timeline controls, active-node focus, autoplay, and step traversal.
- `"architecture"`: topology exploration with inspector panels and full-diagram export controls.

For architecture diagrams, prefer `ArchitectureNode` entries, explicit `props.transitions` labels, and `FlowTimeline.props.zones` plus `ArchitectureNode.props.zone` so system boundaries stay readable.

## 📤 Diagram Export

Use the export button in the renderer to download the full diagram as:

- PNG
- PDF

Export captures every laid-out node and edge, not just the visible viewport.

When embedding architecture diagrams in docs pages or slide decks, these `FlowTimeline.props` settings are especially useful:

- `themeMode: "document"` to follow the surrounding document theme.
- `showHeaderOverlay: false` to reclaim vertical space.
- `showExportControls: false` when export UI would distract inside a tight embed.
- `defaultArchitectureInspectorOpen: false` and `showArchitectureInspectorToggleText: false` for compact presentation layouts.

## 🛠 Manifest Workflow

Recommended on-disk layout:

```text
flow-specs/
  manifest.json
  auth-login.flow.json
  billing-retry.flow.json
  webhook-dispatch.flow.json
```

Manifest example:

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

Relative `src` values inside `manifest.json` are resolved against the manifest file location, so AI harnesses can generate each `*.flow.json` in separate sessions and append or update the manifest incrementally.

Build a manifest from disk:

```bash
pnpm agents:manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
```

This scans `*.flow.json` files and writes a manifest the viewer or renderer can load directly.

## 🤖 Agents Quick Start

Use the agents package when you want to scaffold or validate specs instead of hand-authoring every JSON file:

If your coding agent supports [skills.sh](https://skills.sh), you can also install the provided `flaier-flow-generator` skill directly from this repo with `npx skills add https://github.com/WeAreRetex/flaier --skill flaier-flow-generator`. That gives your agent a packaged workflow for generating, repairing, validating, and manifesting Flaier `*.flow.json` artifacts.

```bash
pnpm agents:scaffold -- --title "Checkout Flow" --template branching --out ./apps/viewer/flow-specs/checkout.flow.json
pnpm agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
pnpm agents:validate -- ./apps/viewer/flow-specs/manifest.json
pnpm agents:scaffold -- --title "Support Story Architecture" --template architecture --out ./apps/slides/flow-specs/story-architecture.flow.json
```

The Slidev example in `apps/slides` shows how to present an architecture spec with `FlaierPanel` and document-aware theme settings.

## 🗂 Repo Layout

```text
apps/docs       Docus-powered documentation site
apps/slides     Slidev example deck built with Flaier
apps/viewer     Nuxt viewer for local flow specs and manifests
packages/core   Published `@flaier/core` Vue package
packages/nuxt   Published `@flaier/nuxt` module and wrapper components
packages/agents CLI tools and shipped flow-generation skill
```

## 👩‍💻 Development

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
- `apps/docs` and `apps/viewer` resolve `@flaier/core` directly from source during dev so renderer edits land without a manual rebuild.
- `apps/slides` resolves live source JS from `@flaier/core` and keeps using built CSS.

## 🔗 Examples And Docs

- Repository: https://github.com/WeAreRetex/flaier
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Viewer app: https://github.com/WeAreRetex/flaier/tree/main/apps/viewer
- Slidev example: https://github.com/WeAreRetex/flaier/tree/main/apps/slides
- Core package: https://github.com/WeAreRetex/flaier/tree/main/packages/core
- Nuxt package: https://github.com/WeAreRetex/flaier/tree/main/packages/nuxt

## 📦 Release

```bash
pnpm release
pnpm release:minor
pnpm release:major
```

These commands use `changelogen` to bump the root version and changelog, sync the same version into every workspace app and package, create a `chore(release): vX.Y.Z` commit, and tag `vX.Y.Z`. Pushing that tag triggers the npm release workflow for `@flaier/core` and `@flaier/nuxt`.

## ☁️ Netlify

- `apps/docs` deploys with `pnpm --dir apps/docs build`. On Netlify, Nitro detects the platform automatically. Set the Netlify package directory to `apps/docs`.
- `apps/slides` ships an app-local `netlify.toml` that builds the Slidev deck to `apps/slides/dist`.
- For each Netlify site, set the app directory as the package directory and leave the base directory at the repo root.
