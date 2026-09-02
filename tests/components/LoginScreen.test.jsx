import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import LoginScreen from '../../src/screens/LoginScreen.tsx'

afterEach(cleanup)

const calls = []

beforeEach(() => {
  calls.length = 0
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method, body: options.body ? JSON.parse(options.body) : null })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

function openReset() {
  render(<LoginScreen onLogin={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: '비밀번호를 잊으셨나요?' }))
}

describe('LoginScreen 비밀번호 찾기', () => {
  test('walks the two-step reset and returns to a prefilled login form', async () => {
    openReset()

    fireEvent.change(screen.getByLabelText('가입 이메일'), { target: { value: 'member@kw.ac.kr' } })
    fireEvent.click(screen.getByRole('button', { name: /인증코드 받기/ }))

    await waitFor(() => expect(calls.length).toBe(1))
    expect(calls[0].url).toBe('/api/auth/password-reset/request')
    expect(calls[0].method).toBe('POST')
    expect(calls[0].body).toEqual({ email: 'member@kw.ac.kr' })

    // Step two only appears once a code has been sent.
    await waitFor(() => expect(screen.getByLabelText('인증코드')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'Passw0rd!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'Passw0rd!' } })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 재설정/ }))

    await waitFor(() => expect(calls.length).toBe(2))
    expect(calls[1].url).toBe('/api/auth/password-reset/confirm')
    expect(calls[1].body).toEqual({ email: 'member@kw.ac.kr', code: '123456', newPassword: 'Passw0rd!' })

    // Back on the login form, identifier prefilled so only the password is left.
    await waitFor(() => expect(screen.getByText('비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.')).toBeTruthy())
    expect(screen.getByLabelText('학번 또는 이메일').value).toBe('member@kw.ac.kr')
  })

  test('validates locally before spending a request', async () => {
    openReset()

    // No @ — never reaches the server.
    fireEvent.change(screen.getByLabelText('가입 이메일'), { target: { value: 'member' } })
    fireEvent.click(screen.getByRole('button', { name: /인증코드 받기/ }))
    await waitFor(() => expect(screen.getByText('가입 이메일을 정확히 입력해주세요.')).toBeTruthy())
    expect(calls.length).toBe(0)

    fireEvent.change(screen.getByLabelText('가입 이메일'), { target: { value: 'member@kw.ac.kr' } })
    fireEvent.click(screen.getByRole('button', { name: /인증코드 받기/ }))
    await waitFor(() => expect(calls.length).toBe(1))
    await waitFor(() => expect(screen.getByLabelText('인증코드')).toBeTruthy())

    // The code input only accepts 6 digits.
    fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '12a34b567' } })
    expect(screen.getByLabelText('인증코드').value).toBe('123456')

    // Weak password is rejected by the shared policy, not by the server.
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'password' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 재설정/ }))
    await waitFor(() => expect(screen.getAllByText(/8자 이상/).length).toBeGreaterThan(0))
    expect(calls.length).toBe(1)

    // Mismatched confirmation is caught too.
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'Passw0rd!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'Passw0rd?' } })
    fireEvent.click(screen.getByRole('button', { name: /비밀번호 재설정/ }))
    await waitFor(() => expect(screen.getByText('새 비밀번호 확인이 일치하지 않습니다.')).toBeTruthy())
    expect(calls.length).toBe(1)
  })

  test('does not reveal whether the address has an account', async () => {
    openReset()
    fireEvent.change(screen.getByLabelText('가입 이메일'), { target: { value: 'nobody@kw.ac.kr' } })
    fireEvent.click(screen.getByRole('button', { name: /인증코드 받기/ }))

    await waitFor(() => expect(screen.getByText(/가입된 계정이 있다면/)).toBeTruthy())
  })
})
