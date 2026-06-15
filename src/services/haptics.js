import { isNativeRuntime } from './nativeBridge.js'

let pluginPromise = null

async function loadPlugin() {
  if (!isNativeRuntime()) return null
  if (pluginPromise) return pluginPromise
  pluginPromise = (async () => {
    try {
      const mod = await import('@capacitor/haptics')
      return mod || null
    } catch {
      return null
    }
  })()
  return pluginPromise
}

export async function hapticLight() {
  const mod = await loadPlugin()
  if (!mod) return
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light })
  } catch {
    // ignore
  }
}

export async function hapticMedium() {
  const mod = await loadPlugin()
  if (!mod) return
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle.Medium })
  } catch {
    // ignore
  }
}

export async function hapticSuccess() {
  const mod = await loadPlugin()
  if (!mod) return
  try {
    await mod.Haptics.notification({ type: mod.NotificationType.Success })
  } catch {
    // ignore
  }
}
