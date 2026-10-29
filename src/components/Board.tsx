import Column from './Column'
import { COLUMNS } from '../types'
import type { CardData, Status } from '../types'

interface Props {
  cards: CardData[]
  onMove: (id: string, status: Status) => void
  onAdd: (status: Status) => void
  onEdit: (card: CardData) => void
}

export default function Board({ cards, onMove, onAdd, onEdit }: Props) {
  return (
    <main className="board">
      {COLUMNS.map((col) => (
        <Column
          key={col.id}
          id={col.id}
          label={col.label}
          cards={cards.filter((c) => c.status === col.id)}
          onDropCard={onMove}
          onAdd={onAdd}
          onEdit={onEdit}
        />
      ))}
    </main>
  )
}
