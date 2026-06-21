const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

function normalizeRootUrl(value, fallback) {
  const candidate = normalizeExternalUrl(value, fallback)
  return candidate.replace(/\/+$/, '')
}

export function normalizeExternalUrl(value, fallback = '') {
  const raw = String(value || '').trim()
  const fallbackValue = String(fallback || '').trim()
  const candidate = raw || fallbackValue
  if (!candidate) return ''
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallbackValue
    return url.href
  } catch {
    return fallbackValue
  }
}

const publicBaseUrl = normalizeRootUrl(
  viteEnv.VITE_PUBLIC_BASE_URL || viteEnv.VITE_COMS_WEB_URL,
  'https://coms.kw.ac.kr',
)

function publicPath(path) {
  return `${publicBaseUrl}${path}`
}

export const DEFAULT_APP_LINKS = Object.freeze({
  hub: publicPath('/'),
  update: publicPath('/'),
  foodClub: publicPath('/foodclub/'),
  teamMate: publicPath('/team-randomizer/'),
  gameClub: publicPath('/gameclub/'),
  kwMate: normalizeExternalUrl(viteEnv.VITE_KWMATE_URL, 'https://kwmate.com/'),
  dailyCoding: normalizeExternalUrl(viteEnv.VITE_DAILY_CODING_URL, 'https://dailycoding-final.com/'),
})

export function normalizeAppLinks(data = {}) {
  const raw = data?.links || data?.appLinks || data?.externalLinks || {}
  return Object.fromEntries(
    Object.entries(DEFAULT_APP_LINKS).map(([key, fallback]) => [
      key,
      normalizeExternalUrl(raw[key], fallback),
    ]),
  )
}
