'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import { usePyodide } from '@/hooks/usePyodide'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'
import { DEFAULT_DATASETS } from '@/lib/datasetGenerator'
import { createClient } from '@/lib/supabase/client'
import { enrichQuestionDetails } from '@/lib/questionFormatter'
import { ArrowLeft, Play, RefreshCw, BarChart, Database, Terminal, FileText, CheckCircle, XCircle, Copy, Send, Settings, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Maximize2 } from 'lucide-react'

export default function PracticeWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient() as any
  const questionIdStr = params.id as string
  const questionId = parseInt(questionIdStr)

  // Question details
  const [question, setQuestion] = useState<any>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)

  // CSV Modal preview states
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([])

  // Runner states
  const { state: pyodideState, progressMsg: pyodideProgress, runCode } = usePyodide()
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [plotUrl, setPlotUrl] = useState('')
  const [showPlotModal, setShowPlotModal] = useState(false)
  const [fullscreenPlotUrl, setFullscreenPlotUrl] = useState<string | null>(null)
  const [passedCases, setPassedCases] = useState(0)
  const [totalCases, setTotalCases] = useState(0)
  const [evalStatus, setEvalStatus] = useState<'idle' | 'success' | 'wrong' | 'error'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Left Panel tabs
  const [leftTab, setLeftTab] = useState<'description' | 'dataset'>('description')
  const [rightTab, setRightTab] = useState<'terminal' | 'plots' | 'cases'>('terminal')
  const [terminalSize, setTerminalSize] = useState<'default' | 'maximized'>('default')
  // Panel collapse and theme toggling
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  const editorRef = useRef<any>(null)
  const terminalScrollRef = useRef<HTMLDivElement>(null)
  
  // Submit preconditions modal state
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showPracticeFailureModal, setShowPracticeFailureModal] = useState(false)
  const [showCongratsModal, setShowCongratsModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  // Auto-scroll terminal to bottom when output updates, rightTab shifts, or panel toggles size
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight
    }
  }, [output, rightTab, terminalSize])

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

  const monaco = useMonaco()
  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'light')
    }
  }, [theme, monaco])

  // Save code changes to localStorage draft
  useEffect(() => {
    if (code && questionId) {
      localStorage.setItem(`pycode_draft_${questionId}`, code)
    }
  }, [code, questionId])

  // Clean title helper: strips accidentally embedded description text from title
  const cleanTitle = (title: string): string => {
    return title || ''
  }

  useEffect(() => {
    const fetchQuestion = async () => {
      setLoading(true)
      try {
        // PRIMARY: Use LOCAL_QUESTIONS for correct titles and descriptions.
        // Supabase is only used for past submission code.
        const localQ = LOCAL_QUESTIONS.find(q => q.id === questionId)
        if (localQ) {
          setQuestion(localQ)

          // Helper: extract first function name from Python code
          const extractFnName = (src: string) => {
            const m = src.match(/def\s+(\w+)\s*\(/)
            return m ? m[1] : ''
          }

          const savedCode = localStorage.getItem(`pycode_draft_${questionId}`)
          const expectedFn = extractFnName(localQ.starter_code || '')

          if (savedCode && extractFnName(savedCode) === expectedFn) {
            // Draft matches this question's function — safe to use
            setCode(savedCode)
          } else {
            // Stale draft (from an old question at same ID) — discard it
            if (savedCode) localStorage.removeItem(`pycode_draft_${questionId}`)

            // Try to load their last correct submission from Supabase
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                const { data: lastSub } = await supabase
                  .from('coding_submissions')
                  .select('submitted_code')
                  .eq('user_id', user.id)
                  .eq('question_id', questionId)
                  .is('quiz_attempt_id', null)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                // Only restore submission if its function name matches too
                if (lastSub?.submitted_code && extractFnName(lastSub.submitted_code) === expectedFn) {
                  setCode(lastSub.submitted_code)
                } else {
                  setCode(localQ.starter_code || '')
                }
              } else {
                setCode(localQ.starter_code || '')
              }
            } catch {
              setCode(localQ.starter_code || '')
            }
          }
        } else {
          router.push('/practice')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchQuestion()
  }, [questionId, supabase, router])

  // Trigger MathJax typesetting whenever the question or active left tab changes
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
  }, [question, leftTab])


  // Custom editor mounting configurations
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
  }

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

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Restore starter template
  const handleResetCode = () => {
    setShowResetConfirm(true)
  }

  const performResetCode = () => {
    setCode(question?.starter_code || '')
  }

  // Run student code using Pyodide WASM
  const handleRun = async () => {
    if (pyodideState !== 'ready') return
    setIsRunning(true)
    setOutput('Compiler: Running script...')
    setPlotUrl('')
    setEvalStatus('idle')

    try {
      const outcome = await runCode(code, question?.verification_script || '')
      setOutput(outcome.output || 'Execution complete with no console output.')
      
      const hasShowCall = code.includes('.show()')
      if (outcome.visualization && outcome.status !== 'runtime_error' && hasShowCall) {
        setPlotUrl(`data:image/png;base64,${outcome.visualization}`)
        setShowPlotModal(true)
      } else {
        setPlotUrl('')
        setShowPlotModal(false)
      }
      setRightTab('terminal')

      setPassedCases(outcome.passed_cases || 0)
      setTotalCases(outcome.total_cases || 0)

      if (outcome.status === 'accepted') {
        setEvalStatus('success')
      } else if (outcome.status === 'wrong_answer') {
        setEvalStatus('wrong')
      } else {
        setEvalStatus('error')
      }
    } catch (err: any) {
      setOutput(`Runner Error: ${err.message || err}`)
      setEvalStatus('error')
      setRightTab('terminal')
    } finally {
      setIsRunning(false)
    }
  }

  // Handle final submission once all tests pass
  const handleSubmit = async () => {
    // 1. Fetch user authentication status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setShowGuestModal(true)
      return
    }

    // 2. Check if all test cases passed
    if (evalStatus !== 'success') {
      setShowPracticeFailureModal(true)
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('coding_submissions').insert({
        user_id: user.id,
        question_id: question.id,
        submitted_code: code,
        status: 'accepted',
        score_points: question.points
      })
      if (error) throw error
      setShowCongratsModal(true)
    } catch (err: any) {
      console.error(err)
      console.error('Submission failed:', err.message || err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col bg-canvas font-sans text-ink animate-pulse overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-14 border-b border-hairline bg-canvas px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-surface-soft"></div>
            <div className="h-5 w-48 bg-surface-soft rounded-md"></div>
          </div>
          <div className="h-6 w-24 bg-surface-soft rounded-full"></div>
        </header>

        {/* Split Panel Skeleton */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Description skeleton */}
          <section className="w-[40%] border-r border-hairline flex flex-col bg-canvas p-6 space-y-6">
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-surface-soft rounded-full"></div>
              <div className="h-6 w-20 bg-surface-soft rounded-full"></div>
            </div>
            <div className="h-8 w-3/4 bg-surface-soft rounded-md"></div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-surface-soft rounded-md"></div>
              <div className="h-4 w-full bg-surface-soft rounded-md"></div>
              <div className="h-4 w-5/6 bg-surface-soft rounded-md"></div>
            </div>
            {/* Example Block Skeleton */}
            <div className="p-4 rounded-2xl bg-surface-soft border border-hairline space-y-2">
              <div className="h-4 w-1/2 bg-canvas rounded-md"></div>
              <div className="h-4 w-1/3 bg-canvas rounded-md"></div>
            </div>
          </section>

          {/* Right panel: Editor + console skeleton */}
          <section className="w-[60%] flex flex-col bg-surface-soft">
            <div className="flex-1 p-6 flex flex-col justify-between">
              {/* Editor area skeleton */}
              <div className="flex-1 bg-canvas border border-hairline rounded-2xl p-4 space-y-3">
                <div className="h-4 w-1/3 bg-surface-soft rounded-md"></div>
                <div className="h-4 w-1/2 bg-surface-soft rounded-md"></div>
                <div className="h-4 w-2/3 bg-surface-soft rounded-md"></div>
              </div>
              {/* Console area skeleton */}
              <div className="h-48 mt-4 bg-canvas border border-hairline rounded-2xl p-4">
                <div className="h-4 w-1/4 bg-surface-soft rounded-md"></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const sample = question?.dataset_name ? DEFAULT_DATASETS[question.dataset_name] : null

  const handleOpenCsvPreview = () => {
    if (!question?.dataset_name || !DEFAULT_DATASETS[question.dataset_name]) return
    const csvContent = DEFAULT_DATASETS[question.dataset_name].csv
    const lines = csvContent.trim().split('\n')
    const parsedRows = lines.map((line: string) => {
      return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
    })
    setCsvPreviewRows(parsedRows)
    setShowCsvModal(true)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-canvas font-sans text-ink select-none">
      {/* Header Bar */}
      <header className="h-14 border-b border-hairline bg-canvas px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/practice"
            className="p-2 rounded-full text-gray-500 hover:text-ink hover:bg-surface-soft transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight truncate max-w-[280px]">{cleanTitle(question?.title || '')}</span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-block-cream text-amber-800 border border-amber-200 font-mono">
              {question?.points} pts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pyodideState !== 'ready' ? (
            <span className="text-xs text-amber-600 flex items-center gap-2 animate-pulse font-light">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {pyodideProgress}
            </span>
          ) : (
            <span className="text-[9px] text-emerald-800 bg-block-mint px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 font-bold tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              SANDBOX ONLINE
            </span>
          )}
        </div>
      </header>

      {/* Main Grid split */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Left Side: Instructions Panel */}
        {!leftPanelCollapsed && (
          <section className="w-[40%] min-w-[320px] border-r border-hairline flex flex-col bg-canvas">
          {/* Tabs */}
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
                Dataset Reference
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

          {/* Instructions Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-canvas">
            {leftTab === 'description' ? (
              <article className="prose prose-sm max-w-none">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-surface-soft text-gray-500 border border-hairline font-mono">
                    {question?.category.replace('-', ' ')}
                  </span>
                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border font-mono ${
                    question?.difficulty === 'easy' ? 'bg-success/10 text-success border-success/20' :
                    question?.difficulty === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-error/10 text-error border-error/20'
                  }`}>
                    {question?.difficulty}
                  </span>
                </div>

                <div className="mb-5 pb-4 border-b border-hairline">
                  <h1 className="text-base font-extrabold text-ink tracking-tight leading-snug">
                    {cleanTitle(question?.title || '')}
                  </h1>
                </div>

                <div 
                  className="text-ink leading-relaxed font-normal text-sm space-y-2 font-sans [&_pre]:!whitespace-pre [&_pre]:!overflow-x-auto [&_code]:!text-[11px]"
                  dangerouslySetInnerHTML={{ __html: enrichQuestionDetails(question) }}
                />
              </article>
            ) : (
              <div className="space-y-6 text-xs text-ink h-full flex flex-col justify-center py-8">
                <div className="p-8 rounded-3xl border border-hairline bg-surface-soft flex flex-col items-center justify-center text-center space-y-5 shadow-sm hover:border-primary/30 transition-all max-w-md mx-auto">
                  <div className="p-4 bg-primary/10 rounded-2xl text-primary animate-pulse">
                    <Database className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-ink">Active Dataset File</h3>
                    <p className="text-xs text-gray-500 font-normal leading-relaxed">
                      This challenge executes inside a Python sandbox loaded with:
                    </p>
                    <div className="mt-1">
                      <span className="text-xs font-mono text-primary font-bold px-3 py-1.5 rounded-xl bg-canvas border border-hairline inline-block shadow-sm select-all">
                        {question?.dataset_name || 'No dataset assigned'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 max-w-xs font-normal leading-relaxed">
                    Click the button below to view the complete CSV dataset with full horizontal and vertical scrolling.
                  </p>
                  
                  {question?.dataset_name && DEFAULT_DATASETS[question.dataset_name] && (
                    <button
                      onClick={handleOpenCsvPreview}
                      className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Preview Full File
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Right Side: Coding Space + Logs - Styled inside a gorgeous panel that reacts to theme */}
        <section className="flex-1 flex flex-col bg-canvas border-l border-hairline min-w-0 overflow-hidden">
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
                onClick={handleCopyCode}
                title="Copy Code"
                className="p-1.5 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-fade-in" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleResetCode}
                title="Reset Code Template"
                className="p-1.5 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-1.5 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <div className="h-4 w-[1px] bg-hairline mx-1"></div>

              <button
                onClick={handleRun}
                disabled={isRunning || pyodideState !== 'ready'}
                className="px-4 py-1.5 rounded-full bg-canvas text-ink border border-hairline hover:bg-surface-soft hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-[11px] font-bold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              >
                <Play className="w-3 h-3 fill-current" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] text-[11px] font-extrabold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)] animate-fade-in"
              >
                <Send className="w-3 h-3" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div 
            className={`flex-1 relative bg-[#1e1e1e] transition-all duration-300 ${
              terminalSize === 'maximized' ? 'min-h-[20%]' : 'min-h-[50%]'
            }`} 
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
          >
            <Editor
              height="100%"
              defaultLanguage="python"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={code}
              onChange={(val) => setCode(val || '')}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                roundedSelection: true,
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
                automaticLayout: true,
              }}
            />
          </div>

          {/* Lower Pane: Logs/Visualizations */}
          <div className={`border-t border-hairline flex flex-col bg-canvas transition-all duration-300 ${
            terminalSize === 'maximized' ? 'h-[75%]' : 'h-[40%]'
          }`}>
            {/* Tabs & Resize Panel size toggles */}
            <div className="flex items-center justify-between border-b border-hairline bg-surface-soft pr-4">
              <div className="flex">
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
                    evalStatus === 'success'
                      ? 'border-semantic-success text-semantic-success font-extrabold bg-canvas/10'
                      : evalStatus === 'wrong' || evalStatus === 'error'
                      ? 'border-error text-error font-extrabold bg-canvas/10'
                      : rightTab === 'cases'
                      ? 'border-primary text-ink bg-canvas font-extrabold'
                      : 'border-transparent text-gray-500 hover:text-ink'
                  }`}
                >
                  {evalStatus === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-semantic-success" />
                  ) : evalStatus === 'wrong' || evalStatus === 'error' ? (
                    <XCircle className="w-3.5 h-3.5 text-error" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Test Results
                </button>
              </div>

              {/* Sizing Controller buttons */}
              <div className="flex items-center">
                {terminalSize === 'default' ? (
                  <button
                    onClick={() => setTerminalSize('maximized')}
                    title="Expand Terminal panel size"
                    className="px-2.5 py-1 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-[9px] font-extrabold uppercase tracking-widest text-ink cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <ChevronUp className="w-3 h-3 text-primary" />
                    Expand
                  </button>
                ) : (
                  <button
                    onClick={() => setTerminalSize('default')}
                    title="Shrink Terminal panel size"
                    className="px-2.5 py-1 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-[9px] font-extrabold uppercase tracking-widest text-ink cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <ChevronDown className="w-3 h-3 text-primary" />
                    Shrink
                  </button>
                )}
              </div>
            </div>

            {/* Tab content panel */}
            <div ref={terminalScrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-body bg-canvas">
              {rightTab === 'terminal' && (
                <div className="space-y-1">
                  {output ? (
                    <pre className="whitespace-pre-wrap font-mono text-body text-xs">
                      {output}
                    </pre>
                  ) : (
                    <p className="text-gray-500 text-xs font-normal">Run code to see standard console print outputs...</p>
                  )}
                </div>
              )}


              {rightTab === 'cases' && (
                <div className="space-y-4">
                  {evalStatus === 'idle' ? (
                    <p className="text-gray-500 text-xs font-normal">Run code to evaluate hidden assertions.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {evalStatus === 'success' && (
                          <div className="px-3 py-1 rounded-full bg-semantic-success/10 border border-semantic-success/20 text-semantic-success text-xs font-semibold uppercase">
                            Challenge Accepted
                          </div>
                        )}
                        {evalStatus === 'wrong' && (
                          <div className="px-3 py-1 rounded-full bg-error/10 border border-error/20 text-error text-xs font-semibold uppercase">
                            Wrong Answer
                          </div>
                        )}
                        {evalStatus === 'error' && (
                          <div className="px-3 py-1 rounded-full bg-rose-700/10 border border-rose-700/20 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase">
                            Runtime Error / Compilation Failed
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 rounded-xl bg-surface-soft border border-hairline flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Cases Passed</p>
                          <p className="text-lg font-bold text-ink mt-1">
                            {passedCases} <span className="text-xs text-gray-500">/ {totalCases}</span>
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-hairline flex items-center justify-center font-bold text-xs text-ink">
                          {totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      {/* Guest Sign In Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-10 rounded-3xl max-w-md w-full space-y-6 text-center shadow-xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Send className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Sign In Required</h3>
              <p className="text-xs text-muted font-normal leading-relaxed">
                Please login or create account to submit your coding solution and record your progress.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-2.5 rounded-full bg-surface-soft hover:bg-surface-card border border-hairline text-ink text-xs font-bold transition-all cursor-pointer"
              >
                Create Account
              </button>
              <button
                onClick={() => setShowGuestModal(false)}
                className="w-full py-2.5 rounded-full bg-transparent hover:bg-surface-soft text-gray-500 hover:text-ink text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Failure Modal */}
      {showPracticeFailureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-8 rounded-3xl max-w-sm w-full space-y-6 text-center shadow-xl animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Verification Failed</h3>
              <p className="text-xs text-muted font-normal leading-relaxed">
                All test cases not passed so you cant submit your solution.
              </p>
            </div>
            <button
              onClick={() => setShowPracticeFailureModal(false)}
              className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Congratulations Submission Modal */}
      {showCongratsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-10 rounded-3xl max-w-sm w-full space-y-6 text-center shadow-2xl animate-scale-in">
            {/* Animated success ring */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '1.5s' }}></div>
              <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-ink tracking-tight">Congratulations! 🎉</h3>
              <p className="text-sm text-muted font-normal leading-relaxed">
                Your solution has been submitted and your progress has been recorded.
              </p>
              {question?.points && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mt-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">+{question.points} pts</span>
                  <span className="text-xs text-muted">earned</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => { setShowCongratsModal(false); router.push('/practice') }}
                className="w-full py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all cursor-pointer"
              >
                Back to Practice
              </button>
              <button
                onClick={() => setShowCongratsModal(false)}
                className="w-full py-2.5 rounded-full bg-surface-soft hover:bg-surface-card border border-hairline text-ink text-xs font-semibold transition-all cursor-pointer"
              >
                Stay on Problem
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-8 rounded-3xl max-w-sm w-full space-y-6 text-center shadow-xl animate-scale-in text-ink">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Reset Editor Code?</h3>
              <p className="text-xs text-muted font-normal leading-relaxed">
                Are you sure you want to reset the editor to the starter template? All of your unsaved progress on this problem will be lost.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-full border border-hairline bg-canvas hover:bg-surface-soft hover:scale-[1.02] active:scale-[0.98] text-ink text-xs font-bold transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false)
                  performResetCode()
                }}
                className="flex-1 py-2 rounded-full bg-primary hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-on-primary text-xs font-bold transition-all duration-200 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full CSV Modal Preview */}
      {showCsvModal && question?.dataset_name && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-canvas border border-hairline rounded-3xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="p-5 border-b border-hairline flex items-center justify-between bg-surface-soft">
              <div className="flex items-center gap-3 text-ink">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-ink">{question.dataset_name}</h3>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {csvPreviewRows.length > 0 ? `${csvPreviewRows.length - 1} records loaded` : 'Loading...'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false)
                  setCsvPreviewRows([])
                }}
                className="p-2 rounded-xl text-gray-500 hover:text-ink hover:bg-surface-card transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Table wrapper with scrollability */}
            <div className="flex-1 overflow-auto p-6 bg-canvas min-h-0 relative flex flex-col">
              {csvPreviewRows.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-gray-500 font-normal">Loading dataset contents...</p>
                </div>
              ) : (
                <div className="flex-1 border border-hairline rounded-2xl overflow-auto bg-canvas relative flex flex-col min-h-0">
                  <table className="min-w-full text-left border-collapse text-xs table-auto">
                    <thead>
                      <tr className="bg-surface-soft border-b border-hairline text-gray-500 font-mono font-semibold uppercase">
                        {csvPreviewRows[0]?.map((col, idx) => (
                          <th key={idx} className="px-4 py-3 whitespace-nowrap sticky top-0 z-10 bg-surface-soft border-b border-hairline">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-body font-mono">
                      {csvPreviewRows.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-surface-soft transition-colors">
                          {row.map((val, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap">
                              {val === '' || val === null || val === undefined ? 'NaN' : val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matplotlib Visualization Overlay Modal */}
      {showPlotModal && plotUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-6 rounded-3xl max-w-4xl w-full flex flex-col items-center justify-center relative shadow-2xl animate-scale-in">
            {/* Top-right button group: Fullscreen + Close */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <button
                onClick={() => setFullscreenPlotUrl(plotUrl)}
                title="Show in Full Screen"
                className="p-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors flex items-center justify-center"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowPlotModal(false)
                  setPlotUrl('')
                }}
                title="Close Plot"
                className="p-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-full text-center space-y-4">
              <h3 className="text-sm font-extrabold text-ink flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Visualization Output
              </h3>
              <div className="border border-hairline rounded-2xl overflow-hidden bg-white p-2">
                <img src={plotUrl} alt="Matplotlib Plot Output" className="w-full max-h-[520px] object-contain rounded-lg mx-auto" />
              </div>
              {/* Full Screen Button */}
              <button
                onClick={() => setFullscreenPlotUrl(plotUrl)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-soft border border-hairline hover:bg-surface-card text-xs font-bold text-ink cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                title="View in Full Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Show in Full Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Plot Overlay */}
      {fullscreenPlotUrl && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center animate-fade-in bg-white dark:bg-zinc-950"
          onClick={() => setFullscreenPlotUrl(null)}
        >
          <button
            onClick={() => setFullscreenPlotUrl(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 hover:text-ink transition-colors cursor-pointer z-10"
            title="Close Fullscreen"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={fullscreenPlotUrl}
            alt="Fullscreen matplotlib plot"
            className="w-full h-full object-contain select-none p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
