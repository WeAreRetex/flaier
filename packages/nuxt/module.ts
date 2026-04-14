import { addComponentsDir, addServerHandler, createResolver, defineNuxtModule } from "@nuxt/kit";

export interface FlowNarratorNuxtOptions {
  css?: boolean;
  components?: boolean;
}

export default defineNuxtModule<FlowNarratorNuxtOptions>({
  meta: {
    name: "@flow-narrator/nuxt",
    configKey: "flowNarrator",
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
      const stylePath = "flow-narrator/style.css";

      if (!nuxt.options.css.includes(stylePath)) {
        nuxt.options.css.push(stylePath);
      }
    }

    if (options.components !== false) {
      addComponentsDir({
        path: resolver.resolve("./runtime/components"),
        pathPrefix: false,
        global: true,
      });
    }

    addServerHandler({
      route: "/_flow-narrator/prepare",
      handler: resolver.resolve("./runtime/server/api/prepare.post"),
    });
  },
});
