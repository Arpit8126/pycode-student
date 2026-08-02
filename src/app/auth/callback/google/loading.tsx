import React from 'react'

export default function GoogleCallbackLoading() {
  return (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center p-6 select-none animate-pulse">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#15171e]/80 border border-[#232630] text-center shadow-xl space-y-6">
        <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto"></div>
        <div className="space-y-3">
          <div className="h-5 w-36 bg-gray-600 rounded mx-auto"></div>
          <div className="h-3 w-64 bg-gray-700 rounded mx-auto mt-2"></div>
        </div>
      </div>
    </div>
  )
}
