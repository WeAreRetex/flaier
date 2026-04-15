import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const siteUrl =
  process.env.URL ??
  process.env.DEPLOY_PRIME_URL ??
  process.env.DEPLOY_URL ??
  process.env.NUXT_SITE_URL ??
  "https://flaier.local";
const siteDomain = new URL(siteUrl).hostname;
const localContentDatabase =
  process.env.NUXT_CONTENT_LOCAL_DB ?? `.data/content/dev-${process.pid}.sqlite`;
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
  content: {
    _localDatabase: {
      type: "sqlite",
      filename: localContentDatabase,
    },
  },
  site: {
    url: siteUrl,
  },
  llms: {
    domain: siteDomain,
  },
  vite: {
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
