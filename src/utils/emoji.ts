// Replaces unicode emoji characters with Twemoji <img> tags so every
// platform (Android < 13 in particular) renders the same React-Native-style
// glyph. Falls back to the original string when twemoji is not available
// (Node, no-network installs, etc.).

type TwemojiParse = (input: string, options?: Record<string, unknown>) => string

let twemojiPromise: Promise<TwemojiParse | null> | null = null
let parser: TwemojiParse | null = null

async function loadTwemoji(): Promise<TwemojiParse | null> {
  if (twemojiPromise) return twemojiPromise
  twemojiPromise = (async () => {
    try {
      const mod = await import('twemoji') as Record<string, unknown>
      const candidate = mod?.default || mod?.parse
      const resolved = typeof candidate === 'function'
        ? candidate as TwemojiParse
        : (candidate as Record<string, unknown> | undefined)?.parse
      if (typeof resolved === 'function') {
        parser = resolved as TwemojiParse
        return parser
      }
      return null
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

// Starts (or joins) the same idempotent lazy load as emojify/EmojiText, without
// needing a string to parse. Used by useTwemoji so any consumer of emojifySync
// can trigger the load and know when to re-render.
export async function ensureTwemojiLoaded(): Promise<boolean> {
  const parse = await loadTwemoji()
  return parse !== null
}

// Sync variant used inside renderMarkdownToHtml. It never starts the dynamic
// import: EmojiText owns the lazy-load boundary and re-renders when ready.
export function emojifySync(htmlOrText) {
  if (!htmlOrText) return ''
  if (!parser) return htmlOrText
  try {
    return parser(htmlOrText, TWEMOJI_OPTIONS)
  } catch {
    return htmlOrText
  }
}
