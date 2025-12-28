import { useState, useCallback } from 'react'
import { NotificationType } from '../components/NotificationModal'

interface NotificationOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  onConfirm?: () => void
}

interface NotificationState {
  isOpen: boolean
  type: NotificationType
  title: string
  message: string
  confirmText: string
  cancelText: string
  showCancel: boolean
  onConfirm?: () => void
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    showCancel: true,
  })

  const showNotification = useCallback((
    type: NotificationType,
    options: NotificationOptions
  ) => {
    const defaultTitles = {
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo',
      info: 'Thông báo',
    }

    setNotification({
      isOpen: true,
      type,
      title: options.title || defaultTitles[type],
      message: options.message,
      confirmText: options.confirmText || 'Xác nhận',
      cancelText: options.cancelText || 'Hủy',
      showCancel: options.showCancel !== undefined ? options.showCancel : true,
      onConfirm: options.onConfirm,
    })
  }, [])

  const success = useCallback((message: string, options?: Omit<NotificationOptions, 'message'>) => {
    showNotification('success', { ...options, message })
  }, [showNotification])

  const error = useCallback((message: string, options?: Omit<NotificationOptions, 'message'>) => {
    showNotification('error', { ...options, message })
  }, [showNotification])

  const warning = useCallback((message: string, options?: Omit<NotificationOptions, 'message'>) => {
    showNotification('warning', { ...options, message })
  }, [showNotification])

  const info = useCallback((message: string, options?: Omit<NotificationOptions, 'message'>) => {
    showNotification('info', { ...options, message })
  }, [showNotification])

  const close = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    notification,
    success,
    error,
    warning,
    info,
    close,
  }
}
