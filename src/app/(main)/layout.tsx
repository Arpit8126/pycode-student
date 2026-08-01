import React from 'react'
import Sidebar from '@/components/Sidebar'
import DesktopOnlyGuard from '@/components/DesktopOnlyGuard'

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DesktopOnlyGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0d0e12]">
        {/* Navigation Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 h-screen overflow-y-auto bg-[#0d0e12]">
          {children}
        </main>
      </div>
    </DesktopOnlyGuard>
  )
}
