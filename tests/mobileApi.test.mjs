import assert from 'node:assert/strict'
import {
  APP_CONFIG_PATH,
  DEFAULT_APP_CONFIG,
  PUSH_TOKEN_PATH,
  getAppConfig,
  isRecoverableMobileApiError,
  registerPushToken,
  unregisterPushToken,
} from '../src/services/mobileApi.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

await getAppConfig()
await registerPushToken({ token: 'push-token', platform: 'ios', deviceId: 'device-1' })

assert.equal(APP_CONFIG_PATH, '/api/mobile/v1/app-config')
assert.equal(PUSH_TOKEN_PATH, '/api/mobile/v1/push-tokens')
assert.equal(calls[0].url, '/api/mobile/v1/app-config')
assert.equal(calls[1].url, '/api/mobile/v1/push-tokens')
assert.equal(calls[1].options.method, 'POST')
assert.deepEqual(JSON.parse(calls[1].options.body), {
  token: 'push-token',
  platform: 'ios',
  deviceId: 'device-1',
})
assert.equal(DEFAULT_APP_CONFIG.minimumSupportedVersion, '0.1.0')
assert.equal(DEFAULT_APP_CONFIG.pushEnabled, true)
assert.equal(DEFAULT_APP_CONFIG.updateUrl, DEFAULT_APP_CONFIG.links.update)
assert.equal(DEFAULT_APP_CONFIG.links.hub.endsWith('/'), true)
assert.equal(isRecoverableMobileApiError(Object.assign(new Error('missing'), { status: 404 })), true)
assert.equal(isRecoverableMobileApiError(Object.assign(new Error('denied'), { status: 403 })), false)

// Logout must retire the token server-side, keyed on the SAME installation
// deviceId the POST registered under — otherwise the backend keeps pushing to
// a device nobody is signed in on.
await unregisterPushToken({ platform: 'ios', deviceId: 'device-1' })
assert.equal(calls[2].url, '/api/mobile/v1/push-tokens')
assert.equal(calls[2].options.method, 'DELETE')
assert.deepEqual(JSON.parse(calls[2].options.body), { platform: 'ios', deviceId: 'device-1' })
assert.equal(calls[2].options.headers['Content-Type'], 'application/json')

console.log('mobile api contract passed')
