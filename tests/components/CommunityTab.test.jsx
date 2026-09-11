import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import CommunityTab from '../../src/screens/CommunityTab.tsx'

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

  test('toggles a scrap from a post list row', () => {
    const toggleBookmark = vi.fn()
    renderCommunity({ toggleBookmark })

    fireEvent.click(screen.getByRole('button', { name: '질문' }))
    const list = screen.getByRole('heading', { name: '커뮤니티 · 1건' }).closest('section')
    fireEvent.click(within(list).getByRole('button', { name: '스크랩' }))
    expect(toggleBookmark).toHaveBeenCalledWith(11)
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
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        title: '새 커뮤니티 글',
        content: '커뮤니티 본문입니다.',
        category: 'INFO',
        anonymousName: '',
      },
      images: [],
      videos: [],
      files: [],
    }))
  })

  // 임원 이상 작성자에게만 직급 칩을 답니다(web #424). 익명 글은 서버가
  // authorRole을 null로 내려주므로 칩이 붙으면 익명성이 새는 것입니다.
  test('tags 임원 이상 authors in the list and leaves everyone else untagged', () => {
    renderCommunity({
      posts: [
        { id: 21, title: '회장 글', category: 'GENERAL', authorName: '회장님', authorRole: 'ADMIN' },
        { id: 22, title: '부회장 글', category: 'GENERAL', authorName: '부회장님', authorRole: 'VICE_PRESIDENT' },
        { id: 23, title: '임원 글', category: 'GENERAL', authorName: '임원님', authorRole: 'OFFICER' },
        { id: 24, title: '회원 글', category: 'GENERAL', authorName: '회원님', authorRole: 'USER' },
        { id: 25, title: '준회원 글', category: 'GENERAL', authorName: '준회원님', authorRole: 'ASSOCIATE' },
        { id: 26, title: '익명 글', category: 'ANONYMOUS', authorRole: null },
      ],
    })

    expect(screen.getByText('회장')).toBeTruthy()
    expect(screen.getByText('부회장')).toBeTruthy()
    expect(screen.getByText('임원')).toBeTruthy()
    expect(screen.queryByText('회원')).toBeNull()
    expect(screen.queryByText('준회원')).toBeNull()

    const anonymousRow = screen.getByText('익명 글').closest('button')
    expect(anonymousRow.querySelector('.role-tag')).toBeNull()
  })

  test('tags the author in the detail view', () => {
    renderCommunity({
      selected: { id: 31, title: '공지성 글', category: 'GENERAL', authorName: '임원님', authorRole: 'OFFICER' },
    })

    const tag = document.querySelector('.role-tag')
    expect(tag.textContent).toBe('임원')
    expect(tag.classList.contains('role-tag-officer')).toBe(true)
  })

  // 알 수 없는 직급이 내려와도 목록이 죽지 않고 칩만 사라져야 합니다.
  test('renders nothing for an unrecognised role', () => {
    renderCommunity({ posts: [{ id: 41, title: '표류 글', category: 'GENERAL', authorName: '아무개', authorRole: 'TREASURER' }] })
    expect(screen.getByText('표류 글')).toBeTruthy()
    expect(document.querySelector('.role-tag')).toBeNull()
  })

  test('lets ADMIN edit mixed-block post text without dropping attachments', async () => {
    const editPost = vi.fn().mockResolvedValue(undefined)
    const originalContent = JSON.stringify([
      { type: 'text', content: '<p>기존 본문</p>' },
      { type: 'file', fileId: 12, name: '첨부.pdf' },
    ])
    renderCommunity({
      selected: {
        id: 51,
        title: '첨부 글',
        category: 'GENERAL',
        content: originalContent,
      },
      currentUser: { id: 9, studentId: '2024999999', role: 'ADMIN' },
      editPost,
    })

    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    expect(screen.getByDisplayValue('기존 본문')).toBeTruthy()
    expect(screen.queryByDisplayValue(originalContent)).toBeNull()
    expect(screen.getByText(/그대로 유지됩니다/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/내용/), { target: { value: '새 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(editPost).toHaveBeenCalledOnce())
    const payload = editPost.mock.calls[0][1]
    expect(JSON.parse(payload.content)).toEqual([
      { type: 'text', content: '새 본문' },
      { type: 'file', fileId: 12, name: '첨부.pdf' },
    ])
  })

  test('lets ADMIN save title-only edits for image-only posts', async () => {
    const editPost = vi.fn().mockResolvedValue(undefined)
    renderCommunity({
      selected: {
        id: 52,
        title: '이미지 글',
        category: 'GENERAL',
        content: '',
        imageUrl: '/api/community/posts/52/image',
      },
      currentUser: { id: 9, studentId: '2024999999', role: 'ADMIN' },
      editPost,
    })

    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '수정된 이미지 글' } })

    const save = screen.getByRole('button', { name: '수정 저장' })
    expect(save.disabled).toBe(false)
    fireEvent.click(save)

    await waitFor(() => expect(editPost).toHaveBeenCalledOnce())
    expect(editPost).toHaveBeenCalledWith(52, expect.objectContaining({
      title: '수정된 이미지 글',
      content: '',
      category: 'GENERAL',
    }))
  })
})
