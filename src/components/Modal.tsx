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
  confirmDisabled?: boolean
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
  confirmDisabled = false,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md animate-fade-in rounded-2xl border border-brand-100 bg-white shadow-2xl">
        <div className="border-b border-brand-100 px-6 py-4">
          <h2 className="text-lg font-bold text-brand-900">{title}</h2>
        </div>
        <div className="px-6 py-4">{children}</div>
        <div className="flex justify-end gap-3 border-t border-brand-100 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              isLoading={isConfirmLoading}
              disabled={confirmDisabled}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
