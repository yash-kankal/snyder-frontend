'use client'
import { useState, useEffect } from 'react'
import { onToast } from '../lib/toast'

const DURATION = 4000 // ms before auto-dismiss

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const unsub = onToast(toast => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, DURATION)
    })
    return unsub
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toaster">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.type === 'success' && (
            <svg className="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="9" />
              <polyline points="6 10.5 9 13.5 14 7.5" />
            </svg>
          )}
          {t.type === 'error' && (
            <svg className="toast-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="9" />
              <line x1="7" y1="7" x2="13" y2="13" />
              <line x1="13" y1="7" x2="7" y2="13" />
            </svg>
          )}
          <span>{t.message}</span>
          <button
            className="toast-close"
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
