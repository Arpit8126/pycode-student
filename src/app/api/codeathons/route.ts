import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

const DEFAULT_BASE_URL = 'https://pycode-student.vercel.app'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'all', 'live', 'upcoming', 'ended'
    const emailParam = searchParams.get('email')
    const limitParam = searchParams.get('limit')

    const origin = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : (request.nextUrl.origin && !request.nextUrl.origin.includes('localhost')
          ? request.nextUrl.origin
          : DEFAULT_BASE_URL)

    const admin = createAdminClient()

    // 1. Fetch codeathons from quizzes table
    let query = (admin.from('quizzes') as any)
      .select('id, title, description, start_time, end_time, duration_minutes, coding_question_ids, creator_id, difficulty, is_coding_quiz, profiles:creator_id(username, full_name)')
      .order('start_time', { ascending: false })

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        query = query.limit(parsedLimit)
      }
    }

    const { data: quizzes, error } = await query

    if (error) {
      console.error('Failed to fetch quizzes:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // 2. If user email is provided, check user's attempts on these codeathons
    let userAttemptsMap: Record<string, any> = {}
    if (emailParam && emailParam.trim()) {
      const targetEmail = emailParam.trim().toLowerCase()
      // Find user id
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      const foundUser = (usersData?.users || []).find(
        (u: any) => u.email?.trim().toLowerCase() === targetEmail
      )

      if (foundUser) {
        const { data: attempts } = await (admin.from('quiz_attempts') as any)
          .select('id, quiz_id, score, score_percentage, completed_at, is_disqualified, warnings_count, started_at')
          .eq('user_id', foundUser.id)

        if (attempts) {
          attempts.forEach((att: any) => {
            userAttemptsMap[att.quiz_id] = {
              attempt_id: att.id,
              has_attempted: true,
              score: att.score,
              score_percentage: att.score_percentage,
              completed_at: att.completed_at,
              is_completed: !!att.completed_at,
              is_disqualified: !!att.is_disqualified,
              warnings_count: att.warnings_count,
              started_at: att.started_at,
            }
          })
        }
      }
    }

    // 3. Process and format codeathon timings and status
    const now = new Date()

    const formattedList = (quizzes || []).map((q: any) => {
      const start = new Date(q.start_time)
      const end = new Date(q.end_time)

      const isLive = now >= start && now <= end
      const isUpcoming = now < start
      const isEnded = now > end

      let status = 'upcoming'
      let statusLabel = 'Coming Soon'
      if (isLive) {
        status = 'live'
        statusLabel = 'Live Now'
      } else if (isEnded) {
        status = 'ended'
        statusLabel = 'Quiz Ended'
      }

      // Calculate duration in minutes if not explicitly set
      const duration =
        q.duration_minutes ||
        (start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)) : null)

      const attempt = userAttemptsMap[q.id] || null

      return {
        id: q.id,
        title: q.title || 'Untitled Codeathon',
        description: q.description || '',
        difficulty: q.difficulty || 'medium',
        creator_name: q.profiles?.full_name || q.profiles?.username || 'Teacher',
        total_questions: Array.isArray(q.coding_question_ids) ? q.coding_question_ids.length : 0,
        timings: {
          start_time: q.start_time,
          end_time: q.end_time,
          duration_minutes: duration,
        },
        status, // 'live' | 'upcoming' | 'ended'
        status_label: statusLabel,
        is_live: isLive,
        is_upcoming: isUpcoming,
        is_ended: isEnded,
        // Direct redirect URL to attend and solve the codeathon in PyCode
        attempt_url: `${origin}/codeathons/${q.id}/attempt`,
        user_attempt: attempt,
      }
    })

    // Filter by status if specified
    let filtered = formattedList
    if (statusFilter && statusFilter !== 'all') {
      filtered = formattedList.filter((c: any) => c.status === statusFilter)
    }

    return NextResponse.json(
      {
        success: true,
        total_codeathons: formattedList.length,
        filtered_count: filtered.length,
        live_count: formattedList.filter((c: any) => c.is_live).length,
        upcoming_count: formattedList.filter((c: any) => c.is_upcoming).length,
        codeathons: filtered,
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('Codeathons API Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
