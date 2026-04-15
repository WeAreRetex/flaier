# @flaier/nuxt

[![npm version](https://img.shields.io/npm/v/%40flaier%2Fnuxt?style=flat-square)](https://www.npmjs.com/package/@flaier/nuxt)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fnuxt?style=flat-square)](https://www.npmjs.com/package/@flaier/nuxt)
[![License](https://img.shields.io/github/license/WeAreRetex/flaier?style=flat-square)](https://github.com/WeAreRetex/flaier/blob/main/LICENSE)

Nuxt module and wrapper components for embedding Flaier flows in Nuxt, Nuxt Content, and Docus apps.

## Install

```bash
npm i @flaier/core @flaier/nuxt
```

## Setup

```ts
export default defineNuxtConfig({
  modules: ["@flaier/nuxt"],
});
```

## Usage

Regular Nuxt page usage:

```vue
<template>
  <FlaierClient src="/api/flows/manifest" :interval="3000" />
</template>
```

Nuxt Content / Docus usage:

```md
## ::FlaierMdc

src: /api/flows/manifest
interval: 3200
height: min(70vh, 780px)

---

::
```

## What It Adds

- `FlaierClient` for regular Nuxt pages.
- `FlaierDemo` for example/demo wrappers.
- `FlaierMdc` for `.md` and `.mdc` embeds in content-driven docs.
- Shared CSS and fullscreen-friendly wrappers for docs layouts.

## Links

- Repository: https://github.com/WeAreRetex/flaier
- Package source: https://github.com/WeAreRetex/flaier/tree/main/packages/nuxt
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Core renderer: https://www.npmjs.com/package/@flaier/core
- Viewer example: https://github.com/WeAreRetex/flaier/tree/main/apps/viewer
