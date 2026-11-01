import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        // preview.html is the live React preview, served by the local preview server.
        input: {
          index: resolve('src/renderer/index.html'),
          preview: resolve('src/renderer/preview.html')
        }
      }
    },
    worker: { format: 'es' }
  }
})
