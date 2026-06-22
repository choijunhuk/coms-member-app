import { Capacitor } from '@capacitor/core'
import { routeFromNotification, routeFromUrl } from '../utils/mobileRoutes.js'
import { bundleVersion } from '../utils/version.js'
import { reportError } from './observability.js'

export function isNativeRuntime() {
  return Capacitor.isNativePlatform()
}

export function nativePlatform() {
  return Capacitor.getPlatform()
}

const ANDROID_NOTIFICATION_SETTINGS_INTENT = 'intent://settings/#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=kr.ac.kw.coms.memberapp;end'

export function openNotificationSettings() {
  if (typeof window === 'undefined' || !isNativeRuntime()) return false
  try {
    if (nativePlatform() === 'ios') {
      window.location.href = 'app-settings:'
      return true
    }
    if (nativePlatform() === 'android') {
      window.location.href = ANDROID_NOTIFICATION_SETTINGS_INTENT
      return true
    }
  } catch (err) {
    reportError(err, { area: 'open-notification-settings' })
  }
  return false
}

export async function readAppVersion() {
  if (!isNativeRuntime()) return bundleVersion()
  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return info?.version || bundleVersion()
  } catch (err) {
    reportError(err, { area: 'native-app-version' })
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

export async function readPushPermissionState() {
  if (!isNativeRuntime()) return 'unavailable'
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.checkPermissions()
    if (result?.receive === 'granted') return 'granted'
    if (result?.receive === 'denied') return 'denied'
    return 'prompt'
  } catch (err) {
    reportError(err, { area: 'push-permission-probe' })
    return 'unavailable'
  }
}

export async function resetPushRegistration() {
  pushHandlers.onToken = null
  pushHandlers.onRoute = null
  pushRegistrationErrorReason = null
  if (!isNativeRuntime() || !pushListenersBound) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
  } catch (err) {
    reportError(err, { area: 'push-reset' })
  } finally {
    pushListenersBound = false
  }
}

// pushEnabled must come from the server's appConfig.pushEnabled value.
// When false (or omitted), the function still requests OS permission so the
// system flag is primed, but deliberately skips PushNotifications.register()
// — avoiding a native crash on devices that lack google-services.json / APNs
// credentials. The caller (App.jsx) passes appConfig.pushEnabled so the
// decision is driven by the backend at runtime, not by a build-time constant.
export async function requestPushRegistration({ onToken, onRoute, pushEnabled = false } = {}) {
  if (!isNativeRuntime()) return { status: 'unavailable' }
  let PushNotifications
  try {
    ({ PushNotifications } = await import('@capacitor/push-notifications'))
  } catch (err) {
    reportError(err, { area: 'push-plugin-import' })
    return { status: 'unavailable' }
  }

  let permission
  try {
    permission = await PushNotifications.requestPermissions()
  } catch (err) {
    reportError(err, { area: 'push-permission-request' })
    return { status: 'error' }
  }
  if (permission.receive !== 'granted') return { status: 'denied' }

  // Latest callbacks always win — the listeners below dereference these at fire
  // time, so a token that arrives after a logout simply finds onToken === null.
  pushHandlers.onToken = onToken || null
  pushHandlers.onRoute = onRoute || null

  if (!pushEnabled) {
    // Permission granted, but we deliberately skip the native register() call so
    // the app never crashes on devices without google-services.json / APNs creds.
    return { status: 'server-unavailable' }
  }

  if (!pushListenersBound) {
    try {
      await PushNotifications.addListener('registration', (token) => {
        pushRegistrationErrorReason = null
        try { pushHandlers.onToken?.(token?.value) } catch (err) { reportError(err, { area: 'push-token-handler' }) }
      })
      await PushNotifications.addListener('registrationError', (error) => {
        pushRegistrationErrorReason = error?.error || error?.message || 'registration-failed'
        reportError(error, { area: 'push-registration' })
      })
      await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        try {
          const route = routeFromNotification(event?.notification)
          if (route) pushHandlers.onRoute?.(route)
        } catch (err) {
          reportError(err, { area: 'push-action-handler' })
        }
      })
      pushListenersBound = true
    } catch (err) {
      reportError(err, { area: 'push-listener-bind' })
      return { status: 'error' }
    }
  }

  try {
    await PushNotifications.register()
  } catch (err) {
    reportError(err, { area: 'push-register-call' })
    return { status: 'server-unavailable' }
  }
  if (pushRegistrationErrorReason) return { status: 'server-unavailable' }
  return { status: 'requested' }
}
