import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: verifiedUser }, error: verifyError } = await admin.auth.getUser(token)
      if (!verifyError && verifiedUser) {
        user = verifiedUser
      }
    }

    if (!user) {
      const supabase = await createClient()
      const { data: { user: cookieUser } } = await supabase.auth.getUser()
      user = cookieUser
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''
    const updates: any = {}

    if (contentType.includes('multipart/form-data')) {
      // ── New path: avatar file upload via FormData ────────────────────────────
      const formData = await request.formData()
      const username = formData.get('username') as string | null
      const avatarFile = formData.get('avatar') as File | null

      if (username) {
        const targetUsername = username.trim().toLowerCase()
        const { data: usernameExists } = await (admin.from('profiles') as any)
          .select('id')
          .eq('username', targetUsername)
          .maybeSingle()
        if (usernameExists && usernameExists.id !== user.id) {
          return NextResponse.json({ error: 'This username is already taken' }, { status: 400 })
        }
        updates.username = targetUsername
      }

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg'
        const filePath = `${user.id}/avatar.${ext}`

        // Ensure the bucket exists (creates it if not — safe to call even if it already exists)
        const { error: bucketError } = await admin.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5 MB max
        })
        // Ignore "already exists" errors (23505 duplicate / bucket already created)
        if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('duplicate')) {
          console.warn('Bucket create warning (non-fatal):', bucketError.message)
        }

        // Upload to Supabase Storage 'avatars' bucket (upsert replaces the old one)
        const { error: uploadError } = await admin.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        // Get the permanent public URL
        const { data: urlData } = admin.storage.from('avatars').getPublicUrl(filePath)
        const cleanUrl = urlData.publicUrl  // No cache-buster → CDN caches this properly
        // Store the clean URL in the DB (CDN-friendly, reduces egress via caching)
        updates.avatar_url = cleanUrl
        // We'll return a cache-busted URL to the browser so the new image shows immediately
        // without polluting the stored URL
      }
    } else {
      // ── Legacy JSON path (username-only updates or old base64 avatar_url) ────
      const body = await request.json()
      const { username, avatar_url } = body

      if (username) {
        const targetUsername = username.trim().toLowerCase()
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
    }

    updates.is_onboarded = true

    const { error: updateError } = await (admin.from('profiles') as any)
      .update(updates)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      // For avatars: return a cache-busted URL so the browser shows the new image immediately
      avatar_url: updates.avatar_url
        ? `${updates.avatar_url}?t=${Date.now()}`
        : null
    })
  } catch (err: any) {
    console.error('Update profile API error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
