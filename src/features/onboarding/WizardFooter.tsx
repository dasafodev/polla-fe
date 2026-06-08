import { type ReactNode } from 'react'

export function WizardFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto max-w-[480px]">{children}</div>
    </footer>
  )
}
