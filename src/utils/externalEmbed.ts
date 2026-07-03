// Turn a pasted URL into an externalEmbed content block, client-side only.
// Mirrors the web's youtube/link handling (postEditorUtils.externalBlockFromUrl)
// but trimmed to what the mobile composer needs: YouTube gets an embed, any
// other https link becomes a plain link card.

function youtubeVideoId(value) {
  try {
    const url = new URL(String(value || '').trim())
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname.startsWith('/watch')) return url.searchParams.get('v')
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null
    }
  } catch {
    return null
  }
  return null
}

// Returns an externalEmbed block, or null if the input isn't a usable https URL.
export function externalBlockFromUrl(value) {
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
  }
}
