import { addComponentsDir, addImportsDir, addServerHandler, createResolver, defineNuxtModule } from "@nuxt/kit";

export interface FlaierNuxtOptions {
  css?: boolean;
  components?: boolean;
}

export default defineNuxtModule<FlaierNuxtOptions>({
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
  },
});
