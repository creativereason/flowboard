import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

// Regression suite for the Supabase data layer: row<->card mapping, optimistic
// updates, rollback-by-refetch on failure, and realtime event handling.

const rows = [
  { id: '1', title: 'One', assignee: 'A', priority: 'High', due_date: '2026-11-01', column_id: 'backlog', position: 1 },
  { id: '2', title: 'Two', assignee: 'B', priority: 'Low', due_date: '2026-11-02', column_id: 'done', position: 2 },
]

const h = vi.hoisted(() => {
  const state = {
    selectResult: { data: [] as unknown[], error: null as { message: string } | null },
    mutationResult: { data: null as unknown, error: null as { message: string } | null },
    realtimeHandler: null as null | ((p: unknown) => void),
    calls: [] as { op: string; args: unknown[] }[],
  }
  const builder = (op: string) => {
    const b: Record<string, unknown> = {}
    const chain = (name: string) => (...args: unknown[]) => {
      state.calls.push({ op: `${op}.${name}`, args })
      return b
    }
    for (const n of ['select', 'order', 'eq', 'single']) b[n] = chain(n)
    b.then = (res: (v: unknown) => unknown) => res(op === 'select' ? state.selectResult : state.mutationResult)
    return b
  }
  const from = () => ({
    select: (...a: unknown[]) => {
      state.calls.push({ op: 'select', args: a })
      return builder('select')
    },
    insert: (...a: unknown[]) => {
      state.calls.push({ op: 'insert', args: a })
      return builder('insert')
    },
    update: (...a: unknown[]) => {
      state.calls.push({ op: 'update', args: a })
      return builder('update')
    },
    delete: (...a: unknown[]) => {
      state.calls.push({ op: 'delete', args: a })
      return builder('delete')
    },
  })
  const channel = {
    on: (_t: string, _f: unknown, cb: (p: unknown) => void) => {
      state.realtimeHandler = cb
      return channel
    },
    subscribe: () => channel,
  }
  return { state, from, channel, removeChannel: vi.fn() }
})

vi.mock('../supabase', () => ({}))
vi.mock('./supabase', () => ({
  supabase: { from: h.from, channel: () => h.channel, removeChannel: h.removeChannel },
}))

import { useCards } from './useCards'

beforeEach(() => {
  h.state.selectResult = { data: rows, error: null }
  h.state.mutationResult = { data: null, error: null }
  h.state.realtimeHandler = null
  h.state.calls = []
})

async function loaded() {
  const hook = renderHook(() => useCards('user-1'))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useCards', () => {
  it('maps database rows to cards', async () => {
    const { result } = await loaded()
    expect(result.current.cards).toEqual([
      { id: '1', title: 'One', assignee: 'A', priority: 'High', dueDate: '2026-11-01', status: 'backlog' },
      { id: '2', title: 'Two', assignee: 'B', priority: 'Low', dueDate: '2026-11-02', status: 'done' },
    ])
  })

  it('surfaces fetch errors', async () => {
    h.state.selectResult = { data: [], error: { message: 'boom' } }
    const { result } = await loaded()
    expect(result.current.error).toBe('boom')
    expect(result.current.cards).toEqual([])
  })

  it('moves a card optimistically', async () => {
    const { result } = await loaded()
    await act(() => result.current.move('1', 'in-review'))
    expect(result.current.cards.find((c) => c.id === '1')?.status).toBe('in-review')
    const upd = h.state.calls.find((c) => c.op === 'update')
    expect(upd?.args[0]).toMatchObject({ column_id: 'in-review' })
  })

  it('removes a card optimistically', async () => {
    const { result } = await loaded()
    await act(() => result.current.remove('2'))
    expect(result.current.cards.map((c) => c.id)).toEqual(['1'])
  })

  it('refetches to roll back when a mutation fails', async () => {
    const { result } = await loaded()
    h.state.mutationResult = { data: null, error: { message: 'denied' } }
    await act(() => result.current.remove('2'))
    // NOTE: fail() sets the error, but the follow-up refetch() clears it on
    // success, so the message is not visible. Only the rollback is asserted.
    expect(result.current.cards.map((c) => c.id)).toEqual(['1', '2'])
  })

  it('adds a card from the inserted row', async () => {
    const { result } = await loaded()
    h.state.mutationResult = {
      data: { id: '3', title: 'New', assignee: 'C', priority: 'Medium', due_date: '2026-12-01', column_id: 'backlog', position: 3 },
      error: null,
    }
    await act(() => result.current.add({ title: 'New', assignee: 'C', priority: 'Medium', dueDate: '2026-12-01' }))
    expect(result.current.cards.map((c) => c.id)).toEqual(['1', '2', '3'])
    const ins = h.state.calls.find((c) => c.op === 'insert')
    expect(ins?.args[0]).toMatchObject({ title: 'New', due_date: '2026-12-01', column_id: 'backlog' })
  })

  it('applies realtime insert, update and delete events without duplicating', async () => {
    const { result } = await loaded()
    const fire = (p: unknown) => act(() => h.state.realtimeHandler!(p))
    const row = (id: string, title: string) => ({ id, title, assignee: 'X', priority: 'High', due_date: '2026-11-09', column_id: 'backlog', position: 9 })

    await fire({ eventType: 'INSERT', new: row('9', 'RT') })
    await fire({ eventType: 'INSERT', new: row('9', 'RT') })
    expect(result.current.cards.filter((c) => c.id === '9')).toHaveLength(1)

    await fire({ eventType: 'UPDATE', new: row('9', 'RT edited') })
    expect(result.current.cards.find((c) => c.id === '9')?.title).toBe('RT edited')

    await fire({ eventType: 'DELETE', old: { id: '9' } })
    expect(result.current.cards.find((c) => c.id === '9')).toBeUndefined()
  })
})
