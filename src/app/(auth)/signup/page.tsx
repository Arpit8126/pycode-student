'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient() as any
  
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameMessage, setUsernameMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  // Real-time optimized debounced username checker
  useEffect(() => {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }

    if (trimmed.length < 3) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be at least 3 characters long.')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username can only contain letters, numbers, and underscores.')
      return
    }

    setUsernameStatus('checking')
    setUsernameMessage('Checking availability...')

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmed)
          .maybeSingle()

        if (error) {
          console.error("Availability check error:", error)
          return
        }

        if (data) {
          setUsernameStatus('taken')
          setUsernameMessage('✗ This username is already taken.')
        } else {
          setUsernameStatus('available')
          setUsernameMessage('✓ Username is available!')
        }
      } catch (err) {
        console.error("Availability check exception:", err)
      }
    }, 350) // 350ms debounce ensures optimal database read-query load

    return () => clearTimeout(timer)
  }, [username])

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
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleGoogleSignup = async () => {
    setError('')
    const trimmedUsername = username.trim().toLowerCase()
    
    // 1. Username constraint validation
    if (!trimmedUsername) {
      setError('Please choose a username first to sign up with Google.')
      return
    }

    if (usernameStatus === 'taken') {
      setError('This username is already taken. Please choose another one.')
      return
    }

    if (usernameStatus === 'checking') {
      setError('Checking username availability... Please wait.')
      return
    }

    if (usernameStatus === 'invalid') {
      setError(usernameMessage)
      return
    }

    setLoading(true)

    // 3. Save pending username to localStorage for callback recovery
    try {
      localStorage.setItem('pycode_signup_username', trimmedUsername)
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const trimmedUsername = username.trim().toLowerCase()
    const trimmedEmail = email.trim().toLowerCase()

    if (usernameStatus === 'taken') {
      setError('This username is already taken. Please choose another one.')
      setLoading(false)
      return
    }

    if (usernameStatus === 'checking') {
      setError('Checking username availability... Please wait.')
      setLoading(false)
      return
    }

    if (usernameStatus === 'invalid') {
      setError(usernameMessage)
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    // 2. Perform Supabase Sign Up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (signUpData.user) {
      // Trigger OTP verification view
      setShowOtp(true)
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError('')
    setOtpLoading(true)

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedUsername = username.trim().toLowerCase()
    const trimmedOtp = otp.trim()

    if (trimmedOtp.length !== 6) {
      setOtpError('Please enter a valid 6-digit verification code.')
      setOtpLoading(false)
      return
    }

    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'signup'
      })

      if (verifyError) {
        throw verifyError
      }

      // Update public.profiles with the chosen username using the secure API
      try {
        const res = await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: trimmedUsername })
        })
        const result = await res.json()
        if (!result.success) {
          console.error("Profile creation failed via API:", result.error)
        }
      } catch (err) {
        console.error("Error setting username:", err)
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed. Please check the code and try again.')
      setOtpLoading(false)
    }
  }

  const handleBackToSignup = () => {
    setShowOtp(false)
    setOtp('')
    setOtpError('')
  }

  if (showOtp) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink px-4 relative">
        <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-scale-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink font-sans">
              Verify Your Email
            </h1>
            <p className="text-gray-500 text-sm mt-2 font-light leading-relaxed">
              We have sent a 6-digit verification code to <span className="text-ink font-semibold">{email}</span>. Please enter it below to activate your account.
            </p>
          </div>

          {otpError && (
            <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm animate-scale-in font-light">
              {otpError}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Verification Code</label>
              <input
                type="text"
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-mono tracking-widest text-center text-lg"
                required
                disabled={otpLoading}
              />
            </div>

            <button
              type="submit"
              disabled={otpLoading}
              className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-on-primary font-semibold transition-all text-sm cursor-pointer disabled:opacity-50"
            >
              {otpLoading ? 'Verifying...' : 'Verify & Register'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={handleBackToSignup}
              className="text-xs text-gray-500 hover:text-ink font-semibold cursor-pointer"
            >
              &larr; Change email or details
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink px-4 relative">

      <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            PyCode
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-light">Create an account to save your solved list</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm animate-scale-in font-light">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. codemaster_42"
              className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
              required
            />
            {usernameMessage && (
              <p className={`text-[11px] mt-1.5 font-mono font-medium ${
                usernameStatus === 'available' ? 'text-emerald-600 dark:text-emerald-400 animate-scale-in' :
                usernameStatus === 'checking' ? 'text-gray-500 animate-pulse' :
                'text-red-500 animate-scale-in'
              }`}>
                {usernameMessage}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@university.edu"
              className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-on-primary font-semibold transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
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
          onClick={handleGoogleSignup}
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
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Log in here
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

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  )
}
