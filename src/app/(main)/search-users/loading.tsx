import React from 'react'

export default function SearchUsersLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#0d0e12] text-white font-sans animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Block Skeleton */}
        <div className="space-y-2 border-b border-[#232630] pb-5">
          <div className="h-6 w-48 bg-[#232630] rounded"></div>
          <div className="h-3.5 w-80 bg-[#1b1c24] rounded"></div>
        </div>

        {/* Search Box Mockup Skeleton */}
        <div className="relative w-full h-12 bg-[#15171e] border border-[#232630] rounded-2xl"></div>

        {/* Profiles Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-[#15171e] border border-[#232630] flex justify-between items-center">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#232630] shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-[#232630] rounded"></div>
                  <div className="h-3 w-16 bg-[#1b1c24] rounded"></div>
                </div>
              </div>
              <div className="w-5 h-5 bg-[#232630] rounded shrink-0"></div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
