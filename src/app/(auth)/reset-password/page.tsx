'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }
  // Force dark theme on this page always
  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])
  useEffect(() => {
    const checkSession = async () => {
      const isRecovery = getCookie('recovery_flow') === 'true'
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !isRecovery) {
        router.push("/login?error=session_expired")
      }
    }
    checkSession()
  }, [supabase, router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // 1. Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)

      // Clear recovery cookie
      document.cookie = "recovery_flow=; path=/; max-age=0;"

      // 2. Globally sign out user from all active devices/sessions for security
      await supabase.auth.signOut({ scope: "global" })

      setTimeout(() => {
        router.push("/login?resetSuccess=true")
      }, 2500)
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink px-4 relative">

        <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Password Updated!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Your password was updated successfully. Redirecting you to login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink px-4 relative">

      <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink font-sans">
            PyCode
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-light">Enter your secure new password</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm animate-scale-in font-light">
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-4 pr-10 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full pl-4 pr-10 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink focus:outline-none cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-on-primary font-semibold transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Saving password...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
