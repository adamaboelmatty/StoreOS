import React from 'react'

interface ShellProps {
  title: string
  children: React.ReactNode
  headerLeft?: React.ReactNode
  headerCenter?: React.ReactNode
  headerRight?: React.ReactNode
}

export default function Shell({ title, children, headerLeft, headerCenter, headerRight }: ShellProps) {
  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-[1080px] mx-auto flex items-center justify-between px-6 h-[52px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em]">{title}</span>
            {headerLeft}
          </div>
          {headerCenter && <div className="flex-1 flex justify-center">{headerCenter}</div>}
          {headerRight && <div className="flex items-center">{headerRight}</div>}
        </div>
      </header>
      <main className="max-w-[1080px] mx-auto px-6 py-5">{children}</main>
    </div>
  )
}
