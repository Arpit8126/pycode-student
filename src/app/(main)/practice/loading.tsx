import React from 'react'

export default function PracticeLoading() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans p-6 md:p-8 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="space-y-2 pb-2">
          <div className="h-7 w-48 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-4 w-full max-w-xl bg-gray-150 dark:bg-zinc-800/80 rounded"></div>
        </div>

        {/* Progress Metrics Card Skeleton */}
        <div className="p-6 rounded-3xl bg-surface-soft border border-hairline flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
          <div className="flex-1 space-y-3 w-full">
            <div className="h-4 w-36 bg-gray-250 dark:bg-zinc-850 rounded"></div>
            <div className="h-3 w-56 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="flex gap-4 pt-1">
              <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
            </div>
          </div>
          <div className="h-10 w-32 bg-gray-250 dark:bg-zinc-750 rounded-full"></div>
        </div>

        {/* Categories Skeletons (3 blocks) */}
        <div className="space-y-5 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-hairline bg-white dark:bg-zinc-900/40 p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-hairline">
                <div className="space-y-1 flex-1">
                  <div className="h-4.5 w-40 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-3 w-64 bg-gray-150 dark:bg-zinc-850 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
              </div>
              <div className="space-y-2">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="h-12 w-full bg-canvas border border-hairline rounded-2xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
