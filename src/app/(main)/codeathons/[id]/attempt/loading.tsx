import React from 'react'

export default function ExamAttemptLoading() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink flex flex-col animate-pulse">
      
      {/* Workspace Header Skeleton */}
      <header className="h-16 border-b border-hairline bg-canvas px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-4.5 w-36 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-6 w-20 bg-gray-150 dark:bg-zinc-800 rounded-full"></div>
        </div>
        <div className="h-9 w-24 bg-gray-150 dark:bg-zinc-800 rounded-full"></div>
      </header>

      {/* Verification Gate Layout Skeleton */}
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center select-none overflow-y-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:divide-x md:divide-hairline">
          
          {/* Left Column: Guidelines Skeleton (5 cols) */}
          <div className="md:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-250 dark:bg-zinc-800 rounded"></div>
                <div className="h-3 w-56 bg-gray-150 dark:bg-zinc-850 rounded"></div>
              </div>
              <div className="h-16 bg-gray-100 dark:bg-zinc-850/50 rounded-2xl border border-hairline"></div>
              
              <div className="space-y-4">
                <div className="h-3 w-28 bg-gray-255 dark:bg-zinc-800 rounded"></div>
                <div className="space-y-3.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                        <div className="h-2.5 w-full bg-gray-150 dark:bg-zinc-850 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-3.5 w-3/4 bg-gray-150 dark:bg-zinc-850 rounded"></div>
          </div>

          {/* Right Column: Credentials Inputs Skeleton (7 cols) */}
          <div className="md:col-span-7 space-y-6 md:pl-8 pl-0">
            <div className="space-y-5">
              <div className="border-b border-hairline pb-3 space-y-2">
                <div className="h-5 w-40 bg-gray-250 dark:bg-zinc-800 rounded"></div>
                <div className="h-3 w-72 bg-gray-150 dark:bg-zinc-850 rounded"></div>
              </div>

              {/* Form Input Rows Skeletons */}
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-10 w-full bg-canvas border border-hairline rounded-xl"></div>
                  </div>
                ))}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                      <div className="h-10 w-full bg-canvas border border-hairline rounded-xl"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Accept & Start button mockup */}
            <div className="space-y-3 pt-4">
              <div className="h-12 w-full bg-gray-250 dark:bg-zinc-700 rounded-full"></div>
              <div className="h-3 w-48 bg-gray-150 dark:bg-zinc-850 rounded mx-auto"></div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
