import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appDelegate = readFileSync('ios/App/App/AppDelegate.swift', 'utf8')
const infoPlist = readFileSync('ios/App/App/Info.plist', 'utf8')

assert.match(appDelegate, /didRegisterForRemoteNotificationsWithDeviceToken\s+deviceToken:\s+Data/)
assert.match(appDelegate, /\.capacitorDidRegisterForRemoteNotifications/)
assert.match(appDelegate, /didFailToRegisterForRemoteNotificationsWithError\s+error:\s+Error/)
assert.match(appDelegate, /\.capacitorDidFailToRegisterForRemoteNotifications/)

assert.match(infoPlist, /CFBundleDisplayName[\s\S]*COMS Member/)
assert.match(infoPlist, /CFBundleURLSchemes[\s\S]*coms-member-app/)
assert.match(infoPlist, /NSFaceIDUsageDescription[\s\S]*COMS/)

// armv7 is a 32-bit capability the deployment target (iOS 15, arm64-only) can
// never satisfy — it made the App Store reject the build's device list.
assert.doesNotMatch(infoPlist, /armv7/)
assert.match(infoPlist, /UIRequiredDeviceCapabilities[\s\S]*?arm64/)

// Push notifications and App Links both need an entitlements file, and it only
// takes effect if the target actually code-signs with it. Without this the app
// registered for remote notifications and got no token in production, and every
// coms.kw.ac.kr link opened Safari instead of the app.
const entitlements = readFileSync('ios/App/App/App.entitlements', 'utf8')
assert.match(entitlements, /<key>aps-environment<\/key>\s*<string>production<\/string>/)
assert.match(entitlements, /<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>\s*<string>applinks:coms\.kw\.ac\.kr<\/string>/)

const pbxproj = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8')
const entitlementRefs = pbxproj.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) || []
assert.equal(entitlementRefs.length, 2, 'both Debug and Release must code-sign with App.entitlements')

console.log('ios native contract passed')
