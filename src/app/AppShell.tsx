import { type ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg">
      <main className="mx-auto w-full max-w-[480px] px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
