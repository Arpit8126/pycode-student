'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Monaco, useMonaco } from '@monaco-editor/react'
import { ArrowLeft, Play, RefreshCw, Database, Terminal, CheckCircle, X, Sun, Moon, ChevronRight, FileCode, RotateCcw, Square, Save, MoreVertical, Download, Trash2, LogIn, UserPlus } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

// Import Monaco Editor dynamically to prevent SSR conflicts
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

declare global {
  interface Window {
    loadPyodide?: any
  }
}

// Predefined datasets data
const DATASETS = {
  'students.csv': {
    name: 'students.csv',
    description: 'Profiles of students containing missing values (NaN) to practice data cleaning (dropna, fillna) and filtering.',
    headers: ['StudentID', 'Name', 'Age', 'Gender', 'Grade', 'Score', 'AttendedClass'],
    csv: `StudentID,Name,Age,Gender,Grade,Score,AttendedClass
101,Amit,20,M,A,92,True
102,Arpit,,M,B,78,True
103,Rahul,22,M,A+,95,True
104,Pooja,19,F,,82,False
105,Neha,20,F,A-,,True
106,Siddharth,21,M,C,64,True
107,Kriti,22,F,B+,88,False
108,Rohan,,M,A,91,True
109,Anjali,20,F,B,,True
110,Yash,21,M,C+,70,False
111,Simran,19,F,A,94,True
112,Karan,22,M,,85,True
113,Sneha,20,F,A+,97,True
114,Vijay,21,M,B-,69,False
115,Aditi,23,F,B,,True`
  },
  'sales.csv': {
    name: 'sales.csv',
    description: 'Product sales quantities and unit prices across regions. Designed for aggregation, math, grouping (groupby), and sorting.',
    headers: ['Date', 'Category', 'Product', 'Quantity', 'UnitPrice', 'Region'],
    csv: `Date,Category,Product,Quantity,UnitPrice,Region
2026-01-01,Electronics,Laptop,5,50000,North
2026-01-01,Office,Chair,12,2500,South
2026-01-02,Electronics,Mouse,25,800,North
2026-01-02,Office,Desk,4,8000,West
2026-01-03,Electronics,Monitor,8,15000,East
2026-01-03,Office,Chair,15,2500,North
2026-01-04,Electronics,Laptop,3,50000,West
2026-01-04,Office,Desk,6,8000,South
2026-01-05,Electronics,Keyboard,10,1200,East
2026-01-05,Office,Chair,8,2500,West
2026-01-06,Electronics,Mouse,30,800,South
2026-01-06,Office,Desk,5,8000,East
2026-01-07,Electronics,Monitor,12,15000,North
2026-01-07,Office,Chair,20,2500,East
2026-01-08,Electronics,Laptop,4,50000,South`
  },
  'weather.csv': {
    name: 'weather.csv',
    description: 'Weather metrics and temperatures across cities. Designed for date-time parsing, sorting, and pivoting.',
    headers: ['City', 'Date', 'Temperature', 'Humidity', 'WindSpeed', 'Condition'],
    csv: `City,Date,Temperature,Humidity,WindSpeed,Condition
Delhi,2026-07-01,36.5,72,12,Sunny
Mumbai,2026-07-01,30.2,88,18,Rainy
Bangalore,2026-07-01,24.8,60,15,Cloudy
Delhi,2026-07-02,37.2,68,10,Sunny
Mumbai,2026-07-02,29.8,90,22,Rainy
Bangalore,2026-07-02,25.1,62,14,Cloudy
Delhi,2026-07-03,35.0,75,14,Sunny
Mumbai,2026-07-03,30.5,85,16,Rainy
Bangalore,2026-07-03,24.2,65,12,Cloudy
Delhi,2026-07-04,36.8,70,8,Sunny
Mumbai,2026-07-04,31.0,82,15,Cloudy
Bangalore,2026-07-04,25.5,58,10,Sunny
Delhi,2026-07-05,38.0,65,11,Sunny
Mumbai,2026-07-05,29.5,92,25,Rainy
Bangalore,2026-07-05,23.9,68,16,Rainy`
  }
}

