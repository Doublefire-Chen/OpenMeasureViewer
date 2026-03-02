import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'make-offline',
      apply: 'build',
      enforce: 'post',
      transformIndexHtml(html) {
        return html.replace(' type="module" crossorigin ', ' defer ');
      },
    },
    {
      name: 'suppress-use-client-warnings',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('node_modules')) {
          return { code: code.replace(/^['"]use client['"];?\n?/gm, ''), map: null };
        }
      },
    },
  ],
  base: './',
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: { format: 'iife' },
    },
  },
})
