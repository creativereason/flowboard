import { useState } from 'react'
import Card from './Card'
import type { CardData, Status } from '../types'

interface Props {
  id: Status
  label: string
  cards: CardData[]
  onDropCard: (id: string, status: Status) => void
  onAdd: (status: Status) => void
  onEdit: (card: CardData) => void
}

export default function Column({ id, label, cards, onDropCard, onAdd, onEdit }: Props) {
  const [over, setOver] = useState(false)

  return (
    <section
      className={`column${over ? ' over' : ''}`}
      aria-label={label}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const cardId = e.dataTransfer.getData('text/plain')
        if (cardId) onDropCard(cardId, id)
      }}
    >
      <h2>
        {label} <span className="count">{cards.length}</span>
      </h2>
      <div className="cards">
        {cards.length === 0 ? (
          <div className="empty-drop">
            <span className="icon upload" aria-hidden="true" />
            Drop a card here or add one below
          </div>
        ) : (
          cards.map((c) => <Card key={c.id} card={c} onEdit={onEdit} />)
        )}
      </div>
      <button type="button" className="add-card" onClick={() => onAdd(id)}>
        <span className="icon plus" aria-hidden="true" />
        Add card
      </button>
    </section>
  )
}
