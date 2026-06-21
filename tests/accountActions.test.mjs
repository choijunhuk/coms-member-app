import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.jsx', 'utf8')
const settingsSource = readFileSync('src/screens/SettingsScreen.jsx', 'utf8')
const profileSource = readFileSync('src/screens/ProfileTab.jsx', 'utf8')

assert.match(appSource, /const \[accountActionError, setAccountActionError\]/)
assert.match(appSource, /reportError\(error, \{ area: 'logout' \}\)/)
assert.match(appSource, /reportError\(error, \{ area: 'withdraw' \}\)/)
assert.match(appSource, /await withdrawSelf\(\)[\s\S]*catch \(error\)[\s\S]*throw error/)
assert.match(settingsSource, /accountActionError = ''/)
assert.match(settingsSource, /App owns the visible accountActionError/)
assert.match(profileSource, /withdrawError \|\| accountActionError/)

console.log('account action contract passed')
