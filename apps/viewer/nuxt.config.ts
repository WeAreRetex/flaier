import { fileURLToPath } from "node:url";

const flowSpecsDir = fileURLToPath(new URL("./flow-specs", import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: "2025-12-01",
  devtools: { enabled: true },
  modules: ["@flow-narrator/nuxt"],
  nitro: {
    preset: "node-server",
  },
  runtimeConfig: {
    flowSpecsDir: process.env.FLOW_SPECS_DIR || flowSpecsDir,
  },
});
