'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, BookOpen, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'

export default function TestsListPage() {
  const supabase = createClient() as any
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(true)

  useEffect(() => {
    const loadTests = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // 1. Fetch Quizzes from Supabase
        const { data: quizData, error: qErr } = await supabase
          .from('quizzes')
          .select('*, profiles:creator_id(username)')
          .order('scheduled_start', { ascending: false })

        if (!qErr && quizData) {
          setQuizzes(quizData)
        }

        if (user) {
          setIsGuest(false)
          // 2. Fetch Attempts for the current user
          const { data: attemptData } = await supabase
            .from('quiz_attempts')
            .select('quiz_id, score_percentage, submitted_at')
            .eq('user_id', user.id)

          if (attemptData) {
            const attemptMap: Record<string, string> = {}
            attemptData.forEach((a: any) => {
              attemptMap[a.quiz_id] = `Completed (Score: ${a.score_percentage}%)`
            })
            setAttempts(attemptMap)
          }
        } else {
          setIsGuest(true)
        }
      } catch (err) {
        console.error("Failed to load quizzes", err)
      } finally {
        setLoading(false)
      }
    }

    loadTests()
  }, [supabase])

  const getQuizStatus = (quiz: any) => {
    const now = new Date()
    const start = new Date(quiz.scheduled_start)
    const end = new Date(quiz.scheduled_end)

    if (now < start) {
      return { label: 'Upcoming', style: 'bg-warning/10 text-warning border border-warning/25 font-mono text-[9px] uppercase tracking-widest' }
    }
    if (now > end) {
      return { label: 'Expired', style: 'bg-error/10 text-error border border-error/25 font-mono text-[9px] uppercase tracking-widest' }
    }
    return { label: 'Live Now', style: 'bg-success/10 text-success border border-success/25 font-mono text-[9px] uppercase tracking-widest animate-pulse' }
  }

  return (
    <div className="min-h-screen p-8 bg-canvas text-ink">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-hairline pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink font-sans">
              Quizzes & Tests
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-light">Join scheduled university exams under anti-cheating supervision</p>
          </div>
        </div>

        {isGuest && (
          <div className="p-4 rounded-xl bg-block-coral border border-hairline text-ink text-xs flex items-center gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>
              <strong>Guest mode active:</strong> You can view scheduled tests here, but you must be logged in to attempt exams and save scores.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-surface-soft border border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm"
              >
                <div className="space-y-3 flex-1 w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-16 bg-surface-card rounded-full"></div>
                    <div className="h-3.5 w-32 bg-surface-card rounded-md"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-surface-card rounded-md"></div>
                  <div className="flex gap-4">
                    <div className="h-4 w-24 bg-surface-card rounded-md"></div>
                    <div className="h-4 w-24 bg-surface-card rounded-md"></div>
                  </div>
                </div>
                <div className="h-10 w-28 bg-surface-card rounded-full"></div>
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-hairline bg-surface-soft text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-ink font-bold mb-1">No Tests Scheduled</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Your teacher hasn&apos;t published any programming exams yet. You can keep practicing challenges in the Sandbox!
            </p>
            <Link
              href="/practice"
              className="inline-block mt-6 px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-semibold transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            >
              Practice Sandbox
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quizzes.map((quiz) => {
              const status = getQuizStatus(quiz)
              const attemptStatus = attempts[quiz.id]
              const isLive = status.label === 'Live Now'
              const formattedDate = new Date(quiz.scheduled_start).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })

              return (
                <div
                  key={quiz.id}
                  className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-primary transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full border ${status.style}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Published by @{quiz.profiles?.username || 'teacher'}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-ink tracking-tight">{quiz.title}</h2>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-light">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formattedDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {quiz.duration_minutes} mins
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        {quiz.question_ids?.length || 0} coding challenges
                      </span>
                    </div>
                  </div>

                  <div className="w-full md:w-auto text-right">
                    {attemptStatus ? (
                      <div className="px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        {attemptStatus}
                      </div>
                    ) : isLive && !isGuest ? (
                      <Link
                        href={`/tests/${quiz.id}/attempt`}
                        className="block w-full md:w-auto px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                      >
                        Enter Exam Hall
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full md:w-auto px-5 py-2.5 rounded-full bg-surface-soft text-gray-400 text-xs font-semibold border border-hairline text-center cursor-not-allowed"
                      >
                        {status.label === 'Upcoming' ? 'Locked' : 'Unavailable'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
