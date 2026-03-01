import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

const isLib = process.env.BUILD_LIB === '1'

export default defineConfig({
  root: isLib ? undefined : 'dev',
  plugins: [
    vue(),
    tailwindcss(),
    ...(isLib ? [dts({ include: ['src'] })] : []),
  ],
  build: isLib
    ? {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'FlowNarrator',
          formats: ['es'],
          fileName: 'index',
        },
        rollupOptions: {
          external: [
            'vue',
            '@vue-flow/core',
            '@json-render/core',
            '@json-render/vue',
            'shiki',
            'shiki-magic-move',
            'shiki-magic-move/vue',
            'html-to-image',
            'jspdf',
            'zod',
          ],
        },
      }
    : {
        outDir: resolve(__dirname, 'dev-dist'),
      },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
