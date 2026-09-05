import { createContext, useContext, useState, useCallback, useRef } from 'react'

/**
 * Lightweight toast system.
 *
 * Usage anywhere under <ToastProvider>:
 *   const toast = useToast()
 *   toast.success('Saved!')
 *   toast.error('Something went wrong')
 *   toast.info('Syncing…')
 *
 * Toasts slide in at the bottom-right and auto-dismiss. No dependencies.
 */
const ToastContext = createContext(null)

let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const push = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idSeq
    setToasts((list) => [...list, { id, message, type }])
    if (duration > 0) {
      timers.current[id] = setTimeout(() => remove(id), duration)
    }
    return id
  }, [remove])

  const toast = {
    show: push,
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d ?? 6000),
    info: (m, d) => push(m, 'info', d),
    loading: (m) => push(m, 'loading', 0), // 0 = stays until dismissed
    dismiss: remove,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const STYLES = {
  success: { icon: '✓', ring: 'border-green-500/30', bar: 'bg-green-400', tint: 'text-green-300' },
  error: { icon: '✕', ring: 'border-red-500/30', bar: 'bg-red-400', tint: 'text-red-300' },
  info: { icon: 'ℹ', ring: 'border-neon-ice/30', bar: 'bg-neon-ice', tint: 'text-neon-ice' },
  loading: { icon: '', ring: 'border-neon-violet/30', bar: 'bg-neon-violet', tint: 'text-neon-violet' },
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const s = STYLES[t.type] || STYLES.info
        return (
          <div key={t.id}
            className={`pointer-events-auto glass rounded-xl border ${s.ring} pl-4 pr-3 py-3 min-w-[260px] max-w-sm flex items-center gap-3 shadow-xl animate-toast-in`}>
            <span className={`shrink-0 ${s.tint} text-sm font-bold`}>
              {t.type === 'loading' ? <Spinner /> : s.icon}
            </span>
            <span className="text-sm text-white/90 flex-1">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="shrink-0 text-white/30 hover:text-white/70 transition text-xs">✕</button>
          </div>
        )
      })}
    </div>
  )
}

/** Small inline spinner (also exported for use elsewhere). */
export function Spinner({ className = '' }) {
  return (
    <span className={`inline-block w-4 h-4 border-2 border-white/20 border-t-neon-violet rounded-full animate-spin ${className}`} />
  )
}
