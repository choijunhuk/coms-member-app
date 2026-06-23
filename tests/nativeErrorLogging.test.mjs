import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.tsx', 'utf8')
const bridgeSource = readFileSync('src/services/nativeBridge.ts', 'utf8')
const observabilitySource = readFileSync('src/services/observability.ts', 'utf8')

assert.doesNotMatch(appSource, /catch\(\(\) => \{\}\)/)
assert.match(appSource, /reportError\(error, \{ area: 'biometric-availability' \}\)/)
assert.match(appSource, /reportError\(error, \{ area: 'deep-link-listener' \}\)/)
assert.match(bridgeSource, /reportError\(err, \{ area: 'push-reset' \}\)/)
assert.match(observabilitySource, /Sentry\.captureException/)

console.log('native error logging contract passed')
