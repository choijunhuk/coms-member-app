import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import CommunityTab from '../../src/screens/CommunityTab.jsx'

afterEach(cleanup)

const posts = [
  {
    id: 11,
    title: '질문 글',
    content: '테스트 질문입니다.',
    category: 'QUESTION',
    createdAt: '2026-06-21T10:00:00Z',
    commentCount: 2,
  },
  {
    id: 12,
    title: '정보 글',
    content: '테스트 정보입니다.',
    category: 'INFO',
    createdAt: '2026-06-21T11:00:00Z',
    commentCount: 0,
  },
]

function renderCommunity(overrides = {}) {
  return render(
    <CommunityTab
      posts={posts}
      selected={null}
      comments={[]}
      loading={false}
      openPost={vi.fn()}
      closePost={vi.fn()}
      createPost={vi.fn().mockResolvedValue(undefined)}
      createCommentForPost={vi.fn()}
      vote={vi.fn()}
      pollVote={vi.fn()}
      editComment={vi.fn()}
      removeComment={vi.fn()}
      currentUser={{ id: 1, studentId: '2024000001', role: 'USER' }}
      {...overrides}
    />,
  )
}

describe('CommunityTab', () => {
  test('filters posts and opens a selected list item', () => {
    const openPost = vi.fn()
    renderCommunity({ openPost })

    fireEvent.click(screen.getByRole('button', { name: '질문' }))

    const list = screen.getByRole('heading', { name: '커뮤니티 · 1건' }).closest('section')
    expect(within(list).getByRole('button', { name: /질문 글/ })).toBeTruthy()
    expect(within(list).queryByRole('button', { name: /정보 글/ })).toBeNull()

    fireEvent.click(within(list).getByRole('button', { name: /질문 글/ }))
    expect(openPost).toHaveBeenCalledWith(11)
  })

  test('submits a community-style post from the composer', async () => {
    const createPost = vi.fn().mockResolvedValue(undefined)
    renderCommunity({ createPost })

    fireEvent.click(screen.getByRole('button', { name: '글 작성' }))
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 커뮤니티 글' } })
    fireEvent.change(screen.getByLabelText(/내용/), { target: { value: '커뮤니티 본문입니다.' } })
    fireEvent.change(screen.getByLabelText('분류'), { target: { value: 'INFO' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(createPost).toHaveBeenCalledTimes(1))
    expect(createPost).toHaveBeenCalledWith({
      payload: {
        title: '새 커뮤니티 글',
        content: '커뮤니티 본문입니다.',
        category: 'INFO',
        anonymousName: '',
      },
      images: [],
    })
  })
})
