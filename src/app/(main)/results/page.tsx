'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Clock, CheckCircle2, XCircle, ShieldAlert, ChevronLeft, Award, BarChart2, Users, Calendar, FileText, BarChart } from 'lucide-react'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'

function getQuestionTotalCases(verificationScript?: string): number {
  if (!verificationScript) return 5
  const match = verificationScript.match(/exec_globals\[["']total_cases["']\]\s*=\s*(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  if (!verificationScript.includes('fn = exec_globals') && !verificationScript.includes('assert fn(')) {
    return 1
  }
  return 5
}

// ─── Circular progress ring component ──────────────────────────────────────────
function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const radius = 44
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-zinc-700" />
        <circle
          cx="56" cy="56" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-black text-ink leading-none">{score}<span className="text-xs font-light text-gray-400">/{total}</span></p>
        <p className="text-[10px] font-bold text-gray-400 mt-0.5">{pct}%</p>
      </div>
    </div>
  )
}

// ─── Scorecard detail view ─────────────────────────────────────────────────────
function ScorecardView({ result, onBack }: { result: any; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'leaderboard'>('evaluation')
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myRank, setMyRank] = useState<number>(0)
  const [loadingLb, setLoadingLb] = useState(false)
  const supabase = createClient() as any

  // Viewed profile state
  const [viewedUser, setViewedUser] = useState<any>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [userSubmissions, setUserSubmissions] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [userHeatmap, setUserHeatmap] = useState<Record<string, number>>({})

  // Leetcode style difficulty categories
  const [viewedEasy, setViewedEasy] = useState(0)
  const [viewedMedium, setViewedMedium] = useState(0)
  const [viewedHard, setViewedHard] = useState(0)
  const [viewedTotalPoints, setViewedTotalPoints] = useState(0)
  const [viewedRankVal, setViewedRankVal] = useState(1)
  const [viewedPercentileVal, setViewedPercentileVal] = useState(100)

  const { quiz, attempt, questions } = result

  const totalScore = questions.reduce((acc: number, q: any) => acc + (q.points || 0), 0)
  const totalQs = questions.length
  const myScore = attempt.score || 0
  const pct = totalScore > 0 ? Math.round((myScore / totalScore) * 100) : 0
  const timeTaken = (() => {
    if (!attempt.started_at || !attempt.completed_at) return 'N/A'
    const ms = new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}m ${s % 60}s`
  })()

  // Count solved vs unsolved from testCasesSummary
  const summary = attempt.student_details?.testCasesSummary || {}
  let solvedCount = 0
  let totalCases = 0
  let passedCases = 0
  questions.forEach((q: any) => {
    const qTotal = getQuestionTotalCases(q.verification_script)
    const check = summary[q.id]
    const passed = check ? (check.passed || 0) : 0
    passedCases += passed
    totalCases += qTotal
    if (passed === qTotal && qTotal > 0) solvedCount++
  })
  const unsolvedCount = totalQs - solvedCount
  const accuracy = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0

  const handleOpenProfile = async (user: any) => {
    setViewedUser(user)
    setModalLoading(true)
    setUserSubmissions([])
    setUserHeatmap({})
    setViewedEasy(0)
    setViewedMedium(0)
    setViewedHard(0)
    setViewedTotalPoints(0)
    setViewedRankVal(1)
    setViewedPercentileVal(100)

    try {
      // Fetch target profile (including bio etc.)
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (prof) {
        setViewedUser(prof)
      }

      // 1. Fetch public submissions of the user
      const { data: subs, error } = await supabase
        .from('coding_submissions')
        .select('*, coding_questions(id, title, points, difficulty)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && subs) {
        setUserSubmissions(subs)

        const counts: Record<string, number> = {}
        subs.forEach((s: any) => {
          const dateStr = new Date(s.created_at).toISOString().split('T')[0]
          counts[dateStr] = (counts[dateStr] || 0) + 1
        })
        setUserHeatmap(counts)

        // Calculate unique accepted submissions per question
        const uniqueAccepted = Array.from(
          new Map(
            subs
              .filter((s: any) => s.status === 'accepted' && s.coding_questions)
              .map((s: any) => [s.question_id, s])
          ).values()
        ) as any[]

        // Sum points
        const points = uniqueAccepted.reduce((acc, curr) => acc + (curr.coding_questions?.points || 0), 0)
        setViewedTotalPoints(points)

        // Count solved count by difficulty
        const easySolved = new Set(subs.filter((s: any) => s.status === 'accepted' && s.coding_questions?.difficulty === 'easy').map((s: any) => s.question_id)).size
        const medSolved = new Set(subs.filter((s: any) => s.status === 'accepted' && s.coding_questions?.difficulty === 'medium').map((s: any) => s.question_id)).size
        const hardSolved = new Set(subs.filter((s: any) => s.status === 'accepted' && s.coding_questions?.difficulty === 'hard').map((s: any) => s.question_id)).size

        setViewedEasy(easySolved)
        setViewedMedium(medSolved)
        setViewedHard(hardSolved)
      }

      // 2. Fetch all accepted submissions to calculate Sandbox Rank
      const { data: allSubs } = await supabase
        .from('coding_submissions')
        .select('user_id, question_id, coding_questions(points)')
        .eq('status', 'accepted')

      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (allSubs) {
        const userScores: Record<string, number> = {}
        const userUniqueSolved: Record<string, Set<number>> = {}

        allSubs.forEach((sub: any) => {
          const uid = sub.user_id
          const qid = sub.question_id
          const pts = sub.coding_questions?.points || 0

          if (!userUniqueSolved[uid]) {
            userUniqueSolved[uid] = new Set()
            userScores[uid] = 0
          }

          if (!userUniqueSolved[uid].has(qid)) {
            userUniqueSolved[uid].add(qid)
            userScores[uid] += pts
          }
        })

        const sortedScores = Object.values(userScores).sort((a: number, b: number) => b - a)
        const targetUserScore = userScores[user.id] || 0
        const rankIndex = sortedScores.indexOf(targetUserScore)
        const finalRank = rankIndex !== -1 ? rankIndex + 1 : sortedScores.length + 1
        const totalUsers = Math.max(profilesCount || 1, Object.keys(userScores).length, 1)
        const topPercent = Math.max(1, Math.min(100, Math.round((finalRank / totalUsers) * 100)))

        setViewedRankVal(finalRank)
        setViewedPercentileVal(topPercent)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setModalLoading(false)
    }
  }

  // Heatmap rendering grid constructor (LeetCode Standard 2026 Year-View Segmented by Month)
  const renderHeatmapGrid = () => {
    const daysInWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const monthsData = []

    for (let m = 0; m < 12; m++) {
      const startDate = new Date(2026, m, 1)
      const startOffset = startDate.getDay()
      const daysInMonth = new Date(2026, m + 1, 0).getDate()
      const monthDays = []

      // 1. Blanks at the beginning of the month
      for (let i = 0; i < startOffset; i++) {
        monthDays.push({
          type: 'empty',
          key: `empty-${m}-${i}`
        })
      }

      // 2. Active days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(2026, m, day)
        const yyyy = currentDate.getFullYear()
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0')
        const dd = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        const count = userHeatmap[dateStr] || 0

        let color = 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700/60 hover:border-gray-400 dark:hover:border-zinc-550'
        if (count === 1) color = 'bg-emerald-200 dark:bg-emerald-900/80 border-emerald-350 dark:border-emerald-800 hover:border-emerald-450 dark:hover:border-emerald-600'
        if (count === 2) color = 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600 hover:border-emerald-600 dark:hover:border-emerald-400'
        if (count >= 3) color = 'bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400 hover:border-emerald-700 dark:hover:border-emerald-300'

        const weekdayName = daysInWeek[currentDate.getDay()]
        const monthName = fullMonthNames[m]

        monthDays.push({
          type: 'day',
          key: dateStr,
          date: currentDate,
          color,
          title: `${weekdayName}, ${monthName} ${day}, ${yyyy}: ${count} submission${count !== 1 ? 's' : ''}`
        })
      }

      // Chunk monthDays into weeks of size 7
      const monthWeeks = []
      for (let i = 0; i < monthDays.length; i += 7) {
        const week = monthDays.slice(i, i + 7)
        while (week.length < 7) {
          week.push({
            type: 'empty',
            key: `empty-pad-${m}-${week.length}`
          })
        }
        monthWeeks.push(week)
      }

      monthsData.push({
        monthIdx: m,
        name: monthNames[m],
        weeks: monthWeeks
      })
    }

    return (
      <div className="w-full overflow-x-auto p-4 bg-canvas border border-hairline rounded-2xl scrollbar-none shadow-sm">
        <div className="min-w-[1100px] flex items-start gap-2">
            <div className="flex flex-col gap-1 text-[8px] font-bold text-gray-500 font-mono pr-1.5 select-none pt-[20px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="h-4 flex items-center justify-end">{day}</div>
              ))}
            </div>

          <div className="flex items-start gap-1">
            {monthsData.map((m, mIdx) => (
              <div
                key={m.monthIdx}
                className={`flex flex-col gap-1 ${
                  mIdx > 0 ? 'ml-3 pl-3 border-l border-dashed border-gray-200 dark:border-gray-700/60' : ''
                }`}
              >
                <div className="text-[9px] font-bold text-gray-500 font-mono select-none h-4">
                  {m.name}
                </div>

                <div className="flex gap-1">
                  {m.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-rows-7 gap-1 flex-shrink-0">
                      {week.map((day: any) => (
                        day.type === 'empty' ? (
                          <div key={day.key} className="w-4 h-4 rounded-[3px] bg-transparent border border-transparent" />
                        ) : (
                          <div
                            key={day.key}
                            className={`w-4 h-4 rounded-[3px] border transition-all ${day.color}`}
                            title={day.title}
                          />
                        )
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    )
  }

  const loadLeaderboard = async () => {
    setLoadingLb(true)
    try {
      const { data: allAttempts } = await supabase
        .from('quiz_attempts')
        .select('*, profiles:user_id(username, full_name, avatar_url)')
        .eq('quiz_id', quiz.id)
        .not('completed_at', 'is', null)

      if (allAttempts) {
        // Enhance with calculated test cases stats and accuracy
        const enhancedAttempts = allAttempts.map((entry: any) => {
          const entrySummary = entry.student_details?.testCasesSummary || {}
          let passedCases = 0
          let totalCases = 0
          questions.forEach((q: any) => {
            const qTotal = getQuestionTotalCases(q.verification_script)
            const passed = entrySummary[q.id]?.passed || 0
            passedCases += passed
            totalCases += qTotal
          })
          const entryAccuracy = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0
          return {
            ...entry,
            passedCases,
            totalCases,
            accuracy: entryAccuracy
          }
        })

        // Sort by accuracy descending, then score descending, then time taken ascending
        const sorted = [...enhancedAttempts].sort((a, b) => {
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
          if (b.score !== a.score) return b.score - a.score
          const ta = a.started_at && a.completed_at ? new Date(a.completed_at).getTime() - new Date(a.started_at).getTime() : Infinity
          const tb = b.started_at && b.completed_at ? new Date(b.completed_at).getTime() - new Date(b.started_at).getTime() : Infinity
          return ta - tb
        })

        setLeaderboard(sorted)
        const rank = sorted.findIndex(a => a.id === attempt.id)
        setMyRank(rank !== -1 ? rank + 1 : 0)
      }
    } catch (e) { console.error(e) } finally { setLoadingLb(false) }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  // Real-time subscription to leaderboard ONLY when tab is active (saves egress)
  useEffect(() => {
    if (activeTab !== 'leaderboard') return

    const channel = supabase
      .channel(`realtime-leaderboard-${quiz.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `quiz_id=eq.${quiz.id}`
        },
        () => {
          loadLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab, quiz.id])

  if (viewedUser) {
    const totalEasy = LOCAL_QUESTIONS.filter(q => q.difficulty === 'easy').length
    const totalMedium = LOCAL_QUESTIONS.filter(q => q.difficulty === 'medium').length
    const totalHard = LOCAL_QUESTIONS.filter(q => q.difficulty === 'hard').length

    const totalSolvedCount = viewedEasy + viewedMedium + viewedHard
    const totalQuestionsCount = totalEasy + totalMedium + totalHard

    const percentSolved = totalQuestionsCount > 0 ? (totalSolvedCount / totalQuestionsCount) * 100 : 0
    const gaugeRadius = 36
    const gaugeCircumference = 2 * Math.PI * gaugeRadius
    const gaugeStrokeDashoffset = gaugeCircumference - (percentSolved / 100) * gaugeCircumference

    return (
      <div className="space-y-6 animate-scale-in">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between border-b border-hairline pb-5">
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">@{viewedUser.username || 'username'}'s Profile</h1>
            <p className="text-gray-500 text-xs mt-1 font-light">Viewing student performance analytics and submission logs</p>
          </div>
          <button
            onClick={() => setViewedUser(null)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-hairline hover:bg-surface-soft hover:text-ink text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Leaderboard
          </button>
        </div>

        {modalLoading ? (
          <div className="space-y-6 animate-pulse w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-52 bg-white dark:bg-zinc-900/40 border border-hairline rounded-3xl"></div>
              <div className="h-52 bg-white dark:bg-zinc-900/40 border border-hairline rounded-3xl"></div>
            </div>
            <div className="h-44 bg-white dark:bg-zinc-900/40 border border-hairline rounded-3xl"></div>
          </div>
        ) : (
          <>
            {/* Top Section - Side-by-Side Cards (LeetCode Style Solved Problems + Profile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Solved Problems Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/40 border border-hairline flex flex-col justify-between shadow-sm min-h-[200px]">
                <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-mono">Solved Problems</h3>
                
                <div className="flex items-center gap-8 py-4">
                  {/* Circular Gauge */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                      {/* Track Circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r={gaugeRadius}
                        className="stroke-hairline-soft dark:stroke-zinc-800 fill-transparent"
                        strokeWidth="4.5"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r={gaugeRadius}
                        className="stroke-primary fill-transparent transition-all duration-500 ease-out"
                        strokeWidth="4.5"
                        strokeDasharray={gaugeCircumference}
                        strokeDashoffset={gaugeStrokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                      <span className="text-2xl font-extrabold text-ink leading-none">{totalSolvedCount}</span>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-bold mt-1">Solved</span>
                    </div>
                  </div>

                  {/* Progress Breakdown Bars */}
                  <div className="flex-1 space-y-3.5">
                    {/* Easy Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-emerald-500">Easy</span>
                        <span className="text-ink font-mono">{viewedEasy}<span className="text-gray-550 font-light">/{totalEasy}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-hairline-soft dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalEasy > 0 ? (viewedEasy / totalEasy) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Medium Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-amber-500">Medium</span>
                        <span className="text-ink font-mono">{viewedMedium}<span className="text-gray-555 font-light">/{totalMedium}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-hairline-soft dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalMedium > 0 ? (viewedMedium / totalMedium) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Hard Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-red-500">Hard</span>
                        <span className="text-ink font-mono">{viewedHard}<span className="text-gray-555 font-light">/{totalHard}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-hairline-soft dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalHard > 0 ? (viewedHard / totalHard) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Student Profile Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/40 border border-hairline flex flex-col justify-between shadow-sm min-h-[200px]">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-mono">Student Profile</h3>
                  
                  <div className="flex items-center gap-5 my-4">
                    <div 
                      onClick={() => setShowLightbox(true)}
                      title="View Full Size Photo"
                      className="w-16 h-16 rounded-full border border-hairline overflow-hidden shadow-md shrink-0 flex items-center justify-center bg-primary/10 border-primary/20 hover:scale-[1.04] cursor-pointer transition-transform duration-300"
                    >
                      {viewedUser.avatar_url ? (
                        <img src={viewedUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-2xl">
                          {viewedUser.username ? viewedUser.username.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <h1 className="text-lg font-extrabold tracking-tight text-ink truncate">
                          {viewedUser.full_name || `@${viewedUser.username || 'developer'}`}
                        </h1>
                        {viewedUser.full_name && (
                          <span className="text-[10px] text-gray-500 font-mono truncate shrink-0">(@{viewedUser.username})</span>
                        )}
                      </div>
                      <p className="text-gray-655 dark:text-zinc-400 text-xs font-bold italic line-clamp-1">
                        {viewedUser.bio || 'No bio written yet.'}
                      </p>
                      <p className="text-gray-500 text-[10px] font-mono leading-none pt-0.5">PyCode Python Programmer</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 border-t border-hairline pt-4">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-mono">Workspace Score</p>
                    <p className="text-2xl font-extrabold text-primary mt-0.5">{viewedTotalPoints} pts</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-mono">Sandbox Rank</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl font-extrabold text-ink">#{viewedRankVal}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                        (Top {viewedPercentileVal}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Heatmap */}
            <div className="space-y-3 pt-4">
              <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                Submission Heatmap
              </h2>
              {renderHeatmapGrid()}
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-1">
                <span>Submission history logs for the year 2026</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-[2px] bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700/60" />
                  <div className="w-3 h-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-900/80 border border-emerald-350 dark:border-emerald-800" />
                  <div className="w-3 h-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600" />
                  <div className="w-3 h-3 rounded-[2px] bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-400" />
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Fullscreen Avatar Lightbox Modal */}
            {showLightbox && (
              <div 
                onClick={() => setShowLightbox(false)}
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setShowLightbox(false)}
                  className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 bg-black/40 px-4 py-2 rounded-full transition-all text-xs font-extrabold uppercase tracking-wider cursor-pointer font-mono shadow-lg"
                  title="Close image"
                >
                  ✕ Close
                </button>

                {/* Centered Image Card */}
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="relative max-w-md w-full aspect-square flex justify-center items-center p-2 cursor-default animate-scale-in"
                >
                  <div className="relative w-72 h-72 md:w-[400px] md:h-[400px] rounded-full border-4 border-white/15 overflow-hidden shadow-2xl select-none bg-zinc-900 transition-transform duration-300 hover:scale-[1.01]">
                    {viewedUser.avatar_url ? (
                      <img 
                        src={viewedUser.avatar_url} 
                        alt="Avatar Full View" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-8xl uppercase select-none font-mono">
                        {viewedUser.username ? viewedUser.username.substring(0, 2).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }
 
  return (
    <div className="space-y-6 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-ink transition-colors cursor-pointer font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Results
        </button>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">Scorecard & Review</p>
        <h1 className="text-2xl font-black text-ink tracking-tight mt-0.5">{quiz.title}</h1>
        {quiz.description && <p className="text-xs text-gray-400 mt-1">{quiz.description}</p>}
        <p className="text-[10px] text-gray-400 font-mono mt-1">
          Ended: {new Date(quiz.end_time).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Top 3 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score ring */}
        <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm flex flex-col items-center gap-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600 dark:text-zinc-400 font-mono">Attempt Score</p>
          <ScoreRing score={myScore} total={totalScore} />
          <p className="text-[11px] text-gray-700 dark:text-zinc-300 font-mono font-extrabold">{pct}%</p>
        </div>

        {/* Accuracy */}
        <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600 dark:text-zinc-400 font-mono">Accuracy Ratio</p>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-500">{accuracy}% accuracy</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-500">Correct: {solvedCount}</span>
              <span className="text-rose-600 dark:text-rose-455">Incorrect: {unsolvedCount}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden flex">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${accuracy}%` }} />
              <div className="h-full bg-rose-400/60 rounded-full flex-1" />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-gray-700 dark:text-zinc-300 font-bold">
              <span>Test cases: {passedCases} / {totalCases} passed</span>
              <span>{timeTaken}</span>
            </div>
          </div>
          {attempt.is_disqualified && (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-semibold font-mono">
              <ShieldAlert className="w-3.5 h-3.5" />
              Disqualified
            </div>
          )}
        </div>

        {/* Leaderboard rank */}
        <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600 dark:text-zinc-400 font-mono">Leaderboard Rank</p>
          {loadingLb ? (
            <div className="flex flex-col items-center justify-center gap-1.5 w-full animate-pulse">
              <div className="h-9 w-12 bg-gray-200 dark:bg-zinc-800 rounded mt-1"></div>
              <div className="h-3 w-28 bg-gray-150 dark:bg-zinc-800 rounded"></div>
            </div>
          ) : (
            <>
              <p className="text-5xl font-black text-ink">{myRank || '—'}</p>
              <p className="text-[11px] text-gray-600 dark:text-zinc-400 font-mono font-bold">Out of {leaderboard.length} attempt submissions</p>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-hairline pb-0">
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border border-b-0 ${
            activeTab === 'evaluation'
              ? 'bg-white dark:bg-zinc-900 border-hairline text-ink'
              : 'border-transparent text-gray-400 hover:text-ink'
          }`}
        >
          My Evaluation
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border border-b-0 ${
            activeTab === 'leaderboard'
              ? 'bg-white dark:bg-zinc-900 border-hairline text-ink'
              : 'border-transparent text-gray-400 hover:text-ink'
          }`}
        >
          Leaderboard Rankings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'evaluation' ? (
        <div className="space-y-4">
          {/* My details */}
          <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-650 dark:text-zinc-355 font-mono">My Submission Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Score', value: `${myScore} / ${totalScore}` },
                { label: 'Questions', value: `${solvedCount} / ${totalQs}` },
                { label: 'Test Cases', value: `${passedCases} / ${totalCases}` },
                { label: 'Time Taken', value: timeTaken },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-surface-soft border border-hairline text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 dark:text-zinc-400 font-mono">{item.label}</p>
                  <p className="text-sm font-black text-ink mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-700 dark:text-zinc-300 font-mono pt-1">
              <div><span className="font-extrabold text-gray-900 dark:text-white">Started:</span> {attempt.started_at ? new Date(attempt.started_at).toLocaleString() : 'N/A'}</div>
              <div><span className="font-extrabold text-gray-900 dark:text-white">Submitted:</span> {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : 'N/A'}</div>
              <div><span className="font-extrabold text-gray-900 dark:text-white">Status:</span> <span className={attempt.is_disqualified ? 'text-rose-600 dark:text-rose-455 font-bold' : 'text-emerald-600 dark:text-emerald-450 font-bold'}>{attempt.is_disqualified ? 'Disqualified' : 'Normal'}</span></div>
              {attempt.student_details?.fullName && (
                <div><span className="font-extrabold text-gray-900 dark:text-white">Name:</span> {attempt.student_details.fullName}</div>
              )}
              {attempt.student_details?.rollNumber && (
                <div><span className="font-extrabold text-gray-900 dark:text-white">Roll No:</span> {attempt.student_details.rollNumber}</div>
              )}
              {attempt.student_details?.courseClass && (
                <div><span className="font-extrabold text-gray-900 dark:text-white">Class:</span> {attempt.student_details.courseClass}</div>
              )}
            </div>
          </div>

          {/* Per-question breakdown */}
          {questions.length > 0 && (
            <div className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-650 dark:text-zinc-355 font-mono">Question Breakdown</h3>
              <div className="space-y-2">
                {questions.map((q: any, i: number) => {
                  const check = summary[q.id]
                  const passed = check ? (check.passed || 0) : 0
                  const total = getQuestionTotalCases(q.verification_script)
                  const qPct = total > 0 ? Math.round((passed / total) * 100) : 0
                  const isCorrect = passed === total && total > 0
                  return (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl border border-hairline bg-surface-soft">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{q.title || `Question ${i + 1}`}</p>
                        <p className="text-[11px] text-gray-600 dark:text-zinc-400 font-mono font-bold">{passed}/{total} test cases · {q.points || 0} pts</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold font-mono ${qPct === 100 ? 'text-emerald-500' : qPct > 0 ? 'text-amber-500' : 'text-rose-500'}`}>{qPct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Leaderboard Tab */
        <div className="rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm overflow-hidden">
          {loadingLb ? (
            <div className="p-5 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-hairline/60 last:border-0">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-4 w-8 bg-gray-250 dark:bg-zinc-800 rounded-md"></div>
                    <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded-md"></div>
                  </div>
                  <div className="flex gap-8 shrink-0">
                    <div className="h-4 w-12 bg-gray-150 dark:bg-zinc-850 rounded-md"></div>
                    <div className="h-4 w-16 bg-gray-150 dark:bg-zinc-850 rounded-md"></div>
                    <div className="h-4 w-20 bg-gray-150 dark:bg-zinc-855 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 font-mono">No submissions yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline text-[9px] font-bold uppercase tracking-wider text-gray-550 dark:text-zinc-400 font-mono bg-gray-50 dark:bg-zinc-900/60">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Test Cases</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Time Taken</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.id === attempt.id
                  const tt = (() => {
                    if (!entry.started_at || !entry.completed_at) return 'N/A'
                    const ms = new Date(entry.completed_at).getTime() - new Date(entry.started_at).getTime()
                    const s = Math.floor(ms / 1000)
                    return `${Math.floor(s / 60)}m ${s % 60}s`
                  })()
                  const entrySummary = entry.student_details?.testCasesSummary || {}
                  let entryQsSolved = 0
                  questions.forEach((q: any) => {
                    const qTotal = getQuestionTotalCases(q.verification_script)
                    const passed = entrySummary[q.id]?.passed || 0
                    if (passed === qTotal && qTotal > 0) entryQsSolved++
                  })

                  return (
                    <tr key={entry.id} className={`transition-colors ${isMe ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface-soft/50'}`}>
                      <td className="px-4 py-3 font-black font-mono text-ink">
                        <div className="flex items-center gap-1.5">
                          {idx + 1 === 1 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                          {idx + 1 === 2 && <Trophy className="w-3.5 h-3.5 text-gray-400" />}
                          {idx + 1 === 3 && <Trophy className="w-3.5 h-3.5 text-amber-700" />}
                          {idx + 1}
                          {isMe && <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary text-[8px] font-black uppercase tracking-wider">YOU</span>}
                        </div>
                      </td>
                      <td 
                        className="px-4 py-3 cursor-pointer hover:underline group/student"
                        onClick={() => handleOpenProfile({
                          id: entry.user_id,
                          username: entry.profiles?.username,
                          full_name: entry.profiles?.full_name,
                          avatar_url: entry.profiles?.avatar_url
                        })}
                      >
                        <div className="flex items-center gap-2">
                          {entry.profiles?.avatar_url ? (
                            <img src={entry.profiles.avatar_url} className="w-7 h-7 rounded-full object-cover border border-hairline group-hover/student:border-primary/30" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary text-[10px] font-black group-hover/student:scale-105 transition-transform">
                              {entry.profiles?.username?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-ink group-hover/student:text-primary transition-colors">{entry.profiles?.full_name || entry.profiles?.username || 'Student'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">@{entry.profiles?.username || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-ink">{entry.score} / {totalScore}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{entryQsSolved} / {totalQs}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{entry.passedCases} / {entry.totalCases}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{entry.accuracy}%</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{tt}</td>
                      <td className="px-4 py-3">
                        {entry.is_disqualified ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-bold uppercase font-mono">Disqualified</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-bold uppercase font-mono">Normal</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Results Page ──────────────────────────────────────────────────────────
export default function ResultsPage() {
  const supabase = createClient() as any
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResult, setSelectedResult] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(true)
  const [totalScore, setTotalScore] = useState(0)
  const [totalAttempted, setTotalAttempted] = useState(0)
  const [overallAccuracy, setOverallAccuracy] = useState(0)
  const [codeathonRank, setCodeathonRank] = useState(1)

  const loadResults = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsGuest(true); setLoading(false); return }
      setIsGuest(false)

      // Fetch all completed quiz attempts for this user
      const { data: attemptData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })

      if (attemptData) {
        // Will be calculated dynamically after fetching quiz/questions data
        setTotalAttempted(0)
        setTotalScore(0)
        setOverallAccuracy(0)
      } else {
        setTotalAttempted(0)
        setTotalScore(0)
        setOverallAccuracy(0)
      }

      // Calculate dynamic global codeathon accuracy ranking
      const { data: allCompletedAttempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, student_details')
        .not('completed_at', 'is', null)

      if (allCompletedAttempts) {
        const userPassed: Record<string, number> = {}
        const userTotal: Record<string, number> = {}

        allCompletedAttempts.forEach((att: any) => {
          const uid = att.user_id
          const summary = att.student_details?.testCasesSummary || {}
          
          if (!userPassed[uid]) {
            userPassed[uid] = 0
            userTotal[uid] = 0
          }

          Object.values(summary).forEach((tc: any) => {
            userPassed[uid] += (tc.passed || 0)
            userTotal[uid] += (tc.total || 0)
          })
        })

        // Calculate accuracies and sort
        const accuracyList = Object.keys(userTotal).map(uid => {
          const passed = userPassed[uid]
          const total = userTotal[uid]
          const accuracy = total > 0 ? (passed / total) : 0
          return { uid, accuracy }
        })

        accuracyList.sort((a, b) => b.accuracy - a.accuracy)

        const myIndex = accuracyList.findIndex(x => x.uid === user.id)
        const myCodeathonRank = myIndex !== -1 ? myIndex + 1 : accuracyList.length + 1
        setCodeathonRank(myCodeathonRank)
      }

      if (!attemptData || attemptData.length === 0) { setLoading(false); return }

      // Get quiz IDs
      const quizIds = attemptData.map((a: any) => a.quiz_id)
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*, profiles:creator_id(username)')
        .in('id', quizIds)

      if (!quizData) { setLoading(false); return }

      // Map quiz data by id
      const quizMap: Record<string, any> = {}
      quizData.forEach((q: any) => { quizMap[q.id] = q })

      // Fetch questions for all quiz IDs
      const allQuestionIds: number[] = []
      quizData.forEach((q: any) => {
        if (q.coding_question_ids) allQuestionIds.push(...q.coding_question_ids)
      })

      let questionMap: Record<number, any> = {}
      if (allQuestionIds.length > 0) {
        const { data: qData } = await supabase
          .from('coding_questions')
          .select('id, title, points, difficulty, verification_script')
          .in('id', allQuestionIds)
        if (qData) qData.forEach((q: any) => { questionMap[q.id] = q })
      }

      // Build results array
      const built: any[] = []
      let scoreSum = 0
      let attemptedCount = 0
      let passedCases = 0
      let encounteredCases = 0

      attemptData.forEach((attempt: any) => {
        const quiz = quizMap[attempt.quiz_id]
        if (!quiz) return
        const questions = (quiz.coding_question_ids || []).map((id: number) => questionMap[id]).filter(Boolean)
        
        attemptedCount++
        scoreSum += (attempt.score || 0)
        
        const summary = attempt.student_details?.testCasesSummary || {}
        questions.forEach((q: any) => {
          const qTotal = getQuestionTotalCases(q.verification_script)
          const passed = summary[q.id]?.passed || 0
          passedCases += passed
          encounteredCases += qTotal
        })

        built.push({ quiz, attempt, questions })
      })

      setResults(built)
      setTotalAttempted(attemptedCount)
      setTotalScore(scoreSum)
      setOverallAccuracy(encounteredCases > 0 ? Math.round((passedCases / encounteredCases) * 100) : 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
  }, [])

  if (selectedResult) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-canvas text-ink font-sans">
        <div className="max-w-4xl mx-auto">
          <ScorecardView result={selectedResult} onBack={() => setSelectedResult(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-ink font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-hairline pb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">My Results</h1>
          <p className="text-gray-500 text-xs mt-1 font-light">View your scores and rankings for completed codeathons</p>
        </div>

        {/* Stats Grid - only for logged-in users */}
        {!isGuest && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-scale-in">
            {/* Stat 1: Total Attempted */}
            <div className="p-4 rounded-2xl border border-hairline bg-white/75 dark:bg-zinc-900/35 backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 select-none">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-inner shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">Attempted</p>
                <p className="text-sm font-black text-ink mt-0.5">{totalAttempted} exams</p>
              </div>
            </div>

            {/* Stat 2: Total Score */}
            <div className="p-4 rounded-2xl border border-hairline bg-white/75 dark:bg-zinc-900/35 backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 select-none">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">Total Score</p>
                <p className="text-sm font-black text-ink mt-0.5">{totalScore} pts</p>
              </div>
            </div>

            {/* Stat 3: Overall Accuracy */}
            <div className="p-4 rounded-2xl border border-hairline bg-white/75 dark:bg-zinc-900/35 backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 select-none">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-450 flex items-center justify-center shadow-inner shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">Accuracy</p>
                <p className="text-sm font-black text-ink mt-0.5">{overallAccuracy}%</p>
              </div>
            </div>

            {/* Stat 4: Codeathon Rank */}
            <div className="p-4 rounded-2xl border border-hairline bg-white/75 dark:bg-zinc-900/35 backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 select-none">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner shrink-0">
                <BarChart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono">Rank</p>
                <p className="text-sm font-black text-ink mt-0.5">#{codeathonRank}</p>
              </div>
            </div>
          </div>
        )}

        {isGuest ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-hairline bg-surface-soft text-gray-500">
            <Award className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <h3 className="text-ink font-bold text-sm mb-1">Login to See Results</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">You need to be logged in to view your codeathon results and rankings.</p>
          </div>
        ) : loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Skeletons for Top Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-hairline bg-white/60 dark:bg-zinc-900/30 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Scorecards skeleton */}
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-36 rounded-2xl bg-white/60 dark:bg-zinc-900/30 border border-hairline" />
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-hairline bg-surface-soft text-gray-500">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <h3 className="text-ink font-bold text-sm mb-1">No Results Yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
              Results appear here after a codeathon ends and you have submitted an attempt. Check the Codeathons tab for upcoming exams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-scale-in">
            {results.map(({ quiz, attempt, questions }) => {
              const totalScore = questions.reduce((acc: number, q: any) => acc + (q.points || 0), 0)
              const myScore = attempt.score || 0
              const totalQs = questions.length
              
              // Calculate accuracy percentage based on passed test cases / total test cases
              const summary = attempt.student_details?.testCasesSummary || {}
              let passedCases = 0
              let totalCases = 0
              questions.forEach((q: any) => {
                const qTotal = getQuestionTotalCases(q.verification_script)
                const passed = summary[q.id]?.passed || 0
                passedCases += passed
                totalCases += qTotal
              })
              const pct = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0
              const timeTaken = (() => {
                if (!attempt.started_at || !attempt.completed_at) return 'N/A'
                const ms = new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()
                const s = Math.floor(ms / 1000)
                return `${Math.floor(s / 60)}m ${s % 60}s`
              })()
              const warnings = attempt.warnings_count || 0
              const barColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
              const endDate = new Date(quiz.end_time)

              return (
                <div
                  key={attempt.id}
                  className="p-5 rounded-2xl border border-hairline bg-white dark:bg-zinc-900/40 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                      {attempt.is_disqualified ? 'Disqualified' : 'Completed'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {endDate.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-sm font-extrabold text-ink tracking-tight leading-snug">{quiz.title}</h2>

                  {/* Stats Boxes Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-xl border border-hairline bg-surface-soft text-center">
                      <p className="text-sm font-black text-ink">{myScore}<span className="text-[9px] text-gray-500 font-light">/{totalScore}</span></p>
                      <p className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 font-mono uppercase tracking-wider mt-0.5">Score</p>
                    </div>
                    <div className="p-2 rounded-xl border border-hairline bg-surface-soft text-center">
                      <p className="text-sm font-black text-ink">{totalQs}</p>
                      <p className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 font-mono uppercase tracking-wider mt-0.5">Total Qs</p>
                    </div>
                    <div className="p-2 rounded-xl border border-hairline bg-surface-soft text-center">
                      <p className="text-sm font-black text-ink truncate">{timeTaken}</p>
                      <p className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 font-mono uppercase tracking-wider mt-0.5">Time</p>
                    </div>
                    <div className="p-2 rounded-xl border border-hairline bg-surface-soft text-center">
                      <p className="text-sm font-black text-ink">{warnings}<span className="text-[9px] text-gray-500 font-light">/3</span></p>
                      <p className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 font-mono uppercase tracking-wider mt-0.5">Warnings</p>
                    </div>
                  </div>

                  {/* Accuracy Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 dark:text-zinc-400 font-bold">
                      <span>Test Case Accuracy</span>
                      <span style={{ color: barColor }}>{pct}% accuracy</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>

                  {/* View button */}
                  <button
                    onClick={() => setSelectedResult({ quiz, attempt, questions })}
                    className="w-full py-2.5 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    View Scorecard Details
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
