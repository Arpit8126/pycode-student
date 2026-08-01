'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import { usePyodide } from '@/hooks/usePyodide'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'
import { DATASET_SAMPLES } from '@/lib/datasetSamples'
import { createClient } from '@/lib/supabase/client'
import { enrichQuestionDetails } from '@/lib/questionFormatter'
import { ArrowLeft, Play, RefreshCw, BarChart, Database, Terminal, FileText, CheckCircle, XCircle, Copy, Send, Settings, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'

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

  // Runner states
  const { state: pyodideState, progressMsg: pyodideProgress, runCode } = usePyodide()
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [plotUrl, setPlotUrl] = useState('')
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
  
  // Submit preconditions modal state
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showPracticeFailureModal, setShowPracticeFailureModal] = useState(false)

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

  useEffect(() => {
    const fetchQuestion = async () => {
      setLoading(true)
      try {
        // Try DB first
        const { data, error } = await supabase
          .from('coding_questions')
          .select('*')
          .eq('id', questionId)
          .maybeSingle()

        if (!error && data) {
          setQuestion(data)
          const savedCode = localStorage.getItem(`pycode_draft_${questionId}`)
          if (savedCode) {
            setCode(savedCode)
          } else {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data: lastSub } = await supabase
                .from('coding_submissions')
                .select('submitted_code')
                .eq('user_id', user.id)
                .eq('question_id', questionId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (lastSub && lastSub.submitted_code) {
                setCode(lastSub.submitted_code)
              } else {
                setCode(data.starter_code || '')
              }
            } else {
              setCode(data.starter_code || '')
            }
          }
        } else {
          // Local fallback
          const localQ = LOCAL_QUESTIONS.find(q => q.id === questionId)
          if (localQ) {
            setQuestion(localQ)
            const savedCode = localStorage.getItem(`pycode_draft_${questionId}`)
            if (savedCode) {
              setCode(savedCode)
            } else {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                const { data: lastSub } = await supabase
                  .from('coding_submissions')
                  .select('submitted_code')
                  .eq('user_id', user.id)
                  .eq('question_id', questionId)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                if (lastSub && lastSub.submitted_code) {
                  setCode(lastSub.submitted_code)
                } else {
                  setCode(localQ.starter_code || '')
                }
              } else {
                setCode(localQ.starter_code || '')
              }
            }
          } else {
            router.push('/practice')
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchQuestion()
  }, [questionId, supabase, router])


  // Custom editor mounting configurations
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    // Disable copy-paste commands inside the editor workspace
    editor.onKeyDown((e: any) => {
      // Control + C or Meta + C (Mac)
      // Control + V or Meta + V (Mac)
      const isModifier = e.ctrlKey || e.metaKey
      if (isModifier && (e.keyCode === 33 || e.keyCode === 52 || e.keyCode === 31)) {
        e.preventDefault()
        setOutput('System Message: Copying and Pasting inside PyCode editor is blocked to support manual practice.')
        setRightTab('terminal')
      }
    })
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
    alert("Code copied to clipboard!")
  }

  // Restore starter template
  const handleResetCode = () => {
    if (confirm('Are you sure you want to reset the editor to the starter template? Your progress will be lost.')) {
      setCode(question?.starter_code || '')
    }
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
      
      if (outcome.visualization) {
        setPlotUrl(`data:image/png;base64,${outcome.visualization}`)
        setRightTab('plots')
      } else {
        setRightTab('terminal')
      }

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
      alert("Congratulations! Your solution has been submitted and progress recorded.")
      router.push('/practice')
    } catch (err: any) {
      console.error(err)
      alert(`Submission failed: ${err.message || err}`)
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

  const sample = question?.dataset_name ? DATASET_SAMPLES[question.dataset_name] : null

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
            <span className="text-sm font-extrabold tracking-tight truncate max-w-[280px]">{question?.title}</span>
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Instructions Panel */}
        {!leftPanelCollapsed && (
          <section className="w-[40%] border-r border-hairline flex flex-col bg-canvas">
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

                <h1 className="text-2xl font-extrabold text-ink mb-4 tracking-tight">{question?.title}</h1>

                <div 
                  className="text-body leading-relaxed font-light text-sm markdown-body space-y-4 font-sans"
                  dangerouslySetInnerHTML={{ __html: enrichQuestionDetails(question) }}
                />
              </article>
            ) : (
              <div className="space-y-6 text-xs text-ink">
                <div>
                  <h3 className="text-sm font-bold text-ink">Dataset: {sample?.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 font-light leading-relaxed">{sample?.description}</p>
                </div>

                {/* Schema Table */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">Column Schemas</h4>
                  <div className="border border-hairline rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-soft text-gray-500 border-b border-hairline">
                          <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider">Column</th>
                          <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider">Type</th>
                          <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {sample?.columns.map((c, i) => (
                          <tr key={i} className="hover:bg-surface-soft">
                            <td className="px-3 py-2 font-mono text-primary font-bold">{c.column}</td>
                            <td className="px-3 py-2 font-mono text-gray-400">{c.type}</td>
                            <td className="px-3 py-2 text-gray-500 font-light">{c.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview Grid */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">First Rows Preview</h4>
                  <div className="border border-hairline rounded-xl overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="bg-surface-soft text-gray-500 border-b border-hairline font-mono text-[9px] uppercase tracking-wider">
                          {sample?.columns.slice(0, 5).map((c, i) => (
                            <th key={i} className="px-3 py-2">{c.column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline font-mono">
                        {sample?.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-surface-soft">
                            {sample?.columns.slice(0, 5).map((col, idx) => (
                              <td key={idx} className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                                {row[col.column] === null ? 'NaN' : String(row[col.column])}
                              </td>
                            ))}
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

        {/* Right Side: Coding Space + Logs - Styled inside a gorgeous panel that reacts to theme */}
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

              <div className="h-4 w-[1px] bg-hairline mx-1"></div>

              <button
                onClick={handleRun}
                disabled={isRunning || pyodideState !== 'ready'}
                className="px-4 py-1.5 rounded-full bg-canvas text-ink border border-hairline hover:bg-surface-soft disabled:opacity-50 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              >
                <Play className="w-3 h-3 fill-current" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)] animate-fade-in"
              >
                <Send className="w-3 h-3" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div 
            className="flex-1 min-h-[50%] relative bg-[#1e1e1e]" 
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
                  {evalStatus === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
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
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-body bg-canvas">
              {rightTab === 'terminal' && (
                <div className="space-y-1">
                  {output ? (
                    <pre className="whitespace-pre-wrap font-mono text-body text-xs">
                      {output}
                    </pre>
                  ) : (
                    <p className="text-gray-500 text-xs font-light">Run code to see standard console print outputs...</p>
                  )}
                </div>
              )}

              {rightTab === 'plots' && (
                <div className="flex items-center justify-center h-full">
                  {plotUrl ? (
                    <div className="relative group rounded-xl overflow-hidden border border-hairline bg-surface-soft p-2 max-w-lg shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                      <img src={plotUrl} alt="Matplotlib HEADLESS Visualization" className="max-h-[180px] object-contain rounded-lg" />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs font-light">No Matplotlib figures drawn. Use plt.plot() or sns.barplot() to construct figures.</p>
                  )}
                </div>
              )}

              {rightTab === 'cases' && (
                <div className="space-y-4">
                  {evalStatus === 'idle' ? (
                    <p className="text-gray-500 text-xs font-light">Run code to evaluate hidden assertions.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {evalStatus === 'success' ? (
                          <div className="px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold uppercase">
                            Challenge Accepted
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-error/10 border border-error/20 text-error text-xs font-semibold uppercase">
                            Wrong Answer / Compilation Failed
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
              <p className="text-xs text-muted font-light leading-relaxed">
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
              <p className="text-xs text-muted font-light leading-relaxed">
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
    </div>
  )
}
