import React from 'react'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-ink font-sans animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="border-b border-hairline pb-5 space-y-2">
          <div className="h-6 w-36 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-3.5 w-60 bg-gray-150 dark:bg-zinc-850 rounded"></div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-hairline shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-hairline">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
            <div className="flex-1 space-y-2.5 w-full text-center sm:text-left">
              <div className="h-5 w-40 bg-gray-250 dark:bg-zinc-850 rounded mx-auto sm:mx-0"></div>
              <div className="h-3.5 w-32 bg-gray-200 dark:bg-zinc-800 rounded mx-auto sm:mx-0"></div>
            </div>
            <div className="h-9 w-28 bg-gray-200 dark:bg-zinc-800 rounded-full shrink-0"></div>
          </div>

          {/* Account Details Form Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-10 w-full bg-canvas border border-hairline rounded-xl"></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
