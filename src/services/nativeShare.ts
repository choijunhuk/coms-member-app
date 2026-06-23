import { isNativeRuntime } from './nativeBridge'

export async function sharePost({ title, url, text }: any) {
  if (isNativeRuntime()) {
    try {
      const { Share } = await import('@capacitor/share')
      const can = await Share.canShare()
      if (can?.value !== false) {
        await Share.share({ title, text, url, dialogTitle: '공유' })
        return { ok: true, channel: 'native' }
      }
    } catch (error) {
      console.warn('Native share failed', error)
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return { ok: true, channel: 'web' }
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, channel: 'web', reason: 'cancelled' }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return { ok: true, channel: 'clipboard' }
    } catch (error) {
      return { ok: false, channel: 'clipboard', reason: error?.message || 'clipboard-denied' }
    }
  }

  return { ok: false, channel: 'none', reason: 'unsupported' }
}
