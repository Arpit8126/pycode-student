import React from 'react'
import Sidebar from '@/components/Sidebar'
import DesktopOnlyGuard from '@/components/DesktopOnlyGuard'
import OfflineBanner from '@/components/OfflineBanner'

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DesktopOnlyGuard>
      <OfflineBanner />
      <div className="flex h-screen w-screen overflow-hidden bg-[#0d0e12] print:h-auto print:w-auto print:overflow-visible print:block print:bg-white">
        {/* Navigation Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 h-screen overflow-y-auto bg-[#0d0e12] print:h-auto print:overflow-visible">
          {children}
        </main>
      </div>
    </DesktopOnlyGuard>
  )
}
