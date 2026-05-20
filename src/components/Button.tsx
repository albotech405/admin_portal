import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

const variantStyles = {
  primary:
    'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_14px_30px_-18px_rgba(37,99,235,0.9)] hover:from-blue-700 hover:to-sky-600',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
}

const sizeStyles = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'rounded-2xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2'
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  return (
    <button
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center">
          <span className="animate-spin mr-2">⏳</span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
