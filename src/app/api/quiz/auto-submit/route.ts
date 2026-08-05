import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getQuestionTotalCases(verificationScript?: string): number {
  if (!verificationScript) return 1
  
  // 1. Check for literal assignment to total_cases in exec_globals, e.g. exec_globals['total_cases'] = 3
  const literalMatch = verificationScript.match(/exec_globals\[["']total_cases["']\]\s*=\s*(\d+)/)
  if (literalMatch) {
    return parseInt(literalMatch[1], 10)
  }
  
  // 2. Check for literal assignment to total variable: e.g. total = 3 (avoiding total = 0)
  const totalMatches = verificationScript.match(/^\s*total\s*=\s*([1-9]\d*)/m)
  if (totalMatches) {
    return parseInt(totalMatches[1], 10)
  }
  
  // 3. Count increments to total: total += 1
  const totalIncMatches = verificationScript.match(/total\s*\+=\s*1/g)
  if (totalIncMatches && totalIncMatches.length > 0) {
    return totalIncMatches.length
  }
  
  if (!verificationScript.includes('fn = exec_globals') && !verificationScript.includes('assert fn(')) {
    return 1
  }
  return 1
}

/**
 * POST /api/quiz/auto-submit
 * 
 * Auto-finalizes all incomplete quiz_attempts for a quiz once the quiz end_time has passed.
 * Called by the teacher dashboard when loading analytics for an ended quiz.
 * Also accepts a single attempt_id for beacon-based auto-submit when a student closes their browser.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { quiz_id, attempt_id } = body

    if (!quiz_id && !attempt_id) {
      return NextResponse.json({ error: 'quiz_id or attempt_id required' }, { status: 400 })
    }

    // 1. Fetch quiz to get end_time and coding_question_ids
    let quizId = quiz_id
    if (!quizId && attempt_id) {
      const { data: attemptRow } = await admin
        .from('quiz_attempts')
        .select('quiz_id')
        .eq('id', attempt_id)
        .maybeSingle()
      if (!attemptRow) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      quizId = (attemptRow as any).quiz_id
    }

    const { data: quiz } = await admin
      .from('quizzes')
      .select('id, end_time, coding_question_ids')
      .eq('id', quizId)
      .maybeSingle()

    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    const quizData = quiz as any

    // Only auto-submit if quiz has ended
    if (new Date(quizData.end_time) > new Date()) {
      return NextResponse.json({ message: 'Quiz is still active, no auto-submit needed' })
    }

    // 2. Fetch questions for score calculation
    const qIds: number[] = quizData.coding_question_ids || []
    let questions: any[] = []
    if (qIds.length > 0) {
      const { data: qData } = await admin
        .from('coding_questions')
        .select('id, points, verification_script')
        .in('id', qIds)
      questions = qData || []
    }

    // 3. Find all incomplete attempts (completed_at IS NULL)
    let attemptsQuery = admin
      .from('quiz_attempts')
      .select('id, user_id, student_details, warnings_count, is_disqualified')
      .eq('quiz_id', quizId)
      .is('completed_at', null)

    if (attempt_id) {
      attemptsQuery = attemptsQuery.eq('id', attempt_id)
    }

    const { data: incompleteAttempts } = await attemptsQuery

    if (!incompleteAttempts || incompleteAttempts.length === 0) {
      return NextResponse.json({ message: 'No incomplete attempts found', swept: 0 })
    }

    // 4. Finalize each incomplete attempt
    const completedAt = new Date().toISOString()
    let swept = 0

    await Promise.all(incompleteAttempts.map(async (attempt: any) => {
      const submittedQs: Record<string, boolean> = attempt.student_details?.submittedQuestions || {}
      const savedSummary: Record<string, { passed: number; total: number }> = attempt.student_details?.testCasesSummary || {}

      let totalPoints = 0
      let earnedPoints = 0
      const finalSummary: Record<number, { passed: number; total: number }> = {}

      questions.forEach((q: any) => {
        totalPoints += q.points
        const isSubmitted = !!submittedQs[q.id]

        // Use saved test case data (saved by handleSubmitQuestion per-question) as ground truth
        const saved = savedSummary[q.id]
        const qTotal = (saved && saved.total > 0) ? saved.total : getQuestionTotalCases(q.verification_script)
        const qPassed = (isSubmitted && saved) ? (saved.passed || 0) : 0

        if (isSubmitted && saved && saved.total > 0) {
          earnedPoints += (saved.passed / saved.total) * q.points
        }

        finalSummary[q.id] = { passed: qPassed, total: qTotal }
      })

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const isDisqualified = attempt.is_disqualified || (attempt.warnings_count || 0) >= 3

      const { error } = await (admin as any)
        .from('quiz_attempts')
        .update({
          completed_at: completedAt,
          score: isDisqualified ? 0 : Math.round(earnedPoints),
          score_percentage: isDisqualified ? 0 : scorePercentage,
          student_details: {
            ...attempt.student_details,
            testCasesSummary: finalSummary
          }
        })
        .eq('id', attempt.id)

      if (!error) swept++
    }))

    return NextResponse.json({ success: true, swept })
  } catch (err: any) {
    console.error('[auto-submit] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
