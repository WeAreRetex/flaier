import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const coreSourceAliases =
  process.env.NODE_ENV === "production"
    ? []
    : [
        {
          find: /^@flaier\/core$/,
          replacement: fileURLToPath(
            new URL("../../packages/core/src/index.unstyled.ts", import.meta.url),
          ),
        },
      ];

export default defineConfig({
  resolve: {
    alias: coreSourceAliases,
  },
});
