import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import EmojiText from '../../src/components/EmojiText.tsx'

afterEach(cleanup)

describe('EmojiText', () => {
  test('loads Twemoji on first render and replaces the fallback text', async () => {
    render(<EmojiText text="환영합니다 😀" />)

    const image = await screen.findByRole('img')
    expect(image.getAttribute('class')).toBe('emoji')
    expect(image.getAttribute('alt')).toBe('😀')
  })
})
