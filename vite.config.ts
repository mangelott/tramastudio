/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trama Studio',
        short_name: 'Trama',
        description: 'Visitas, medições e orçamentos da Trama Studio',
        lang: 'pt-PT',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FAF7F2',
        theme_color: '#FAF7F2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Os pedidos ao Supabase nunca são servidos da cache do service worker:
        // os dados offline vivem no IndexedDB (Dexie).
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
  },
})
