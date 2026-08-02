'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Terminal, Calendar, User, LogOut, Code, Award, Sun, Moon, ChevronUp, BarChart2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LogIn, RefreshCw } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // Hide sidebar completely when taking an exam
  const isAttemptPage = pathname ? /^\/codeathons\/[^\/]+\/attempt$/.test(pathname) : false
  if (isAttemptPage) {
    return null
  }
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoadingPath(null)
  }, [pathname])

  useEffect(() => {
    const saved = localStorage.getItem('pycode_sidebar_collapsed')
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed
    setIsCollapsed(nextVal)
    localStorage.setItem('pycode_sidebar_collapsed', String(nextVal))
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsGuest(false)
        let { data } = await (supabase.from('profiles') as any)
          .select('username, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        // Self-healing check: Sync chosen username from signup page if defaulted or empty
        try {
          const pendingUsername = localStorage.getItem('pycode_signup_username')
          if (pendingUsername && (!data?.username || data.username.startsWith('user_'))) {
            console.log("Sidebar self-healing: updating username with:", pendingUsername)
            const { error: updateErr } = await (supabase.from('profiles') as any)
              .update({ 
                username: pendingUsername.toLowerCase().trim(),
                is_onboarded: true
              })
              .eq('id', user.id)

            if (!updateErr) {
              localStorage.removeItem('pycode_signup_username')
              const { data: refreshed } = await (supabase.from('profiles') as any)
                .select('username, avatar_url')
                .eq('id', user.id)
                .maybeSingle()
              data = refreshed
            }
          }
        } catch (e) {
          console.error("Self-healing username sync error:", e)
        }

        setProfile(data)
      } else {
        setIsGuest(true)
        setProfile(null)
      }
    }
    fetchUser()

    // Listen for authentication changes to update username dynamically (on Sign-In/OAuth callback completion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed, reloading sidebar profile:", event)
      fetchUser()
    })

    // Read initial theme setting from documentElement class
    const isLight = !document.documentElement.classList.contains('dark')
    setTheme(isLight ? 'light' : 'dark')

    // Click outside popover to close it
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  const menuItems = [
    { name: 'Practice Sandbox', path: '/practice', icon: Code },
    { name: 'Code Editor', path: '/editor', icon: FileCode2Icon },
    { name: 'Codeathons', path: '/codeathons', icon: Calendar },
    { name: 'Results', path: '/results', icon: BarChart2, authRequired: true },
    { name: 'My Profile', path: '/profile', icon: User, authRequired: true },
  ]

  return (
    <aside className={`h-screen bg-canvas border-r border-hairline flex flex-col justify-between select-none transition-[width] duration-300 ease-in-out shrink-0 print:hidden ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Brand Header */}
      {!isCollapsed ? (
        <div className="p-6 flex items-center justify-between">
          <Link href="/practice" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] group-hover:scale-105 transition-transform duration-200">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink font-sans">PyCode</h1>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-medium">Workspace</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleToggleCollapse}
              className="p-2 rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-all"
              title="Collapse Sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed header: all buttons are uniform 40×40px centered circles, perfectly aligned with nav icons */
        <div className="pt-4 pb-2 flex flex-col items-center gap-1">
          {/* Logo — same 40×40 circle */}
          <Link
            href="/practice"
            title="PyCode Home"
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:scale-105 transition-transform shrink-0"
          >
            <Terminal className="w-5 h-5" />
          </Link>

          {/* Expand button — same 40×40 circle as nav icons */}
          <button
            onClick={handleToggleCollapse}
            title="Expand Sidebar"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-all shrink-0"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Theme toggle — same 40×40 circle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors shrink-0"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Nav Menu */}
      {!isCollapsed ? (
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            if (item.authRequired && isGuest) return null

            const isLoading = loadingPath === item.path
            const Icon = isLoading ? RefreshCw : item.icon
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setLoadingPath(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-primary'
                    : 'text-body hover:bg-surface-soft hover:text-ink border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
                <span className={isLoading ? 'animate-pulse opacity-70' : ''}>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      ) : (
        /* Collapsed nav: icon buttons with floating tooltip on hover */
        <nav className="flex-1 px-2 pt-2 space-y-1 flex flex-col items-center">
          {menuItems.map((item) => {
            if (item.authRequired && isGuest) return null

            const isLoading = loadingPath === item.path
            const Icon = isLoading ? RefreshCw : item.icon
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')

            return (
              <div key={item.path} className="relative group w-full flex justify-center">
                <Link
                  href={item.path}
                  onClick={() => setLoadingPath(item.path)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 border hover:scale-[1.02] active:scale-[0.97] ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] border-primary'
                      : 'text-body hover:bg-surface-soft hover:text-ink border-transparent hover:border-hairline'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
                </Link>
                {/* Floating tooltip label */}
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[100] shadow-xl border border-white/10">
                  {item.name}
                  {/* Arrow pointing left */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900 dark:border-r-gray-800" />
                </div>
              </div>
            )
          })}
        </nav>
      )}

      {/* Profile & Footer */}
      <div className="p-3 border-t border-hairline relative flex justify-center" ref={menuRef}>
        {isGuest ? (
          !isCollapsed ? (
            <div className="p-4 rounded-2xl bg-surface-soft text-center space-y-3">
              <p className="text-xs text-body leading-normal font-light">
                You are exploring as a <strong className="font-semibold text-ink">Guest</strong>. Create an account to save test scores and progress!
              </p>
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="flex-1 py-2 rounded-full bg-canvas hover:bg-surface-card text-ink text-xs font-semibold border border-hairline transition-colors text-center font-sans"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 py-2 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-semibold transition-opacity text-center font-sans"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <Link
                href="/login"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary hover:opacity-90 text-on-primary transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] shrink-0"
              >
                <LogIn className="w-4 h-4" />
              </Link>
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[100] shadow-xl border border-white/10">
                Log In / Sign Up
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900 dark:border-r-gray-800" />
              </div>
            </div>
          )
        ) : (
          <div className="w-full flex justify-center">
            {/* Popover User Menu */}
            {showUserMenu && (
              <div className={`absolute bottom-[70px] bg-canvas border border-hairline rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-scale-in z-[50] space-y-1 ${isCollapsed ? 'left-2 w-32' : 'left-4 right-4'}`}>
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-body hover:bg-surface-soft hover:text-ink rounded-xl font-medium transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-accent-magenta hover:bg-accent-magenta/10 rounded-xl font-semibold transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}

            {/* Clickable User Card */}
            {!isCollapsed ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-surface-soft transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover border border-hairline bg-surface-soft"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary border border-hairline flex items-center justify-center font-bold text-on-primary text-sm shadow-inner">
                      {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'PY'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-ink truncate max-w-[100px]">
                      @{profile?.username || 'user'}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-semantic-success font-mono font-medium uppercase tracking-wider">
                      <Award className="w-3 h-3" />
                      Learner
                    </div>
                  </div>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-ink transition-colors" />
              </button>
            ) : (
              <div className="relative group">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full hover:scale-105 transition-transform cursor-pointer relative shrink-0"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover border border-hairline bg-surface-soft"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary border border-hairline flex items-center justify-center font-bold text-on-primary text-sm shadow-inner">
                      {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'PY'}
                    </div>
                  )}
                </button>
                {!showUserMenu && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[100] shadow-xl border border-white/10">
                    @{profile?.username || 'user'}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900 dark:border-r-gray-800" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

// Distinct icon for Code Editor (file with code brackets) — different from the brand Terminal icon
function FileCode2Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m5 12-3 3 3 3" />
      <path d="m9 18 3-3-3-3" />
    </svg>
  )
}
