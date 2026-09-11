import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ResourcesTab from '../../src/screens/ResourcesTab.tsx'
import { updateArchiveFile } from '../../src/services/archiveApi.ts'

vi.mock('../../src/hooks/useTwemoji.ts', () => ({
  useTwemoji: () => {},
}))

vi.mock('../../src/services/archiveApi.ts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    updateArchiveFile: vi.fn().mockResolvedValue({ id: 7 }),
    voteFile: vi.fn(),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ResourcesTab archive editing', () => {
  test('saves archive edits while preserving untouched structured description exactly', async () => {
    const originalDescription = JSON.stringify([
      { type: 'text', content: '<p>기존 설명</p>' },
      { type: 'file', fileId: 9, name: '부록.pdf' },
    ])
    const onChanged = vi.fn()

    render(
      <ResourcesTab
        currentUser={{ role: 'ADMIN', studentId: '2024000001' }}
        onChanged={onChanged}
        files={[{
          id: 7,
          title: '자료 제목',
          category: 'GENERAL',
          description: originalDescription,
          originalName: 'original.pdf',
          uploadedBy: '2024999999',
          uploadedAt: '2026-09-01T00:00:00Z',
        }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /자료 제목/ }))
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '수정된 자료' } })
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(updateArchiveFile).toHaveBeenCalledOnce())
    expect(updateArchiveFile).toHaveBeenCalledWith(7, expect.objectContaining({
      title: '수정된 자료',
      description: originalDescription,
      category: 'GENERAL',
      file: null,
    }))
    expect(onChanged).toHaveBeenCalledOnce()
  })

  test('changed archive description rewrites one text block and keeps attachments', async () => {
    const originalDescription = JSON.stringify([
      { type: 'text', content: '<p>기존 설명</p>' },
      { type: 'file', fileId: 9, name: '부록.pdf' },
    ])

    render(
      <ResourcesTab
        currentUser={{ role: 'ADMIN', studentId: '2024000001' }}
        files={[{
          id: 8,
          title: '자료 제목',
          category: 'GENERAL',
          description: originalDescription,
          originalName: 'original.pdf',
          uploadedBy: '2024999999',
          uploadedAt: '2026-09-01T00:00:00Z',
        }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /자료 제목/ }))
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByLabelText('설명 (선택)'), { target: { value: '새 설명' } })
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(updateArchiveFile).toHaveBeenCalledOnce())
    expect(JSON.parse(updateArchiveFile.mock.calls[0][1].description)).toEqual([
      { type: 'text', content: '새 설명' },
      { type: 'file', fileId: 9, name: '부록.pdf' },
    ])
  })
})
