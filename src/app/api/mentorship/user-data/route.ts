import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'

// CORS headers for cross-origin requests from the mentorship website
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Cache-Control': 'no-store, max-age=0',
}

// Default mentorship API key (can be overridden in .env.local via PYCODE_MENTORSHIP_API_KEY)
export const DEFAULT_MENTORSHIP_API_KEY =
  process.env.PYCODE_MENTORSHIP_API_KEY || 'pycode_mentor_live_8f3d1b9a2c7e456'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function GET(request: NextRequest) {
  return handleUserData(request)
}

export async function POST(request: NextRequest) {
  return handleUserData(request)
}

async function handleUserData(request: NextRequest) {
  try {
    // 1. Authenticate API Key
    const apiKeyHeader =
      request.headers.get('x-api-key') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const url = new URL(request.url)
    const apiKeyParam = url.searchParams.get('api_key')
    const providedKey = (apiKeyHeader || apiKeyParam || '').trim()

    const validKey = (process.env.PYCODE_MENTORSHIP_API_KEY || DEFAULT_MENTORSHIP_API_KEY).trim()

    if (!providedKey || providedKey !== validKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing API key. Provide a valid x-api-key header or api_key query parameter.',
        },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // 2. Extract Email Parameter
    let email = url.searchParams.get('email')
    if (!email && request.method === 'POST') {
      try {
        const body = await request.json()
        email = body.email
      } catch (_) {}
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required 'email' parameter. e.g. /api/mentorship/user-data?email=student@example.com",
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const targetEmail = email.trim().toLowerCase()
    const admin = createAdminClient()
    const origin = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : (request.nextUrl.origin && !request.nextUrl.origin.includes('localhost')
          ? request.nextUrl.origin
          : DEFAULT_MENTORSHIP_API_KEY ? 'https://pycode-student.vercel.app' : 'https://pycode-student.vercel.app')

    // 3. Look up user by email in Supabase Auth
    let foundAuthUser: any = null
    let page = 1
    const maxPages = 10

    while (page <= maxPages) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error || !data?.users || data.users.length === 0) break

      const match = data.users.find(
        (u: any) => u.email?.trim().toLowerCase() === targetEmail
      )
      if (match) {
        foundAuthUser = match
        break
      }

      if (data.users.length < 200) break
      page++
    }

    if (!foundAuthUser) {
      return NextResponse.json(
        {
          success: false,
          not_found: true,
          error: `No PyCode account found with email '${targetEmail}'. User has not registered on PyCode yet.`,
        },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const userId = foundAuthUser.id

    // 4. Fetch Profile Details
    const { data: profile } = await (admin.from('profiles') as any)
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // Resolved profile info
    const resolvedAvatar =
      profile?.avatar_url ||
      foundAuthUser.user_metadata?.avatar_url ||
      foundAuthUser.user_metadata?.picture ||
      null

    const resolvedFullName =
      profile?.full_name ||
      foundAuthUser.user_metadata?.full_name ||
      foundAuthUser.user_metadata?.name ||
      profile?.username ||
      targetEmail.split('@')[0]

    // 5. Fetch Saved Workspace Files & Folders (Python Terminal Code ONLY - Exclude Notebooks)
    const { data: rawScripts } = await (admin.from('saved_scripts') as any)
      .select('*')
      .eq('user_id', userId)
      .order('last_modified', { ascending: false })

    const nonDatasetScripts = (rawScripts || []).filter((s: any) => {
      const name = s.name.toLowerCase()
      // Exclude notebooks (.ipynb)
      if (name.endsWith('.ipynb')) return false
      // Exclude dataset files (.csv, .json, .parquet, .xlsx, .sqlite)
      if (
        name.endsWith('.csv') ||
        name.endsWith('.parquet') ||
        name.endsWith('.json') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.sqlite')
      ) {
        return false
      }
      return true
    })

    const foldersSet = new Set<string>()
    const formattedFiles = nonDatasetScripts.map((s: any) => {
      const fullPath = s.name
      let folder: string | null = null
      let filename = fullPath

      if (fullPath.includes('/')) {
        const lastSlash = fullPath.lastIndexOf('/')
        const folderName = fullPath.substring(0, lastSlash)
        folder = folderName
        filename = fullPath.substring(lastSlash + 1)
        foldersSet.add(folderName)
      }

      // Generate direct base64 share link for this file
      let fileShareUrl = ''
      try {
        const payloadObj = {
          senderName: resolvedFullName,
          itemType: 'file',
          title: filename,
          files: [{ name: fullPath, code: s.code || '', format: 'terminal' }],
        }
        const b64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64')
        fileShareUrl = `${origin}/editor?share_data=${encodeURIComponent(b64)}`
      } catch (_) {}

      return {
        name: fullPath,
        filename,
        folder,
        code: s.code || '',
        last_modified: s.last_modified,
        // Direct link to open & edit this exact file inside PyCode editor
        open_editor_url: `${origin}/editor?file=${encodeURIComponent(fullPath)}`,
        edit_url: `${origin}/editor?file=${encodeURIComponent(fullPath)}`,
        copy_url: `${origin}/editor?file=${encodeURIComponent(fullPath)}`,
        share_url: fileShareUrl || `${origin}/editor?file=${encodeURIComponent(fullPath)}`,
      }
    })

    // Construct hierarchical file tree
    const fileTree = buildFileTree(formattedFiles, Array.from(foldersSet))

    // 6. Fetch Practice Submissions & Heatmap
    const { data: submissions } = await (admin.from('coding_submissions') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const heatmapCounts: Record<string, number> = {}
    const solvedQuestionsMap = new Map<number, any>()

    ;(submissions || []).forEach((sub: any) => {
      const dateStr = new Date(sub.created_at).toISOString().split('T')[0]
      heatmapCounts[dateStr] = (heatmapCounts[dateStr] || 0) + 1

      if (sub.status === 'accepted' && !solvedQuestionsMap.has(sub.question_id)) {
        const localMeta = LOCAL_QUESTIONS.find((q) => q.id === sub.question_id)
        solvedQuestionsMap.set(sub.question_id, {
          question_id: sub.question_id,
          title: localMeta?.title || `Question #${sub.question_id}`,
          category: localMeta?.category || 'python-basics',
          difficulty: localMeta?.difficulty || 'easy',
          points: localMeta?.points || 10,
          code: sub.code,
          passed_cases: sub.passed_cases,
          total_cases: sub.total_cases,
          solved_at: sub.created_at,
          practice_url: `https://pycode-student.vercel.app/practice/${sub.question_id}`,
        })
      }
    })

    const streakStats = calculateStreaks(heatmapCounts)

    // 7. Fetch Test / Codeathon Attempts & Scores
    const { data: quizAttempts } = await (admin.from('quiz_attempts') as any)
      .select('*, quizzes(*)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    const formattedTests = (quizAttempts || []).map((att: any) => {
      const quiz = att.quizzes || {}
      const answersObj = att.answers || {}
      const answeredCount = Object.keys(answersObj).length

      let status = 'in_progress'
      if (att.is_disqualified) {
        status = 'disqualified'
      } else if (att.completed_at) {
        status = 'completed'
      }

      return {
        test_id: att.quiz_id,
        test_title: quiz.title || 'Codeathon Assessment',
        test_description: quiz.description || '',
        score: att.score || 0,
        score_percentage: att.score_percentage || 0,
        status,
        is_disqualified: !!att.is_disqualified,
        warnings_count: att.warnings_count || 0,
        started_at: att.started_at,
        completed_at: att.completed_at,
        questions_answered: answeredCount,
        student_details: att.student_details || null,
        attempt_url: `${origin}/codeathons/${att.quiz_id}/attempt`,
        share_url: `${origin}/codeathons/${att.quiz_id}/attempt`,
        copy_url: `${origin}/codeathons/${att.quiz_id}/attempt`,
        leaderboard_url: `${origin}/api/codeathons/${att.quiz_id}/leaderboard`,
      }
    })

    // 7b. Fetch Live & Upcoming Codeathons to Attend
    const now = new Date()
    const { data: upcomingQuizzes } = await (admin.from('quizzes') as any)
      .select('id, title, description, start_time, end_time, duration_minutes, coding_question_ids, difficulty')
      .gt('end_time', now.toISOString())
      .order('start_time', { ascending: true })

    const attemptedQuizIds = new Set(formattedTests.map((t: any) => t.test_id))

    const availableCodeathons = (upcomingQuizzes || []).map((q: any) => {
      const start = new Date(q.start_time)
      const end = new Date(q.end_time)
      const isLive = now >= start && now <= end
      const isUpcoming = now < start

      const duration =
        q.duration_minutes ||
        (start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)) : null)

      return {
        id: q.id,
        title: q.title || 'Codeathon',
        description: q.description || '',
        difficulty: q.difficulty || 'medium',
        total_questions: Array.isArray(q.coding_question_ids) ? q.coding_question_ids.length : 0,
        timings: {
          start_time: q.start_time,
          end_time: q.end_time,
          duration_minutes: duration,
        },
        status: isLive ? 'live' : 'upcoming',
        status_label: isLive ? 'Live Now' : 'Coming Soon',
        is_live: isLive,
        is_upcoming: isUpcoming,
        has_already_attempted: attemptedQuizIds.has(q.id),
        // Direct redirect URL to attend codeathon in PyCode
        attempt_url: `${origin}/codeathons/${q.id}/attempt`,
        share_url: `${origin}/codeathons/${q.id}/attempt`,
        copy_url: `${origin}/codeathons/${q.id}/attempt`,
        leaderboard_url: `${origin}/api/codeathons/${q.id}/leaderboard`,
      }
    })

    // Compute detailed folder metadata with direct URLs
    const folderDetails = Array.from(foldersSet).sort().map((folderName: string) => {
      const folderFiles = formattedFiles.filter((f: any) => f.folder === folderName)
      let folderShareUrl = ''
      try {
        const payloadObj = {
          senderName: resolvedFullName,
          itemType: 'folder',
          title: folderName,
          files: folderFiles.map((f: any) => ({ name: f.name, code: f.code, format: 'terminal' })),
        }
        const b64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64')
        folderShareUrl = `${origin}/editor?share_data=${encodeURIComponent(b64)}`
      } catch (_) {}

      return {
        name: folderName,
        files_count: folderFiles.length,
        open_editor_url: `${origin}/editor?folder=${encodeURIComponent(folderName)}`,
        copy_url: `${origin}/editor?folder=${encodeURIComponent(folderName)}`,
        share_url: folderShareUrl || `${origin}/editor?folder=${encodeURIComponent(folderName)}`,
      }
    })

    // 8. Return Comprehensive Synced Payload
    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email: targetEmail,
          username: profile?.username || 'user',
          full_name: resolvedFullName,
          bio: profile?.bio || '',
          avatar_url: resolvedAvatar,
          created_at: profile?.created_at || foundAuthUser.created_at,
          stats: {
            questions_solved_count: solvedQuestionsMap.size,
            total_submissions: (submissions || []).length,
            tests_attempted_count: formattedTests.length,
            current_streak_days: streakStats.currentStreak,
            longest_streak_days: streakStats.longestStreak,
          },
        },
        workspace: {
          total_files: formattedFiles.length,
          folders: Array.from(foldersSet).sort(),
          folder_details: folderDetails,
          files: formattedFiles,
          file_tree: fileTree,
        },
        heatmap: {
          daily_counts: heatmapCounts,
          current_streak: streakStats.currentStreak,
          longest_streak: streakStats.longestStreak,
          solved_questions: Array.from(solvedQuestionsMap.values()),
        },
        tests_and_assessments: {
          total_attempts: formattedTests.length,
          past_attempts: formattedTests,
          attempts: formattedTests,
          available_codeathons: availableCodeathons,
        },
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('Mentorship User Data API Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// Helper to construct a nested folder/file tree structure
function buildFileTree(files: any[], folders: string[]) {
  const root: any = { type: 'folder', name: 'root', children: {} }

  folders.forEach((f: string) => {
    const parts = f.split('/')
    let current = root
    parts.forEach((p: string) => {
      if (!current.children[p]) {
        current.children[p] = { type: 'folder', name: p, children: {} }
      }
      current = current.children[p]
    })
  })

  files.forEach((file: any) => {
    if (file.folder) {
      const parts = (file.folder as string).split('/')
      let current = root
      parts.forEach((p: string) => {
        if (!current.children[p]) {
          current.children[p] = { type: 'folder', name: p, children: {} }
        }
        current = current.children[p]
      })
      current.children[file.filename] = {
        type: 'file',
        name: file.filename,
        path: file.name,
        code: file.code,
        last_modified: file.last_modified,
      }
    } else {
      root.children[file.filename] = {
        type: 'file',
        name: file.filename,
        path: file.name,
        code: file.code,
        last_modified: file.last_modified,
      }
    }
  })

  function convertToArray(node: any): any {
    if (node.type === 'file') return node
    return {
      type: 'folder',
      name: node.name,
      children: Object.values(node.children).map(convertToArray),
    }
  }

  return Object.values(root.children).map(convertToArray)
}

// Calculate streaks from daily activity counts
function calculateStreaks(dailyCounts: Record<string, number>) {
  const dates = Object.keys(dailyCounts)
    .filter((d) => dailyCounts[d] > 0)
    .sort()

  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const oneDayMs = 24 * 60 * 60 * 1000
  let longestStreak = 1
  let currentStreak = 0
  let tempStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]).getTime()
    const curr = new Date(dates[i]).getTime()
    const diffDays = Math.round((curr - prev) / oneDayMs)

    if (diffDays === 1) {
      tempStreak++
      if (tempStreak > longestStreak) longestStreak = tempStreak
    } else if (diffDays > 1) {
      tempStreak = 1
    }
  }

  // Check if current streak extends to today or yesterday
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayDate = new Date(Date.now() - oneDayMs).toISOString().split('T')[0]
  const lastActiveDate = dates[dates.length - 1]

  if (lastActiveDate === todayStr || lastActiveDate === yesterdayDate) {
    currentStreak = tempStreak
  } else {
    currentStreak = 0
  }

  return { currentStreak, longestStreak }
}
