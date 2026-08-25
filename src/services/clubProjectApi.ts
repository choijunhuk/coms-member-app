import { request } from './apiClient'
import { ClubProjectListSchema, parseApiResponse } from './responseSchemas'

// COM's Apps catalog (동아리 제작 프로젝트) — the richer, admin-curated catalog
// behind the website's /apps page, distinct from the simple /api/apps link list.
export async function listClubProjects() {
  const data = await request('/api/club-projects')
  return parseApiResponse(ClubProjectListSchema, data, '동아리 프로젝트 목록')
}
