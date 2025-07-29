import React from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  children: React.ReactNode
  className?: string
}

interface ModalHeaderProps {
  title?: string
  description?: string
  onClose?: () => void
  closable?: boolean
  children?: React.ReactNode
}

interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

const sizeVariants = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closable = true,
  children,
  className
}: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closable])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative z-50 w-full mx-4 bg-[#1F2A44] rounded-lg shadow-xl',
          'max-h-[90vh] overflow-hidden flex flex-col',
          sizeVariants[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description || closable) && (
          <ModalHeader
            title={title}
            description={description}
            onClose={onClose}
            closable={closable}
          />
        )}
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export function ModalHeader({
  title,
  description,
  onClose,
  closable = true,
  children
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-600">
      <div className="space-y-1">
        {title && (
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        )}
        {description && (
          <p className="text-sm text-gray-300">{description}</p>
        )}
        {children}
      </div>
      
      {closable && onClose && (
        <button
          onClick={onClose}
          className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4 text-gray-400" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  )
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 border-t border-gray-600', className)}>
      {children}
    </div>
  )
}

// Specialized modal components
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} />
      <ModalContent>
        <p className="text-gray-300">{description}</p>
      </ModalContent>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  variant?: 'info' | 'success' | 'warning' | 'error'
  actionText?: string
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  variant = 'info',
  actionText = 'OK'
}: AlertModalProps) {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">✓</div>
      case 'warning':
        return <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">!</div>
      case 'error':
        return <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">✕</div>
      default:
        return <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">i</div>
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <div className="flex items-start gap-4">
          {getIcon()}
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-gray-300">{description}</p>
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button onClick={onClose} fullWidth>
          {actionText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}