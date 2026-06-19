const TRUSTED_WEB_HOSTS = new Set(['coms.kw.ac.kr', 'www.coms.kw.ac.kr'])
const TRUSTED_SCHEMES = new Set(['coms-member-app:', 'coms:'])

function normalizeSegments(url) {
  if (TRUSTED_SCHEMES.has(url.protocol)) {
    return [url.hostname, ...url.pathname.split('/')].filter(Boolean)
  }
  if (url.protocol === 'https:' && TRUSTED_WEB_HOSTS.has(url.hostname)) {
    return url.pathname.split('/').filter(Boolean)
  }
  return []
}

function routeFromSegments(segments) {
  const [scope, id] = segments
  if (scope === 'notices' && id) return { tab: 'notices', noticeId: String(id) }
  if (scope === 'community' && id) return { tab: 'community', postId: String(id) }
  if (scope === 'notifications') return { tab: 'notifications' }
  if (scope === 'resources' || scope === 'files' || scope === 'archive') return { tab: 'resources' }
  if (scope === 'activity-log' || scope === 'monthly-calendar' || scope === 'activity') return { tab: 'activity' }
  return null
}

export function routeFromUrl(value) {
  try {
    return routeFromSegments(normalizeSegments(new URL(String(value))))
  } catch {
    return null
  }
}

export function routeFromNotification(notification) {
  const data = notification?.data || notification || {}
  const linked = routeFromUrl(data.url || data.link || data.deepLink)
  if (linked) return linked
  if (data.noticeId) return { tab: 'notices', noticeId: String(data.noticeId) }
  if (data.postId) return { tab: 'community', postId: String(data.postId) }
  if (data.type === 'COMMUNITY_POST_DELETED') return { tab: 'profile', section: 'deleted-posts' }
  if (String(data.type || '').startsWith('NOTICE')) return data.targetId ? { tab: 'notices', noticeId: String(data.targetId) } : { tab: 'notices' }
  if (String(data.type || '').startsWith('COMMUNITY')) return data.targetId ? { tab: 'community', postId: String(data.targetId) } : { tab: 'community' }
  if (String(data.type || '').startsWith('SCHEDULE') || String(data.type || '').startsWith('ACTIVITY')) return { tab: 'activity' }
  if (data.target === 'activity' || data.target === 'schedule') return { tab: 'activity' }
  if (data.target === 'notifications') return { tab: 'notifications' }
  return null
}
