import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'
import SponsorsScreen from '../../src/screens/SponsorsScreen.tsx'

afterEach(cleanup)

const tierResponse = [
  {
    id: 1,
    name: 'Gold',
    color: '#c6952f',
    description: '오래 함께한 후원자',
    sponsors: [
      {
        id: 12,
        name: '광운상사',
        logoUrl: 'https://cdn.example.com/logo.png',
        linkUrl: 'https://example.com/',
        description: '<p><strong>장학 사업</strong>을 후원합니다.</p>',
        sinceDate: '2024-01-01',
        untilDate: '2024-12-31',
        anonymous: false,
      },
      {
        id: null,
        name: null,
        logoUrl: null,
        linkUrl: 'javascript:alert(1)',
        description: null,
        sinceDate: null,
        untilDate: null,
        anonymous: true,
      },
    ],
  },
]

const pageResponse = {
  settings: {
    heroTitle: '함께 만드는 COMS',
    heroSubtitle: '후원자 여러분을 소개합니다.',
    introHtml: '<p>꾸준한 <strong>응원</strong>에 감사드립니다.</p>',
    accentColor: '#c6952f',
    layout: 'GRID',
    showTierLabels: true,
    thankYouMessage: '보내주신 마음을 오래 기억하겠습니다.',
    howToSection: {
      title: '후원 안내',
      bodyHtml: '<p>운영진에게 연락해주세요.</p>',
      contactEmail: 'hello@example.com',
      contactLink: 'https://example.com/support',
      bankNote: '계좌 안내는 문의 시 전달합니다.',
    },
    showCounts: true,
  },
  bannerImageUrl: 'https://cdn.example.com/banner.jpg',
  sponsorCount: 2,
  tierCount: 1,
}

function renderSponsors({ tiers = tierResponse, page = pageResponse } = {}) {
  globalThis.fetch = vi.fn(async (url) => new Response(JSON.stringify(
    String(url).endsWith('/page') ? page : tiers,
  ), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onBack = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <SponsorsScreen onBack={onBack} />
    </QueryClientProvider>,
  )
  return { onBack }
}

describe('SponsorsScreen', () => {
  test('renders the exact public response shape safely', async () => {
    const { onBack } = renderSponsors()

    expect(await screen.findByRole('heading', { name: '함께 만드는 COMS' })).toBeTruthy()
    expect(screen.getByText('응원').closest('p').textContent).toBe('꾸준한 응원에 감사드립니다.')
    expect(screen.getByRole('img', { name: '후원자 페이지 배너' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Gold' })).toBeTruthy()
    expect(screen.getByText('장학 사업').closest('p').textContent).toBe('장학 사업을 후원합니다.')
    expect(screen.getByText('2024. 1. 1. ~ 2024. 12. 31.')).toBeTruthy()
    expect(screen.getByText('익명 후원자')).toBeTruthy()
    expect(screen.getByRole('link', { name: /광운상사/ }).getAttribute('rel')).toBe('noreferrer')
    expect(screen.getByRole('link', { name: '후원 문의하기' }).getAttribute('href')).toBe('https://example.com/support')
    expect(screen.queryByRole('link', { name: '익명 후원자' })).toBeNull()
    expect(screen.getByText('보내주신 마음을 오래 기억하겠습니다.')).toBeTruthy()

    const chip = screen.getByTestId('sponsor-tier-color-1')
    expect(chip.style.getPropertyValue('--sponsor-tier-color')).toBe('#c6952f')

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  test('shows the required empty state when no sponsors are registered', async () => {
    renderSponsors({ tiers: [] })
    expect(await screen.findByText('아직 등록된 후원자가 없습니다')).toBeTruthy()
  })
})
