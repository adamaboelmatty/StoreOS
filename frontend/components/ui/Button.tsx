import React from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const variantClasses: Record<string, string> = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800 font-medium shadow-sm',
  secondary: 'bg-white border border-black/[0.08] text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-card',
  ghost: 'bg-transparent text-gray-500 hover:bg-black/[0.04] hover:text-gray-800',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-[12px] rounded-lg',
  md: 'px-4 py-2 text-[13px] rounded-lg',
}

export default function Button({
  children, variant = 'secondary', size = 'md', onClick, disabled = false, className,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 ease-out',
        'disabled:opacity-35 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  )
}
