import { useNavigate } from 'react-router-dom'
import { GroupDeck } from './GroupDeck'

export function GroupsEditor() {
  const nav = useNavigate()
  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-ink">Grupos</h1>
        <p className="mt-1 text-ink-soft">Ordena cada grupo del 1° al 4°. Los 2 primeros clasifican.</p>
      </header>
      <GroupDeck onComplete={() => nav('/predicciones')} />
    </div>
  )
}
