import { Link } from 'react-router-dom'
import { ROUND_SLUGS } from '../../types/enums'

const NAMES: Record<string, string> = { r32: 'Dieciseisavos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semifinal', '3rd': 'Tercer puesto', final: 'Final' }

export function KoRoundList() {
  return (
    <div>
      <h1>Eliminatorias</h1>
      <ul>
        {ROUND_SLUGS.map((slug) => (
          <li key={slug}><Link to={`/eliminatorias/${slug}`}>{NAMES[slug]}</Link></li>
        ))}
      </ul>
    </div>
  )
}
