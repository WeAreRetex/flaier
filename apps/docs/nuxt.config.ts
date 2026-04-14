import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  modules: ["@flow-narrator/nuxt"],
  vite: {
    plugins: [tailwindcss()],
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
