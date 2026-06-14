import { fileURLToPath, URL } from 'node:url'
import { rmSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const cleanAssets = {
  name: 'clean-assets',
  buildStart() {
    const htmlPath = resolve(__dirname, 'index.html')
    // Restore dev entry point so Vite compiles from source, not a stale bundle
    let html = readFileSync(htmlPath, 'utf-8')
    html = html.replace(
      /<script type="module" crossorigin src="\.\/assets\/index-[^"]+\.js"><\/script>/,
      '<script type="module" src="/src/main.ts"></script>'
    )
    writeFileSync(htmlPath, html)
    // Remove stale assets so every build starts clean
    rmSync(resolve(__dirname, 'assets'), { recursive: true, force: true })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    cleanAssets,
  ],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
  }
})
