import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.tsx', 'utf8')
const appStateSource = readFileSync('src/hooks/useAppState.ts', 'utf8')
const settingsSource = readFileSync('src/screens/SettingsScreen.tsx', 'utf8')
const profileSource = readFileSync('src/screens/ProfileTab.tsx', 'utf8')

assert.match(appStateSource, /const \[accountActionError, setAccountActionError\]/)
assert.match(appSource, /accountActionError,[\s\S]*setAccountActionError,[\s\S]*= useAppState\(\)/)
assert.match(appSource, /reportError\(error, \{ area: 'logout' \}\)/)
assert.match(appSource, /reportError\(error, \{ area: 'withdraw' \}\)/)
assert.match(appSource, /await withdrawSelf\(\)[\s\S]*catch \(error\)[\s\S]*throw error/)
assert.match(settingsSource, /accountActionError = ''/)
assert.match(settingsSource, /App owns the visible accountActionError/)
assert.match(profileSource, /withdrawError \|\| accountActionError/)

console.log('account action contract passed')
