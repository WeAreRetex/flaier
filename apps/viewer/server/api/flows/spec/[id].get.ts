import { defineEventHandler, getRouterParam } from 'h3'
import { getFlowSpecById } from '../../../utils/flow-specs'

export default defineEventHandler(async (event) => {
  const flowId = getRouterParam(event, 'id')
  return getFlowSpecById(event, flowId)
})
