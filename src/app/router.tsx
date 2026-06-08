import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { RequireAuth } from './guards/RequireAuth'
import { AppShell } from './AppShell'
import { Login } from '../features/onboarding/Login'
import { Dashboard } from '../features/home/Dashboard'
import { Hub } from '../features/predicciones/Hub'
import { Review } from '../features/predicciones/Review'
import { GroupsList } from '../features/groups/GroupsList'
import { GroupEditor } from '../features/groups/GroupEditor'
import { Thirds } from '../features/groups/Thirds'
import { PowerupsForm } from '../features/powerups/PowerupsForm'
import { KoRoundList } from '../features/ko/KoRoundList'
import { KoRoundDetail } from '../features/ko/KoRoundDetail'
import { KoMatchDetail } from '../features/ko/KoMatchDetail'
import { Scoreboard } from '../features/scoreboard/Scoreboard'
import { Breakdown } from '../features/scoreboard/Breakdown'

function ProtectedShell() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'predicciones', element: <Hub /> },
      { path: 'predicciones/grupos', element: <GroupsList /> },
      { path: 'predicciones/grupos/:groupId', element: <GroupEditor /> },
      { path: 'predicciones/terceros', element: <Thirds /> },
      { path: 'predicciones/powerups', element: <PowerupsForm /> },
      { path: 'predicciones/revisar', element: <Review /> },
      { path: 'eliminatorias', element: <KoRoundList /> },
      { path: 'eliminatorias/:round', element: <KoRoundDetail /> },
      { path: 'eliminatorias/partido/:matchId', element: <KoMatchDetail /> },
      { path: 'tabla', element: <Scoreboard /> },
      { path: 'tabla/:participantId', element: <Breakdown /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
