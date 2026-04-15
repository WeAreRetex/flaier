import { createFlaierCatalog, edgeTransitionSchema, sourceAnchorSchema } from "@flaier/core";
import type { FlaierCustomNodeDefinitions } from "@flaier/core";
import { z } from "zod/v4";
import CalloutNode from "../components/CalloutNode.vue";

export const docsCalloutNodes = {
  CalloutNode: {
    props: z.object({
      label: z.string(),
      body: z.string(),
      tone: z.enum(["info", "tip", "warning"]).default("info"),
      sourceAnchor: sourceAnchorSchema.optional(),
      transitions: z.array(edgeTransitionSchema).optional(),
    }),
    description: "Narrative callout card for custom renderer and catalog extension examples.",
    component: CalloutNode,
    estimateSize: ({ props }) => ({
      width: 280,
      height: Math.min(240, Math.max(132, 110 + Math.ceil(props.body.length / 42) * 14)),
    }),
    getSummary: ({ props }) => props.body,
  },
} satisfies FlaierCustomNodeDefinitions;

export const docsCalloutCatalog = createFlaierCatalog({ nodes: docsCalloutNodes });
