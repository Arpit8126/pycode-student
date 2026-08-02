'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, AlertCircle, FileText, CheckCircle2, Search, X, Link2, Check, Award, BarChart } from 'lucide-react'

export default function CodeathonsListPage() {
  const supabase = createClient() as any
  const [codeathons, setCodeathons] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadCodeathons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Only fetch quizzes that haven't ended yet
      const { data: codeathonData, error: qErr } = await supabase
        .from('quizzes')
        .select('*, profiles:creator_id(username)')
        .gt('end_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (!qErr && codeathonData) {
        setCodeathons(codeathonData)
      }

      if (user) {
        setIsGuest(false)
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, score, score_percentage, completed_at, is_disqualified, started_at, student_details')
          .eq('user_id', user.id)

        if (attemptData) {
          const attemptMap: Record<string, any> = {}
          attemptData.forEach((a: any) => {
            attemptMap[a.quiz_id] = a
          })
          setAttempts(attemptMap)
        }
      } else {
        setIsGuest(true)
      }
    } catch (err) {
      console.error('Failed to load codeathons', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCodeathons()
  }, [])

  // Real-time listener
  useEffect(() => {
    const channel = supabase
      .channel('realtime-student-codeathons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, () => loadCodeathons())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, () => loadCodeathons())
      .subscribe()

    // 5 second tick to dynamically update buttons as time changes
    const tickInterval = setInterval(() => {
      setCodeathons(prev => [...prev])
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(tickInterval)
    }
  }, [supabase])

  const getCodeathonStatus = (codeathon: any) => {
    const now = new Date()
    const start = new Date(codeathon.start_time)
    const end = new Date(codeathon.end_time)

    if (now < start) {
      return { label: 'Coming Soon', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
    }
    if (now > end) {
      return { label: 'Quiz Ended', style: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-550 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/60' }
    }
    return { label: 'Live Now', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
  }

  // Apply search filter
  const filteredCodeathons = codeathons.filter(c =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6 md:p-8 bg-canvas text-ink font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-hairline pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Codeathons</h1>
            <p className="text-gray-500 text-xs mt-1 font-light">Join scheduled university exams under anti-cheating supervision</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search codeathons..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-full text-xs border border-hairline bg-white dark:bg-zinc-900/60 focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono placeholder:text-gray-400 text-ink"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isGuest && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-ink text-xs flex items-center gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-primary" />
            <p className="font-light">
              <strong className="font-bold text-ink">Guest mode active:</strong> You can view scheduled codeathons, but you must be logged in to attempt exams.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {/* Skeletons for Codeathon Cards */}
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-5 rounded-2xl border border-hairline border-l-[5px] border-l-gray-300 dark:border-l-zinc-700 bg-white/60 dark:bg-zinc-900/30 shadow-sm px-5 py-4 overflow-hidden">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="h-4.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-5 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                      <div className="h-3.5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                  </div>
                  <div className="shrink-0 h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredCodeathons.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-hairline bg-surface-soft text-gray-500 animate-scale-in">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <h3 className="text-ink font-bold text-sm mb-1">
              {searchQuery ? 'No matches found' : 'No Active Codeathons'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
              {searchQuery
                ? `No codeathons match "${searchQuery}". Try a different name.`
                : 'No upcoming or live codeathons right now. Check your Results tab for past completed exams.'}
            </p>
            {!searchQuery && (
              <Link
                href="/results"
                className="inline-block mt-5 px-5 py-2 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all shadow-sm uppercase tracking-wider"
              >
                View My Results
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-scale-in">
            {filteredCodeathons.map((codeathon) => {
              const status = getCodeathonStatus(codeathon)
              const userAttempt = attempts[codeathon.id]

              const now = new Date()
              const start = new Date(codeathon.start_time)
              const end = new Date(codeathon.end_time)
              const isExpired = now > end
              const isUpcoming = now < start
              const isLive = now >= start && now <= end

              let actionButton = null

              if (userAttempt) {
                if (userAttempt.is_disqualified) {
                  actionButton = (
                    <button disabled className="px-5 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-extrabold cursor-not-allowed uppercase tracking-wider whitespace-nowrap">
                      Disqualified
                    </button>
                  )
                } else if (userAttempt.completed_at) {
                  actionButton = (
                    <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Submitted
                    </div>
                  )
                } else {
                  actionButton = isExpired ? (
                    <button disabled className="px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[11px] font-bold cursor-not-allowed border border-hairline uppercase tracking-wider whitespace-nowrap">
                      Quiz Ended
                    </button>
                  ) : (
                    <Link href={`/codeathons/${codeathon.id}/attempt`} className="px-5 py-2 rounded-full bg-primary hover:opacity-90 text-on-primary text-[11px] font-bold transition-all shadow-md uppercase tracking-wider whitespace-nowrap">
                      Resume
                    </Link>
                  )
                }
              } else {
                if (isExpired) {
                  actionButton = (
                    <button disabled className="px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 text-[11px] font-bold cursor-not-allowed border border-hairline uppercase tracking-wider whitespace-nowrap">
                      Quiz Ended
                    </button>
                  )
                } else if (isUpcoming) {
                  actionButton = (
                    <button disabled className="px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 text-[11px] font-bold cursor-not-allowed border border-hairline uppercase tracking-wider whitespace-nowrap">
                      Coming Soon
                    </button>
                  )
                } else if (isLive && !isGuest) {
                  actionButton = (
                    <Link href={`/codeathons/${codeathon.id}/attempt`} className="px-5 py-2 rounded-full bg-primary hover:opacity-90 text-on-primary text-[11px] font-bold transition-all shadow-md uppercase tracking-wider animate-scale-in whitespace-nowrap">
                      Attempt Now
                    </Link>
                  )
                } else {
                  actionButton = (
                    <button disabled className="px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 text-[11px] font-bold cursor-not-allowed border border-hairline uppercase tracking-wider whitespace-nowrap">
                      {isGuest ? 'Login to Attempt' : 'Unavailable'}
                    </button>
                  )
                }
              }

              return (
                <div
                  key={codeathon.id}
                  className="flex items-center gap-5 rounded-2xl border border-hairline border-l-[5px] border-l-primary bg-white/75 dark:bg-zinc-900/35 backdrop-blur-md shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 px-5 py-4 overflow-hidden"
                >
                  {/* Left: Status + Title + Meta */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${status.style}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">@{codeathon.profiles?.username || 'teacher'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-ink tracking-tight truncate">{codeathon.title}</h2>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/codeathons/${codeathon.id}/attempt`
                          navigator.clipboard.writeText(link)
                          setCopiedId(codeathon.id)
                          setTimeout(() => setCopiedId(null), 2000)
                        }}
                        className="p-1 rounded-full hover:bg-surface-soft text-gray-400 hover:text-primary transition-colors cursor-pointer shrink-0"
                        title="Copy Codeathon Link"
                      >
                        {copiedId === codeathon.id ? (
                          <Check className="w-3.5 h-3.5 text-success animate-scale-in" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {copiedId === codeathon.id && (
                        <span className="text-[10px] font-mono font-bold text-success animate-fade-in">
                          Copied!
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-gray-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(codeathon.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(codeathon.end_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          if (codeathon.duration_minutes) return `${codeathon.duration_minutes} mins limit`
                          if (codeathon.start_time && codeathon.end_time) {
                            const diffMs = new Date(codeathon.end_time).getTime() - new Date(codeathon.start_time).getTime()
                            const diffMins = Math.max(0, Math.floor(diffMs / 60000))
                            return `${diffMins} mins limit`
                          }
                          return 'No time limit'
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {codeathon.coding_question_ids?.length || 0} questions
                      </span>
                    </div>
                  </div>

                  {/* Right: Action */}
                  <div className="shrink-0">
                    {actionButton}
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
