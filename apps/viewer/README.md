# @flaier/viewer 🔎

**A local review surface for flow specs, manifests, and generated artifacts.**

`@flaier/viewer` is the local playground for Flaier specs.

Use it when you want to preview a folder of `*.flow.json` files, inspect generated manifests, or hand teammates a ready-made app for reviewing flows without building a custom host first.

## 🎯 What It Is Used For

- Browsing and debugging flow specs during authoring.
- Reviewing AI-generated manifests before they land in docs or product surfaces.
- Giving docs writers and engineers a simple local app for testing new diagrams.
- Reusing the viewer as a Nuxt layer in another project.

## 🌟 Features

- 🗂 Serves a local manifest API for `Flaier` and the Nuxt wrapper components.
- 🪄 Loads `manifest.json` when it exists and synthesizes one when it does not.
- 🌍 Supports local files, inline specs, and remote `http(s)` JSON sources.
- 🧱 Works as either a standalone app or a reusable Nuxt layer.
- 🧩 Uses `@flaier/nuxt`, so docs-style wrappers and embeds are available too.

## 🧭 Common Use Cases

**Spec Authoring**

Keep the viewer open while writing or refining `*.flow.json` files so you can immediately see how a flow reads in the renderer.

**AI Output Review**

Point the app at generated manifests or flow folders and use it as a human QA layer before those artifacts land in docs or demos.

**Internal Portals**

Reuse the app as a Nuxt layer when you want a flow browser inside an internal engineering or enablement surface.

## 🚀 Run

From the repo root:

```bash
pnpm install
pnpm viewer:dev
```

From `apps/viewer` directly:

```bash
pnpm dev
```

## 📁 Local Specs Directory

By default, the app reads specs from:

```text
./flow-specs
```

Override with:

```bash
FLOW_SPECS_DIR=/absolute/or/relative/path pnpm dev
```

If `manifest.json` is present, the viewer loads it.

If `manifest.json` is missing, the viewer scans `*.flow.json` files in `flow-specs/` and builds an in-memory manifest automatically.

To write a manifest explicitly from the repo root:

```bash
pnpm agents:manifest -- --dir ./apps/viewer/flow-specs --out ./apps/viewer/flow-specs/manifest.json
```

## 🔌 API Surface

The app serves:

- `GET /api/flows/manifest`
- `GET /api/flows/spec/:id`

`Flaier` consumes `/api/flows/manifest`, and each flow is loaded on demand.

Manifest entries may point at:

- relative local `*.flow.json` files,
- inline spec objects,
- remote `http(s)` JSON sources.

The API normalizes manifest entries so the browser always loads selected flows through `/api/flows/spec/:id`.

## 🧱 Layer Usage

This package is structured as a Nuxt layer, with `nuxt.config.ts`, `pages/`, `server/`, and `app.vue`, so it can be used directly as an app or extended from another Nuxt project.

## 🧩 Nuxt Wrappers

The viewer uses `@flaier/nuxt`, which globally registers:

- `FlaierClient`
- `FlaierDemo`
- `FlaierMdc`

Example MDC usage in Nuxt Content or Docus:

```md
## ::FlaierMdc

src: /api/flows/manifest
interval: 3200
height: min(70vh, 780px)

---

::
```

`FlaierMdc` includes a bottom-right fullscreen toggle. When enabled, it teleports to `body` and renders in a fixed-position modal so the diagram is not clipped by docs-page layout borders.

For regular Nuxt pages, use `FlaierClient` or `FlaierDemo` instead.

## 🔗 Links

- Repository: https://github.com/WeAreRetex/flaier
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Core package: https://www.npmjs.com/package/@flaier/core
- Nuxt package: https://www.npmjs.com/package/@flaier/nuxt
