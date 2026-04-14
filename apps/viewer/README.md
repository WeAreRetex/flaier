# @flow-narrator/viewer

Nuxt viewer layer/app for browsing local Flow Narrator specs.

## Run

From the repo root:

```bash
pnpm install
pnpm viewer:dev
```

From `apps/viewer` directly:

```bash
pnpm dev
```

## Local specs directory

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

## API surface

The app serves:

- `GET /api/flows/manifest`
- `GET /api/flows/spec/:id`

`FlowNarrator` consumes `/api/flows/manifest`, and each flow is loaded on demand.

Manifest entries may point at:

- relative local `*.flow.json` files
- inline spec objects
- remote `http(s)` JSON sources

The API normalizes manifest entries so the browser always loads selected flows via `/api/flows/spec/:id`.

## Layer usage

This package is structured as a Nuxt layer (contains `nuxt.config.ts`, `pages/`, `server/`, and `app.vue`) and can be used directly as an app or extended from another Nuxt project.

## Nuxt wrappers

The viewer uses `@flow-narrator/nuxt`, which globally registers:

- `FlowNarratorClient`
- `FlowNarratorDemo`
- `FlowNarratorMdc`

### MDC component (Nuxt Content / Docus)

Install `@flow-narrator/nuxt`, enable the module, and use the globally registered `FlowNarratorMdc` component in `.md`/`.mdc`:

```md
## ::FlowNarratorMdc

src: /api/flows/manifest
interval: 3200
height: min(70vh, 780px)

---

::
```

It includes a bottom-right fullscreen toggle button. When enabled, the component teleports to `body` and renders in a fixed-position modal, so it is not clipped by docs-page layout borders.

For regular Nuxt pages, use `FlowNarratorClient` or `FlowNarratorDemo` instead.
