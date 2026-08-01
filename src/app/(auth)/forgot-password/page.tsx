'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [warningMsg, setWarningMsg] = useState('')
  const supabase = createClient()

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setWarningMsg('')

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    // Rate Limiting: Max 2 attempts in 2 hours
    const now = Date.now()
    const twoHoursMs = 2 * 60 * 60 * 1000
    
    let attempts: number[] = []
    try {
      const stored = localStorage.getItem("forgot_password_attempts")
      if (stored) {
        attempts = JSON.parse(stored)
      }
    } catch (err) {
      console.error("Failed to parse attempts log:", err)
    }

    const activeAttempts = attempts.filter((timestamp) => now - timestamp < twoHoursMs)

    if (activeAttempts.length >= 2) {
      const oldestAttempt = Math.min(...activeAttempts)
      const msLeft = twoHoursMs - (now - oldestAttempt)
      const minutesLeft = Math.ceil(msLeft / (60 * 1000))
      
      setWarningMsg(
        `Maximum limit of 2 attempts reached. Please wait ${minutesLeft} minute${
          minutesLeft !== 1 ? "s" : ""
        } before requesting another link.`
      )
      return
    }

    setLoading(true)

    try {
      // 1. Pre-flight check: Verify if email exists
      const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(trimmedEmail)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Email verification failed.")
      }

      if (!data.exists) {
        setWarningMsg("This email address is not registered in our database.")
        setLoading(false)
        return
      }

      // 2. Trigger Supabase Password Reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      // Log successful attempt for rate limiting
      activeAttempts.push(now)
      localStorage.setItem("forgot_password_attempts", JSON.stringify(activeAttempts))

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to trigger recovery email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink px-4 relative">

        <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Email Sent!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            We&apos;ve sent a password recovery link to <span className="text-ink font-semibold">{email}</span>. Click the link to define a new password.
          </p>
          <Link href="/login" className="text-primary font-semibold hover:underline text-sm">
            &larr; Back to login
          </Link>
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
          <p className="text-gray-500 text-sm mt-2 font-light">Reset your password to regain access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm animate-scale-in font-light">
            {error}
          </div>
        )}

        {warningMsg && (
          <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/25 text-warning text-sm animate-scale-in font-light">
            {warningMsg}
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-on-primary font-semibold transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Send Recovery Link'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-gray-500 hover:text-ink font-semibold">
            &larr; Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
