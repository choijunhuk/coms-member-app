import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  APP_INCLUDED_FEATURES,
  APP_SHELL_TABS,
  WEB_ONLY_FEATURES,
  getAppTabIds,
  isWebOnlyFeature,
} from '../src/config/appScope.js'

assert.deepEqual(getAppTabIds(), ['home', 'notices', 'community', 'resources', 'notifications', 'operations', 'profile'])
assert.equal(APP_SHELL_TABS.length, 7)
assert.equal(APP_SHELL_TABS.find((tab) => tab.id === 'operations')?.adminOnly, true)
assert.deepEqual(APP_INCLUDED_FEATURES, [
  'login',
  'logout',
  'session-restore',
  'home-dashboard',
  'notices',
  'community',
  'resources',
  'notification-center',
  'push-notifications',
  'deep-links',
  'mobile-home-api',
  'app-config',
  'operator-light',
  'profile',
])
assert.deepEqual(WEB_ONLY_FEATURES, [
  'recruit-apply',
  'recruit-notice',
  'signup',
  'public-about',
  'public-activities',
  'public-projects',
  'admin-console',
])
assert.equal(isWebOnlyFeature('recruit-apply'), true)
assert.equal(isWebOnlyFeature('admin-console'), true)
assert.equal(isWebOnlyFeature('operator-light'), false)
assert.equal(isWebOnlyFeature('community'), false)

const appSource = readFileSync('src/App.jsx', 'utf8')
for (const forbidden of ['RecruitApply', 'RecruitNotice', 'Signup', 'AdminConsole', 'FullAdminPanel']) {
  assert.equal(appSource.includes(forbidden), false, `app must not include ${forbidden}`)
}

assert.equal(existsSync('capacitor.config.json'), true)
const capacitor = JSON.parse(readFileSync('capacitor.config.json', 'utf8'))
assert.equal(capacitor.appId, 'kr.ac.kw.coms.memberapp')
assert.equal(capacitor.webDir, 'dist')

console.log('app scope contract passed')
