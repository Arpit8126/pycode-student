'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Terminal, Calendar, User, Search, LogOut, Code, Award, Sun, Moon, ChevronUp } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    { name: 'Code Editor', path: '/editor', icon: Terminal },
    { name: 'Scheduled Tests', path: '/tests', icon: Calendar },
    { name: 'My Profile', path: '/profile', icon: User, authRequired: true },
  ]

  return (
    <aside className="w-64 h-screen bg-canvas border-r border-hairline flex flex-col justify-between select-none">
      {/* Brand Header */}
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

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          if (item.authRequired && isGuest) return null

          const Icon = item.icon
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-primary'
                  : 'text-body hover:bg-surface-soft hover:text-ink border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Profile & Footer */}
      <div className="p-4 border-t border-hairline relative" ref={menuRef}>
        {isGuest ? (
          <div className="p-4 rounded-2xl bg-surface-soft text-center space-y-3">
            <p className="text-xs text-body leading-normal font-light">
              You are exploring as a <strong className="font-semibold text-ink">Guest</strong>. Create an account to save test scores and progress!
            </p>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 py-2 rounded-full bg-canvas hover:bg-surface-card text-ink text-xs font-semibold border border-hairline transition-colors text-center"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="flex-1 py-2 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-semibold transition-opacity text-center"
              >
                Sign Up
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Popover User Menu */}
            {showUserMenu && (
              <div className="absolute bottom-[80px] left-4 right-4 bg-canvas/80 border border-hairline rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-scale-in z-[50] space-y-1">
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-body hover:bg-surface-soft hover:text-ink rounded-xl font-medium transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-accent-magenta hover:bg-accent-magenta/10 rounded-xl font-semibold transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}

            {/* Clickable User Card */}
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
          </div>
        )}
      </div>
    </aside>
  )
}
