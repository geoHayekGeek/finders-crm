'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ToastContainer, ToastProps } from '@/components/Toast'

interface ToastContextType {
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastProps = {
      id,
      type,
      message,
      duration,
      onClose: removeToast
    }
    
    setToasts(prev => [...prev, newToast])
  }, [removeToast])

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration)
  }, [showToast])

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration)
  }, [showToast])

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration)
  }, [showToast])

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

