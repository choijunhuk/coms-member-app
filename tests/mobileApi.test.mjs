import assert from 'node:assert/strict'
import {
  APP_CONFIG_PATH,
  DEFAULT_APP_CONFIG,
  MOBILE_HOME_PATH,
  PUSH_TOKEN_PATH,
  getAppConfig,
  getMobileHome,
  isRecoverableMobileApiError,
  registerPushToken,
} from '../src/services/mobileApi.js'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

await getMobileHome()
await getAppConfig()
await registerPushToken({ token: 'push-token', platform: 'ios', deviceId: 'device-1' })

assert.equal(MOBILE_HOME_PATH, '/api/mobile/v1/home')
assert.equal(APP_CONFIG_PATH, '/api/mobile/v1/app-config')
assert.equal(PUSH_TOKEN_PATH, '/api/mobile/v1/push-tokens')
assert.equal(calls[0].url, '/api/mobile/v1/home')
assert.equal(calls[1].url, '/api/mobile/v1/app-config')
assert.equal(calls[2].url, '/api/mobile/v1/push-tokens')
assert.equal(calls[2].options.method, 'POST')
assert.deepEqual(JSON.parse(calls[2].options.body), {
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

console.log('mobile api contract passed')
