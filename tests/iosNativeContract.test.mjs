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

console.log('ios native contract passed')
