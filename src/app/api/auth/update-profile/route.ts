import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { username, avatar_url } = await request.json()
    
    // Authenticate user using either Authorization header or cookies
    const authHeader = request.headers.get('Authorization')
    let user = null
    const admin = createAdminClient()

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: verifiedUser }, error: verifyError } = await admin.auth.getUser(token)
      if (!verifyError && verifiedUser) {
        user = verifiedUser
      }
    }

    if (!user) {
      // Fallback to cookie session
      const supabase = await createClient()
      const { data: { user: cookieUser } } = await supabase.auth.getUser()
      user = cookieUser
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates: any = {}
    if (username) {
      const targetUsername = username.trim().toLowerCase()
      
      // Check if username is already taken by someone else
      const { data: usernameExists } = await (admin.from('profiles') as any)
        .select('id')
        .eq('username', targetUsername)
        .maybeSingle()

      if (usernameExists && usernameExists.id !== user.id) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 400 })
      }
      updates.username = targetUsername
    }

    if (avatar_url) {
      updates.avatar_url = avatar_url
    }
    
    updates.is_onboarded = true

    // Update profile using Admin Client to bypass client-side RLS constraints
    const { error: updateError } = await (admin.from('profiles') as any)
      .update(updates)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Update profile API error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
