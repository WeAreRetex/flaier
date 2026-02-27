import { h } from 'vue'
import type { ComponentFn } from '@json-render/vue'
import { defineRegistry } from '@json-render/vue'
import { catalog } from './catalog'
import FlowTimelineRenderer from './components/renderer/FlowTimelineRenderer.vue'

const FlowTimelineComponent: ComponentFn<typeof catalog, 'FlowTimeline'> = ({ props }) =>
  h(FlowTimelineRenderer, {
    title: props.title,
    description: props.description,
    direction: props.direction,
  })

const TriggerNodeComponent: ComponentFn<typeof catalog, 'TriggerNode'> = () => null
const CodeNodeComponent: ComponentFn<typeof catalog, 'CodeNode'> = () => null
const DescriptionNodeComponent: ComponentFn<typeof catalog, 'DescriptionNode'> = () => null
const LinkNodeComponent: ComponentFn<typeof catalog, 'LinkNode'> = () => null

export const { registry } = defineRegistry(catalog, {
  components: {
    FlowTimeline: FlowTimelineComponent,
    TriggerNode: TriggerNodeComponent,
    CodeNode: CodeNodeComponent,
    DescriptionNode: DescriptionNodeComponent,
    LinkNode: LinkNodeComponent,
  },
})
