import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
const strings = readFileSync('android/app/src/main/res/values/strings.xml', 'utf8')

assert.match(strings, /<string name="custom_url_scheme">coms-member-app<\/string>/)
assert.match(manifest, /android:allowBackup="false"/)
assert.match(manifest, /<action android:name="android\.intent\.action\.VIEW" \/>/)
assert.match(manifest, /<category android:name="android\.intent\.category\.DEFAULT" \/>/)
assert.match(manifest, /<category android:name="android\.intent\.category\.BROWSABLE" \/>/)
assert.match(manifest, /<data android:scheme="@string\/custom_url_scheme" \/>/)
// The autoVerify filter must claim ONLY the paths the app can actually route.
// Claiming the whole host swallowed every other page on the site into an app
// that had no route for it.
assert.doesNotMatch(manifest, /<data android:scheme="https" android:host="coms\.kw\.ac\.kr" \/>/)
assert.match(manifest, /android:autoVerify="true"/)

// Derive the expected prefixes from the router itself so the two cannot drift.
const routes = readFileSync('src/utils/mobileRoutes.ts', 'utf8')
const routedScopes = [...routes.matchAll(/scope === '([a-z-]+)'/g)].map((match) => match[1])
assert.ok(routedScopes.includes('notices') && routedScopes.includes('monthly-calendar'))

for (const scope of new Set(routedScopes)) {
  assert.match(
    manifest,
    new RegExp(`<data android:scheme="https" android:host="coms\\.kw\\.ac\\.kr" android:pathPrefix="/${scope}" />`),
    `AndroidManifest is missing an App Links pathPrefix for the routed scope /${scope}`,
  )
}

console.log('android native contract passed')
