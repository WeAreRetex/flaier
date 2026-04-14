---
title: Flaier
navigation: false
---

::u-page-hero
---
title: Spec-driven flow visualization
description: Turn AI-generated JSON specs into interactive flow diagrams. Narrative walkthroughs, architecture maps, and exportable diagrams — all from a single Vue component.
links:
  - label: Get started
    to: /getting-started/introduction
    icon: i-heroicons-arrow-right
    color: primary
  - label: View on GitHub
    to: https://github.com/Rigo-m/flow-visualizer
    icon: i-simple-icons-github
    color: neutral
    variant: outline
---
::

::u-page-section
---
title: Everything in one component
description: Drop `<Flaier>` into any Vue app and point it at a spec file. No configuration needed.
---

:::u-page-feature
---
icon: i-heroicons-play-circle
title: Narrative mode
description: Timeline-driven playback with autoplay, step controls, and active-node focus. Perfect for guided code walkthroughs.
---
:::

:::u-page-feature
---
icon: i-heroicons-map
title: Architecture mode
description: Static topology explorer with node inspector, zone boundaries, and full-diagram export. Ideal for system design documents.
---
:::

:::u-page-feature
---
icon: i-heroicons-document-arrow-down
title: Diagram export
description: Export the full diagram as PNG or PDF — not just the visible viewport. Captures all laid-out nodes and edges.
---
:::

:::u-page-feature
---
icon: i-heroicons-cpu-chip
title: AI-native spec format
description: JSON specs are designed for LLM generation. Each node type maps to a clear, flat structure that AI agents produce reliably.
---
:::

:::u-page-feature
---
icon: i-heroicons-rectangle-stack
title: Multi-flow manifests
description: Load a manifest of many flows and let users switch between them via a built-in dropdown. AI harnesses can append flows incrementally.
---
:::

:::u-page-feature
---
icon: i-heroicons-command-line
title: Agent CLI
description: Scaffold, validate, and package flow specs from the terminal. Integrates with AI coding agents as a Claude skill.
---
:::

:::u-page-feature
---
icon: i-heroicons-presentation-chart-line
title: Nuxt and Slidev embeds
description: Use the Nuxt module in docs sites, or drop FlaierPanel into Slidev for presentation-friendly architecture walkthroughs.
---
:::

::

::u-page-section
---
title: Start in seconds
description: Install the package and render your first flow.
class: bg-gray-50 dark:bg-gray-900
---

```bash
pnpm add @flaier/core
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

Need Nuxt, Docus, or Nuxt Content support? Install `@flaier/nuxt` and use the wrapper components documented in the API reference.

::
