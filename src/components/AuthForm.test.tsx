import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))
vi.mock('../supabase', () => ({ supabase: { auth } }))

import AuthForm from './AuthForm'

async function fill(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email Address'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
}

describe('AuthForm', () => {
  beforeEach(() => {
    auth.signInWithPassword.mockReset()
    auth.signUp.mockReset()
  })

  it('signs in with the entered credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    render(<AuthForm />)
    await fill('a@b.com', 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret1' })
  })

  it('shows the error message when sign in fails', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<AuthForm />)
    await fill('a@b.com', 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
  })

  it('switches to sign up and asks to confirm email when no session is returned', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('tab', { name: 'Sign up' }))
    await fill('new@b.com', 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'new@b.com', password: 'secret1' })
    expect(await screen.findByText(/Check your email/)).toBeInTheDocument()
  })
})
