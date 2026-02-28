# @flow-narrator/viewer

Nuxt viewer layer/app for browsing local Flow Narrator specs.

## Run

```bash
bun install
bun run dev
```

## Local specs directory

By default, the app reads specs from:

```text
./flow-specs
```

Override with:

```bash
FLOW_SPECS_DIR=/absolute/or/relative/path bun run dev
```

The app serves:

- `GET /api/flows/manifest`
- `GET /api/flows/spec/:id`

`FlowNarrator` consumes `/api/flows/manifest`, and each flow is loaded on demand.

## Layer usage

This package is structured as a Nuxt layer (contains `nuxt.config.ts`, `pages/`, `server/`, `app.vue`) and can be used directly as an app or extended from another Nuxt project.

## MDC component (Nuxt Content / Docus)

The layer ships a markdown component at `components/content/FlowNarratorMdc.vue`.

Use it in `.md`/`.mdc`:

```md
::FlowNarratorMdc
---
src: /api/flows/manifest
interval: 3200
height: min(70vh, 780px)
---
::
```

It includes a bottom-right fullscreen toggle button. When enabled, the component teleports to `body` and renders in a fixed-position modal, so it is not clipped by docs-page layout borders.
