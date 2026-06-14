const VERSION_PART = /^\d+$/

export function parseVersion(value) {
  if (typeof value !== 'string') return [0, 0, 0]
  const parts = value.trim().split('.').slice(0, 3)
  while (parts.length < 3) parts.push('0')
  return parts.map((part) => (VERSION_PART.test(part) ? Number(part) : 0))
}

export function compareVersion(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  for (let i = 0; i < 3; i += 1) {
    if (left[i] === right[i]) continue
    return left[i] < right[i] ? -1 : 1
  }
  return 0
}

export function isVersionBelow(current, minimum) {
  if (!current || !minimum) return false
  return compareVersion(current, minimum) < 0
}

export function bundleVersion() {
  // Defined by Vite (see vite.config.js); falls back when running tests without Vite.
  return typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__
}
