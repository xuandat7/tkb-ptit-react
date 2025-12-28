import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  type?: NotificationType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'info',
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  showCancel = true,
}) => {
  if (!isOpen) return null

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'from-green-500 to-green-600',
      iconBgColor: 'bg-white/20',
      iconColor: 'text-white',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'from-red-500 to-red-600',
      iconBgColor: 'bg-white/20',
      iconColor: 'text-white',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'from-yellow-500 to-yellow-600',
      iconBgColor: 'bg-white/20',
      iconColor: 'text-white',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: Info,
      bgColor: 'from-blue-500 to-blue-600',
      iconBgColor: 'bg-white/20',
      iconColor: 'text-white',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  }

  const config = typeConfig[type]
  const Icon = config.icon

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    } else {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.bgColor} px-5 py-3 flex items-center gap-2`}>
          <div className={`w-8 h-8 rounded-full ${config.iconBgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${config.iconColor}`} />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-gray-700 text-sm">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 flex gap-2 justify-end">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-white text-gray-700 text-sm font-medium transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 ${config.buttonColor} text-white rounded-md text-sm font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationModal
