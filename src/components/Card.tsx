import type { CardData } from '../types'

interface Props {
  card: CardData
  onEdit: (card: CardData) => void
}

function formatDate(iso: string) {
  if (!iso) return 'No due date'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Card({ card, onEdit }: Props) {
  return (
    <article
      className="card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => onEdit(card)}
    >
      <div className="card-top">
        <span className={`badge ${card.priority.toLowerCase()}`}>{card.priority}</span>
      </div>
      <h3>{card.title}</h3>
      <div className="meta">
        <span>👤 {card.assignee || 'Unassigned'}</span>
        <span>📅 {formatDate(card.dueDate)}</span>
      </div>
    </article>
  )
}
