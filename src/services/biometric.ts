import { isNativeRuntime } from './nativeBridge'

let pluginPromise = null

async function loadPlugin() {
  if (!isNativeRuntime()) return null
  if (pluginPromise) return pluginPromise
  pluginPromise = (async () => {
    try {
      const mod: any = await import('@aparajita/capacitor-biometric-auth')
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
  // Fail CLOSED: if the plugin can't load we must not silently grant access,
  // otherwise a plugin failure would bypass a lock the user enabled. Devices
  // without usable biometric hardware are never sent to the lock screen — App
  // only locks when isBiometricAvailable() is true — so this stays safe.
  if (!plugin) return { ok: false, reason: 'unavailable' }
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
