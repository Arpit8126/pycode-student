'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePyodide } from '@/hooks/usePyodide'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import { createClient } from '@/lib/supabase/client'
import { DATASET_SAMPLES } from '@/lib/datasetSamples'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'
import { enrichQuestionDetails } from '@/lib/questionFormatter'
import { Play, RefreshCw, BarChart, Database, Terminal, FileText, CheckCircle, XCircle, ShieldAlert, Clock, AlertTriangle, Copy, Send, Settings, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'

interface QuestionDetails {
  id: number
  title: string
  difficulty: string
  points: number
  category: string
  description: string
  starter_code: string
  verification_script: string
  dataset_name: string | null
}

export default function ExamAttemptPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient() as any
  const quizId = params.id as string
  
  const { state: pyodideState, progressMsg: pyodideProgress, runCode } = usePyodide()

  // Quiz details
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<QuestionDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Exam operational states
  const [hasStarted, setHasStarted] = useState(false)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(0) // seconds remaining
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Anti-cheating logs
  const [warnings, setWarnings] = useState(0)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [lastWarningReason, setLastWarningReason] = useState('')

  // Sandbox outcome states per question
  const [isRunning, setIsRunning] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState<Record<number, string>>({})
  const [plotUrls, setPlotUrls] = useState<Record<number, string>>({})
  const [testChecks, setTestChecks] = useState<Record<number, { passed: number, total: number }>>({})
  const [evalStates, setEvalStates] = useState<Record<number, 'success' | 'wrong' | 'error' | 'idle'>>({})

  // Left & Right subtabs
  const [leftTab, setLeftTab] = useState<'description' | 'dataset'>('description')
  const [rightTab, setRightTab] = useState<'terminal' | 'plots' | 'cases'>('terminal')

  // Panel collapse and theme toggling
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const editorRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const updateTheme = () => {
      const isLight = !document.documentElement.classList.contains('dark')
      setTheme(isLight ? 'light' : 'dark')
    }
    
    updateTheme()
    
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    const isLightNow = !document.documentElement.classList.contains('dark')
    if (isLightNow) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
  }

  // Explicit Monaco theme bindings
  const monaco = useMonaco()

  // Handle font loading calculation adjustments for Monaco Editor overlay alignment
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleLayout = () => {
      if (editorRef.current) {
        editorRef.current.layout()
      }
      if (monaco) {
        monaco.editor.remeasureFonts()
      }
    }
    document.fonts.ready.then(handleLayout)
    const t1 = setTimeout(handleLayout, 100)
    const t2 = setTimeout(handleLayout, 350)
    const t3 = setTimeout(handleLayout, 800)
    const t4 = setTimeout(handleLayout, 1800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [editorRef.current, monaco])

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'light')
    }
  }, [theme, monaco])

  // Load Quiz metadata
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true)
      try {
        const { data: quizData, error: qErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .maybeSingle()

        if (qErr || !quizData) {
          alert('Failed to load quiz metadata. Returning to tests panel.')
          router.push('/tests')
          return
        }

        setQuiz(quizData)
        setTimeLeft(quizData.duration_minutes * 60)

        // Fetch questions included in this quiz
        const qIds = quizData.question_ids || []
        if (qIds.length > 0) {
          const { data: qData, error: qDataErr } = await supabase
            .from('coding_questions')
            .select('*')
            .in('id', qIds)

          if (!qDataErr && qData) {
            // Reorder questions to match the quiz schedule question_ids order
            const sortedQ = qIds.map((id: number) => qData.find((q: any) => q.id === id)).filter(Boolean)
            setQuestions(sortedQ as any)
            
            // Initialize answer inputs
            const initialAnswers: Record<number, string> = {}
            const savedAnswersStr = typeof window !== 'undefined' ? localStorage.getItem(`pycode_exam_answers_${quizId}`) : null
            const savedAnswers = savedAnswersStr ? JSON.parse(savedAnswersStr) : null

            sortedQ.forEach((q: any) => {
              initialAnswers[q.id] = (savedAnswers && savedAnswers[q.id] !== undefined)
                ? savedAnswers[q.id]
                : (q.starter_code || '')
            })
            setAnswers(initialAnswers)
          }
        }
      } catch (err) {
        console.error("Quiz load crash:", err)
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [quizId, supabase, router])

  // Save answers draft to localStorage on change
  useEffect(() => {
    if (Object.keys(answers).length > 0 && quizId) {
      localStorage.setItem(`pycode_exam_answers_${quizId}`, JSON.stringify(answers))
    }
  }, [answers, quizId])

  // Fullscreen, tab change, focus loss tracking
  useEffect(() => {
    if (!hasStarted) return

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerWarning('Exiting fullscreen mode.')
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerWarning('Tab switch detected.')
      }
    }

    const handleBlur = () => {
      triggerWarning('Focus loss detected (exited browser workspace).')
    }

    const preventKeys = (e: KeyboardEvent) => {
      // Prevent F12, Escape, Alt+Tab, command shortcuts
      const isAlt = e.altKey
      const isMeta = e.metaKey
      if (e.key === 'F12' || e.key === 'Escape' || (isAlt && e.key === 'Tab') || isMeta) {
        e.preventDefault()
        triggerWarning('System shortcut detected.')
      }
    }

    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      triggerWarning('Copy, cut, or paste operation attempted.')
    }

    // Bind event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('keydown', preventKeys, true)
    document.addEventListener('copy', preventCopyPaste, true)
    document.addEventListener('cut', preventCopyPaste, true)
    document.addEventListener('paste', preventCopyPaste, true)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('keydown', preventKeys, true)
      document.removeEventListener('copy', preventCopyPaste, true)
      document.removeEventListener('cut', preventCopyPaste, true)
      document.removeEventListener('paste', preventCopyPaste, true)
    }
  }, [hasStarted, warnings])

  // Exam Countdown Timer
  useEffect(() => {
    if (!hasStarted || timeLeft <= 0) {
      if (hasStarted && timeLeft <= 0) {
        // Auto-submit
        handleSubmitQuiz(true)
      }
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [hasStarted, timeLeft])

  const triggerWarning = (reason: string) => {
    // Prevent immediate multiple warning triggering during tab state transition races
    if (showWarningModal) return

    setLastWarningReason(reason)
    const nextWarnings = warnings + 1
    setWarnings(nextWarnings)

    if (nextWarnings >= 3) {
      // 3 strikes: Disqualify
      alert('Disqualification: You have violated the testing protocols 3 times. Your exam will be automatically submitted now.')
      handleSubmitQuiz(true, true)
    } else {
      setShowWarningModal(true)
    }
  }

  const startExam = async () => {
    try {
      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      setHasStarted(true)
    } catch (err) {
      alert('You must allow fullscreen permissions to take this exam.')
    }
  }

  // Run student code locally using Pyodide WASM
  const handleExecuteCode = async () => {
    const activeQ = questions[activeQuestionIdx]
    if (!activeQ) return
    if (pyodideState !== 'ready') {
      alert(`Python compiler is not ready yet: ${pyodideProgress}`)
      return
    }

    setIsRunning(true)
    setRightTab('terminal')
    setConsoleOutput(prev => ({ ...prev, [activeQ.id]: 'Compiler: Running script...' }))
    setPlotUrls(prev => {
      const next = { ...prev }
      delete next[activeQ.id]
      return next
    })

    try {
      const outcome = await runCode(answers[activeQ.id] || '', activeQ.verification_script || '')
      
      const outputText = outcome.output || 'Execution complete with no console output.'
      setConsoleOutput(prev => ({ ...prev, [activeQ.id]: outputText }))
      
      if (outcome.visualization) {
        setPlotUrls(prev => ({ ...prev, [activeQ.id]: `data:image/png;base64,${outcome.visualization}` }))
        setRightTab('plots')
      }

      const passed = outcome.passed_cases || 0
      const total = outcome.total_cases || 0
      setTestChecks(prev => ({ 
        ...prev, 
        [activeQ.id]: { passed, total } 
      }))

      if (outcome.status === 'accepted') {
        setEvalStates(prev => ({ ...prev, [activeQ.id]: 'success' }))
      } else if (outcome.status === 'wrong_answer') {
        setEvalStates(prev => ({ ...prev, [activeQ.id]: 'wrong' }))
      } else {
        setEvalStates(prev => ({ ...prev, [activeQ.id]: 'error' }))
      }
    } catch (err: any) {
      setConsoleOutput(prev => ({ ...prev, [activeQ.id]: `Failed to execute: ${err.message}` }))
      setEvalStates(prev => ({ ...prev, [activeQ.id]: 'error' }))
    } finally {
      setIsRunning(false)
    }
  }

  // End Exam and submit
  const handleSubmitQuiz = async (auto = false, disqualified = false) => {
    if (!auto && !confirm('Are you sure you want to finish and submit the exam? You will not be able to return.')) {
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      // 1. Calculate Score percentage
      let totalPoints = 0
      let earnedPoints = 0

      questions.forEach((q) => {
        totalPoints += q.points
        const check = testChecks[q.id]
        if (check && check.total > 0) {
          earnedPoints += (check.passed / check.total) * q.points
        } else {
          const outcome = evalStates[q.id]
          if (outcome === 'success') {
            earnedPoints += q.points
          }
        }
      })

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

      // 2. Create Quiz Attempt record
      const { data: attempt, error: attemptErr } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quiz.id,
          score: disqualified ? 0 : Math.round(earnedPoints),
          score_percentage: disqualified ? 0 : scorePercentage,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (attemptErr) throw attemptErr

      // 3. Save individual question submissions linked to this attempt ID
      const submissionPromises = questions.map((q) => {
        const check = testChecks[q.id]
        let pointsEarned = 0
        let isSuccess = false
        if (check && check.total > 0) {
          pointsEarned = Math.round((check.passed / check.total) * q.points)
          isSuccess = check.passed === check.total
        } else {
          const outcome = evalStates[q.id]
          if (outcome === 'success') {
            pointsEarned = q.points
            isSuccess = true
          }
        }

        return supabase.from('coding_submissions').insert({
          user_id: user.id,
          question_id: q.id,
          quiz_attempt_id: attempt.id,
          submitted_code: answers[q.id] || '',
          status: disqualified ? 'wrong_answer' : (isSuccess ? 'accepted' : 'wrong_answer'),
          score_points: disqualified ? 0 : pointsEarned
        })
      })

      await Promise.all(submissionPromises)

      // Clear localStorage draft on successful exam submission
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`pycode_exam_answers_${quizId}`)
      }

      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }

      router.push('/tests?submitSuccess=true')
    } catch (err: any) {
      console.error(err)
      alert(`Submission failed: ${err.message || err}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-sans text-ink">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 font-light">Entering Exam Room...</p>
        </div>
      </div>
    )
  }

  // 1. Initial fullscreen gate modal
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12 text-ink font-sans">
        <div className="max-w-xl w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-[0_4px_16px_rgba(0,0,0,0.06)] relative overflow-hidden animate-scale-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error/10 blur-3xl rounded-full"></div>
          
          <div className="w-16 h-16 rounded-2xl bg-error/15 border border-error/20 flex items-center justify-center text-error mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight mb-2 text-ink">Quiz Secure Exam Sandbox</h1>
          <p className="text-sm text-gray-500 font-light leading-relaxed mb-6">
            You are attempting <strong className="text-ink">"{quiz?.title}"</strong>. To protect the credibility and security of university programming exams, PyCode enforces strict anti-cheating supervision protocols.
          </p>

          {/* Secure guidelines list */}
          <div className="space-y-3.5 mb-8 text-xs text-gray-600 font-light bg-surface-soft border border-hairline p-5 rounded-2xl">
            <div className="flex gap-2">
              <span className="text-error font-bold">&#8226;</span>
              <p><strong className="text-ink font-bold">Fullscreen Locking</strong>: Exiting fullscreen mode triggers security warnings.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-error font-bold">&#8226;</span>
              <p><strong className="text-ink font-bold">Tab-Switch Blocker</strong>: Opening new tabs, developer consoles, or switching applications is flagged.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-error font-bold">&#8226;</span>
              <p><strong className="text-ink font-bold">3-Warnings Strike</strong>: Receiving 3 alerts automatically disqualifies and submits your test.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-error font-bold">&#8226;</span>
              <p><strong className="text-ink font-bold">Clipboard Protection</strong>: Copying or pasting code into Monaco editor is disabled.</p>
            </div>
          </div>

          <button
            onClick={startExam}
            className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer transition-all text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            I Agree & Enter Fullscreen
          </button>
        </div>
      </div>
    )
  }

  const activeQ = questions[activeQuestionIdx]
  const sample = activeQ?.dataset_name ? DATASET_SAMPLES[activeQ.dataset_name] : null
  const activeCode = answers[activeQ?.id] || ''

  return (
    <div className="h-screen w-full flex flex-col bg-canvas font-sans text-ink select-none relative">
      {/* Warning Overlay Modal */}
      {showWarningModal && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border-2 border-amber-500 text-center shadow-2xl animate-scale-in text-ink">
            <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/25 flex items-center justify-center text-warning mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-ink">Security Violation Alert</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed font-light">
              Reason: <strong className="text-warning font-semibold">{lastWarningReason}</strong>. Exiting the exam pane violates test protocols.
            </p>
            
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline mb-6 flex justify-between items-center text-xs">
              <span className="text-gray-500 uppercase tracking-wider font-semibold">Active Warnings</span>
              <span className="font-bold text-lg text-warning">{warnings} / 3</span>
            </div>

            <button
              onClick={async () => {
                setShowWarningModal(false)
                // Attempt to re-enter fullscreen
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen()
                  }
                } catch {}
              }}
              className="px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all text-sm cursor-pointer"
            >
              Resume Testing
            </button>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <header className="h-16 border-b border-hairline bg-canvas px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold tracking-tight text-ink">{quiz?.title}</span>
          <span className="text-[9px] text-gray-500 border border-hairline bg-surface-soft px-2.5 py-1 rounded-full uppercase font-bold tracking-widest font-mono">
            Exam Mode
          </span>
          {pyodideState !== 'ready' ? (
            <span className="text-xs text-amber-600 flex items-center gap-2 animate-pulse font-light ml-4">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {pyodideProgress}
            </span>
          ) : null}
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-3 bg-surface-soft border border-hairline px-4 py-2 rounded-full">
          <Clock className={`w-4 h-4 ${timeLeft < 120 ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
          <span className={`font-mono text-sm font-bold ${timeLeft < 120 ? 'text-red-655' : 'text-ink'}`}>
            {formatTimer(timeLeft)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExecuteCode}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-full bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? 'Running...' : 'Run Checks'}
          </button>

          <button
            onClick={() => handleSubmitQuiz()}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-555 text-white text-xs font-bold cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </header>

      {/* Main split grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost minimal sidebar showing quiz question tabs */}
        <nav className="w-20 bg-canvas border-r border-hairline flex flex-col items-center py-6 gap-3">
          {questions.map((q, idx) => {
            const isActive = idx === activeQuestionIdx
            const state = evalStates[q.id]
            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestionIdx(idx)
                  setLeftTab('description')
                }}
                className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-primary border-primary text-on-primary shadow-lg'
                    : 'bg-canvas border-hairline text-gray-500 hover:text-ink hover:border-gray-400'
                }`}
              >
                Q{idx + 1}
                {state === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-semantic-success mt-0.5 animate-pulse"></span>}
                {state === 'wrong' && <span className="w-1.5 h-1.5 rounded-full bg-error mt-0.5 animate-pulse"></span>}
              </button>
            )
          })}
        </nav>

        {/* Instructions Pane */}
        {!leftPanelCollapsed && (
          <section className="w-[35%] border-r border-hairline flex flex-col bg-canvas">
            <div className="flex border-b border-hairline bg-surface-soft items-stretch">
              <button
                onClick={() => setLeftTab('description')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
                  leftTab === 'description'
                    ? 'border-primary text-ink bg-canvas'
                    : 'border-transparent text-gray-500 hover:text-ink'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Description
              </button>

              {sample && (
                <button
                  onClick={() => setLeftTab('dataset')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
                    leftTab === 'dataset'
                      ? 'border-primary text-ink bg-canvas'
                      : 'border-transparent text-gray-500 hover:text-ink'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Dataset
                </button>
              )}

              <button
                onClick={() => setLeftPanelCollapsed(true)}
                title="Minimize panel"
                className="px-4 text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-all border-l border-hairline flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-canvas text-ink">
            {leftTab === 'description' ? (
              <article className="prose prose-sm max-w-none">
                <h2 className="text-base font-extrabold text-ink mb-2">{activeQ?.title}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-surface-soft text-gray-500 border border-hairline font-mono">
                    {activeQ?.category.replace('-', ' ')}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20 font-mono">
                    {activeQ?.points} points
                  </span>
                </div>
                <div 
                  className="text-body leading-relaxed font-light text-sm markdown-body space-y-4 font-sans"
                  dangerouslySetInnerHTML={{ __html: enrichQuestionDetails(activeQ) }}
                />
              </article>
            ) : (
              <div className="space-y-6 text-xs text-ink">
                <div>
                  <h3 className="text-sm font-bold text-ink">Dataset: {sample?.name}</h3>
                  <p className="text-gray-500 mt-1 font-light leading-relaxed">{sample?.description}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">Column Schemas</h4>
                  <div className="border border-hairline rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-soft text-gray-500 border-b border-hairline">
                          <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider">Column</th>
                          <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline font-mono text-gray-500">
                        {sample?.columns.map((c, i) => (
                          <tr key={i} className="hover:bg-surface-soft">
                            <td className="px-3 py-2 text-primary font-bold">{c.column}</td>
                            <td className="px-3 py-2 text-gray-400 font-light">{c.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Coding Area */}
        <section className="flex-1 flex flex-col bg-canvas border-l border-hairline">
          {/* Monaco Editor Header Bar */}
          <div className="h-11 border-b border-hairline bg-surface-soft px-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              {leftPanelCollapsed && (
                <button
                  onClick={() => setLeftPanelCollapsed(false)}
                  title="Expand description"
                  className="mr-2 p-1.5 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-colors flex items-center justify-center animate-fade-in"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[9px] font-bold text-ink bg-canvas px-2.5 py-1 rounded-full border border-hairline flex items-center gap-1.5 uppercase tracking-widest font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse"></span>
                Python 3
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-1.5 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-colors flex items-center justify-center"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div 
            className="flex-1 min-h-[50%] relative border-b border-white/10 bg-[#1e1e1e]"
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
          >
            <Editor
              height="100%"
              defaultLanguage="python"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={activeCode}
              onChange={(val) => {
                if (activeQ) {
                  setAnswers(prev => ({ ...prev, [activeQ.id]: val || '' }))
                }
              }}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                readOnly: isRunning,
                padding: { top: 16, bottom: 16 },
                cursorBlinking: 'smooth',
                contextmenu: false,
                cursorStyle: 'line',
                cursorWidth: 2,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoClosingDelete: 'always',
                autoClosingOvertype: 'always',
                matchBrackets: 'never',
              }}
            />
          </div>

          {/* Outputs */}
          <div className="h-[35%] flex flex-col bg-canvas border-t border-hairline">
            {/* Subtabs */}
            <div className="flex border-b border-hairline bg-surface-soft">
              <button
                onClick={() => setRightTab('terminal')}
                className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
                  rightTab === 'terminal'
                    ? 'border-primary text-ink bg-canvas font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-ink'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Console Terminal
              </button>

              <button
                onClick={() => setRightTab('plots')}
                className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
                  rightTab === 'plots'
                    ? 'border-primary text-ink bg-canvas font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-ink'
                }`}
              >
                <BarChart className="w-3.5 h-3.5" />
                Visualizations
              </button>

              <button
                onClick={() => setRightTab('cases')}
                className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
                  rightTab === 'cases'
                    ? 'border-primary text-ink bg-canvas font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-ink'
                }`}
              >
                Test Checks
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-body bg-canvas">
              {rightTab === 'terminal' && (
                <pre className="whitespace-pre-wrap text-body">
                  {activeQ ? (consoleOutput[activeQ.id] || 'No print output log recorded yet.') : ''}
                </pre>
              )}

              {rightTab === 'plots' && (
                <div className="flex items-center justify-center h-full">
                  {activeQ && plotUrls[activeQ.id] ? (
                    <img src={plotUrls[activeQ.id]} alt="Fig plot" className="max-h-[140px] object-contain rounded-lg border border-hairline p-1 bg-surface-soft animate-scale-in" />
                  ) : (
                    <p className="text-gray-500 font-light text-xs">No Matplotlib canvas figures rendered.</p>
                  )}
                </div>
              )}

              {rightTab === 'cases' && (
                <div className="space-y-4">
                  {activeQ && evalStates[activeQ.id] ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {evalStates[activeQ.id] === 'success' ? (
                          <span className="px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold uppercase flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> SUCCESS</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-error/10 border border-error/20 text-error text-xs font-semibold uppercase flex items-center gap-1.5"><XCircle className="w-4 h-4" /> COMPILATION / WRONG ANSWER</span>
                        )}
                      </div>
                      <p className="text-body text-xs font-light">
                        Test Cases: {testChecks[activeQ.id]?.passed} passed / {testChecks[activeQ.id]?.total} total
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 font-light text-xs">Run code checks to verify test assert assertions.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
