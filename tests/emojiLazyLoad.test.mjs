import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { register } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tempDir = mkdtempSync(join(tmpdir(), 'coms-emoji-load-'))
const markerPath = join(tempDir, 'twemoji-resolutions.txt')
const hookSource = `
  import { appendFileSync } from 'node:fs'
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'twemoji') appendFileSync(${JSON.stringify(markerPath)}, 'resolved\\n')
    return nextResolve(specifier, context)
  }
`

register(`data:text/javascript,${encodeURIComponent(hookSource)}`, { parentURL: import.meta.url })

try {
  const emoji = await import(`../src/utils/emoji.ts?lazy-load=${Date.now()}`)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(existsSync(markerPath), false, 'module import must not resolve twemoji')

  const [first, second] = await Promise.all([emoji.emojify('😀'), emoji.emojify('🎉')])
  assert.match(first, /<img/)
  assert.match(second, /<img/)
  assert.equal(readFileSync(markerPath, 'utf8').trim().split('\n').length, 1)

  // ensureTwemojiLoaded backs useTwemoji (the hook EmojiText, PostContent and
  // ResourcesTab all call so their emojifySync output twemoji-ifies once the
  // parser lands, whichever of them mounts first). It must join the same
  // cached load rather than starting a second one.
  assert.equal(await emoji.ensureTwemojiLoaded(), true)
  assert.equal(readFileSync(markerPath, 'utf8').trim().split('\n').length, 1)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

console.log('emoji lazy-load contract passed')
