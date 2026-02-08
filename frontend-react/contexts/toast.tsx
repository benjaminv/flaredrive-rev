import React, { createContext, useCallback, useContext, useState } from 'react'
import { IconCheck, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-react'

type ToastType = 'success' | 'info' | 'warning' | 'error'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
})

export const useToast = () => useContext(ToastContext)

let nextId = 0

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const value: ToastContextValue = {
    toast: addToast,
    success: msg => addToast(msg, 'success'),
    error: msg => addToast(msg, 'error'),
    info: msg => addToast(msg, 'info'),
    warning: msg => addToast(msg, 'warning'),
  }

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <IconCheck size={18} />,
    info: <IconInfoCircle size={18} />,
    warning: <IconAlertTriangle size={18} />,
    error: <IconX size={18} />,
  }

  const alertClass: Record<ToastType, string> = {
    success: 'alert-success',
    info: 'alert-info',
    warning: 'alert-warning',
    error: 'alert-error',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast toast-top toast-center z-100">
        {toasts.map(t => (
          <div key={t.id} className={`alert ${alertClass[t.type]} shadow-lg py-2 px-4 min-w-60 animate-slide-in-down`}>
            {iconMap[t.type]}
            <span className="text-sm">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
