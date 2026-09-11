import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import AuthorEditPanel from '../../src/components/AuthorEditPanel.tsx'
import { listMembers } from '../../src/services/adminApi.ts'

vi.mock('../../src/services/adminApi.ts', () => ({
  listMembers: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AuthorEditPanel', () => {
  test('loads members only for ADMIN and submits selected member ownership transfer', async () => {
    listMembers.mockResolvedValue([
      { id: 1, name: '김관리', studentId: '2023123456' },
      { id: 2, name: '박회원', studentId: '2024999999' },
    ])
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthorEditPanel
        currentUser={{ role: 'ADMIN' }}
        currentName="기존 표시"
        directNameKey="name"
        onCancel={() => {}}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => expect(listMembers).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByPlaceholderText('이름 또는 학번 검색'), { target: { value: '김관리' } })
    fireEvent.click(await screen.findByRole('button', { name: /김관리 · 2023123456/ }))

    expect(screen.getByText(/실제 소유권이 이전됩니다/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '작성자 저장' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ studentId: '2023123456' }))
  })

  test('non-admin direct name edit does not load members', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AuthorEditPanel
        currentUser={{ role: 'USER' }}
        currentName="기존 표시"
        directNameKey="uploaderName"
        onCancel={() => {}}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByPlaceholderText('이름 또는 학번 검색')).toBeNull()
    expect(listMembers).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('목록에 표시할 이름'), { target: { value: '직접 표시' } })
    fireEvent.click(screen.getByRole('button', { name: '작성자 저장' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ uploaderName: '직접 표시' }))
  })
})
