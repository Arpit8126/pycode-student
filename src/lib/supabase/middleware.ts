import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isNetworkError } from './networkError'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  let isNetError = false

  try {
    const {
      data: { user: fetchedUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError && isNetworkError(authError)) {
      isNetError = true
    } else {
      user = fetchedUser
    }
  } catch (err) {
    if (isNetworkError(err)) {
      isNetError = true
    }
  }

  if (isNetError) {
    return supabaseResponse
  }

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  const isCallbackPage = request.nextUrl.pathname.startsWith('/auth/callback')
  const isPublicApi = request.nextUrl.pathname.startsWith('/api/auth/verify-email')

  // Pages that require login (guests can browse other pages like practice, tests)
  const isAuthRequiredPage =
    request.nextUrl.pathname.startsWith('/profile')

  // Redirect unauthenticated users to login ONLY for auth-required pages
  if (!user && !isAuthPage && !isCallbackPage && !isPublicApi && isAuthRequiredPage) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = '/login'
    url.searchParams.set('redirectTo', redirectTo)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages to the practice sandbox
  if (user && isAuthPage && request.nextUrl.pathname !== '/reset-password') {
    const url = request.nextUrl.clone()
    url.pathname = '/practice'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
