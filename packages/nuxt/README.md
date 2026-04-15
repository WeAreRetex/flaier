# @flaier/nuxt 🧭

[![npm version](https://img.shields.io/npm/v/%40flaier%2Fnuxt?style=flat-square)](https://www.npmjs.com/package/@flaier/nuxt)
[![npm downloads](https://img.shields.io/npm/dm/%40flaier%2Fnuxt?style=flat-square)](https://www.npmjs.com/package/@flaier/nuxt)
[![License](https://img.shields.io/github/license/WeAreRetex/flaier?style=flat-square)](https://github.com/WeAreRetex/flaier/blob/main/LICENSE)

**The Nuxt-native way to publish interactive technical walkthroughs.**

`@flaier/nuxt` is the Nuxt integration layer for Flaier.

Use it when you want Flaier diagrams to feel native inside a Nuxt app, a docs portal, or a Docus or Nuxt Content site without wiring the renderer manually on every page.

## 🎯 What It Is Used For

- Embedding interactive flows in Nuxt pages and app routes.
- Dropping diagrams into `.md` and `.mdc` content with a clean authoring experience.
- Powering docs sites where fullscreen rendering and client-only behavior need to just work.
- Standardizing how Flaier is presented across demos, docs, and product surfaces.

## 🌟 Features

- 🧩 `FlaierClient` for regular Nuxt page usage.
- 📝 `FlaierMdc` for Nuxt Content and Docus embeds.
- 🎛 `FlaierDemo` for example and showcase wrappers.
- 🎨 Shared CSS and docs-friendly wrappers for polished embeds.
- 🖥 Fullscreen-friendly behavior so diagrams are not clipped by content layouts.

## 🧭 Common Use Cases

**Docs Teams**

Drop interactive diagrams into `.md` and `.mdc` pages so technical documentation can show behavior instead of only describing it.

**Platform Or Product Teams**

Standardize Flaier usage across Nuxt routes, demos, and content pages with shared wrappers instead of ad hoc renderer setup.

**Architecture Reviews**

Use fullscreen-friendly embeds in design docs and review portals where complex diagrams need more room than a normal content column allows.

## 📦 Install

```bash
npm i @flaier/core @flaier/nuxt
```

## ⚙️ Setup

```ts
export default defineNuxtConfig({
  modules: ["@flaier/nuxt"],
});
```

## 🚀 Usage

Regular Nuxt page usage:

```vue
<template>
  <FlaierClient src="/api/flows/manifest" :interval="3000" />
</template>
```

Nuxt Content or Docus usage:

```md
## ::FlaierMdc

src: /api/flows/manifest
interval: 3200
height: min(70vh, 780px)

---

::
```

## 🧩 Components At A Glance

| Component | Used for |
| --- | --- |
| `FlaierClient` | Standard client-side renderer usage inside Nuxt pages |
| `FlaierDemo` | Demo or showcase wrappers with presentation-friendly defaults |
| `FlaierMdc` | Embedded diagrams inside `.md` and `.mdc` content |

## 🔗 Links

- Repository: https://github.com/WeAreRetex/flaier
- Package source: https://github.com/WeAreRetex/flaier/tree/main/packages/nuxt
- Docs source: https://github.com/WeAreRetex/flaier/tree/main/apps/docs
- Core renderer: https://www.npmjs.com/package/@flaier/core
- Viewer example: https://github.com/WeAreRetex/flaier/tree/main/apps/viewer
