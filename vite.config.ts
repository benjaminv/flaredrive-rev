/// <reference types="vite/client" />

import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import VueRouter from 'unplugin-vue-router/vite'
import UnoCSS from 'unocss/vite'

const IS_PROD = process.env.NODE_ENV === 'production' && process.env.BUILD_ENV !== 'development'

config({ path: resolve(import.meta.dirname, '.env') })
config({
  path: resolve(import.meta.dirname, IS_PROD ? '.env.production' : '.env.development'),
  override: true,
})

const USE_REACT = process.env.FRONTEND === 'react'
const projectRoot = import.meta.dirname

// Vue plugins
const vuePlugins = [
  VueRouter({
    routesFolder: 'frontend/pages',
    dts: 'frontend/typed-router.d.ts',
  }),
  Vue(),
  VueJsx(),
  AutoImport({
    dts: 'frontend/auto-imports.d.ts',
    dtsMode: 'overwrite',
    imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
    vueTemplate: true,
    vueDirectives: true,
    dirs: ['frontend/composables', 'frontend/stores', 'frontend/utils', 'common/'],
  }),
  Components({
    dts: 'frontend/components.d.ts',
    dirs: ['frontend/components'],
    directoryAsNamespace: true,
    collapseSamePrefixes: true,
    resolvers: [NaiveUiResolver()],
  }),
  UnoCSS({}),
]

// React plugins
const reactPlugins = [react(), tailwindcss()]

export default defineConfig({
  // React uses frontend-react as root; Vue uses project root
  root: USE_REACT ? resolve(projectRoot, 'frontend-react') : undefined,
  publicDir: resolve(projectRoot, 'public'),
  plugins: [
    ...(USE_REACT ? reactPlugins : vuePlugins),
    cloudflare({
      // For React: point config and state back to project root
      ...(USE_REACT
        ? {
            configPath: resolve(projectRoot, 'wrangler.jsonc'),
            persistState: { path: resolve(projectRoot, '.wrangler/state') },
          }
        : {}),
    }),
  ],
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
  esbuild: {
    drop: IS_PROD ? ['console'] : [],
  },
  resolve: {
    alias: {
      '@': resolve(projectRoot, USE_REACT ? 'frontend-react' : 'frontend'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5880,
    cors: true,
  },
})
