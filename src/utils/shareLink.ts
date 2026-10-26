// The URL the app hands to the share sheet for a community post.
//
// Link-preview crawlers (KakaoTalk, Slack, ...) only show a post's own title and image when the
// link carries the server's share signature (`/community/{id}?s=...`, from
// GET /api/community/posts/{id}/share-link); a bare link previews as a generic COM's card.
//
// The base is the public site, never window.location: inside the native app the page origin is
// https://localhost (Android) or capacitor://localhost (iOS), so a link built from it opened
// nowhere for whoever received it.

export function communityShareUrl(postId: number | string, signedUrl: string | null | undefined, publicBaseUrl: string): string {
  const base = String(publicBaseUrl || '').replace(/\/+$/, '')
  const plain = `${base}/community/${postId}`
  if (!signedUrl) return plain
  try {
    const url = new URL(signedUrl)
    const expected = new URL(base)
    // Only ever share a link to this post on the public site; anything else falls back.
    if (url.protocol === 'https:'
      && url.host === expected.host
      && url.pathname === `/community/${postId}`
      && url.searchParams.get('s')) {
      return url.href
    }
  } catch {
    // Malformed answer: the plain link still works, it just previews generically.
  }
  return plain
}
