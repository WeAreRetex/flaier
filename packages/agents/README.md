# @flow-narrator/agents

Tooling package for AI harness workflows that generate and validate flow specs.

## Commands

```bash
bun run manifest -- --dir ./flow-specs --out ./flow-specs/manifest.json
bun run validate -- ./flow-specs/manifest.json
```

`manifest` scans `*.flow.json` and writes `manifest.json`.

`validate` accepts either a single flow spec or a manifest and validates specs with `@json-render/core`.
