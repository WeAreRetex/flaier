import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const siteUrl = process.env.NUXT_SITE_URL ?? "https://flaier.local";
const siteDomain = new URL(siteUrl).hostname;
const coreSourceAliases =
  process.env.NODE_ENV === "production"
    ? []
    : [
        {
          find: "@flaier/core/style.css",
          replacement: fileURLToPath(new URL("../../packages/core/src/style.css", import.meta.url)),
        },
        {
          find: /^@flaier\/core$/,
          replacement: fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
        },
      ];

export default defineNuxtConfig({
  modules: ["@flaier/nuxt"],
  ogImage: {
    zeroRuntime: true,
    compatibility: {
      // Prefer the WASM Takumi binding in CI/deploy builds to avoid native renderer crashes.
      prerender: {
        takumi: "wasm",
      },
      runtime: {
        takumi: "wasm",
      },
    },
  },
  site: {
    url: siteUrl,
  },
  llms: {
    domain: siteDomain,
  },
  vite: {
    // @ts-expect-error vite plugin
    plugins: [tailwindcss()],
    resolve: {
      alias: coreSourceAliases,
    },
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "zod",
        "shiki-magic-move/vue",
        "html-to-image",
        "jspdf",
        "shiki",
        "@json-render/vue",
        "@json-render/core",
        "@vue-flow/core",
      ],
    },
  },
});
