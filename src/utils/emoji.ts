// Replaces unicode emoji characters with Twemoji <img> tags so every
// platform (Android < 13 in particular) renders the same React-Native-style
// glyph. Falls back to the original string when twemoji is not available
// (Node, no-network installs, etc.).

type TwemojiParse = (input: string, options?: Record<string, unknown>) => string

let twemojiPromise: Promise<TwemojiParse | null> | null = null

async function loadTwemoji(): Promise<TwemojiParse | null> {
  if (twemojiPromise) return twemojiPromise
  twemojiPromise = (async () => {
    try {
      const mod = await import('twemoji') as Record<string, unknown>
      const parser = mod?.default || mod?.parse
      if (typeof parser === 'function') return parser as TwemojiParse
      const nested = (parser as Record<string, unknown> | undefined)?.parse
      return typeof nested === 'function' ? (nested as TwemojiParse) : null
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
let parser: TwemojiParse | null = null
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
