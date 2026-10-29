import { useEffect, useState } from 'react'
import { PRIORITIES } from '../types'
import type { CardData, Priority } from '../types'

interface Props {
  card: CardData | null
  onSave: (data: Omit<CardData, 'id' | 'status'>, id?: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function CardModal({ card, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card?.title ?? '')
  const [assignee, setAssignee] = useState(card?.assignee ?? '')
  const [priority, setPriority] = useState<Priority>(card?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={card ? 'Edit card' : 'Add card'}
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ title: title.trim(), assignee: assignee.trim(), priority, dueDate }, card?.id)
        }}
      >
        <div className="modal-head">
          <h2>{card ? 'Edit card' : 'Add card'}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <span className="icon x" aria-hidden="true" />
          </button>
        </div>
        <label className="field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter card name..." required autoFocus />
        </label>
        <label className="field">
          Assignee
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Who owns this?" required />
        </label>
        <div className="field-row">
          <label className="field small">
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field small">
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
        </div>
        <div className="actions">
          {card && (
            <button type="button" className="danger-link" onClick={() => onDelete(card.id)}>
              Delete card
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
