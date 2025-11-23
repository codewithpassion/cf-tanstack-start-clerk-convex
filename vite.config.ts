import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import path from 'node:path'

const config = defineConfig({
  resolve: {
    alias: {
      'use-sync-external-store/shim/index.js': path.resolve(__dirname, 'src/shim-use-sync-external-store.ts'),
    },
  },
  build: {
    rollupOptions: {
      // external: ['@clerk/backend']
    }
  },
  optimizeDeps: {
    include: ['cookie'],
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
