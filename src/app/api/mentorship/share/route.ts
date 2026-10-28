import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Cache-Control': 'no-store, max-age=0',
}

const DEFAULT_BASE_URL = 'https://pycode-student.vercel.app'
const DEFAULT_MENTORSHIP_API_KEY =
  process.env.PYCODE_MENTORSHIP_API_KEY || 'pycode_mentor_live_8f3d1b9a2c7e456'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify API Key
    const apiKeyHeader =
      request.headers.get('x-api-key') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const url = new URL(request.url)
    const apiKeyParam = url.searchParams.get('api_key')
    const providedKey = (apiKeyHeader || apiKeyParam || '').trim()

    const validKey = (process.env.PYCODE_MENTORSHIP_API_KEY || DEFAULT_MENTORSHIP_API_KEY).trim()

    if (!providedKey || providedKey !== validKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key.' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const origin = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : (request.nextUrl.origin && !request.nextUrl.origin.includes('localhost')
          ? request.nextUrl.origin
          : DEFAULT_BASE_URL)

    const body = await request.json()
    const { email, file_name, folder_name, sender_name, direct_files, title: customTitle } = body

    const admin = createAdminClient()
    let resolvedSender = sender_name || 'PyCode Student'
    let resolvedTitle = customTitle || ''
    let itemType: 'file' | 'folder' = 'file'
    let filesToShare: { name: string; code: string; format: string }[] = []

    // Mode A: Share from student's saved workspace by email
    if (email && email.trim()) {
      const targetEmail = email.trim().toLowerCase()
      // Look up user
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      const foundUser = (usersData?.users || []).find(
        (u: any) => u.email?.trim().toLowerCase() === targetEmail
      )

      if (!foundUser) {
        return NextResponse.json(
          { success: false, error: `No PyCode account found for email '${targetEmail}'.` },
          { status: 404, headers: CORS_HEADERS }
        )
      }

      // Fetch student's profile for display name
      const { data: prof } = await (admin.from('profiles') as any)
        .select('full_name, username')
        .eq('id', foundUser.id)
        .maybeSingle()

      resolvedSender = prof?.full_name || prof?.username || foundUser.user_metadata?.name || 'PyCode Student'

      // Fetch student's scripts from saved_scripts
      const { data: scripts, error: scriptsErr } = await (admin.from('saved_scripts') as any)
        .select('*')
        .eq('user_id', foundUser.id)

      if (scriptsErr || !scripts || scripts.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Student has no saved scripts to share.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }

      if (folder_name && folder_name.trim()) {
        itemType = 'folder'
        resolvedTitle = folder_name.trim()
        const targetPrefix = `${folder_name.trim()}/`
        const matched = scripts.filter(
          (s: any) => s.name.startsWith(targetPrefix) && !s.name.endsWith('.ipynb')
        )

        if (matched.length === 0) {
          return NextResponse.json(
            { success: false, error: `Folder '${folder_name}' has no Python files.` },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        filesToShare = matched.map((s: any) => ({
          name: s.name,
          code: s.code || '',
          format: 'terminal',
        }))
      } else if (file_name && file_name.trim()) {
        itemType = 'file'
        resolvedTitle = file_name.trim().split('/').pop() || file_name.trim()
        const matched = scripts.find((s: any) => s.name === file_name.trim())

        if (!matched) {
          return NextResponse.json(
            { success: false, error: `File '${file_name}' not found in student's workspace.` },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        filesToShare = [
          {
            name: matched.name,
            code: matched.code || '',
            format: 'terminal',
          },
        ]
      } else {
        return NextResponse.json(
          { success: false, error: 'Provide either file_name or folder_name to share.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
    } else if (Array.isArray(direct_files) && direct_files.length > 0) {
      // Mode B: Direct files payload passed
      itemType = direct_files.length > 1 ? 'folder' : 'file'
      resolvedTitle = customTitle || direct_files[0].name
      filesToShare = direct_files.map((f: any) => ({
        name: f.name,
        code: f.code || '',
        format: f.format || 'terminal',
      }))
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters (email + file_name/folder_name, or direct_files).' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Insert into shared_items table
    let shareId: string | null = null
    let shareUrl = ''

    try {
      const { data: inserted, error: insertErr } = await (admin.from('shared_items') as any)
        .insert({
          sender_name: resolvedSender,
          item_type: itemType,
          title: resolvedTitle,
          files: filesToShare,
          file_count: filesToShare.length,
        })
        .select('id')
        .single()

      if (!insertErr && inserted?.id) {
        shareId = inserted.id
        shareUrl = `${origin}/editor?share=${inserted.id}`
      }
    } catch (err) {
      console.warn('Supabase shared_items insert failed:', err)
    }

    // Build offline base64 fallback link
    let fallbackUrl = ''
    try {
      const payloadObj = {
        senderName: resolvedSender,
        itemType,
        title: resolvedTitle,
        files: filesToShare,
      }
      const rawJson = JSON.stringify(payloadObj)
      const base64Str = Buffer.from(rawJson).toString('base64')
      fallbackUrl = `${origin}/editor?share_data=${encodeURIComponent(base64Str)}`
    } catch (e) {
      console.error('Base64 encoding fallback error:', e)
    }

    const finalShareUrl = shareUrl || fallbackUrl
    const ownerParam = email ? `&owner=${encodeURIComponent(email)}` : ''
    const openEditorUrl =
      itemType === 'folder'
        ? `${origin}/editor?folder=${encodeURIComponent(resolvedTitle)}${ownerParam}`
        : `${origin}/editor?file=${encodeURIComponent(filesToShare[0]?.name || '')}${ownerParam}`

    return NextResponse.json(
      {
        success: true,
        share_id: shareId,
        share_url: finalShareUrl,
        copy_url: finalShareUrl,
        open_editor_url: openEditorUrl,
        fallback_url: fallbackUrl,
        sender_name: resolvedSender,
        item_type: itemType,
        title: resolvedTitle,
        file_count: filesToShare.length,
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('Share API Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
