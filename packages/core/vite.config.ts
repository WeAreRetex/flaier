import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/postcss";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  pack: {
    entry: resolve(__dirname, "src/index.ts"),
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    dts: false,
    exports: false,
    alias: {
      "@": resolve(__dirname, "src"),
    },
    plugins: [vue()],
    deps: {
      neverBundle: [
        "vue",
        "@vue-flow/core",
        "@json-render/core",
        "@json-render/vue",
        "shiki",
        "shiki-magic-move",
        "shiki-magic-move/vue",
        "html-to-image",
        "jspdf",
        "zod",
      ],
    },
    css: {
      fileName: "style.css",
      inject: false,
      transformer: "postcss",
      postcss: {
        plugins: [tailwindcss({ base: __dirname })],
      },
    },
  },
});
