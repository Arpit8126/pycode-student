import React from 'react'

export default function EditorLoading() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col animate-pulse">
      
      {/* Editor Header Skeleton */}
      <header className="h-14 border-b border-hairline bg-canvas px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-4.5 w-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-6 w-16 bg-gray-150 dark:bg-zinc-800 rounded-full"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-8.5 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="h-8.5 w-24 bg-gray-250 dark:bg-zinc-700 rounded-full"></div>
        </div>
      </header>

      {/* Editor Panels Split Layout Skeleton */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Challenge description (5 cols) */}
        <div className="w-[40%] border-r border-hairline p-5 space-y-4 overflow-y-auto shrink-0 bg-canvas">
          <div className="h-6 w-1/2 bg-gray-250 dark:bg-zinc-800 rounded"></div>
          <div className="flex gap-2">
            <div className="h-5.5 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
            <div className="h-5.5 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-gray-150 dark:bg-zinc-850 rounded"></div>
            <div className="h-3 w-full bg-gray-150 dark:bg-zinc-850 rounded"></div>
            <div className="h-3 w-5/6 bg-gray-150 dark:bg-zinc-850 rounded"></div>
          </div>
          <div className="p-4 rounded-xl bg-surface-soft border border-hairline space-y-2">
            <div className="h-3 w-20 bg-gray-205 dark:bg-zinc-800 rounded"></div>
            <div className="h-3 w-full bg-gray-150 dark:bg-zinc-850 rounded"></div>
          </div>
        </div>

        {/* Right Side: Code editor pane (60%) */}
        <div className="flex-1 flex flex-col bg-surface-soft/20">
          {/* Tabs bar */}
          <div className="h-10 bg-canvas border-b border-hairline px-4 flex items-center gap-2">
            <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          </div>
          {/* Text editor body */}
          <div className="flex-1 p-6 space-y-3 font-mono text-xs">
            <div className="h-4 w-1/3 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded ml-4"></div>
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded ml-8"></div>
            <div className="h-4 w-1/4 bg-gray-200 dark:bg-zinc-800 rounded ml-4"></div>
          </div>
          {/* Terminal console mockup */}
          <div className="h-40 bg-zinc-950 border-t border-hairline p-4 space-y-2 font-mono">
            <div className="h-3 w-28 bg-zinc-800 rounded"></div>
            <div className="h-3 w-48 bg-zinc-800 rounded"></div>
          </div>
        </div>

      </div>

    </div>
  )
}
