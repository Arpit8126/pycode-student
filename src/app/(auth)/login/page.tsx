'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Force dark theme on this page always
  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      // Restore user's saved theme when leaving this page
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('resetSuccess') === 'true') {
      setSuccessMsg('Your password has been successfully reset. Please log in with your new password.')
    }
    if (searchParams.get('error') === 'session_expired') {
      setError('Your password reset session has expired. Please request a new link.')
    }
  }, [searchParams])

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    
    // Clear any leftover signup state to enforce a pure login flow check
    try {
      localStorage.removeItem('pycode_signup_username')
    } catch {}
    
    const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
    const redirect_uri = `${window.location.origin}/auth/callback/google`
    const response_type = "id_token"
    const scope = "openid email profile"
    
    const rawNonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    const hashedNonce = await sha256(rawNonce)

    try {
      localStorage.setItem("google_oauth_nonce", rawNonce)
    } catch {}

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=${response_type}&scope=${encodeURIComponent(scope)}&nonce=${hashedNonce}`
    window.location.href = authUrl
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    let targetEmail = email.trim()

    // Support logging in by username: lookup the profile's email
    if (!targetEmail.includes('@')) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', targetEmail.toLowerCase())
        .maybeSingle()

      if (profileErr || !profile) {
        setError('No account found with this username. Please use your email.')
        setLoading(false)
        return
      }

      // Supabase signInWithPassword needs an email. Since we don't store email directly on public.profiles,
      // we lookup the email using a secure backend api or we let the database handle it.
      // But in this system, since they share the same DB, we can write an RPC or simple Next.js API to fetch the email securely.
      // Let's call our verify endpoint or handle lookup
      try {
        const res = await fetch(`/api/auth/username-email?username=${encodeURIComponent(targetEmail.toLowerCase())}`)
        const data = await res.json()
        if (res.ok && data.email) {
          targetEmail = data.email
        } else {
          setError(data.error || 'Failed to resolve email from username. Please login with email.')
          setLoading(false)
          return
        }
      } catch (err) {
        setError('Error resolving login details. Please login with email.')
        setLoading(false)
        return
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink px-4 relative">

      <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            PyCode
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-light">Log in to practice and submit tests</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm animate-scale-in font-light">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-success/10 border border-success/25 text-success text-sm animate-scale-in font-light">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Email or Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or username"
              className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
              required
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-on-primary font-semibold transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-hairline"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-canvas px-2 text-gray-400 font-semibold font-mono tracking-widest">Or Continue With</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink font-semibold transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Register here
          </Link>
        </p>

        <div className="text-center mt-6">
          <Link href="/practice" className="text-xs text-gray-400 hover:text-ink transition-colors uppercase tracking-widest font-mono font-bold">
            Explore as Guest &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
