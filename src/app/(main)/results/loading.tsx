import React from 'react'

export default function ResultsLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-ink font-sans animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-hairline pb-5">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-3.5 w-72 bg-gray-150 dark:bg-zinc-850 rounded"></div>
          </div>
        </div>

        {/* Evaluation Stats Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Main Score stats */}
          <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm flex items-center gap-4 col-span-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
            <div className="space-y-2 flex-1">
              <div className="h-3 w-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-5 w-24 bg-gray-250 dark:bg-zinc-750 rounded"></div>
            </div>
          </div>
          
          {/* Leaderboard Rank stats card */}
          <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm flex flex-col items-center justify-center gap-2">
            <div className="h-2.5 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-8 w-12 bg-gray-200 dark:bg-zinc-800 rounded mt-1"></div>
            <div className="h-3 w-32 bg-gray-150 dark:bg-zinc-855 rounded"></div>
          </div>
        </div>

        {/* Tab Headers Skeleton */}
        <div className="flex gap-2 border-b border-hairline pt-2">
          <div className="h-10 w-28 bg-gray-250 dark:bg-zinc-800 rounded-t-xl border border-hairline border-b-0"></div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-zinc-900/40 rounded-t-xl"></div>
        </div>

        {/* Tab Content Skeleton (Per-question breakdown) */}
        <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm space-y-4">
          <div className="h-3 w-36 bg-gray-250 dark:bg-zinc-800 rounded"></div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-soft border border-hairline text-center space-y-1.5">
                <div className="h-2 w-12 bg-gray-200 dark:bg-zinc-800 rounded mx-auto"></div>
                <div className="h-4.5 w-16 bg-gray-250 dark:bg-zinc-750 rounded mx-auto"></div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 w-full bg-surface-soft border border-hairline rounded-xl"></div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
