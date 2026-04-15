# @flaier/core

[![npm version](https://img.shields.io/npm/v/%40flaier%2Fcore?style=flat-square)](https://www.npmjs.com/package/@flaier/core)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fcore?style=flat-square)](https://www.npmjs.com/package/@flaier/core)
[![License](https://img.shields.io/github/license/WeAreRetex/flaier?style=flat-square)](https://github.com/WeAreRetex/flaier/blob/main/LICENSE)

Vue components, catalog helpers, and styles for rendering Flaier flow specs in narrative and architecture modes.

## Install

```bash
npm i @flaier/core
```

## Usage

```vue
<script setup lang="ts">
import { Flaier } from "@flaier/core";
import "@flaier/core/style.css";
</script>

<template>
  <Flaier src="./flow-specs/manifest.json" :interval="3000" />
</template>
```

## Features

- Narrative playback with active-step focus, autoplay, and timeline controls.
- Architecture rendering with zones, inspector panels, and export controls.
- Manifest support for loading many related flows behind one entry point.
- PNG and PDF export for the full diagram, not just the visible viewport.

## Links

- Repository: https://github.com/WeAreRetex/flaier
- Package source: https://github.com/WeAreRetex/flaier/tree/main/packages/core
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Nuxt integration: https://www.npmjs.com/package/@flaier/nuxt
- Viewer example: https://github.com/WeAreRetex/flaier/tree/main/apps/viewer
