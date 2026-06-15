import { Capacitor } from '@capacitor/core'
import { routeFromNotification, routeFromUrl } from '../utils/mobileRoutes.js'
import { bundleVersion } from '../utils/version.js'

export function isNativeRuntime() {
  return Capacitor.isNativePlatform()
}

export function nativePlatform() {
  return Capacitor.getPlatform()
}

export async function readAppVersion() {
  if (!isNativeRuntime()) return bundleVersion()
  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return info?.version || bundleVersion()
  } catch {
    return bundleVersion()
  }
}

export async function setupDeepLinkListener(onRoute) {
  if (!isNativeRuntime()) return () => {}
  const { App } = await import('@capacitor/app')
  const handle = await App.addListener('appUrlOpen', (event) => {
    const route = routeFromUrl(event?.url)
    if (route) onRoute(route)
  })
  return () => {
    void handle.remove()
  }
}

export async function setupAppStateListener(onChange) {
  if (!isNativeRuntime()) return () => {}
  const { App } = await import('@capacitor/app')
  const handle = await App.addListener('appStateChange', (state) => {
    onChange(Boolean(state?.isActive))
  })
  return () => {
    void handle.remove()
  }
}

export async function setupBackButtonListener(handler) {
  if (!isNativeRuntime()) return () => {}
  const { App } = await import('@capacitor/app')
  const handle = await App.addListener('backButton', ({ canGoBack }) => {
    const result = handler?.({ canGoBack })
    if (!result) {
      void App.exitApp()
    }
  })
  return () => {
    void handle.remove()
  }
}

// Listeners are bound once per process, but the user-scoped callbacks live in
// `pushHandlers` so logout can null them out — preventing a stale onToken bound
// to user A from registering user B's freshly-issued FCM token as user A.
let pushListenersBound = false
let pushRegistrationErrorReason = null
const pushHandlers = { onToken: null, onRoute: null }

export async function resetPushRegistration() {
  pushHandlers.onToken = null
  pushHandlers.onRoute = null
  pushRegistrationErrorReason = null
  if (!isNativeRuntime() || !pushListenersBound) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
  } catch (err) {
    console.warn('Push reset failed', err)
  } finally {
    pushListenersBound = false
  }
}

export async function requestPushRegistration({ onToken, onRoute } = {}) {
  if (!isNativeRuntime()) return { status: 'unavailable' }
  let PushNotifications
  try {
    ({ PushNotifications } = await import('@capacitor/push-notifications'))
  } catch (err) {
    console.warn('Push plugin import failed', err)
    return { status: 'unavailable' }
  }

  let permission
  try {
    permission = await PushNotifications.requestPermissions()
  } catch (err) {
    console.warn('Push permission request failed', err)
    return { status: 'error' }
  }
  if (permission.receive !== 'granted') return { status: 'denied' }

  // Latest callbacks always win — the listeners below dereference these at fire
  // time, so a token that arrives after a logout simply finds onToken === null.
  pushHandlers.onToken = onToken || null
  pushHandlers.onRoute = onRoute || null

  if (!pushListenersBound) {
    try {
      await PushNotifications.addListener('registration', (token) => {
        pushRegistrationErrorReason = null
        try { pushHandlers.onToken?.(token?.value) } catch (err) { console.warn('Push token handler failed', err) }
      })
      await PushNotifications.addListener('registrationError', (error) => {
        pushRegistrationErrorReason = error?.error || error?.message || 'registration-failed'
        console.warn('Push registration failed', error)
      })
      await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        try {
          const route = routeFromNotification(event?.notification)
          if (route) pushHandlers.onRoute?.(route)
        } catch (err) {
          console.warn('Push action handler failed', err)
        }
      })
      pushListenersBound = true
    } catch (err) {
      console.warn('Push listener bind failed', err)
      return { status: 'error' }
    }
  }

  // register() can throw on devices without Google Play Services / without a
  // google-services.json configured at build time. Catch it so the user does not
  // get pushed back to the launcher.
  try {
    await PushNotifications.register()
  } catch (err) {
    console.warn('Push register call failed', err)
    return { status: 'server-unavailable' }
  }
  if (pushRegistrationErrorReason) return { status: 'server-unavailable' }
  return { status: 'requested' }
}
