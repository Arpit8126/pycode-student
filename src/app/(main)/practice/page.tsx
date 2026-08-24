'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_QUESTIONS, LocalQuestion } from '@/lib/localQuestions'
import { CheckCircle2, Circle, AlertCircle, Award, BarChart2, BookOpen, ChevronDown, ChevronRight, Search, Shuffle, WifiOff } from 'lucide-react'

export default function PracticeListPage() {
  const supabase = createClient() as any
  
  const [questions, setQuestions] = useState<LocalQuestion[]>(LOCAL_QUESTIONS)
  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set())
  const [attemptedIds, setAttemptedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [disqualifiedMessage, setDisqualifiedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('disqualified') === 'true') {
        setDisqualifiedMessage('You have been disqualified from the codeathon for violating security protocols (e.g. exiting fullscreen or switching tabs).')
        const newUrl = window.location.pathname
        window.history.replaceState({ path: newUrl }, '', newUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Collapsed sections map
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'python-ifelse': true,
    'python-loops': true,
    'python-patterns': true,
    'python-strings': true,
    'python-lists-arrays': true,
    'python-dicts': true,
    'python-oop': true,
    'numpy': true,
    'pandas': true,
    'matplotlib-seaborn': true
  })

  const toggleCategory = (catId: string) => {
    setExpandedCats(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }))
  }

  const cleanTitle = (title: string): string => {
    return title || ''
  }

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true)
      try {
        // Use LOCAL_QUESTIONS as the question source (correct titles, proper HTML)
        // Supabase is used only for user progress tracking (solved/attempted IDs)
        setQuestions(LOCAL_QUESTIONS)

        // Fetch logged user submission history
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: submissions } = await supabase
            .from('coding_submissions')
            .select('question_id, status, quiz_attempt_id')
            .eq('user_id', user.id)

          if (submissions) {
            const solved = new Set<number>()
            const attempted = new Set<number>()

            submissions.forEach((sub: any) => {
              if (sub.status === 'accepted') {
                solved.add(sub.question_id)
              } else {
                if (!sub.quiz_attempt_id) {
                  attempted.add(sub.question_id)
                }
              }
            })

            // If a question is solved, remove it from attempted
            solved.forEach(id => attempted.delete(id))

            setSolvedIds(solved)
            setAttemptedIds(attempted)
          }
        }
      } catch (err) {
        console.error("Failed to load progress metrics:", err)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [])

  // Categories definition
  const categories = [
    { id: 'python-ifelse', name: '1. Control Flow (If/Else)', desc: 'Boolean expressions, relational operators, conditional branching' },
    { id: 'python-loops', name: '2. Loops & Math Logic', desc: 'For/while iterations, primes, Fibonacci, and number properties' },
    { id: 'python-patterns', name: '3. Pattern Printing', desc: 'Nested loops generating stars, numbers, and character grids' },
    { id: 'python-strings', name: '4. String Methods & Algorithms', desc: 'Slicing, splits, joins, substring indexing, and string algorithms' },
    { id: 'python-lists-arrays', name: '5. Lists & Array Algorithms', desc: 'List comprehensions, rotation, chunking, binary search, sorting, two-pointer techniques' },
    { id: 'python-dicts', name: '6. Dictionaries & Sets', desc: 'Frequency count, hash maps, key-value lookup operations' },
    { id: 'python-oop', name: '7. OOP, Lambdas & Exceptions', desc: 'Classes, encapsulation, inheritance, property decorators, dunders, custom errors' },
    { id: 'numpy', name: '8. NumPy Scientific Computing', desc: 'N-dimensional arrays, mathematical vectorization, matrix transformations' },
    { id: 'pandas', name: '9. Pandas Data Science & Analysis', desc: 'DataFrames, null handling, indexing, group-by, merging, filtering datasets' },
    { id: 'matplotlib-seaborn', name: '10. Matplotlib & Seaborn Visuals', desc: 'Bar plots, line charts, scatter plots, canvas styling, and distributions' }
  ]

  // Filtered lists helper
  const getFilteredQuestions = (catId: string) => {
    return questions.filter(q => {
      const matchCat = q.category === catId
      const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
                          q.description.toLowerCase().includes(search.toLowerCase())
      const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
      return matchCat && matchSearch && matchDiff
    })
  }

  // overall counts
  const totalQuestions = questions.length
  const totalSolved = solvedIds.size
  const solvePercent = totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0

  const easyTotal = questions.filter(q => q.difficulty === 'easy').length
  const easySolved = questions.filter(q => q.difficulty === 'easy' && solvedIds.has(q.id)).length

  const mediumTotal = questions.filter(q => q.difficulty === 'medium').length
  const mediumSolved = questions.filter(q => q.difficulty === 'medium' && solvedIds.has(q.id)).length

  const hardTotal = questions.filter(q => q.difficulty === 'hard').length
  const hardSolved = questions.filter(q => q.difficulty === 'hard' && solvedIds.has(q.id)).length

  // Pick random unsolved problem
  const handleRandomProblem = () => {
    const unsolved = questions.filter(q => !solvedIds.has(q.id))
    const pool = unsolved.length > 0 ? unsolved : questions
    if (pool.length > 0) {
      const rand = pool[Math.floor(Math.random() * pool.length)]
      window.location.href = `/practice/${rand.id}`
    }
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans p-8 flex items-center justify-center">
        <div className="p-8 rounded-3xl bg-surface-soft border border-hairline text-center max-w-md mx-auto space-y-4 shadow-sm animate-scale-in">
          <WifiOff className="w-12 h-12 text-error mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-ink">No Internet Connection</h2>
          <p className="text-xs text-muted font-light leading-relaxed">
            You are currently offline. Please check your internet connection to access practice problems and submit test solutions.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs cursor-pointer transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans p-8 animate-pulse">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-64 bg-surface-soft rounded-md"></div>
            <div className="h-4 w-full max-w-xl bg-surface-soft rounded-md"></div>
          </div>

          {/* Progress Card Skeleton */}
          <div className="p-8 rounded-3xl bg-surface-soft/40 border border-hairline flex flex-col md:flex-row items-center gap-8 shadow-sm">
            <div className="w-24 h-24 rounded-full bg-surface-soft"></div>
            <div className="flex-1 space-y-3 w-full">
              <div className="h-5 w-40 bg-surface-soft rounded-md"></div>
              <div className="h-3.5 w-60 bg-surface-soft rounded-md"></div>
              <div className="flex gap-4">
                <div className="h-6 w-24 bg-surface-soft rounded-full"></div>
                <div className="h-6 w-24 bg-surface-soft rounded-full"></div>
                <div className="h-6 w-24 bg-surface-soft rounded-full"></div>
              </div>
            </div>
            <div className="h-10 w-36 bg-surface-soft rounded-full"></div>
          </div>

          {/* Filter Bar Skeleton */}
          <div className="h-16 bg-surface-soft border border-hairline rounded-2xl"></div>

          {/* Category List Skeletons */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-hairline bg-surface-soft/40 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-surface-soft rounded-md"></div>
                    <div className="h-3 w-64 bg-surface-soft rounded-md"></div>
                  </div>
                  <div className="h-4 w-12 bg-surface-soft rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans p-8 select-none">
      {disqualifiedMessage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-canvas border border-red-500/30 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink leading-tight">Exam Disqualification Alert</h3>
              <p className="text-sm text-body font-medium leading-relaxed dark:text-zinc-350">{disqualifiedMessage}</p>
            </div>
            <button
              onClick={() => setDisqualifiedMessage(null)}
              className="w-full py-2 bg-primary hover:opacity-90 text-on-primary rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Understand &amp; Acknowledge
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner details */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center border-b border-hairline pb-4 mb-2">
          {/* Left Column: Title & Description */}
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink font-sans">
              Arpit's Coding Sheet
            </h1>
            <p className="text-xs text-gray-500 font-light leading-relaxed max-w-2xl">
              This workspace provides a structured roadmap to learn Python coding, NumPy structures, Pandas cleaning routines, and Matplotlib visualizations.
            </p>
          </div>

          {/* Right Column: Developer Info Box utilizing the entire height */}
          <div className="flex items-center gap-4 bg-white dark:bg-surface-card border border-hairline px-6 py-4 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-none self-stretch justify-center">
            <div className="space-y-0.5 text-left md:text-right">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 font-mono">Developed By</p>
              <h4 className="text-sm font-extrabold text-ink dark:text-white">Arpit Pandey</h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-none">Student at GLA University</p>
            </div>
            <div className="h-10 w-[1px] bg-black/10 dark:bg-white/10 mx-1"></div>
            <a
              href="https://www.linkedin.com/in/dev-arpit/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full bg-[#0a66c2] hover:bg-[#004182] text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-[1.02] shrink-0"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              Visit LinkedIn
            </a>
          </div>
        </div>

        {/* Overall progress visualizer panel - LeetCode Style Solved Problems + Quick Actions side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-ink">
          {/* Card 1: Solved Problems Card */}
          <div className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Solved Problems</h3>
            
            <div className="flex items-center gap-8 py-4">
              {/* Circular Gauge */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  {/* Track Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    className="stroke-hairline-soft fill-transparent"
                    strokeWidth="4.5"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    className="stroke-primary fill-transparent transition-all duration-500 ease-out"
                    strokeWidth="4.5"
                    strokeDasharray={226.19}
                    strokeDashoffset={226.19 - (solvePercent / 100) * 226.19}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <span className="text-2xl font-extrabold text-ink leading-none">{totalSolved}</span>
                  <span className="text-[10px] text-gray-400 font-medium mt-1">Solved</span>
                </div>
              </div>

              {/* Progress Breakdown Bars */}
              <div className="flex-1 space-y-3.5">
                {/* Easy Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-500">Easy</span>
                    <span className="text-ink font-mono">{easySolved}<span className="text-gray-400 font-light">/{easyTotal}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${easyTotal > 0 ? (easySolved / easyTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-500">Medium</span>
                    <span className="text-ink font-mono">{mediumSolved}<span className="text-gray-400 font-light">/{mediumTotal}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${mediumTotal > 0 ? (mediumSolved / mediumTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Hard Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-red-500">Hard</span>
                    <span className="text-ink font-mono">{hardSolved}<span className="text-gray-400 font-light">/{hardTotal}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions Card */}
          <div className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px]">
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest font-mono">Quick Actions</h3>
              <p className="text-sm font-semibold text-ink mt-3">Ready for a new challenge?</p>
              <p className="text-xs text-body font-light mt-1 leading-relaxed">
                Click below to select a random unsolved programming challenge and test your current syntax skills instantly!
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-black/5 pt-4 mt-4">
              <span className="text-[10px] text-muted font-mono tracking-wider uppercase font-bold">
                Total Solved: {solvePercent}%
              </span>
              <button
                onClick={handleRandomProblem}
                className="px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary font-bold text-xs cursor-pointer transition-opacity flex items-center gap-1.5 shadow-md"
              >
                <Shuffle className="w-4 h-4" />
                Random Problem
              </button>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-canvas border border-hairline rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="w-full md:w-96 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges by title..."
              className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-hairline rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-ink transition-all font-light"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['all', 'easy', 'medium', 'hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono cursor-pointer transition-all ${
                  selectedDifficulty === diff
                    ? 'bg-primary text-on-primary border border-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                    : 'bg-canvas text-gray-500 border border-hairline hover:text-ink'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Drawers */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const list = getFilteredQuestions(cat.id)
            const catTotal = list.length
            const catSolved = list.filter(q => solvedIds.has(q.id)).length
            const catPercent = catTotal > 0 ? Math.round((catSolved / catTotal) * 100) : 0
            const isExpanded = expandedCats[cat.id]

            if (catTotal === 0 && search) return null // Hide category if empty during filter

            return (
              <div key={cat.id} className="border border-hairline bg-canvas rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
                {/* Accordion Trigger Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-surface-soft transition-all"
                >
                  <div className="space-y-1 pr-4">
                    <span className="text-sm font-bold text-ink tracking-tight">{cat.name}</span>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">{cat.desc}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Progress fraction and bar */}
                    <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                      <div className="w-24 h-1.5 bg-surface-soft rounded-full overflow-hidden border border-hairline">
                        <div 
                          className="h-full bg-primary transition-all duration-700" 
                          style={{ width: `${catPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-500 min-w-[36px] text-right">{catSolved} / {catTotal}</span>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Collapsible Body Table */}
                {isExpanded && (
                  <div className="border-t border-hairline bg-canvas overflow-x-auto animate-fade-in text-xs">
                    {list.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 font-light">
                        No active problems match the current filter criteria.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-soft text-gray-500 border-b border-hairline font-mono text-[9px] uppercase tracking-wider font-semibold">
                            <th className="px-6 py-3.5 w-16">Status</th>
                            <th className="px-6 py-3.5">Problem Name</th>
                            <th className="px-6 py-3.5">Difficulty</th>
                            <th className="px-6 py-3.5 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {list.map((q) => {
                            const isSolved = solvedIds.has(q.id)
                            const isAttempted = attemptedIds.has(q.id)

                            return (
                              <tr key={q.id} className="hover:bg-surface-soft transition-colors group">
                                <td className="px-6 py-3.5">
                                  {isSolved ? (
                                    <CheckCircle2 className="w-4.5 h-4.5 text-semantic-success" />
                                  ) : isAttempted ? (
                                    <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                                  ) : (
                                    <Circle className="w-4.5 h-4.5 text-gray-300" />
                                  )}
                                </td>
                                <td className="px-6 py-3.5 font-semibold text-ink">
                                  <Link
                                    href={`/practice/${q.id}`}
                                    className="text-ink hover:underline group-hover:text-primary transition-colors"
                                  >
                                    {cleanTitle(q.title)}
                                  </Link>
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border font-mono ${
                                    q.difficulty === 'easy' ? 'bg-success/10 text-success border-success/20' :
                                    q.difficulty === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                                    'bg-error/10 text-error border-error/20'
                                  }`}>
                                    {q.difficulty}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 text-right font-bold text-gray-500 font-mono">
                                  {q.points}
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
          })}
        </div>
      </div>
    </div>
  )
}
