'use client'

import React, { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [showOnlineAlert, setShowOnlineAlert] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOffline(!navigator.onLine)

    const handleOnline = () => {
      setIsOffline(false)
      setShowOnlineAlert(true)
      const timer = setTimeout(() => {
        setShowOnlineAlert(false)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowOnlineAlert(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-2 text-center text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-2 shadow-md animate-slide-down">
        <WifiOff className="w-4 h-4 animate-pulse" />
        <span>You are currently offline. Please check your internet connection.</span>
      </div>
    )
  }

  if (showOnlineAlert) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white px-4 py-2 text-center text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-2 shadow-md animate-slide-down">
        <Wifi className="w-4 h-4 animate-bounce" />
        <span>Back online! Reconnected successfully.</span>
      </div>
    )
  }

  return null
}
