import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'))

// Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN is present
// (set in CI). Without it the plugin is omitted entirely, so normal/dev builds
// are never broken and nothing is uploaded.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryPlugins = sentryAuthToken
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || 'kw-coms',
        project: process.env.SENTRY_PROJECT || 'coms-member-app',
        authToken: sentryAuthToken,
        // Delete .map files from dist after upload so they are never served publicly.
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      }),
    ]
  : []

export default defineConfig({
  // sentryVitePlugin must come AFTER react so it sees the final build output.
  plugins: [react(), ...sentryPlugins],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
  },
  build: {
    // Only emit source maps when uploading to Sentry, and use 'hidden' so no
    // sourceMappingURL comment is written into the bundles — the maps are never
    // publicly discoverable, and the plugin deletes them from dist after upload.
    sourcemap: sentryAuthToken ? 'hidden' : false,
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
