import { type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { makeQueryClient } from '../lib/queryClient'
import { googleClientId } from '../auth/google'
import { AuthProvider } from '../auth/AuthContext'
import { ErrorBoundary } from './ErrorBoundary'

const queryClient = makeQueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <GoogleOAuthProvider clientId={googleClientId}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        </GoogleOAuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
