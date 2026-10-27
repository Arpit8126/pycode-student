import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
}

const DEFAULT_BASE_URL = 'https://pycode-student.vercel.app'

function getQuestionTotalCases(verificationScript?: string): number {
  if (!verificationScript) return 1
  const match = verificationScript.match(/exec_globals\[["']total_cases["']\]\s*=\s*(\d+)/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return 1
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quizId = id
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')

    const origin = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : (request.nextUrl.origin && !request.nextUrl.origin.includes('localhost')
          ? request.nextUrl.origin
          : DEFAULT_BASE_URL)

    const admin = createAdminClient()

    // 1. Fetch Quiz details
    const { data: quiz, error: quizErr } = await (admin.from('quizzes') as any)
      .select('id, title, description, start_time, end_time, duration_minutes, coding_question_ids, creator_id, profiles:creator_id(username, full_name)')
      .eq('id', quizId)
      .maybeSingle()

    if (quizErr || !quiz) {
      return NextResponse.json(
        { success: false, error: `Codeathon with ID '${quizId}' not found.` },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // 2. Fetch Questions to accurately compute test case counts
    const qIds = Array.isArray(quiz.coding_question_ids) ? quiz.coding_question_ids : []
    const localMap = new Map(LOCAL_QUESTIONS.map((q) => [q.id, q]))
    
    let dbQuestions: any[] = []
    if (qIds.length > 0) {
      const { data: qData } = await (admin.from('coding_questions') as any)
        .select('id, points, verification_script')
        .in('id', qIds)
      dbQuestions = qData || []
    }

    const questionMap = new Map<number, { points: number; verification_script: string }>()
    qIds.forEach((qid: number) => {
      const localQ = localMap.get(qid)
      const dbQ = dbQuestions.find((dq: any) => dq.id === qid)
      questionMap.set(qid, {
        points: (dbQ as any)?.points || localQ?.points || 100,
        verification_script: localQ?.verification_script || (dbQ as any)?.verification_script || '',
      })
    })

    // 3. Fetch Completed Quiz Attempts
    const { data: allAttempts, error: attErr } = await (admin.from('quiz_attempts') as any)
      .select('id, quiz_id, user_id, score, score_percentage, is_disqualified, warnings_count, started_at, completed_at, student_details, profiles:user_id(username, full_name, avatar_url)')
      .eq('quiz_id', quizId)
      .not('completed_at', 'is', null)

    if (attErr) {
      console.error('Error fetching leaderboard attempts:', attErr)
      return NextResponse.json(
        { success: false, error: attErr.message },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // 4. Calculate accurate passed test cases and accuracy for each participant
    const enhanced = (allAttempts || []).map((entry: any) => {
      const entrySummary = entry.student_details?.testCasesSummary || {}
      let passedCases = 0
      let totalCases = 0

      qIds.forEach((qid: number) => {
        const qMeta = questionMap.get(qid)
        const check = entrySummary[qid]
        const passed = check ? (check.passed || 0) : 0
        const total = getQuestionTotalCases(qMeta?.verification_script)
        passedCases += passed
        totalCases += total
      })

      const accuracy = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0

      let timeTakenSeconds = 0
      if (entry.started_at && entry.completed_at) {
        const start = new Date(entry.started_at).getTime()
        const end = new Date(entry.completed_at).getTime()
        timeTakenSeconds = Math.max(0, Math.round((end - start) / 1000))
      }

      const prof = entry.profiles || {}
      const details = entry.student_details || {}

      return {
        attempt_id: entry.id,
        user_id: entry.user_id,
        username: prof.username || 'student',
        full_name: prof.full_name || details.fullName || prof.username || 'Student',
        avatar_url: prof.avatar_url || null,
        roll_number: details.rollNumber || null,
        course: details.courseClass || null,
        section: details.section || null,
        score: entry.score || 0,
        score_percentage: entry.score_percentage || 0,
        accuracy,
        passed_cases: passedCases,
        total_cases: totalCases,
        time_taken_seconds: timeTakenSeconds,
        time_taken_formatted: formatDuration(timeTakenSeconds),
        warnings_count: entry.warnings_count || 0,
        is_disqualified: !!entry.is_disqualified,
        started_at: entry.started_at,
        completed_at: entry.completed_at,
      }
    })

    // 5. Sort: non-disqualified first, then score DESC, accuracy DESC, time ASC
    enhanced.sort((a: any, b: any) => {
      if (a.is_disqualified !== b.is_disqualified) {
        return a.is_disqualified ? 1 : -1
      }
      if (b.score !== a.score) {
        return b.score - a.score
      }
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy
      }
      return a.time_taken_seconds - b.time_taken_seconds
    })

    // Assign rank numbers
    const ranked = enhanced.map((item: any, idx: number) => ({
      rank: idx + 1,
      ...item,
    }))

    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : ranked.length
    const paginated = ranked.slice(0, limit)

    const now = new Date()
    const quizStart = new Date(quiz.start_time)
    const quizEnd = new Date(quiz.end_time)

    return NextResponse.json(
      {
        success: true,
        codeathon: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description || '',
          creator_name: quiz.profiles?.full_name || quiz.profiles?.username || 'Teacher',
          total_questions: qIds.length,
          timings: {
            start_time: quiz.start_time,
            end_time: quiz.end_time,
            duration_minutes: quiz.duration_minutes,
          },
          status: now > quizEnd ? 'ended' : now >= quizStart ? 'live' : 'upcoming',
          total_participants: ranked.length,
          attempt_url: `${origin}/codeathons/${quiz.id}/attempt`,
          share_url: `${origin}/codeathons/${quiz.id}/attempt`,
          copy_url: `${origin}/codeathons/${quiz.id}/attempt`,
        },
        leaderboard: paginated,
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('Leaderboard API Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
