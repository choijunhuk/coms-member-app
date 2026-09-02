import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'
import HomeTab from '../../src/screens/HomeTab.tsx'

afterEach(cleanup)

// HomeTab now reads 사이트 설정 and 정기 일정 through react-query. Both are
// additive decorations that must fall back silently, so the harness fails every
// request: what renders below is what a member sees with the server unreachable.
function renderWithQuery(ui) {
  globalThis.fetch = vi.fn(async () => { throw new Error('offline') })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('HomeTab', () => {
  test('renders dashboard sections and opens linked content', () => {
    const openNotice = vi.fn()
    const openPost = vi.fn()
    const setActiveTab = vi.fn()

    renderWithQuery(
      <HomeTab
        notices={[{
          id: 1,
          title: '알림 테스트',
          content: '<p>이번 주 공지입니다.</p>',
          createdAt: '2026-06-21T10:00:00Z',
          pinned: true,
        }]}
        posts={[{
          id: 2,
          title: '커뮤니티 테스트',
          content: '질문 내용',
          category: 'QUESTION',
          createdAt: '2026-06-21T11:00:00Z',
          commentCount: 3,
        }]}
        files={[{
          id: 3,
          title: '회지 자료',
          category: 'ACADEMIC_JOURNAL',
          originalName: 'coms.pdf',
          uploadedAt: '2026-06-21T12:00:00Z',
        }]}
        unreadCount={4}
        clubActivities={[{
          id: 4,
          kind: 'SCHEDULE',
          title: '정기 세미나',
          description: '발표 준비',
          eventDate: '2999-06-30',
        }]}
        openNotice={openNotice}
        openPost={openPost}
        setActiveTab={setActiveTab}
      />,
    )

    expect(screen.getByRole('heading', { name: '오늘 볼 일정, 활동, 공지, 자료를 한 화면에서 확인합니다.' })).toBeTruthy()
    expect(screen.getByText('정기 세미나')).toBeTruthy()
    // 서버 값이 없어도 하드코딩 폴백 문구가 그대로 보입니다.
    expect(screen.getByText('Today COMS')).toBeTruthy()
    expect(screen.getByText('모집 안내')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /알림 테스트/ }))
    expect(openNotice).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: /커뮤니티 테스트/ }))
    expect(openPost).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    expect(setActiveTab).toHaveBeenCalledWith('resources')
  })
})
