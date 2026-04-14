import { defineEventHandler } from "h3";
import { getFlowManifestForApi } from "../../utils/flow-specs";

export default defineEventHandler(async (event) => {
  return getFlowManifestForApi(event);
});
