import { useState } from 'react'
import { Lightbulb } from '@phosphor-icons/react'
import { pickRandomFact } from '../data/funFacts'

// Un dato aleatorio por montaje: cambia cada vez que el usuario entra al Inicio.
export function FunFactCard() {
  const [fact] = useState(pickRandomFact)
  return (
    <div className="flex gap-3 rounded-card border border-gold/30 bg-[#fbf4e3] p-4">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
        <Lightbulb size={16} weight="fill" />
      </span>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-gold">Dato mundialista</p>
        <p className="mt-1 text-sm leading-snug text-ink">{fact.text}</p>
      </div>
    </div>
  )
}
