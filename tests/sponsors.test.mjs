import assert from 'node:assert/strict'

import { getSponsorPage, listSponsorTiers } from '../src/services/sponsorsApi.ts'
import {
  SponsorPageResponseSchema,
  SponsorTierListSchema,
  parseApiResponse,
} from '../src/services/responseSchemas.ts'
import { safeExternalHref } from '../src/utils/urlValidation.ts'

const tiersFixture = [
  {
    id: 1,
    name: 'Gold',
    color: '#c6952f',
    description: '오래 함께한 후원자',
    sortOrder: 0,
    sponsors: [
      {
        id: 12,
        name: '광운상사',
        tierId: 1,
        logoUrl: 'https://cdn.example.com/logo.png',
        linkUrl: 'https://example.com/',
        description: '<p>장학 사업을 후원합니다.</p>',
        sinceDate: '2024-01-01',
        untilDate: '2024-12-31',
        anonymous: false,
        futureField: 'preserved',
      },
      {
        id: null,
        name: null,
        tierId: 1,
        logoUrl: null,
        linkUrl: null,
        description: null,
        sinceDate: null,
        untilDate: null,
        anonymous: true,
      },
    ],
    futureField: true,
  },
  {
    id: null,
    name: '',
    color: null,
    description: null,
    sortOrder: 2147483647,
    sponsors: [
      {
        id: 30,
        name: '이음 문구점',
        tierId: null,
        logoUrl: null,
        linkUrl: null,
        description: null,
        sinceDate: null,
        untilDate: null,
        anonymous: false,
      },
    ],
  },
]

const pageFixture = {
  settings: {
    heroTitle: '함께 만드는 COMS',
    heroSubtitle: '후원자 여러분을 소개합니다.',
    bannerImageId: 8,
    introHtml: '<p>꾸준한 응원에 감사드립니다.</p>',
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
  futureField: 'preserved',
}

const parsedTiers = parseApiResponse(SponsorTierListSchema, tiersFixture, '후원자 목록')
assert.equal(parsedTiers[0].sponsors[1].id, null)
assert.equal(parsedTiers[0].sponsors[0].futureField, 'preserved')
assert.equal(parsedTiers[0].futureField, true)
assert.equal(parsedTiers[1].id, null)
assert.equal(parsedTiers[1].name, '')
assert.equal(parsedTiers[1].sponsors[0].name, '이음 문구점')

const parsedPage = parseApiResponse(SponsorPageResponseSchema, pageFixture, '후원자 페이지')
assert.equal(parsedPage.settings.heroTitle, '함께 만드는 COMS')
assert.equal(parsedPage.sponsorCount, 2)
assert.equal(parsedPage.futureField, 'preserved')

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  const data = url === '/api/sponsors/page' ? pageFixture : tiersFixture
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

assert.deepEqual(await listSponsorTiers(), tiersFixture)
assert.deepEqual(await getSponsorPage(), pageFixture)
assert.deepEqual(calls.map((call) => call.url), ['/api/sponsors', '/api/sponsors/page'])

assert.equal(safeExternalHref('https://example.com/support'), 'https://example.com/support')
assert.equal(safeExternalHref('javascript:alert(1)'), '')
assert.equal(safeExternalHref('data:text/html,x'), '')

console.log('sponsors contract passed')

{
  const { sponsorInitial } = await import('../src/utils/sponsorInitial.ts')
  assert.equal(sponsorInitial('60기 박채현'), '박')
  assert.equal(sponsorInitial('광운대'), '광')
  assert.equal(sponsorInitial('  '), '후')
}
