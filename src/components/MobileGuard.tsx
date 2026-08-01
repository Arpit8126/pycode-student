'use client'

import { useEffect, useState } from 'react'
import { Monitor, BookOpen } from 'lucide-react'

export default function MobileGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024)
      setChecked(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Don't render anything until check is done (avoids flash)
  if (!checked) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0d0d] px-8 text-center">
        {/* Glowing orb background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#c96a3a]/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Developer credit — pinned to top */}
        <div className="absolute top-0 left-0 right-0 px-6 py-5 flex items-center justify-between border-b border-white/10 bg-white/[0.03]">
          <div className="text-left">
            <p className="text-white text-sm font-bold tracking-tight leading-tight">Developed by Arpit Pandey</p>
            <p className="text-white/50 text-xs font-light mt-0.5">Student · GLA University</p>
          </div>
          <a
            href="https://www.linkedin.com/in/dev-arpit/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0A66C2]/25 border border-[#0A66C2]/50 text-[#4fa3e8] text-xs font-bold tracking-wide hover:bg-[#0A66C2]/40 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        </div>

        {/* Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center shadow-2xl">
            <Monitor className="w-12 h-12 text-[#c96a3a]" strokeWidth={1.5} />
          </div>
          {/* Small phone slash badge */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-red-500 border-2 border-[#0d0d0d] flex items-center justify-center">
            <span className="text-white text-xs font-black">✕</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-white text-2xl font-extrabold tracking-tight mb-3">
          Desktop Only
        </h1>
        <p className="text-white/50 text-sm font-light leading-relaxed max-w-xs mb-8">
          PyCode is a full-featured coding IDE and learning platform. For the best experience and proper code editing, please open this website on a <span className="text-white/80 font-semibold">desktop or laptop</span>.
        </p>

        {/* Info card */}
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 text-left">
          <div className="w-9 h-9 rounded-xl bg-[#c96a3a]/20 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-4.5 h-4.5 text-[#c96a3a]" />
          </div>
          <div>
            <p className="text-white/80 text-xs font-semibold mb-1">Why desktop?</p>
            <p className="text-white/40 text-[11px] font-light leading-relaxed">
              The code editor, practice problems, and data science tools require a large screen and keyboard for effective learning and coding.
            </p>
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-10 text-white/20 text-[10px] uppercase tracking-widest font-mono">
          pycode · open on desktop
        </p>
      </div>
    )
  }

  return <>{children}</>
}
