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
