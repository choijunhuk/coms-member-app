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

// Logout and session-expiry must share ONE teardown. They used to diverge:
// expiry left the push registration, the queued offline posts and every coms.*
// preference behind for the next member who signed in on the device.
assert.match(appSource, /const clearLocalSession = useCallback\(async \(\) => \{/)
for (const step of [
  /setUser\(null\)/,
  /setPushStatus\('idle'\)/,
  /setPushPermission\(null\)/,
  /setPendingCommunityPosts\(\[\]\)/,
  /await resetPushRegistration\(\)/,
  /queryClient\.cancelQueries\(\)/,
  /queryClient\.clear\(\)/,
  /await purgePersistedCache\(\)/,
  /await removeStoredValuesByPrefix\('coms\.', \[INSTALLATION_DEVICE_ID_KEY\]\)/,
]) {
  assert.match(appSource.split('const clearLocalSession')[1].split('}, [')[0], step)
}

// Both exits run it, and both retire the push token first.
const logoutBody = appSource.split('async function handleLogout()')[1].split('\n  }')[0]
assert.match(logoutBody, /await retirePushToken\(\)[\s\S]*await logoutUser\(\)[\s\S]*await clearLocalSession\(\)/)
const expiryBody = appSource.split('onSessionExpired(')[1].split('\n  }), [')[0]
assert.match(expiryBody, /await retirePushToken\(\)[\s\S]*await clearLocalSession\(\)/)

// The push-token DELETE is itself refreshable, so its own 401 would re-enter
// the expiry handler forever without this guard.
assert.match(expiryBody, /if \(sessionTeardownRef\.current\) return/)

// Withdraw/wipe additionally drop the installation id — the account or the
// whole device is going away, so it has nothing left to identify.
for (const name of ['handleWithdraw', 'handleWipeDevice']) {
  const body = appSource.split(`async function ${name}()`)[1].split('\n  }')[0]
  assert.match(body, /await clearLocalSession\(\)[\s\S]*await removeStoredValuesByPrefix\('coms\.'\)/)
}

console.log('account action contract passed')
