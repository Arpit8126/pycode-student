import React from 'react'

export default function CodeathonsLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-ink font-sans animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-hairline pb-5">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-3.5 w-64 bg-gray-150 dark:bg-zinc-850 rounded"></div>
          </div>
        </div>

        {/* Exams Card Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                {/* Header status badge & details */}
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                  <div className="h-3 w-12 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                </div>
                {/* Exam title & description metadata */}
                <div className="space-y-2">
                  <div className="h-4.5 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3.5 w-40 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                    <div className="h-3.5 w-48 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                    <div className="h-3.5 w-32 bg-gray-150 dark:bg-zinc-800 rounded"></div>
                  </div>
                </div>
              </div>
              {/* Footer action button mockup */}
              <div className="border-t border-hairline pt-4 mt-2">
                <div className="h-9 w-full bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
