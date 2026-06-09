import { GroupDeck } from './GroupDeck'
import { BackButton, useGoBack } from '../../ui/BackButton'

export function GroupsEditor() {
  const goBack = useGoBack()
  return (
    <div>
      <BackButton />
      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-ink">Grupos</h1>
        <p className="mt-1 text-ink-soft">Ordena cada grupo del 1° al 4°. Los 2 primeros clasifican.</p>
      </header>
      <GroupDeck onComplete={goBack} />
    </div>
  )
}
