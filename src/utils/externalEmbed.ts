// Turn a pasted URL into an externalEmbed content block, client-side only.
// Mirrors the web's youtube/link handling (postEditorUtils.externalBlockFromUrl)
// but trimmed to what the mobile composer needs: YouTube gets an embed, any
// other https link becomes a plain link card.

// YouTube video ids are exactly 11 chars of [A-Za-z0-9_-]; anything else is
// rejected so a crafted id can't smuggle extra URL syntax into the built links.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

function validVideoId(id) {
  return id && YOUTUBE_ID_RE.test(id) ? id : null
}

function youtubeVideoId(value) {
  try {
    const url = new URL(String(value || '').trim())
    if (url.hostname === 'youtu.be') return validVideoId(url.pathname.slice(1))
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname.startsWith('/watch')) return validVideoId(url.searchParams.get('v'))
      if (url.pathname.startsWith('/shorts/')) return validVideoId(url.pathname.split('/')[2])
      if (url.pathname.startsWith('/embed/')) return validVideoId(url.pathname.split('/')[2])
    }
  } catch {
    return null
  }
  return null
}

// Returns an externalEmbed block, or null if the input isn't a usable https URL.
// `extra` carries known metadata (title, thumbnailUrl, description, …) — e.g.
// from YouTube search results or a link-preview fetch — merged over the defaults.
export function externalBlockFromUrl(value, extra = {}) {
  const raw = String(value || '').trim()
  if (!raw) return null
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null

  const videoId = youtubeVideoId(raw)
  if (videoId) {
    return {
      type: 'externalEmbed',
      provider: 'youtube',
      kind: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      title: '',
      width: 75,
      align: 'center',
      ...extra,
    }
  }

  return {
    type: 'externalEmbed',
    provider: 'external',
    kind: 'link',
    url: raw,
    title: raw,
    width: 75,
    align: 'center',
    ...extra,
  }
}
