import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from './guards/RequireAuth'
import { AppShell } from './AppShell'
import { Login } from '../features/onboarding/Login'
import { Dashboard } from '../features/home/Dashboard'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell>
          <Dashboard />
        </AppShell>
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
