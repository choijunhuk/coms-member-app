import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.jsx', 'utf8')

assert.match(
  appSource,
  /isBiometricAvailable\(\)\.then\(\(available\) => \{\s*if \(mounted && available\) setLocked\(true\)/,
)
assert.match(
  appSource,
  /return \(\) => \{\s*mounted = false\s*cleanup\(\)\s*\}/,
)

console.log('biometric idle lock contract passed')
