import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  addComponentsDir,
  addImportsDir,
  addServerHandler,
  createResolver,
  defineNuxtModule,
} from "@nuxt/kit";

export interface ModuleOptions {
  css?: boolean;
  components?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@flaier/nuxt",
    configKey: "flaier",
    compatibility: {
      nuxt: ">=4.4.0",
    },
  },
  defaults: {
    css: true,
    components: true,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    if (options.css !== false) {
      nuxt.options.css ||= [];
      const stylePath = "@flaier/core/style.css";

      if (!nuxt.options.css.includes(stylePath)) {
        nuxt.options.css.push(stylePath);
      }
    }

    addImportsDir(resolver.resolve("./runtime/composables"));

    if (options.components !== false) {
      addComponentsDir({
        path: resolver.resolve("./runtime/components"),
        pathPrefix: false,
        global: true,
      });
    }

    addServerHandler({
      route: "/_flaier/prepare",
      handler: resolver.resolve("./runtime/server/api/prepare.post"),
    });

    // Dev-only spec editor save endpoint. Production builds register no route
    // and carry no save directory configuration.
    if (nuxt.options.dev) {
      const layerConfigs = nuxt.options._layers?.map((layer) => layer.config) ?? [];
      const publicDirCandidates = [
        resolve(nuxt.options.rootDir, nuxt.options.dir?.public ?? "public"),
        ...layerConfigs.map((config) =>
          resolve(config.rootDir ?? nuxt.options.rootDir, config.dir?.public ?? "public"),
        ),
      ];

      const saveDirs = Array.from(new Set(publicDirCandidates)).filter((dir) => existsSync(dir));

      nuxt.options.runtimeConfig.flaier = { saveDirs };

      addServerHandler({
        route: "/_flaier/save",
        handler: resolver.resolve("./runtime/server/api/save.post"),
      });
    }
  },
});
