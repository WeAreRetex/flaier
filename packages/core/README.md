# @flaier/core ✨

[![npm version](https://img.shields.io/npm/v/%40flaier%2Fcore?style=flat-square)](https://www.npmjs.com/package/@flaier/core)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fcore?style=flat-square)](https://www.npmjs.com/package/@flaier/core)
[![License](https://img.shields.io/github/license/WeAreRetex/flaier?style=flat-square)](https://github.com/WeAreRetex/flaier/blob/main/LICENSE)

**The Vue renderer for explainable flows and architecture walkthroughs.**

`@flaier/core` is the main Vue renderer for Flaier.

Use it when you want to turn a JSON flow spec or manifest into an interactive walkthrough inside a Vue application, a demo surface, or an internal developer tool.

## 🎯 What It Is Used For

- Explaining how a request, workflow, or architecture behaves step by step.
- Embedding interactive system diagrams in Vue apps instead of static screenshots.
- Rendering AI-generated flow artifacts in a polished UI people can actually inspect.
- Exporting diagrams for docs, decks, tickets, and async review threads.

## 🌟 Features

- 🎬 Narrative playback with active-step focus, autoplay, and timeline controls.
- 🏗 Architecture rendering with zones, inspector panels, and topology-first layouts.
- 🗂 Manifest support for loading many related flows behind one entry point.
- 📤 PNG and PDF export for the full diagram, not just the visible viewport.
- 🎨 Bundled CSS and built-in node renderers so the default experience looks production-ready fast.

## 🧭 Common Use Cases

**Vue Apps**

Embed flows directly inside internal tools, product surfaces, or engineering portals without building a renderer from scratch.

**AI-Generated Specs**

Point the component at checked-in JSON, generated artifacts, or remote spec URLs and render them in a UI people can step through.

**Architecture Reviews**

Switch to architecture mode when you need a cleaner system view for discussing boundaries, dependencies, and transitions.

## 📦 Install

```bash
npm i @flaier/core
```

## 🚀 Basic Usage

```vue
<script setup lang="ts">
import { Flaier } from "@flaier/core";
import "@flaier/core/style.css";
</script>

<template>
  <Flaier src="./flow-specs/manifest.json" :interval="3000" />
</template>
```

## 🧠 Accepted Inputs

`Flaier` accepts:

- a single flow spec object,
- a single flow spec JSON path or URL,
- a multi-flow manifest object,
- or a multi-flow manifest JSON path or URL.

That makes `@flaier/core` a good fit whether your specs come from checked-in files, generated artifacts, or remote APIs.

## 🧩 When To Use `@flaier/nuxt` Instead

Stay with `@flaier/core` when you are in plain Vue.

Reach for [`@flaier/nuxt`](https://www.npmjs.com/package/@flaier/nuxt) when you want:

- global Nuxt wrapper components,
- easy embedding in Nuxt Content or Docus markdown,
- or docs-site-friendly fullscreen and client-only behavior out of the box.

## 🔗 Links

- Repository: https://github.com/WeAreRetex/flaier
- Package source: https://github.com/WeAreRetex/flaier/tree/main/packages/core
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Nuxt integration: https://www.npmjs.com/package/@flaier/nuxt
- Viewer example: https://github.com/WeAreRetex/flaier/tree/main/apps/viewer
