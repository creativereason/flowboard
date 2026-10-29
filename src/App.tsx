import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Board from './components/Board'
import CardModal from './components/CardModal'
import AuthForm from './components/AuthForm'
import { supabase } from './supabase'
import { useCards } from './useCards'
import { ThemeToggle } from './theme'
import logoSm from './assets/logo-sm.svg'
import { COLUMNS } from './types'
import type { CardData, Status } from './types'

type ModalState = { card: CardData | null; status?: Status } | null

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) return null
  if (!session) return <AuthForm />
  return <BoardApp userId={session.user.id} email={session.user.email ?? ''} />
}

function BoardApp({ userId, email }: { userId: string; email: string }) {
  const { cards, loading, error, add, update, move, remove } = useCards(userId)
  const [modal, setModal] = useState<ModalState>(null)

  const save = (data: Omit<CardData, 'id' | 'status'>, id?: string) => {
    if (id) update(id, data)
    else add(data, modal?.status)
    setModal(null)
  }

  const confirmRemove = (id: string) => {
    const card = cards.find((c) => c.id === id)
    if (!window.confirm(`Delete "${card?.title ?? 'this card'}"? This can't be undone.`)) return
    remove(id)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">
            <img src={logoSm} alt="" width={20} height={20} />
          </span>
          FlowBoard
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <span className="avatar" title={email}>
            {(email[0] ?? 'U').toUpperCase()}
          </span>
          <button className="link-btn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="subbar">
        <span className="crumb">Boards</span>
        <span className="sep">/</span>
        <h1>My board</h1>
        <span className="count-label">{COLUMNS.length} columns</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <Board
          cards={cards}
          onMove={move}
          onAdd={(status) => setModal({ card: null, status })}
          onEdit={(card) => setModal({ card })}
        />
      )}
      {modal && (
        <CardModal
          card={modal.card}
          onSave={save}
          onDelete={(id) => {
            confirmRemove(id)
            setModal(null)
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
