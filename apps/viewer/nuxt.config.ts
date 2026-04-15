import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const flowSpecsDir = fileURLToPath(new URL("./flow-specs", import.meta.url));
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
  compatibilityDate: "2025-12-01",
  devtools: { enabled: true },
  modules: ["@flaier/nuxt"],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: coreSourceAliases,
    },
  },
  nitro: {
    preset: "node-server",
  },
  runtimeConfig: {
    flowSpecsDir: process.env.FLOW_SPECS_DIR || flowSpecsDir,
  },
});