export default function CodeEditorPage() {
  const supabase = createClient()
  const [code, setCode] = useState('# Write your code here\n')

  // Pyodide Loading States
  const [pyodideState, setPyodideState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const pyodideRef = useRef<any>(null)
  const editorRef = useRef<any>(null)
  const stdoutRef = useRef<(text: string) => void>(null)
  
  // Web Worker for Pyodide background thread
  const workerRef = useRef<Worker | null>(null)
  const execIdRef = useRef<string>('')
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [promptValue, setPromptValue] = useState('')

  // Saved Files States
  const router = useRouter()
  const [savedFiles, setSavedFiles] = useState<{ name: string; code: string; lastModified: string }[]>([])
  const [leftSidebarTab, setLeftSidebarTab] = useState<'savedFiles' | 'datasets'>('savedFiles')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showGuestSaveModal, setShowGuestSaveModal] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')
  const [activeDropdownFile, setActiveDropdownFile] = useState<string | null>(null)

  // Resizing output terminal panel
  const [terminalHeight, setTerminalHeight] = useState(240)
  const isDraggingRef = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return
    const newHeight = window.innerHeight - e.clientY
    const clampedHeight = Math.max(80, Math.min(newHeight, window.innerHeight * 0.7))
    setTerminalHeight(clampedHeight)
    if (editorRef.current) {
      editorRef.current.layout()
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    if (editorRef.current) {
      editorRef.current.layout()
    }
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Operational States
  const [isRunning, setIsRunning] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState('')
  const [plotUrl, setPlotUrl] = useState('')
  const [showPlotModal, setShowPlotModal] = useState(false)


  
  // Theme sync
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  // File Explorer State
  const [selectedFile, setSelectedFile] = useState<keyof typeof DATASETS | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  
  // Global theme observer hook
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

  // Set stdout / stderr logger ref to state appender
  useEffect(() => {
    (stdoutRef as any).current = (text: string) => {
      setConsoleOutput(prev => prev + text)
    }
  }, [])

  // Initialize Pyodide Web Worker background thread
  const initWorker = () => {
    setPyodideState('loading')
    setProgressMsg('Loading WebAssembly core inside background thread...')

    const worker = new Worker('/pyodide-worker.js')
    workerRef.current = worker

    worker.onmessage = (e) => {
      const data = e.data
      if (data.type === 'INIT_READY') {
        setPyodideState('ready')
        setProgressMsg('Environment ready!')
      } else if (data.type === 'INIT_ERROR') {
        setPyodideState('error')
        setProgressMsg(data.message || 'Failed to initialize worker.')
      } else if (data.type === 'STDOUT' || data.type === 'STDERR') {
        setConsoleOutput(prev => prev + data.text)
      } else if (data.type === 'NEED_INPUT') {
        setActivePrompt(data.prompt)
        setPromptValue('')
      } else if (data.type === 'FILE_CONTENT') {
        const content = data.content
        const lines = content.trim().split('\n')
        setPreviewRows(lines.map((line: string) => {
          return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
        }))
      } else if (data.type === 'RUN_SUCCESS') {
        setIsRunning(false)
        if (data.plotData) {
          setPlotUrl(`data:image/png;base64,${data.plotData}`)
          setShowPlotModal(true)
        }
      } else if (data.type === 'RUN_ERROR') {
        setIsRunning(false)
        let errMsg = data.message || 'Error occurred.'
        const lines = errMsg.split('\n')
        const cleanLines = lines.filter((line: string) => {
          return !line.includes('/_pyodide/') && 
                 !line.includes('/pyodide/') && 
                 !line.includes('eval_code_async') && 
                 !line.includes('run_async')
        })
        setConsoleOutput(prev => prev + '\n' + cleanLines.join('\n'))
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      setConsoleOutput(prev => prev + '\n[Worker System Error]: ' + err.message)
      setIsRunning(false)
    }

    worker.postMessage({ type: 'INIT', datasets: DATASETS })
  }

  // Load saved files
  const loadSavedFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await (supabase.from('saved_scripts') as any)
          .select('*')
          .order('last_modified', { ascending: false })
        
        if (!error && data) {
          const formatted = data.map((d: any) => ({
            name: d.name,
            code: d.code,
            lastModified: new Date(d.last_modified).toLocaleString()
          }))
          setSavedFiles(formatted)
          if (formatted.length > 0) {
            setCode(formatted[0].code)
          }
          return
        }
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to localStorage:", err)
    }

    if (typeof window !== 'undefined') {
      const filesStr = localStorage.getItem('pycode_saved_files')
      if (filesStr) {
        try {
          const files = JSON.parse(filesStr)
          setSavedFiles(files)
          if (files.length > 0) {
            setCode(files[0].code)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  useEffect(() => {
    initWorker()
    loadSavedFiles()
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const handleSaveFile = async () => {
    let name = saveFileName.trim()
    if (!name) return
    if (!name.endsWith('.py')) {
      name += '.py'
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .upsert({
            user_id: user.id,
            name,
            code,
            last_modified: new Date().toISOString()
          }, { onConflict: 'user_id, name' })
        
        if (!error) {
          loadSavedFiles()
          setShowSaveModal(false)
          setSaveFileName('')
          return
        } else {
          console.error("Supabase save error:", error)
        }
      }
    } catch (err) {
      console.warn("Supabase save failed, falling back to localStorage:", err)
    }

    const newFile = {
      name,
      code,
      lastModified: new Date().toLocaleString()
    }

    const updatedFiles = [...savedFiles]
    const existingIndex = updatedFiles.findIndex(f => f.name.toLowerCase() === name.toLowerCase())
    if (existingIndex > -1) {
      updatedFiles[existingIndex] = newFile
    } else {
      updatedFiles.push(newFile)
    }

    setSavedFiles(updatedFiles)
    localStorage.setItem('pycode_saved_files', JSON.stringify(updatedFiles))
    setShowSaveModal(false)
    setSaveFileName('')
  }

  const handleLoadFile = (file: { name: string; code: string }) => {
    setCode(file.code)
    if (editorRef.current) {
      editorRef.current.setValue(file.code)
    }
  }

  const handleDeleteFile = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .delete()
          .eq('user_id', user.id)
          .eq('name', name)
        
        if (!error) {
          loadSavedFiles()
          setActiveDropdownFile(null)
          return
        }
      }
    } catch (err) {
      console.warn("Supabase delete failed, falling back to localStorage:", err)
    }

    const updatedFiles = savedFiles.filter(f => f.name !== name)
    setSavedFiles(updatedFiles)
    localStorage.setItem('pycode_saved_files', JSON.stringify(updatedFiles))
    setActiveDropdownFile(null)
  }

  const handleDownloadFile = (file: { name: string; code: string }) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
    setActiveDropdownFile(null)
  }

  // Read current CSV file contents from Pyodide FS to display preview table
  const loadFilePreview = (filename: keyof typeof DATASETS) => {
    setSelectedFile(filename)
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'GET_FILE', filename })
    } else {
      const lines = DATASETS[filename].csv.trim().split('\n')
      setPreviewRows(lines.map(line => line.split(',')))
    }
  }

  // Reset a specific CSV file in Pyodide
  const handleResetFile = (filename: keyof typeof DATASETS) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET_FILE', filename, csv: DATASETS[filename].csv })
      alert(`${filename} has been reset to default values.`)
    }
  }

  // Run Code
  const handleRunCode = async () => {
    if (!workerRef.current || isRunning) return
    setIsRunning(true)
    setConsoleOutput('')

    // Generate unique execution ID for this run session
    const execId = Math.random().toString(36).substring(7)
    execIdRef.current = execId

    workerRef.current.postMessage({
      type: 'RUN_CODE',
      code,
      execId
    })
  }

  const handleTerminateCode = () => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setActivePrompt(null)
    setPromptValue('')
    setIsRunning(false)
    setConsoleOutput(prev => prev + '\n[Program Terminated by User]')
    
    // Respawn worker to restore VM state
    initWorker()
  }

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = promptValue
    setPromptValue('')
    setActivePrompt(null)
    
    // Submit values to Next.js long-poll endpoint
    try {
      await fetch(`/api/editor/input?execId=${execIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val })
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handlePromptCancel = async () => {
    setPromptValue('')
    setActivePrompt(null)
    try {
      await fetch(`/api/editor/input?execId=${execIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '' })
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col bg-canvas text-ink font-sans relative">
      
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
            <span className="text-sm font-extrabold tracking-tight">Code Editor</span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
              Sandbox IDE
            </span>
          </div>
        </div>

        <div>
          {pyodideState !== 'ready' ? (
            <span className="text-xs text-amber-600 flex items-center gap-2 animate-pulse font-light">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {progressMsg}
            </span>
          ) : (
            <span className="text-[9px] text-emerald-800 bg-success/10 px-2.5 py-1 rounded-full border border-success/20 flex items-center gap-1.5 font-bold tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
              SANDBOX ONLINE
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Explorer: Saved Files & Virtual CSV Files */}
        <section className="w-64 border-r border-hairline flex flex-col bg-canvas p-4 space-y-4">
          {/* Tab Selector Buttons */}
          <div className="flex border-b border-hairline shrink-0">
            <button
              onClick={() => setLeftSidebarTab('savedFiles')}
              className={`flex-1 pb-2 text-center text-xs font-extrabold tracking-tight border-b-2 cursor-pointer transition-all ${
                leftSidebarTab === 'savedFiles'
                  ? 'border-primary text-ink'
                  : 'border-transparent text-gray-500 hover:text-ink'
              }`}
            >
              Saved Files
            </button>
            <button
              onClick={() => setLeftSidebarTab('datasets')}
              className={`flex-1 pb-2 text-center text-xs font-extrabold tracking-tight border-b-2 cursor-pointer transition-all ${
                leftSidebarTab === 'datasets'
                  ? 'border-primary text-ink'
                  : 'border-transparent text-gray-500 hover:text-ink'
              }`}
            >
              Datasets
            </button>
          </div>

          {leftSidebarTab === 'savedFiles' ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5 mb-1">
                  <FileCode className="w-3.5 h-3.5 text-primary" />
                  Your Saved Scripts
                </h3>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  Resumable Python code files saved locally in browser.
                </p>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0 relative pr-0.5">
                {savedFiles.length === 0 ? (
                  <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                    <p className="text-[11px] text-gray-700 dark:text-gray-300 font-semibold">No saved files yet.</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-light mt-1">Click &quot;Save File&quot; in toolbar to store progress!</p>
                  </div>
                ) : (
                  savedFiles.map((file) => {
                    const isActive = code === file.code
                    const isDropdownOpen = activeDropdownFile === file.name
                    return (
                      <div key={file.name} className="relative group animate-fade-in">
                        <button
                          onClick={() => handleLoadFile(file)}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 pr-10 ${
                            isActive
                              ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                              : 'bg-canvas border-hairline text-gray-500 hover:text-ink hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden w-full">
                            <FileCode className="w-4 h-4 shrink-0 text-primary animate-pulse" />
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold font-mono truncate">{file.name}</span>
                              <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate font-mono">{file.lastModified}</span>
                            </div>
                          </div>
                        </button>

                        {/* Three-dot dropdown menu trigger */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveDropdownFile(isDropdownOpen ? null : file.name)
                            }}
                            className="p-1 rounded-full text-gray-400 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Options */}
                          {isDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveDropdownFile(null)
                                }} 
                              />
                              <div className="absolute right-0 top-6 w-32 bg-canvas border border-hairline rounded-xl shadow-xl py-1.5 z-20 animate-scale-in">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadFile(file)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 hover:text-ink hover:bg-surface-soft flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-primary" />
                                  Download
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteFile(file.name)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-[11px] font-bold text-red-600 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  Virtual Datasets
                </h3>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  Pandas datasets pre-loaded in the browser VM workspace.
                </p>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0">
                {Object.keys(DATASETS).map((key) => {
                  const filename = key as keyof typeof DATASETS
                  const active = selectedFile === filename
                  return (
                    <button
                      key={filename}
                      onClick={() => loadFilePreview(filename)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${
                        active
                          ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                          : 'bg-canvas border-hairline text-gray-700 dark:text-gray-400 hover:text-ink hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileCode className="w-4 h-4 shrink-0 text-primary" />
                        <span className="text-xs font-bold font-mono truncate">{filename}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right Coding Sandbox Section */}
        <section className="flex-1 flex flex-col bg-canvas border-l border-hairline">
          
          {/* Monaco Editor Header Bar */}
          <div className="h-11 border-b border-hairline bg-surface-soft px-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-ink bg-canvas px-2.5 py-1 rounded-full border border-hairline flex items-center gap-1.5 uppercase tracking-widest font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse"></span>
                Python 3
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const isLight = document.documentElement.classList.contains('dark')
                  if (isLight) {
                    document.documentElement.classList.remove('dark')
                    localStorage.setItem('theme', 'light')
                  } else {
                    document.documentElement.classList.add('dark')
                    localStorage.setItem('theme', 'dark')
                  }
                }}
                title="Toggle Theme"
                className="p-1.5 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card cursor-pointer transition-colors flex items-center justify-center"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <div className="h-4 w-[1px] bg-hairline mx-1"></div>

              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) {
                    setShowGuestSaveModal(true)
                  } else {
                    setShowSaveModal(true)
                  }
                }}
                disabled={pyodideState !== 'ready'}
                className="px-4 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5 text-primary" />
                Save File
              </button>

              <div className="h-4 w-[1px] bg-hairline mx-1"></div>

              {isRunning ? (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-extrabold flex items-center gap-1.5 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Running...
                  </div>
                  <button
                    onClick={handleTerminateCode}
                    className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" stroke="none" />
                    Stop
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRunCode}
                  disabled={pyodideState !== 'ready'}
                  className="px-5 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run Code
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor Canvas */}
          <div className="flex-1 min-h-[50%] relative bg-[#1e1e1e] select-text">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={code}
              onChange={(val) => setCode(val || '')}
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

          {/* Resizer Handle Bar */}
          <div 
            onMouseDown={handleMouseDown}
            className="h-1.5 bg-hairline hover:bg-primary/50 cursor-ns-resize transition-colors duration-200 select-none z-10" 
          />

          {/* Console Output Panel */}
          <div 
            style={{ height: `${terminalHeight}px` }} 
            className="border-t border-hairline flex flex-col bg-canvas shrink-0 overflow-hidden"
          >
            <div className="flex border-b border-hairline bg-surface-soft px-4 py-2">
              <span className="text-[10px] uppercase font-mono font-extrabold text-gray-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                Console Terminal
              </span>
            </div>



            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-body leading-relaxed bg-canvas select-text">
              {consoleOutput ? (
                <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
              ) : (
                <p className="text-gray-400 font-light italic">Write Python code and click Run Code to execute and print outputs here...</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* CSV File Preview Overlay */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 flex items-center justify-end">
          <div className="w-[50%] h-full bg-canvas border-l border-hairline flex flex-col shadow-2xl p-6 space-y-6 animate-slide-up">
            
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-base font-extrabold text-ink font-mono">{selectedFile}</h2>
                  <p className="text-xs text-gray-500 font-light leading-relaxed mt-0.5">
                    {DATASETS[selectedFile].description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetFile(selectedFile)}
                  title="Reset dataset back to defaults"
                  className="px-3 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-primary" />
                  Reset File
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-full border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Sheet Table */}
            <div className="flex-1 border border-hairline rounded-2xl overflow-hidden bg-canvas overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-soft border-b border-hairline text-gray-500 font-mono font-semibold uppercase">
                    {previewRows[0]?.map((col, idx) => (
                      <th key={idx} className="px-4 py-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-body font-mono">
                  {previewRows.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-surface-soft transition-colors">
                      {row.map((val, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-2.5 truncate max-w-[200px]">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Matplotlib Visualization Overlay Modal */}
      {showPlotModal && plotUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-6 rounded-3xl max-w-2xl w-full flex flex-col items-center justify-center relative shadow-2xl animate-scale-in">
            <button
              onClick={() => {
                setShowPlotModal(false)
                setPlotUrl('')
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
              <div className="border border-hairline rounded-2xl overflow-hidden bg-white p-4">
                <img src={plotUrl} alt="Matplotlib Plot Output" className="max-h-[380px] object-contain rounded-lg mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Input Modal Dialog */}
      {activePrompt !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-xs uppercase font-mono font-extrabold text-primary flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Python Input Required
            </h3>
            <p className="text-sm font-medium text-ink">
              {activePrompt || "Enter value:"}
            </p>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                placeholder="Type value here..."
                autoFocus
              />
              <div className="flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={handleTerminateCode}
                  className="px-4 py-2 rounded-xl bg-red-600/10 border border-red-600/20 text-red-600 hover:bg-red-600/20 text-xs font-bold cursor-pointer transition-colors"
                >
                  Terminate
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePromptCancel}
                    className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save File Modal Dialog */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-xs uppercase font-mono font-extrabold text-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Code Script
            </h3>
            <p className="text-sm font-medium text-ink">
              Enter a filename to save this script in your browser workspace:
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                placeholder="e.g. solution.py"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false)
                    setSaveFileName('')
                  }}
                  className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFile}
                  disabled={!saveFileName.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Save Modal — shown when non-logged-in user clicks Save File */}
      {showGuestSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-canvas border border-hairline p-10 rounded-3xl max-w-md w-full space-y-6 text-center shadow-xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Save className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Sign In to Save</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                Please log in or create an account to save your code scripts. Your files will be securely synced to the cloud so you can resume anytime.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 rounded-full bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-2.5 rounded-full bg-surface-soft hover:bg-surface-card border border-hairline text-ink text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create Account
              </button>
              <button
                onClick={() => setShowGuestSaveModal(false)}
                className="w-full py-2.5 rounded-full bg-transparent hover:bg-surface-soft text-gray-500 hover:text-ink text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
