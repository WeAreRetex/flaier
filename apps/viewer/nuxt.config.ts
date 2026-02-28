import { resolve } from 'node:path'

export default {
  compatibilityDate: '2025-12-01',
  devtools: { enabled: true },
  nitro: {
    preset: 'node-server',
  },
  runtimeConfig: {
    flowSpecsDir: process.env.FLOW_SPECS_DIR || resolve(__dirname, 'flow-specs'),
  },
}
