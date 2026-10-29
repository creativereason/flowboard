import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { CardData, Priority, Status } from './types'

interface Row {
  id: string
  title: string
  assignee: string
  priority: Priority
  due_date: string
  column_id: Status
  position: number
}

const toCard = (r: Row): CardData => ({
  id: r.id,
  title: r.title,
  assignee: r.assignee,
  priority: r.priority,
  dueDate: r.due_date,
  status: r.column_id,
})

export type CardInput = Omit<CardData, 'id' | 'status'>

export function useCards(userId: string) {
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('id,title,assignee,priority,due_date,column_id,position')
      .order('position')
    if (error) setError(error.message)
    else {
      setError(null)
      setCards((data as Row[]).map(toCard))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
    const channel = supabase
      .channel(`cards:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id
            setCards((cs) => cs.filter((c) => c.id !== id))
          } else {
            const card = toCard(payload.new as Row)
            setCards((cs) =>
              cs.some((c) => c.id === card.id)
                ? cs.map((c) => (c.id === card.id ? card : c))
                : [...cs, card],
            )
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refetch])

  const fail = async (message: string) => {
    setError(message)
    await refetch()
  }

  const add = async (input: CardInput, status: Status = 'backlog') => {
    const { data, error } = await supabase
      .from('cards')
      .insert({
        title: input.title,
        assignee: input.assignee,
        priority: input.priority,
        due_date: input.dueDate,
        column_id: status,
        position: Date.now(),
      })
      .select('id,title,assignee,priority,due_date,column_id,position')
      .single()
    if (error) return setError(error.message)
    const card = toCard(data as Row)
    setCards((cs) => (cs.some((c) => c.id === card.id) ? cs : [...cs, card]))
  }

  const update = async (id: string, input: CardInput) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...input } : c)))
    const { error } = await supabase
      .from('cards')
      .update({
        title: input.title,
        assignee: input.assignee,
        priority: input.priority,
        due_date: input.dueDate,
      })
      .eq('id', id)
    if (error) await fail(error.message)
  }

  const move = async (id: string, status: Status) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    const { error } = await supabase
      .from('cards')
      .update({ column_id: status, position: Date.now() })
      .eq('id', id)
    if (error) await fail(error.message)
  }

  const remove = async (id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id))
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) await fail(error.message)
  }

  return { cards, loading, error, add, update, move, remove }
}
