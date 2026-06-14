import { spawnSync } from 'node:child_process'

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'https://coms.kw.ac.kr/api'

console.log(`Building COMS member app with VITE_API_BASE_URL=${apiBaseUrl}`)

const result = spawnSync(command, ['vite', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_BASE_URL: apiBaseUrl,
  },
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
