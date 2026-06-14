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

export async function requestPushRegistration({ onToken, onRoute } = {}) {
  if (!isNativeRuntime()) return { status: 'unavailable' }
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return { status: 'denied' }

  await PushNotifications.addListener('registration', (token) => {
    onToken?.(token?.value)
  })
  await PushNotifications.addListener('registrationError', (error) => {
    console.warn('Push registration failed', error)
  })
  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const route = routeFromNotification(event?.notification)
    if (route) onRoute?.(route)
  })
  await PushNotifications.register()
  return { status: 'requested' }
}
