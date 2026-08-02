'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [error, setError] = useState('')
  const called = useRef(false)

  useEffect(() => {
    const handleCallback = async () => {
      if (called.current) return
      called.current = true

      try {
        const hash = window.location.hash
        const params = new URLSearchParams(hash.substring(1))
        
        const idToken = params.get('id_token')
        const errorParam = params.get('error')

        if (errorParam) {
          setError(params.get('error_description') || 'Google authentication failed.')
          return
        }

        if (!idToken) {
          setError('Authentication token not found in URL callback hash.')
          return
        }

        // Retrieve the stored nonce
        let savedNonce: string | undefined = undefined;
        try {
          const stored = localStorage.getItem("google_oauth_nonce");
          if (stored) {
            savedNonce = stored;
          }
        } catch {}

        // Decode Google ID Token to extract email
        let oauthEmail: string | undefined = undefined;
        try {
          const base64Url = idToken.split('.')[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const decoded = JSON.parse(jsonPayload);
            oauthEmail = decoded.email;
          }
        } catch (jwtDecodeErr) {
          console.error("JWT decoding failed:", jwtDecodeErr);
        }

        // Retrieve stored username if they were in registration flow
        let pendingUsername: string | null = null;
        try {
          pendingUsername = localStorage.getItem('pycode_signup_username');
        } catch {}

        // If no pending username (Logging in): Check if email exists in database
        if (!pendingUsername && oauthEmail) {
          try {
            const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(oauthEmail)}`);
            const verifyData = await res.json();

            if (verifyData.exists === false) {
              router.push(`/signup?error=${encodeURIComponent('This Google account is not registered yet. Please enter a username and click Continue with Google to sign up.')}`);
              return;
            }
          } catch (checkEmailErr) {
            console.error("Email registration check failed:", checkEmailErr);
          }
        }

        // Exchange Google ID Token with Supabase session (using saved raw nonce)
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          nonce: savedNonce,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        if (data?.user) {
          // If they selected a username during registration, save it
          if (pendingUsername) {
            try {
              // Update profile directly client-side using .update (owner has RLS update permissions)
              let updatedClientSide = false
              
              const { error: updateErr } = await supabase
                .from('profiles')
                .update({ 
                  username: pendingUsername.toLowerCase().trim(),
                  is_onboarded: true
                })
                .eq('id', data.user.id)

              if (!updateErr) {
                console.log("Google Callback client-side username updated successfully!")
                localStorage.removeItem('pycode_signup_username')
                updatedClientSide = true
              } else {
                console.warn("Google Callback client-side username update failed, trying API fallback:", updateErr)
              }

              // Fallback to server-side API endpoint if client-side update failed
              if (!updatedClientSide) {
                console.log("Attempting server-side profile update fallback...")
                const res = await fetch('/api/auth/update-profile', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.session?.access_token}`,
                  },
                  body: JSON.stringify({ username: pendingUsername })
                })
                const result = await res.json()
                if (result.success) {
                  localStorage.removeItem('pycode_signup_username')
                } else {
                  console.error("Google Callback server-side profile update failed:", result.error)
                }
              }
            } catch (err) {
              console.error("Error setting username in callback:", err)
            }
          }

          try {
            localStorage.removeItem('google_oauth_nonce')
          } catch {}

          router.push('/')
        }
      } catch (err: any) {
        console.error("Authentication error during callback processing:", err)
        setError(err.message || 'Authentication processing failed.')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-[#090a0f] flex items-center justify-center font-sans text-white relative overflow-hidden select-none">
      {/* Decorative Glowing Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c96a3a]/15 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full mx-4 p-8 rounded-3xl bg-[#13141a]/60 border border-white/5 text-center shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fade-in relative z-10">
        {error ? (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Authentication Failed</h2>
              <p className="text-white/40 text-xs leading-relaxed max-w-xs mx-auto">{error}</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 rounded-full bg-white hover:bg-white/90 text-black font-semibold tracking-wide transition-all text-xs cursor-pointer shadow-lg hover:shadow-xl"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-6 animate-pulse">
            <div className="w-12 h-12 bg-[#c96a3a]/20 rounded-full mx-auto"></div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold tracking-tight text-white/90">Completing Sign In...</h2>
              <p className="text-white/45 text-xs font-light">Authenticating workspace session with secure databases...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
