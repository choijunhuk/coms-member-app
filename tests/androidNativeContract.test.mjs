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
assert.match(manifest, /<data android:scheme="https" android:host="coms\.kw\.ac\.kr" \/>/)

console.log('android native contract passed')
