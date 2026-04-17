import { h } from "vue";
import type { ComponentFn, ComponentRegistry } from "@json-render/vue";
import { defineRegistry } from "@json-render/vue";
import { catalog, createFlaierCatalog } from "./catalog";
import FlowTimelineRenderer from "./components/renderer/FlowTimelineRenderer.vue";
import { createFlaierCustomRegistryComponents } from "./custom-nodes";
import type { FlaierCatalogOptions } from "./types";

const FlowTimelineComponent: ComponentFn<typeof catalog, "FlowTimeline"> = ({ props }) =>
  h(FlowTimelineRenderer, {
    title: props.title,
    description: props.description,
    mode: props.mode,
    participants: props.participants,
    showSequenceNumbers: props.showSequenceNumbers,
    zones: props.zones,
    direction: props.direction,
    minHeight: props.minHeight,
    layoutEngine: props.layoutEngine,
    layoutRankSep: props.layoutRankSep,
    layoutNodeSep: props.layoutNodeSep,
    layoutEdgeSep: props.layoutEdgeSep,
    themeMode: props.themeMode,
    showHeaderOverlay: props.showHeaderOverlay,
    showExportControls: props.showExportControls,
    showThemeToggle: props.showThemeToggle,
    showArchitectureInspector: props.showArchitectureInspector,
    defaultArchitectureInspectorOpen: props.defaultArchitectureInspectorOpen,
    showArchitectureInspectorToggleText: props.showArchitectureInspectorToggleText,
  });

const ArchitectureNodeComponent: ComponentFn<typeof catalog, "ArchitectureNode"> = () => null;
const TriggerNodeComponent: ComponentFn<typeof catalog, "TriggerNode"> = () => null;
const CodeNodeComponent: ComponentFn<typeof catalog, "CodeNode"> = () => null;
const DecisionNodeComponent: ComponentFn<typeof catalog, "DecisionNode"> = () => null;
const PayloadNodeComponent: ComponentFn<typeof catalog, "PayloadNode"> = () => null;
const ErrorNodeComponent: ComponentFn<typeof catalog, "ErrorNode"> = () => null;
const DescriptionNodeComponent: ComponentFn<typeof catalog, "DescriptionNode"> = () => null;
const LinkNodeComponent: ComponentFn<typeof catalog, "LinkNode"> = () => null;
const SequenceParticipantComponent: ComponentFn<typeof catalog, "SequenceParticipant"> = () => null;
const SequenceParticipantBoxComponent: ComponentFn<typeof catalog, "SequenceParticipantBox"> = () =>
  null;
const SequenceMessageComponent: ComponentFn<typeof catalog, "SequenceMessage"> = () => null;
const SequenceNoteComponent: ComponentFn<typeof catalog, "SequenceNote"> = () => null;
const SequenceGroupComponent: ComponentFn<typeof catalog, "SequenceGroup"> = () => null;
const SequenceBranchComponent: ComponentFn<typeof catalog, "SequenceBranch"> = () => null;

const baseRegistryResult = defineRegistry(catalog, {
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
    SequenceParticipant: SequenceParticipantComponent,
    SequenceParticipantBox: SequenceParticipantBoxComponent,
    SequenceMessage: SequenceMessageComponent,
    SequenceNote: SequenceNoteComponent,
    SequenceGroup: SequenceGroupComponent,
    SequenceBranch: SequenceBranchComponent,
  },
});

export const registry = baseRegistryResult.registry;

export function createFlaierRendererRegistry<
  TNodes extends NonNullable<FlaierCatalogOptions["nodes"]>,
>(options?: FlaierCatalogOptions<TNodes>): ComponentRegistry {
  return {
    ...registry,
    ...createFlaierCustomRegistryComponents(options?.nodes),
  };
}

export function createFlaierRegistry<TNodes extends NonNullable<FlaierCatalogOptions["nodes"]>>(
  options?: FlaierCatalogOptions<TNodes>,
) {
  return {
    catalog: createFlaierCatalog(options),
    registry: createFlaierRendererRegistry(options),
  };
}
