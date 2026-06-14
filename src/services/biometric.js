import { isNativeRuntime } from './nativeBridge.js'

let pluginPromise = null

async function loadPlugin() {
  if (!isNativeRuntime()) return null
  if (pluginPromise) return pluginPromise
  pluginPromise = (async () => {
    try {
      const mod = await import('@aparajita/capacitor-biometric-auth')
      return mod?.BiometricAuth || mod?.default || null
    } catch {
      return null
    }
  })()
  return pluginPromise
}

export async function isBiometricAvailable() {
  const plugin = await loadPlugin()
  if (!plugin) return false
  try {
    const info = await plugin.checkBiometry()
    return Boolean(info?.isAvailable)
  } catch {
    return false
  }
}

export async function verifyBiometric({ reason = '재인증이 필요합니다.' } = {}) {
  const plugin = await loadPlugin()
  if (!plugin) return { ok: true, reason: 'unavailable' }
  try {
    await plugin.authenticate({
      reason,
      cancelTitle: '취소',
      allowDeviceCredential: true,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error?.code || error?.message || 'denied' }
  }
}
