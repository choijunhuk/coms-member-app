import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'))

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://coms.kw.ac.kr',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
