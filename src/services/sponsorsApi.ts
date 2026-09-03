import { request } from './apiClient'
import {
  SponsorPageResponseSchema,
  SponsorTierListSchema,
  parseApiResponse,
  type SponsorPageResponse,
  type SponsorTier,
} from './responseSchemas'

export const SPONSOR_TIERS_QUERY_KEY = ['member-app', 'sponsors']
export const SPONSOR_PAGE_QUERY_KEY = ['member-app', 'sponsors-page']

export async function listSponsorTiers(): Promise<SponsorTier[]> {
  const data = await request('/api/sponsors')
  return parseApiResponse(SponsorTierListSchema, data, '후원자 목록')
}

export async function getSponsorPage(): Promise<SponsorPageResponse> {
  const data = await request('/api/sponsors/page')
  return parseApiResponse(SponsorPageResponseSchema, data, '후원자 페이지')
}
