import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Card from './Card'
import type { CardData } from '../types'

const base: CardData = {
  id: 'c1',
  title: 'Write tests',
  assignee: 'Brian',
  priority: 'High',
  dueDate: '2026-11-05',
  status: 'backlog',
}

describe('Card', () => {
  it('renders title, assignee, priority and a formatted due date', () => {
    render(<Card card={base} onEdit={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Write tests' })).toBeInTheDocument()
    expect(screen.getByText(/Brian/)).toBeInTheDocument()
    expect(screen.getByText('High')).toHaveClass('badge', 'high')
    expect(screen.getByText(/Nov 5, 2026/)).toBeInTheDocument()
  })

  it('falls back when assignee or due date is missing', () => {
    render(<Card card={{ ...base, assignee: '', dueDate: '' }} onEdit={() => {}} />)
    expect(screen.getByText(/Unassigned/)).toBeInTheDocument()
    expect(screen.getByText(/No due date/)).toBeInTheDocument()
  })

  it('calls onEdit with the card when clicked', async () => {
    const onEdit = vi.fn()
    render(<Card card={base} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('heading', { name: 'Write tests' }))
    expect(onEdit).toHaveBeenCalledWith(base)
  })
})
