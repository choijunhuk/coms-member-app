import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { reportError } from '../services/observability.js'

const memoryCache = new Map()
const hydratedKeys = new Set()

function shouldUseNativePreferences() {
  return Capacitor.isNativePlatform()
}

function localStorageFallback() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function readStoredValue(key) {
  if (shouldUseNativePreferences()) return memoryCache.has(key) ? memoryCache.get(key) : null
  return localStorageFallback()?.getItem(key) ?? null
}

export async function hydrateStoredValues(keys) {
  if (!shouldUseNativePreferences()) return
  await Promise.all([...new Set(keys)].map(async (key) => {
    if (hydratedKeys.has(key)) return
    try {
      const { value } = await Preferences.get({ key })
      if (value !== null && value !== undefined) {
        memoryCache.set(key, value)
      } else {
        const legacyValue = localStorageFallback()?.getItem(key)
        if (legacyValue !== null && legacyValue !== undefined) {
          memoryCache.set(key, legacyValue)
          await Preferences.set({ key, value: legacyValue })
          localStorageFallback()?.removeItem(key)
        } else {
          memoryCache.delete(key)
        }
      }
      hydratedKeys.add(key)
    } catch (error) {
      reportError(error, { area: 'preferences-hydrate', key })
    }
  }))
}

export async function readStoredValueAsync(key) {
  await hydrateStoredValues([key])
  return readStoredValue(key)
}

export function writeStoredValue(key, value) {
  const normalized = String(value)
  memoryCache.set(key, normalized)
  if (!shouldUseNativePreferences()) {
    localStorageFallback()?.setItem(key, normalized)
    return
  }
  void Preferences.set({ key, value: normalized }).catch((error) => {
    reportError(error, { area: 'preferences-write', key })
  })
}

export async function writeStoredValueAsync(key, value) {
  const normalized = String(value)
  memoryCache.set(key, normalized)
  if (!shouldUseNativePreferences()) {
    localStorageFallback()?.setItem(key, normalized)
    return
  }
  await Preferences.set({ key, value: normalized })
}

export function removeStoredValue(key) {
  memoryCache.delete(key)
  if (!shouldUseNativePreferences()) {
    localStorageFallback()?.removeItem(key)
    return
  }
  void Preferences.remove({ key }).catch((error) => {
    reportError(error, { area: 'preferences-remove', key })
  })
}

export async function removeStoredValueAsync(key) {
  memoryCache.delete(key)
  if (!shouldUseNativePreferences()) {
    localStorageFallback()?.removeItem(key)
    return
  }
  await Preferences.remove({ key })
}

export async function removeStoredValuesByPrefix(prefix) {
  const storage = localStorageFallback()
  if (storage) {
    const keys = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    keys.forEach((key) => storage.removeItem(key))
  }

  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(prefix)) memoryCache.delete(key)
  }

  if (!shouldUseNativePreferences()) return
  const { keys } = await Preferences.keys()
  await Promise.all(keys.filter((key) => key.startsWith(prefix)).map((key) => Preferences.remove({ key })))
}
