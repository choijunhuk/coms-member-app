import { useEffect, useState } from 'react'
import { ensureTwemojiLoaded } from '../utils/emoji'

// emojifySync (used by renderMarkdownToHtml/renderSafeHtml/renderPlainTextWithEmoji)
// never starts the dynamic twemoji import itself — something has to call the
// lazy loader and re-render once it lands. Previously only EmojiText did that,
// so shortcodes rendered through the other markdown helpers (PostContent,
// ResourcesTab) never got twemoji-ified unless CommunityTab happened to mount
// first and warm the shared cache. Any component that renders emoji can call
// this hook instead: it joins the same idempotent load and flips once ready.
let twemojiReady = false

export function useTwemoji(): boolean {
  const [ready, setReady] = useState(twemojiReady)

  useEffect(() => {
    if (twemojiReady) return undefined
    let active = true
    void ensureTwemojiLoaded().then((loaded) => {
      if (!loaded) return
      twemojiReady = true
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  return ready
}
