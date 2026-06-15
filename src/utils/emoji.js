// Replaces unicode emoji characters with Twemoji <img> tags so every
// platform (Android < 13 in particular) renders the same React-Native-style
// glyph. Falls back to the original string when twemoji is not available
// (Node, no-network installs, etc.).

let twemojiPromise = null

async function loadTwemoji() {
  if (twemojiPromise) return twemojiPromise
  twemojiPromise = (async () => {
    try {
      const mod = await import('twemoji')
      const parser = mod?.default || mod?.parse
      return typeof parser === 'function' ? parser : parser?.parse || null
    } catch {
      return null
    }
  })()
  return twemojiPromise
}

const TWEMOJI_OPTIONS = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/',
  className: 'emoji',
}

export async function emojify(htmlOrText) {
  if (!htmlOrText) return ''
  const parse = await loadTwemoji()
  if (!parse) return htmlOrText
  try {
    return parse(htmlOrText, TWEMOJI_OPTIONS)
  } catch {
    return htmlOrText
  }
}

// Sync variant used inside renderMarkdownToHtml. The first call kicks off
// the dynamic import; until it resolves the raw text is returned. After the
// import lands every subsequent call hits the cached parser, so user-visible
// renders catch up on re-render.
let parser = null
loadTwemoji().then((fn) => {
  parser = fn
})

export function emojifySync(htmlOrText) {
  if (!htmlOrText) return ''
  if (!parser) return htmlOrText
  try {
    return parser(htmlOrText, TWEMOJI_OPTIONS)
  } catch {
    return htmlOrText
  }
}
