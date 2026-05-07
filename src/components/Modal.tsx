import React from 'react'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  onConfirm?: () => void | Promise<void>
  confirmText?: string
  confirmVariant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary'
  cancelText?: string
  isConfirmLoading?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  cancelText = 'Cancel',
  isConfirmLoading = false,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              isLoading={isConfirmLoading}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
