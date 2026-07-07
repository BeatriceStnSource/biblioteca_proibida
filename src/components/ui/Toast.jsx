import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let _nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const toast = {
    info:    (msg, dur) => addToast(msg, 'info', dur),
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error', dur),
    warn:    (msg, dur) => addToast(msg, 'warn', dur),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Portal de toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              pointer-events-auto px-4 py-3 rounded shadow-lg
              text-sm font-sans animate-slide-up
              ${t.type === 'success' ? 'bg-verde text-white' : ''}
              ${t.type === 'error'   ? 'bg-vermelho text-white' : ''}
              ${t.type === 'warn'    ? 'bg-laranja text-white' : ''}
              ${t.type === 'info'    ? 'bg-superficie text-card border border-borda' : ''}
            `}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
