import { registerFlaierNodes } from "#imports";
import { docsCalloutNodes } from "../lib/flaier-callout-example";

export default defineNuxtPlugin(() => {
  registerFlaierNodes(docsCalloutNodes);
});
