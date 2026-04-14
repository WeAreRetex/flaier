import { h } from "vue";
import type { ComponentFn } from "@json-render/vue";
import { defineRegistry } from "@json-render/vue";
import { catalog } from "./catalog";
import FlowTimelineRenderer from "./components/renderer/FlowTimelineRenderer.vue";

const FlowTimelineComponent: ComponentFn<typeof catalog, "FlowTimeline"> = ({ props }) =>
  h(FlowTimelineRenderer, {
    title: props.title,
    description: props.description,
    mode: props.mode,
    zones: props.zones,
    direction: props.direction,
    minHeight: props.minHeight,
    layoutEngine: props.layoutEngine,
    layoutRankSep: props.layoutRankSep,
    layoutNodeSep: props.layoutNodeSep,
    layoutEdgeSep: props.layoutEdgeSep,
  });

const ArchitectureNodeComponent: ComponentFn<typeof catalog, "ArchitectureNode"> = () => null;
const TriggerNodeComponent: ComponentFn<typeof catalog, "TriggerNode"> = () => null;
const CodeNodeComponent: ComponentFn<typeof catalog, "CodeNode"> = () => null;
const DecisionNodeComponent: ComponentFn<typeof catalog, "DecisionNode"> = () => null;
const PayloadNodeComponent: ComponentFn<typeof catalog, "PayloadNode"> = () => null;
const ErrorNodeComponent: ComponentFn<typeof catalog, "ErrorNode"> = () => null;
const DescriptionNodeComponent: ComponentFn<typeof catalog, "DescriptionNode"> = () => null;
const LinkNodeComponent: ComponentFn<typeof catalog, "LinkNode"> = () => null;

export const { registry } = defineRegistry(catalog, {
  components: {
    FlowTimeline: FlowTimelineComponent,
    ArchitectureNode: ArchitectureNodeComponent,
    TriggerNode: TriggerNodeComponent,
    CodeNode: CodeNodeComponent,
    DecisionNode: DecisionNodeComponent,
    PayloadNode: PayloadNodeComponent,
    ErrorNode: ErrorNodeComponent,
    DescriptionNode: DescriptionNodeComponent,
    LinkNode: LinkNodeComponent,
  },
});
