'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePyodide } from '@/hooks/usePyodide'
import { Monaco, useMonaco } from '@monaco-editor/react'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })
import { createClient } from '@/lib/supabase/client'
import { DATASET_SAMPLES } from '@/lib/datasetSamples'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'
import { enrichQuestionDetails } from '@/lib/questionFormatter'
import { Play, RefreshCw, BarChart, Database, Terminal, FileText, CheckCircle, XCircle, ShieldAlert, Clock, AlertTriangle, Copy, Send, Settings, Sun, Moon, ChevronLeft, ChevronRight, LogIn, UserPlus, X } from 'lucide-react'

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
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({})
  const [isFullscreenActive, setIsFullscreenActive] = useState(true)

  // Anti-cheating logs
  const [warnings, setWarnings] = useState(0)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [lastWarningReason, setLastWarningReason] = useState('')
  const isSubmittingRef = useRef(false)
  const [submitType, setSubmitType] = useState<'manual' | 'auto' | 'disqualified' | null>(null)
  const [isDisqualifiedUser, setIsDisqualifiedUser] = useState(false)

  // Student registration details
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [courseClass, setCourseClass] = useState('')
  const [section, setSection] = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const lastWarningTimeRef = useRef<number>(0)

  // Custom premium modal dialogs instead of native alert/confirm popups
  const [customDialog, setCustomDialog] = useState<{
    show: boolean
    type: 'alert' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
    onCancel?: () => void
  }>({
    show: false,
    type: 'alert',
    title: '',
    message: ''
  })

  const showCustomAlert = (title: string, message: string, onConfirm?: () => void) => {
    setCustomDialog({
      show: true,
      type: 'alert',
      title,
      message,
      onConfirm
    })
  }

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setCustomDialog({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel
    })
  }

  // State for the unsubmitted-questions pre-flight warning modal
  const [showSubmitWarning, setShowSubmitWarning] = useState(false)
  const [unsubmittedWithRuns, setUnsubmittedWithRuns] = useState<QuestionDetails[]>([])

  const handleRequestSubmit = () => {
    // Find questions where at least 1 test case ran but the user never clicked "Submit Question"
    const danglingQuestions = questions.filter(q => {
      const ranTestCases = (testChecks[q.id]?.passed ?? 0) > 0 || (testChecks[q.id]?.total ?? 0) > 0
      const alreadySubmitted = !!submittedQuestions[q.id]
      return ranTestCases && !alreadySubmitted
    })

    if (danglingQuestions.length > 0) {
      // Show the warning — list which questions are dangling
      setUnsubmittedWithRuns(danglingQuestions)
      setShowSubmitWarning(true)
    } else {
      // All ran questions are submitted — just show the standard confirm
      showCustomConfirm(
        'Finish and Submit Exam?',
        'Are you sure you want to submit your answers? Once submitted you cannot return to the exam.',
        () => { handleSubmitQuiz(false, false) }
      )
    }
  }


  const handleQuitExam = () => {
    showCustomConfirm(
      'Disqualify and Quit Exam?',
      'Warning: Quitting the exam now will immediately disqualify you and record a score of 0. You will NOT be allowed to re-attempt this codeathon. Are you sure you want to quit?',
      async () => {
        await handleSubmitQuiz(false, true)
      }
    )
  }

  const handleStopCode = () => {
    setIsRunning(false)
    const activeQ = questions[activeQuestionIdx]
    if (activeQ) {
      setConsoleOutput(prev => ({ ...prev, [activeQ.id]: '[Execution Terminated by User]' }))
      setEvalStates(prev => ({ ...prev, [activeQ.id]: 'error' }))
    }
  }

  const handleSubmitQuestion = async () => {
    const activeQ = questions[activeQuestionIdx]
    if (!activeQ) return
    if (submittedQuestions[activeQ.id]) return // LOCK: already submitted questions cannot be submitted again!

    let check = testChecks[activeQ.id]
    let state = evalStates[activeQ.id]

    if (!check) {
      // Dynamically run checks if not run yet
      setIsRunning(true)
      setRightTab('terminal')
      setConsoleOutput(prev => ({ ...prev, [activeQ.id]: 'Compiler: Running checks before submit...' }))
      try {
        const userCode = answers[activeQ.id] || ''
        const outcome = await runCode(userCode, activeQ.verification_script || '')
        
        const outputText = outcome.output || 'Execution complete with no console output.'
        setConsoleOutput(prev => ({ ...prev, [activeQ.id]: outputText }))
        
        check = {
          passed: outcome.passed_cases ?? 0,
          total: outcome.total_cases ?? 1
        }
        setTestChecks(prev => ({ ...prev, [activeQ.id]: check }))
        state = outcome.status === 'accepted' ? 'success' : (outcome.status === 'wrong_answer' ? 'wrong' : 'error')
        setEvalStates(prev => ({ ...prev, [activeQ.id]: state }))
      } catch (err) {
        console.error("Auto-run on submit failed:", err)
      } finally {
        setIsRunning(false)
      }
    }

    const proceedWithSubmission = () => {
      // Submit question locally
      const nextSubmitted = { ...submittedQuestions, [activeQ.id]: true }
      setSubmittedQuestions(nextSubmitted)

      // Build test case data for this question
      const qTotal = (check && check.total > 0) ? check.total : getQuestionTotalCases(activeQ.verification_script)
      const qPassed = (check && check.total > 0) ? check.passed : (state === 'success' ? qTotal : 0)

      // Save state to DB asynchronously
      if (attemptId) {
        const updatedSummary: Record<number, { passed: number; total: number }> = {}
        questions.forEach((q: any) => {
          if (!nextSubmitted[q.id]) return
          if (q.id === activeQ.id) {
            updatedSummary[q.id] = { passed: qPassed, total: qTotal }
          } else {
            const c = testChecks[q.id]
            const qt = (c && c.total > 0) ? c.total : getQuestionTotalCases(q.verification_script)
            const qp = (c && c.total > 0) ? c.passed : (evalStates[q.id] === 'success' ? qt : 0)
            updatedSummary[q.id] = { passed: qp, total: qt }
          }
        })

        supabase
          .from('quiz_attempts')
          .update({
            student_details: {
              fullName,
              rollNumber,
              courseClass,
              section,
              submittedQuestions: nextSubmitted,
              testCasesSummary: updatedSummary
            }
          })
          .eq('id', attemptId)
          .then((res: any) => {
            if (res.error) console.error('Failed to sync submittedQuestions to DB:', res.error)
          })
      }

      showCustomAlert(
        'Question Submitted Successfully',
        `Challenge "${activeQ.title}" has been successfully completed and submitted. A green status indicator has been recorded.`
      )
    }

    if (state === 'error') {
      showCustomConfirm(
        'Code Contains Errors',
        'Your code contains a compilation, syntax, or runtime error. Would you still like to submit it, or would you prefer to correct the code first?',
        () => { proceedWithSubmission() }
      )
    } else {
      proceedWithSubmission()
    }
  }

  // Sandbox outcome states per question
  const [isRunning, setIsRunning] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState<Record<number, string>>({})
  const [plotUrls, setPlotUrls] = useState<Record<number, string>>({})
  const [showPlotModal, setShowPlotModal] = useState(false)
  const [testChecks, setTestChecks] = useState<Record<number, { passed: number, total: number }>>({})
  const [evalStates, setEvalStates] = useState<Record<number, 'success' | 'wrong' | 'error' | 'idle'>>({})

  // Left & Right subtabs
  const [leftTab, setLeftTab] = useState<'description' | 'dataset'>('description')
  const [rightTab, setRightTab] = useState<'terminal' | 'plots' | 'cases'>('terminal')

  // Panel collapse and theme toggling
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const editorRef = useRef<any>(null)

  // Keep track of text draft sync timeout per question
  const syncTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({})

  // Debounced draft code text syncer (very fast, no compilation, zero UI lag)
  const triggerTextDraftSync = (questionId: number, code: string) => {
    if (syncTimeoutRef.current[questionId]) {
      clearTimeout(syncTimeoutRef.current[questionId])
    }

    syncTimeoutRef.current[questionId] = setTimeout(() => {
      if (!attemptId) return

      const nextAnswers = { ...answers, [questionId]: code }
      supabase
        .from('quiz_attempts')
        .update({
          answers: nextAnswers
        })
        .eq('id', attemptId)
        .then((res: any) => {
          if (res.error) console.error('Failed to sync text draft to DB:', res.error)
        })
    }, 1500)
  }

  // Silent background checks run on blur or question switch
  const runSilentChecks = async (questionIdx: number) => {
    const q = questions[questionIdx]
    if (!q || !attemptId || submittedQuestions[q.id]) return

    const code = answers[q.id] || ''
    if (!code.trim() || code === q.starter_code) return // Don't run empty or starter code

    try {
      const outcome = await runCode(code, q.verification_script || '')
      const passed = outcome.passed_cases || 0
      const total = outcome.total_cases || 0
      const newCheck = { passed, total }

      setTestChecks(prev => {
        const next = { ...prev, [q.id]: newCheck }

        let newState: 'success' | 'wrong' | 'error' = 'error'
        if (outcome.status === 'accepted') {
          newState = 'success'
        } else if (outcome.status === 'wrong_answer') {
          newState = 'wrong'
        }
        setEvalStates(prevStates => ({ ...prevStates, [q.id]: newState }))

        // Update testCasesSummary in database
        const updatedSummary: Record<number, { passed: number; total: number }> = {}
        questions.forEach((item: any) => {
          const c = item.id === q.id ? newCheck : prev[item.id]
          if (c && c.total > 0) {
            updatedSummary[item.id] = { passed: c.passed, total: c.total }
          } else {
            const est = item.id === q.id ? newState : evalStates[item.id]
            const qTotal = getQuestionTotalCases(item.verification_script)
            updatedSummary[item.id] = { passed: est === 'success' ? qTotal : 0, total: qTotal }
          }
        })

        supabase
          .from('quiz_attempts')
          .update({
            student_details: {
              fullName,
              rollNumber,
              courseClass,
              section,
              submittedQuestions: submittedQuestions,
              testCasesSummary: updatedSummary
            }
          })
          .eq('id', attemptId)
          .then((res: any) => {
            if (res.error) console.error('Failed to sync silent checks to DB:', res.error)
          })

        return next
      })
    } catch (e) {
      console.error("Silent background checks failed:", e)
    }
  }

  useEffect(() => {
    return () => {
      Object.values(syncTimeoutRef.current).forEach(t => clearTimeout(t))
    }
  }, [])

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

  // Trigger MathJax typesetting whenever the active question changes
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).MathJax && (window as any).MathJax.typesetPromise) {
      setTimeout(() => {
        try {
          (window as any).MathJax.typesetPromise();
        } catch (e) {
          console.error(e);
        }
      }, 150);
    }
  }, [activeQuestionIdx])

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

    editor.onDidBlurEditorText(() => {
      const activeQ = questions[activeQuestionIdx]
      if (activeQ) {
        runSilentChecks(activeQuestionIdx)
      }
    })

    // Prevent copy, cut, paste via browser events on the Monaco editor DOM node
    const domNode = editor.getDomNode()
    if (domNode) {
      domNode.addEventListener('paste', (e: any) => {
        e.preventDefault()
        e.stopPropagation()
      }, true)
      domNode.addEventListener('copy', (e: any) => {
        e.preventDefault()
        e.stopPropagation()
      }, true)
      domNode.addEventListener('cut', (e: any) => {
        e.preventDefault()
        e.stopPropagation()
      }, true)
    }
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
          showCustomAlert(
            'Failed to Load Quiz',
            'Failed to load codeathon metadata. Returning to panel.',
            () => { router.push('/codeathons') }
          )
          return
        }

        setQuiz(quizData)

        // Fetch current user details & check if they have any existing completed or in-progress attempts
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsGuest(false)
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .maybeSingle()

          if (prof) {
            if (prof.full_name) setFullName(prof.full_name)
            if (prof.username) setUsername(prof.username)
          }

          // Fetch all attempts for this user and quiz
          const { data: userAttempts } = await supabase
            .from('quiz_attempts')
            .select('id, completed_at, is_disqualified, warnings_count, student_details')
            .eq('quiz_id', quizId)
            .eq('user_id', user.id)

          const existingAttempt = userAttempts?.find((a: any) => a.completed_at !== null)
          const inProgressAttempt = userAttempts?.find((a: any) => a.completed_at === null)

          if (existingAttempt) {
            if (existingAttempt.is_disqualified || (existingAttempt.warnings_count || 0) >= 2) {
              setIsDisqualifiedUser(true)
              setLoading(false)
              return
            }
            showCustomAlert('Exam Already Submitted', 'You have already submitted and completed this exam.', () => {
              router.push('/codeathons')
            })
            return
          }

          if (inProgressAttempt) {
            if (inProgressAttempt.is_disqualified || (inProgressAttempt.warnings_count || 0) >= 2) {
              setIsDisqualifiedUser(true)
              setLoading(false)
              return
            }
            setAttemptId(inProgressAttempt.id)
            setWarnings(inProgressAttempt.warnings_count || 0)
            if (inProgressAttempt.student_details) {
              setFullName(inProgressAttempt.student_details.fullName || '')
              setRollNumber(inProgressAttempt.student_details.rollNumber || '')
              setCourseClass(inProgressAttempt.student_details.courseClass || '')
              setSection(inProgressAttempt.student_details.section || '')
              setSubmittedQuestions(inProgressAttempt.student_details.submittedQuestions || {})
            }
          } else {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`pycode_exam_answers_${quizId}`)
            }
          }
        } else {
          setIsGuest(true)
          setLoading(false)
          return
        }

        // Calculate seconds remaining in the scheduled time slot window
        const nowMs = Date.now()
        const endMs = new Date(quizData.end_time).getTime()
        const windowSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000))

        if (windowSeconds <= 0) {
          showCustomAlert('Exam Ended', 'This codeathon has already ended and is no longer available.', () => {
            router.push('/codeathons')
          })
          return
        }

        // The student's remaining time is bounded by the end of the slot window.
        // If a time limit is set, it cannot exceed the slot end time.
        if (quizData.duration_minutes) {
          const limitSeconds = quizData.duration_minutes * 60
          setTimeLeft(Math.min(limitSeconds, windowSeconds))
        } else {
          setTimeLeft(windowSeconds) // no time limit means bounded by slot end_time
        }

        // Fetch questions included in this quiz
        const qIds = quizData.coding_question_ids || []
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

            // EXPLICIT CODEATHON ISOLATION: Initialize each challenge editor with starter_code or draft exam answer.
            // DO NOT preload previous student drafts or practice submissions.
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

  // Auto-submit beacon: fires when user closes tab/window mid-exam
  // Uses navigator.sendBeacon which is guaranteed to fire even during page unload
  useEffect(() => {
    if (!hasStarted || !attemptId) return

    const handlePageHide = () => {
      // Only send beacon if not already submitted (isSubmitting means submit is in flight)
      if (typeof navigator.sendBeacon === 'function') {
        const payload = JSON.stringify({ attempt_id: attemptId, quiz_id: quizId })
        navigator.sendBeacon('/api/quiz/auto-submit', new Blob([payload], { type: 'application/json' }))
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [hasStarted, attemptId, quizId])

  useEffect(() => {
    if (!hasStarted) return

    const isBypassed = ['code_with_arpit', 'harsh'].includes(username.toLowerCase())
    if (isBypassed) return

    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement
      setIsFullscreenActive(isFS)
      if (!isFS) {
        triggerWarning('Exiting fullscreen mode.')
      } else {
        setShowWarningModal(false)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerWarning('Tab switch detected.')
      }
    }

    const handleBlur = () => {
      // If tab is already hidden, visibilitychange listener handles it to avoid duplicate warnings
      if (document.visibilityState === 'hidden') return
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
  }, [hasStarted, warnings, username])

  // Exam Countdown Timer
  useEffect(() => {
    if (timeLeft === -1) return

    if (!hasStarted) return

    // Auto-submit if time is up
    if (timeLeft <= 0) {
      handleSubmitQuiz(true)
      return
    }

    const interval = setInterval(() => {
      // Prioritize Codeathon absolute end time over individual time limit
      if (quiz?.end_time) {
        const absoluteRemaining = Math.max(0, Math.floor((new Date(quiz.end_time).getTime() - Date.now()) / 1000))
        if (absoluteRemaining <= 0) {
          clearInterval(interval)
          handleSubmitQuiz(true)
          return
        }
        
        // Use the minimum of individual time left and slot absolute remaining time
        setTimeLeft((prev) => {
          const nextVal = prev - 1
          return Math.min(nextVal, absoluteRemaining)
        })
      } else {
        setTimeLeft((prev) => prev - 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [hasStarted, timeLeft, quiz])

  const triggerWarning = (reason: string) => {
    // Block warnings if submission or disqualification is already in progress
    if (isSubmittingRef.current) {
      return
    }

    // Throttle warnings (ignore duplicate triggers within 3 seconds)
    const now = Date.now()
    if (now - lastWarningTimeRef.current < 3000) {
      return
    }
    
    // Only count warnings (blur, tab switch) if they are currently inside fullscreen exam
    if (reason !== 'Exiting fullscreen mode.' && !document.fullscreenElement) {
      return
    }
    
    lastWarningTimeRef.current = now

    setLastWarningReason(reason)
    const nextWarnings = warnings + 1
    setWarnings(nextWarnings)

    // Real-time warning sync to DB
    if (attemptId) {
      supabase
        .from('quiz_attempts')
        .update({ 
          warnings_count: nextWarnings,
          is_disqualified: nextWarnings >= 2
        })
        .eq('id', attemptId)
        .then(({ error }: any) => {
          if (error) console.error('Failed to sync warnings to DB:', error)
        })
    }

    if (nextWarnings >= 2) {
      // 2 strikes: Disqualify instantly
      isSubmittingRef.current = true
      handleSubmitQuiz(true, true)
    } else {
      setShowWarningModal(true)
    }
  }

  const startExam = async () => {
    // Validate required inputs
    const reqInputs = quiz?.required_inputs || []
    if (reqInputs.includes('Full Name') && !fullName.trim()) {
      showCustomAlert('Required Credentials', 'Please fill out your Full Name before starting the exam.')
      return
    }
    if (reqInputs.includes('Roll Number') && !rollNumber.trim()) {
      showCustomAlert('Required Credentials', 'Please fill out your Roll Number before starting the exam.')
      return
    }
    if (reqInputs.includes('Course / Class') && !courseClass.trim()) {
      showCustomAlert('Required Credentials', 'Please fill out your Course / Class before starting the exam.')
      return
    }
    if (reqInputs.includes('Section') && !section.trim()) {
      showCustomAlert('Required Credentials', 'Please fill out your Section before starting the exam.')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Student user session not found.')

      // If no in-progress attempt exists in DB, initialize one
      if (!attemptId) {
        const { data: newAttempt, error: insErr } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quizId,
            user_id: user.id,
            started_at: new Date().toISOString(),
            student_details: {
              fullName: fullName.trim(),
              rollNumber: rollNumber.trim(),
              courseClass: courseClass.trim(),
              section: section.trim()
            },
            is_disqualified: false,
            warnings_count: 0
          })
          .select()
          .single()

        if (insErr) throw insErr
        setAttemptId(newAttempt.id)
      }

      // Request fullscreen
      const isBypassed = ['code_with_arpit', 'harsh'].includes(username.toLowerCase())
      if (!isBypassed && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      setIsFullscreenActive(true)
      setHasStarted(true)
    } catch (err: any) {
      console.error(err)
      showCustomAlert('Permission Blocked', err.message || 'You must allow fullscreen permissions to take this exam.')
    }
  }

  // Run student code locally using Pyodide WASM
  const handleExecuteCode = () => {
    const activeQ = questions[activeQuestionIdx]
    if (!activeQ) return
    if (submittedQuestions[activeQ.id]) {
      showCustomAlert('Question Locked', 'This question has already been submitted and is locked from further execution.')
      return
    }
    if (pyodideState !== 'ready') {
      showCustomAlert('Compiler Initializing', `The Python compiler execution environment is not ready yet: ${pyodideProgress}`)
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

    // Yield control using setTimeout so the Stop button renders first and is clickable
    setTimeout(async () => {
      try {
        const userCode = answers[activeQ.id] || ''
        const outcome = await runCode(userCode, activeQ.verification_script || '')
        
        const outputText = outcome.output || 'Execution complete with no console output.'
        setConsoleOutput(prev => ({ ...prev, [activeQ.id]: outputText }))
        
        const hasShowCall = userCode.includes('.show()')
        if (outcome.visualization && outcome.status !== 'runtime_error' && hasShowCall) {
          setPlotUrls(prev => ({ ...prev, [activeQ.id]: `data:image/png;base64,${outcome.visualization}` }))
          setShowPlotModal(true)
        } else {
          setShowPlotModal(false)
        }
        setRightTab('terminal')

        const passed = outcome.passed_cases || 0
        const total = outcome.total_cases || 0
        const newCheck = { passed, total }
        setTestChecks(prev => ({ 
          ...prev, 
          [activeQ.id]: newCheck 
        }))

        let newState: 'success' | 'wrong' | 'error' = 'error'
        if (outcome.status === 'accepted') {
          newState = 'success'
        } else if (outcome.status === 'wrong_answer') {
          newState = 'wrong'
        }
        setEvalStates(prev => ({ ...prev, [activeQ.id]: newState }))

        if (attemptId) {
          const nextChecks = { ...testChecks, [activeQ.id]: newCheck }
          const nextEvalStates = { ...evalStates, [activeQ.id]: newState }
          
          const updatedSummary: Record<number, { passed: number; total: number }> = {}
          questions.forEach((q: any) => {
            const c = nextChecks[q.id]
            if (c && c.total > 0) {
              updatedSummary[q.id] = { passed: c.passed, total: c.total }
            } else {
              const est = nextEvalStates[q.id]
              const qTotal = getQuestionTotalCases(q.verification_script)
              updatedSummary[q.id] = { passed: est === 'success' ? qTotal : 0, total: qTotal }
            }
          })

          supabase
            .from('quiz_attempts')
            .update({
              answers: answers,
              student_details: {
                fullName,
                rollNumber,
                courseClass,
                section,
                submittedQuestions: submittedQuestions,
                testCasesSummary: updatedSummary
              }
            })
            .eq('id', attemptId)
            .then((res: any) => {
              if (res.error) console.error('Failed to sync execution checks to DB:', res.error)
            })
        }
      } catch (err: any) {
        setConsoleOutput(prev => ({ ...prev, [activeQ.id]: `Failed to execute: ${err.message}` }))
        setEvalStates(prev => ({ ...prev, [activeQ.id]: 'error' }))
      } finally {
        setIsRunning(false)
      }
    }, 50)
  }

  const getQuestionTotalCases = (verificationScript?: string): number => {
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

  // End Exam and submit
  const handleSubmitQuiz = async (auto = false, disqualified = false) => {
    isSubmittingRef.current = true
    setSubmitType(disqualified ? 'disqualified' : auto ? 'auto' : 'manual')
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      // Automatically re-run all unsubmitted questions before calculating scores
      const updatedSubmittedQuestions = { ...submittedQuestions }
      const updatedTestChecks = { ...testChecks }
      const updatedEvalStates = { ...evalStates }

      for (const q of questions) {
        if (!updatedSubmittedQuestions[q.id] && !disqualified && warnings < 2) {
          const userCode = answers[q.id] || ''
          try {
            const outcome = await runCode(userCode, q.verification_script || '')
            updatedTestChecks[q.id] = {
              passed: outcome.passed_cases ?? 0,
              total: outcome.total_cases ?? 1
            }
            updatedEvalStates[q.id] = outcome.status
            updatedSubmittedQuestions[q.id] = true
          } catch (e) {
            console.error(`Auto-run failed for question ${q.id}:`, e)
          }
        }
      }

      // 1. Calculate Score
      let totalPoints = 0
      let earnedPoints = 0

      questions.forEach((q) => {
        totalPoints += q.points
        if (!updatedSubmittedQuestions[q.id]) return
        const check = updatedTestChecks[q.id]
        if (check && check.total > 0) {
          earnedPoints += (check.passed / check.total) * q.points
        } else {
          if (updatedEvalStates[q.id] === 'success') earnedPoints += q.points
        }
      })

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

      // 2. Build testCasesSummary using actual Pyodide run data (check.total) as ground truth
      const testCasesSummary: Record<number, { passed: number, total: number }> = {}
      questions.forEach((q) => {
        const qTotal = getQuestionTotalCases(q.verification_script)
        const isSubmitted = !!updatedSubmittedQuestions[q.id]
        if (!isSubmitted) {
          testCasesSummary[q.id] = { passed: 0, total: qTotal }
          return
        }
        const check = updatedTestChecks[q.id]
        if (check && check.total > 0) {
          testCasesSummary[q.id] = { passed: check.passed, total: check.total }
        } else {
          const outcome = updatedEvalStates[q.id]
          testCasesSummary[q.id] = { passed: outcome === 'success' ? qTotal : 0, total: qTotal }
        }
      })

      const finalStudentDetails = {
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim(),
        courseClass: courseClass.trim(),
        section: section.trim(),
        submittedQuestions: updatedSubmittedQuestions,
        testCasesSummary
      }

      const completedAt = new Date().toISOString()

      // 3. Build all DB write promises to run concurrently
      let finalAttemptId = attemptId
      const attemptPayload = {
        score: Math.round(earnedPoints),
        score_percentage: scorePercentage,
        completed_at: completedAt,
        is_disqualified: disqualified || warnings >= 2,
        student_details: finalStudentDetails,
        answers: answers
      }

      let attemptWritePromise: Promise<any>
      if (finalAttemptId) {
        attemptWritePromise = supabase
          .from('quiz_attempts')
          .update(attemptPayload)
          .eq('id', finalAttemptId)
      } else {
        attemptWritePromise = supabase
          .from('quiz_attempts')
          .insert({
            user_id: user.id,
            quiz_id: quiz.id,
            started_at: completedAt,
            warnings_count: warnings,
            ...attemptPayload
          })
          .select()
          .single()
          .then((res: any) => {
            if (res.data?.id) finalAttemptId = res.data.id
            return res
          })
      }

      // Start attempt write immediately, don't await yet
      const submissionPromises = questions.map((q) => {
        const isSubmitted = !!updatedSubmittedQuestions[q.id]
        const check = updatedTestChecks[q.id]
        let pointsEarned = 0
        let isSuccess = false

        if (isSubmitted) {
          if (check && check.total > 0) {
            pointsEarned = Math.round((check.passed / check.total) * q.points)
            isSuccess = check.passed === check.total
          } else if (updatedEvalStates[q.id] === 'success') {
            pointsEarned = q.points
            isSuccess = true
          }
        }

        // coding_submissions insert (will use finalAttemptId after attempt write resolves)
        return attemptWritePromise.then(() =>
          supabase.from('coding_submissions').insert({
            user_id: user.id,
            question_id: q.id,
            quiz_attempt_id: finalAttemptId,
            submitted_code: answers[q.id] || '',
            status: disqualified || !isSubmitted ? 'wrong_answer' : (isSuccess ? 'accepted' : 'wrong_answer'),
            score_points: disqualified ? 0 : pointsEarned
          })
        )
      })

      // Fire fullscreen exit non-blocking
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }

      // Clear localStorage draft
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`pycode_exam_answers_${quizId}`)
      }

      // Wait for attempt write first (coding_submissions depend on it)
      await attemptWritePromise

      // Navigate immediately — submissions continue in background
      if (disqualified || warnings >= 2) {
        router.push('/practice?disqualified=true')
      } else {
        router.push('/results')
      }

      // Fire submissions in background (don't block navigation)
      Promise.all(submissionPromises).catch((err) => console.error('Background submission error:', err))

    } catch (err: any) {
      console.error(err)
      showCustomAlert('Submission Failed', `Submission failed: ${err.message || err}`)
      setIsSubmitting(false)
      isSubmittingRef.current = false
      setSubmitType(null)
    }
  }


  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas font-sans text-ink flex flex-col animate-pulse">
        {/* Workspace Header Skeleton */}
        <header className="h-16 border-b border-hairline bg-canvas px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-4.5 w-36 bg-gray-250 dark:bg-zinc-800 rounded"></div>
            <div className="h-6 w-20 bg-gray-150 dark:bg-zinc-800 rounded-full"></div>
          </div>
          <div className="h-9 w-24 bg-gray-150 dark:bg-zinc-800 rounded-full"></div>
        </header>

        {/* Verification Gate Layout Skeleton */}
        <div className="flex-1 p-6 md:p-8 flex items-center justify-center select-none overflow-y-auto">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:divide-x md:divide-hairline">
            {/* Left Column: Guidelines */}
            <div className="md:col-span-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-gray-250 dark:bg-zinc-800 rounded"></div>
                  <div className="h-3 w-56 bg-gray-150 dark:bg-zinc-850 rounded"></div>
                </div>
                <div className="h-16 bg-gray-100 dark:bg-zinc-850/50 rounded-2xl border border-hairline"></div>
                
                <div className="space-y-4">
                  <div className="h-3 w-28 bg-gray-250 dark:bg-zinc-800 rounded"></div>
                  <div className="space-y-3.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                          <div className="h-2.5 w-full bg-gray-150 dark:bg-zinc-850 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-3.5 w-3/4 bg-gray-150 dark:bg-zinc-850 rounded"></div>
            </div>

            {/* Right Column: Inputs */}
            <div className="md:col-span-7 space-y-6 md:pl-8 pl-0">
              <div className="space-y-5">
                <div className="border-b border-hairline pb-3 space-y-2">
                  <div className="h-5 w-40 bg-gray-250 dark:bg-zinc-800 rounded"></div>
                  <div className="h-3 w-72 bg-gray-150 dark:bg-zinc-850 rounded"></div>
                </div>

                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                      <div className="h-10 w-full bg-canvas border border-hairline rounded-xl"></div>
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                        <div className="h-10 w-full bg-canvas border border-hairline rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="h-12 w-full bg-gray-250 dark:bg-zinc-700 rounded-full"></div>
                <div className="h-3 w-48 bg-gray-150 dark:bg-zinc-850 rounded mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isDisqualifiedUser) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8 text-ink font-sans relative overflow-x-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-red-500/30 shadow-2xl relative overflow-hidden z-10 text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black tracking-tight text-ink">Disqualified from Exam</h1>
            <p className="text-xs text-gray-555 dark:text-zinc-400 font-medium leading-relaxed">
              You are disqualified and you can&apos;t attend the codeathon. Please contact the codeathon creator.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                router.push('/practice')
              }}
              className="w-full py-3 rounded-full bg-surface-soft hover:bg-surface-card border border-hairline text-ink text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Explore Practice Sandbox
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8 text-ink font-sans relative overflow-x-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-2xl relative overflow-hidden z-10 text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black tracking-tight text-ink">Authentication Required</h1>
            <p className="text-xs text-gray-550 dark:text-zinc-400 font-medium leading-relaxed">
              You are not logged in to attempt this Codeathon. Log in to your student account to save scores, submit question test cases, and record your performance.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                const target = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
                router.push(target)
              }}
              className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
            >
              <LogIn className="w-4 h-4" />
              Log In to My Account
            </button>
            <button
              onClick={() => {
                router.push('/signup')
              }}
              className="w-full py-3 rounded-full bg-surface-soft hover:bg-surface-card border border-hairline text-ink text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create New Account
            </button>
            <button
              onClick={() => {
                router.push('/practice')
              }}
              className="w-full py-3 rounded-full bg-transparent hover:bg-surface-soft text-gray-500 hover:text-ink text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Explore Practice Sandbox
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 1. Initial fullscreen gate modal
  if (!hasStarted) {
    const reqInputs = quiz?.required_inputs || []
    
    // Calculate the duration limit dynamically from start_time and end_time if duration_minutes is falsy
    const calculatedMinutes = (() => {
      if (quiz?.duration_minutes) return quiz.duration_minutes
      if (quiz?.start_time && quiz?.end_time) {
        const diffMs = new Date(quiz.end_time).getTime() - new Date(quiz.start_time).getTime()
        return Math.max(0, Math.floor(diffMs / 60000))
      }
      return 0
    })()

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8 text-ink font-sans relative overflow-x-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch bg-canvas/30 backdrop-blur-md border border-hairline p-6 md:p-8 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] relative overflow-hidden z-10">
          
          {/* Left Column: Security Sandbox Rules & Quiz Info (5 columns on desktop) */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-6 md:border-r md:border-hairline md:pr-8 pr-0">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 shadow-[0_4px_12px_rgba(239,68,68,0.1)]">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-ink">Secure Exam Sandbox</h1>
                  <p className="text-[10px] text-gray-500 font-mono tracking-wide uppercase">Exam Onboarding</p>
                </div>
              </div>

              {/* Quiz Quick Info Block */}
              <div className="p-4 rounded-2xl bg-surface-soft border border-hairline space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-widest font-mono">Exam Metadata</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Codeathon:</span>
                    <span className="font-extrabold text-ink truncate max-w-[180px]">{quiz?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Questions:</span>
                    <span className="font-bold text-ink">{quiz?.coding_question_ids?.length || 0} coding challenges</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Duration Limit:</span>
                    <span className="font-bold text-primary">{calculatedMinutes ? `${calculatedMinutes} mins` : 'No Time Limit'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Window:</span>
                    <span className="font-mono text-[10px] text-ink">
                      {quiz?.start_time && new Date(quiz.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guidelines section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-gray-950 dark:text-zinc-200 uppercase tracking-widest font-mono">Exam Guard Guidelines</h3>
                <div className="space-y-3.5 text-xs text-gray-655 dark:text-zinc-400 font-light">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-500 mt-0.5">
                      <ShieldAlert className="w-3 h-3" />
                    </div>
                    <p className="leading-relaxed">
                      <strong className="text-ink font-bold">Fullscreen Locking</strong><br />
                      Exiting fullscreen mode triggers automatic cheating security alerts.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-500 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                    <p className="leading-relaxed">
                      <strong className="text-ink font-bold">Tab-Switch Blocker</strong><br />
                      Switching browser tabs or losing window focus is automatically flagged.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0 text-red-650 dark:text-red-400 mt-0.5">
                      <XCircle className="w-3 h-3" />
                    </div>
                    <p className="leading-relaxed">
                      <strong className="text-ink font-bold">2-Warnings Strike</strong><br />
                      Exceeding 2 security warnings will disqualify your exam submission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-gray-500 leading-normal hidden md:block">
              Please double check that your network connection is stable before entering the secure sandbox.
            </p>
          </div>

          {/* Right Column: Onboarding Input & Start Button (7 columns on desktop) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-6 md:pl-4 pl-0">
            <div className="space-y-5">
              <div className="border-b border-hairline pb-3">
                <h2 className="text-base font-extrabold text-ink tracking-tight">Verify Your Credentials</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Confirm your identities to link and catalog your test attempts correctly.</p>
              </div>

              <div className="space-y-4">
                {reqInputs.includes('Full Name') && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink transition-all shadow-sm"
                      required
                    />
                  </div>
                )}

                {reqInputs.includes('Roll Number') && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Roll Number</label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="Enter university roll number"
                      className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink transition-all shadow-sm"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reqInputs.includes('Course / Class') && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Course / Class</label>
                      <input
                        type="text"
                        value={courseClass}
                        onChange={(e) => setCourseClass(e.target.value)}
                        placeholder="e.g. BCA III Year"
                        className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink transition-all shadow-sm"
                        required
                      />
                    </div>
                  )}

                  {reqInputs.includes('Section') && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-mono">Section</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. A-4"
                        className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink transition-all shadow-sm"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={startExam}
                className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold uppercase tracking-wider text-xs rounded-full cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2.5 shadow-[0_6px_24px_rgba(220,38,38,0.2)] hover:shadow-[0_8px_32px_rgba(220,38,38,0.3)]"
              >
                <ShieldAlert className="w-4 h-4" />
                I Agree & Enter Fullscreen
              </button>
              <p className="text-[10px] text-gray-500 text-center">
                By entering, you consent to automatic tracking of page visibility changes.
              </p>
            </div>
          </div>

        </div>
      </div>
    )
  }

  const activeQ = questions[activeQuestionIdx]
  const sample = activeQ?.dataset_name ? DATASET_SAMPLES[activeQ.dataset_name] : null
  const activeCode = answers[activeQ?.id] || ''

  return (
    <div className="h-screen w-full flex flex-col bg-canvas font-sans text-ink select-none relative">
      {/* Fullscreen Blur Overlay Guard */}
      {hasStarted && !isFullscreenActive && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center px-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-red-500/30 text-center shadow-2xl space-y-5 text-ink">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-ink">Fullscreen Required</h2>
              <p className="text-body text-sm font-medium leading-relaxed dark:text-zinc-300">
                Exiting fullscreen mode is a security violation. You must remain in fullscreen mode to take this exam.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline flex justify-between items-center text-xs">
              <span className="text-gray-500 uppercase tracking-wider font-semibold">Active Warnings</span>
              <span className="font-bold text-lg text-red-500">{warnings} / 2</span>
            </div>

            <button
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen()
                    setIsFullscreenActive(true)
                  }
                } catch (e) {
                  console.error(e)
                }
              }}
              className="w-full py-2.5 rounded-full bg-red-650 hover:bg-red-600 text-white font-semibold transition-all text-sm cursor-pointer shadow-lg"
            >
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Warning Overlay Modal */}
      {showWarningModal && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border-2 border-amber-500 text-center shadow-2xl animate-scale-in text-ink">
            <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/25 flex items-center justify-center text-warning mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-ink">Security Violation Alert</h2>
            <p className="text-body text-base mb-6 leading-relaxed font-medium dark:text-zinc-300">
              Reason: <strong className="text-warning font-extrabold">{lastWarningReason}</strong>. Exiting the exam pane violates test protocols.
            </p>
            
            <div className="p-4 rounded-xl bg-surface-soft border border-hairline mb-6 flex justify-between items-center text-xs">
              <span className="text-gray-500 uppercase tracking-wider font-semibold">Active Warnings</span>
              <span className="font-bold text-lg text-warning">{warnings} / 2</span>
            </div>

            <button
              onClick={async () => {
                setShowWarningModal(false)
                // Attempt to re-enter fullscreen
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen()
                    setIsFullscreenActive(true)
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
        {timeLeft !== -1 && (
          <div className="flex items-center gap-3 bg-surface-soft border border-hairline px-4 py-2 rounded-full">
            <Clock className={`w-4 h-4 ${timeLeft < 120 ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
            <span className={`font-mono text-sm font-bold ${timeLeft < 120 ? 'text-red-655' : 'text-ink'}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Quit Exam button */}
          <button
            type="button"
            onClick={handleQuitExam}
            className="px-4 py-2 rounded-full border border-red-500/30 hover:border-red-500 text-red-500 dark:text-red-400 text-xs font-bold transition-all duration-200 hover:bg-red-500/5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Quit Exam
          </button>

          {/* Warning count badge */}
          <div className="px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_2px_8px_rgba(239,68,68,0.06)]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Warnings: {warnings}/2</span>
          </div>

          {/* Stop / Terminate button */}
          {isRunning && (
            <button
              type="button"
              onClick={handleStopCode}
              className="px-4 py-2.5 rounded-full bg-red-650 hover:bg-red-600 text-white text-xs font-bold cursor-pointer transition-all duration-200 flex items-center gap-1.5 animate-pulse hover:scale-[1.02] active:scale-[0.98]"
            >
              <XCircle className="w-3.5 h-3.5" />
              Stop
            </button>
          )}

          {/* Run button */}
          <button
            onClick={handleExecuteCode}
            disabled={isRunning || (activeQ && !!submittedQuestions[activeQ.id])}
            className="px-5 py-2.5 rounded-full bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary text-xs font-bold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? 'Running...' : 'Run Checks'}
          </button>

          {/* Submit exam button */}
          <button
            onClick={handleRequestSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-full bg-red-650 hover:bg-red-600 active:scale-[0.98] text-white text-xs font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main split grid */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Leftmost sidebar showing quiz question tabs */}
        <nav className="w-56 bg-canvas border-r border-hairline flex flex-col items-stretch px-4 py-6 gap-2.5 shrink-0">
          {questions.map((q, idx) => {
            const isActive = idx === activeQuestionIdx
            const isSubmitted = !!submittedQuestions[q.id]
            return (
              <button
                key={q.id}
                onClick={() => {
                  if (activeQuestionIdx !== idx) {
                    runSilentChecks(activeQuestionIdx)
                  }
                  setActiveQuestionIdx(idx)
                }}
                className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between font-bold text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-primary border-primary text-on-primary shadow-[0_4px_12px_rgba(204,120,92,0.25)]'
                    : 'bg-canvas border-hairline text-gray-500 hover:text-ink hover:border-gray-450 hover:bg-surface-soft'
                }`}
              >
                <span>Question {idx + 1}</span>
                {isSubmitted && (
                  <span className="w-2 h-2 rounded-full bg-semantic-success shadow-[0_0_8px_rgba(93,184,114,0.6)]"></span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Instructions Pane - Always visible with description only */}
        <section className="w-[35%] min-w-[320px] border-r border-hairline flex flex-col bg-canvas">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-canvas text-ink">
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
                className="text-ink leading-relaxed font-normal text-sm markdown-body space-y-4 font-sans"
                dangerouslySetInnerHTML={{ __html: enrichQuestionDetails(activeQ) }}
              />
            </article>
          </div>
        </section>

        {/* Coding Area */}
        <section className="flex-1 flex flex-col bg-canvas border-l border-hairline min-w-0">
          {/* Monaco Editor Header Bar */}
          <div className="h-11 border-b border-hairline bg-surface-soft px-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-ink bg-canvas px-2.5 py-1 rounded-full border border-hairline flex items-center gap-1.5 uppercase tracking-widest font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse"></span>
                Python 3
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Individual Question Submit Button */}
              {activeQ && (
                <button
                  type="button"
                  onClick={handleSubmitQuestion}
                  disabled={!!submittedQuestions[activeQ.id]}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                    submittedQuestions[activeQ.id]
                      ? 'bg-semantic-success/15 border border-semantic-success/30 text-semantic-success cursor-not-allowed opacity-80'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.15)] active:scale-[0.97] cursor-pointer'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {submittedQuestions[activeQ.id] ? 'Question Submitted' : 'Submit Question'}
                </button>
              )}

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
                  const newCode = val || ''
                  setAnswers(prev => ({ ...prev, [activeQ.id]: newCode }))
                  triggerTextDraftSync(activeQ.id, newCode)
                }
              }}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                readOnly: isRunning || (activeQ && !!submittedQuestions[activeQ.id]),
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
                automaticLayout: true,
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
                onClick={() => setRightTab('cases')}
                className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
                  evalStates[activeQ.id] === 'success'
                    ? 'border-semantic-success text-semantic-success font-extrabold bg-canvas/10'
                    : evalStates[activeQ.id] === 'wrong' || evalStates[activeQ.id] === 'error'
                    ? 'border-error text-error font-extrabold bg-canvas/10'
                    : rightTab === 'cases'
                    ? 'border-primary text-ink bg-canvas font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-ink'
                }`}
              >
                {evalStates[activeQ.id] === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-semantic-success" />
                ) : evalStates[activeQ.id] === 'wrong' || evalStates[activeQ.id] === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-error" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Test Checks
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-body bg-canvas">
              {rightTab === 'terminal' && (
                <pre className="whitespace-pre-wrap text-body">
                  {activeQ ? (consoleOutput[activeQ.id] || 'No print output log recorded yet.') : ''}
                </pre>
              )}


              {rightTab === 'cases' && (
                <div className="space-y-4">
                  {activeQ && evalStates[activeQ.id] ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {evalStates[activeQ.id] === 'success' ? (
                          <span className="px-3 py-1 rounded-full bg-semantic-success/10 border border-semantic-success/20 text-semantic-success text-xs font-semibold uppercase flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> SUCCESS</span>
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

      {isSubmitting && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-canvas border border-hairline shadow-2xl space-y-6 text-center text-ink animate-scale-in">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping"></div>
              <div className="relative w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary">
                <ShieldAlert className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">
                {submitType === 'auto' 
                  ? 'Time Expired: Auto-Submitting Exam...' 
                  : submitType === 'disqualified' 
                  ? 'Security Disqualification In Progress...' 
                  : 'Submitting Your Exam...'}
              </h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed">
                {submitType === 'auto'
                  ? 'Your time limit has expired. Your progress has been automatically saved and is being submitted to the dashboard now.'
                  : submitType === 'disqualified'
                  ? 'You have exceeded the maximum security warnings. Your attempt has been terminated, and you are being disqualified.'
                  : 'Saving your solutions and compiling final evaluation scores in the database sandbox. Please do not close this window.'}
              </p>
            </div>
            <div className="h-2 w-full bg-hairline rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse w-3/4 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {customDialog.show && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-canvas border border-hairline shadow-2xl animate-scale-in text-ink text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink leading-tight">{customDialog.title}</h3>
              <p className="text-sm text-body font-medium leading-relaxed dark:text-zinc-300">{customDialog.message}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {customDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDialog(prev => ({ ...prev, show: false }))
                    if (customDialog.onCancel) customDialog.onCancel()
                  }}
                  className="flex-1 py-2.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-gray-700 dark:text-gray-250 text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCustomDialog(prev => ({ ...prev, show: false }))
                  if (customDialog.onConfirm) customDialog.onConfirm()
                }}
                className="flex-1 py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unsubmitted Questions Pre-flight Warning Modal ─────────────────── */}
      {showSubmitWarning && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-lg w-full p-6 rounded-3xl bg-canvas border border-amber-500/40 shadow-2xl animate-scale-in text-ink space-y-5">

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-ink leading-tight">Questions Not Individually Submitted!</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  You ran test cases but forgot to click <span className="font-mono bg-amber-500/10 px-1.5 py-0.5 rounded-md">"Submit Question"</span> for the following:
                </p>
              </div>
            </div>

            {/* Unsubmitted question list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {unsubmittedWithRuns.map((q, i) => (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">{q.title}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                      {testChecks[q.id]?.passed ?? 0}/{testChecks[q.id]?.total ?? 0} test cases passed — not submitted
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] font-extrabold uppercase tracking-wider border border-red-200 dark:border-red-700/40">
                    Will score 0
                  </span>
                </div>
              ))}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-surface-soft border border-hairline">
              <ShieldAlert className="w-4 h-4 shrink-0 text-gray-500 mt-0.5" />
              <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                Each question must be submitted separately using the <strong>"Submit Question"</strong> button. 
                Running test cases alone does not count as a submission. 
                If you proceed now, the questions above will be marked as <strong>wrong</strong>.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSubmitWarning(false)}
                className="flex-1 py-2.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-gray-700 dark:text-gray-250 text-xs font-extrabold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                ← Cancel — Go Back &amp; Submit Questions
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitWarning(false)
                  handleSubmitQuiz(false, false)
                }}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_4px_12px_rgba(220,38,38,0.25)]"
              >
                Proceed Anyway (Score 0 for above)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matplotlib Visualization Overlay Modal */}
      {showPlotModal && activeQ && plotUrls[activeQ.id] && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-6 rounded-3xl max-w-4xl w-full flex flex-col items-center justify-center relative shadow-2xl animate-scale-in">
            <button
              onClick={() => {
                setShowPlotModal(false)
              }}
              title="Close Plot"
              className="absolute top-4 right-4 p-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-full text-center space-y-4">
              <h3 className="text-sm font-extrabold text-ink flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Visualization Output
              </h3>
              <div className="border border-hairline rounded-2xl overflow-hidden bg-white p-2">
                <img src={plotUrls[activeQ.id]} alt="Matplotlib Plot Output" className="w-full max-h-[520px] object-contain rounded-lg mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
