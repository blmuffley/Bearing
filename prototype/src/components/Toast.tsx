import { useState, useCallback, createContext, useContext, ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  exiting?: boolean
}

interface ToastContextType {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 300)
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{ minWidth: 320 }}>
      {toasts.map(t => (
        <ToastMessage key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastMessage({ toast }: { toast: ToastItem }) {
  const bgMap = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    info: 'var(--color-info)',
  }
  const iconMap = { success: '\u2713', error: '\u2717', info: '\u2139' }

  return (
    <div
      className={toast.exiting ? 'animate-toast-out' : 'animate-toast-in'}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${bgMap[toast.type]}`,
        borderLeft: `4px solid ${bgMap[toast.type]}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ color: bgMap[toast.type], fontWeight: 700, fontSize: 16 }}>{iconMap[toast.type]}</span>
      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{toast.message}</span>
    </div>
  )
}
