import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcDir = resolve(__dirname, 'src')

export default defineConfig({
  root: srcDir,
  base: './',
  publicDir: false,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [resolve(__dirname, 'src/**/*.{ts,tsx,html}')],
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                bg: '#09090b',       // zinc-950
                surface: '#18181b',  // zinc-900
                border: '#27272a',   // zinc-800
                accent: '#6366f1',   // indigo-500
                'accent-hover': '#4f46e5', // indigo-600
                glass: 'rgba(24, 24, 27, 0.6)',
              },
            },
          },
          plugins: [],
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    // scripts/build.ts already cleaned dist/ and writes background/content/manifest
    // alongside this; don't let Vite wipe those out.
    emptyOutDir: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        popup: resolve(srcDir, 'popup/index.html'),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts', 'lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
