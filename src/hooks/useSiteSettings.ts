import { useQuery } from '@tanstack/react-query'
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_QUERY_KEY, getSiteSettings } from '../services/siteApi'

// 학기 표기 / 모집 상태 / 문의 링크는 운영진이 웹 관리 화면에서 바꾸는 값이라
// 앱에 하드코딩해두면 학기마다 배포가 필요했습니다. 서버 값을 읽되, 아직
// 도착하지 않았거나(콜드 런치) 오프라인이면 기존 하드코딩 값을 그대로 씁니다.
// 화면 장식용 데이터라 재시도하지 않고, 조용히 폴백으로 떨어집니다.
// 캐시는 다른 쿼리와 같이 디스크에 저장돼도 무방합니다 (PII 아님).
export function useSiteSettings() {
  const query = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: getSiteSettings,
    retry: false,
  })
  return query.data ?? DEFAULT_SITE_SETTINGS
}
