import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { RequireAuth } from './guards/RequireAuth'
import { RequireAdmin } from './guards/RequireAdmin'
import { AppShell } from './AppShell'
import { Login } from '../features/onboarding/Login'
import { OnboardingLayout } from '../features/onboarding/OnboardingLayout'
import { Dashboard } from '../features/home/Dashboard'
import { Hub } from '../features/predicciones/Hub'
import { Review } from '../features/predicciones/Review'
import { GroupsEditor } from '../features/groups/GroupsEditor'
import { Thirds } from '../features/groups/Thirds'
import { Powerups } from '../features/powerups/Powerups'
import { KoRoundList } from '../features/ko/KoRoundList'
import { KoRoundDetail } from '../features/ko/KoRoundDetail'
import { KoMatchDetail } from '../features/ko/KoMatchDetail'
import { Scoreboard } from '../features/scoreboard/Scoreboard'
import { Breakdown } from '../features/scoreboard/Breakdown'
import { Participants } from '../features/admin/Participants'

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
    path: '/onboarding',
    element: (
      <RequireAuth>
        <OnboardingLayout />
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: <ProtectedShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'predicciones', element: <Hub /> },
      { path: 'predicciones/grupos', element: <GroupsEditor /> },
      { path: 'predicciones/terceros', element: <Thirds /> },
      { path: 'predicciones/powerups', element: <Powerups /> },
      { path: 'predicciones/revisar', element: <Review /> },
      { path: 'eliminatorias', element: <KoRoundList /> },
      { path: 'eliminatorias/:round', element: <KoRoundDetail /> },
      { path: 'eliminatorias/partido/:matchId', element: <KoMatchDetail /> },
      { path: 'tabla', element: <Scoreboard /> },
      { path: 'tabla/:participantId', element: <Breakdown /> },
      // Única pantalla admin: lista de inscritos (el resto de la data entra por scripts a la DB).
      { path: 'admin', element: <RequireAdmin><Participants /></RequireAdmin> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
