import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { useReduced, springSoft } from './motion'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  const reduced = useReduced()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-navy/45"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[80%] max-w-[480px] flex-col rounded-t-[24px] bg-surface shadow-diffuse focus:outline-none"
            initial={reduced ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={springSoft}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" aria-hidden />
            {title && (
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="grid size-9 place-items-center rounded-full text-muted active:scale-95"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
