'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Monaco, useMonaco } from '@monaco-editor/react'
import { ArrowLeft, Play, RefreshCw, Database, Terminal, CheckCircle, X, Sun, Moon, ChevronLeft, ChevronRight, FileCode, RotateCcw, Square, Save, MoreVertical, Download, Trash2, LogIn, UserPlus, LogOut, Edit2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { DEFAULT_DATASETS as DATASETS } from '@/lib/datasetGenerator'
import { initDB, getDatasets, saveDataset, deleteDataset, CustomDataset } from '@/lib/indexedDb'

// Import Monaco Editor dynamically to prevent SSR conflicts
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

declare global {
  interface Window {
    loadPyodide?: any
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
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showGuestSaveModal, setShowGuestSaveModal] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')
  const [activeDropdownFile, setActiveDropdownFile] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string | null>(null)
  const [fileSearch, setFileSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [renameFileName, setRenameFileName] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [lastSavedCode, setLastSavedCode] = useState<string>('# Write your code here\n')
  const [datasetSearch, setDatasetSearch] = useState('')
  const [importedDatasets, setImportedDatasets] = useState<CustomDataset[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importedDatasetsRef = useRef<CustomDataset[]>([])
  const [activeDropdownDataset, setActiveDropdownDataset] = useState<string | null>(null)
  const [datasetDropdownPos, setDatasetDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const [isWaitingForInput, setIsWaitingForInput] = useState(false)
  const isRestoredRef = useRef(false)

  useEffect(() => {
    importedDatasetsRef.current = importedDatasets
  }, [importedDatasets])

  // Load draft code from localStorage on mount (restores editor state on refresh)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActiveFile = localStorage.getItem('pycode_active_file_draft')
      const savedDraft = localStorage.getItem('pycode_unsaved_draft')
      const savedLastCode = localStorage.getItem('pycode_last_saved_code_draft')
      
      if (savedActiveFile) {
        setActiveFileName(savedActiveFile)
        if (savedLastCode) setLastSavedCode(savedLastCode)
      }
      if (savedDraft) {
        setCode(savedDraft)
      }
      isRestoredRef.current = true
    }
  }, [])

  // Auto-save editor state to localStorage to survive page refreshes
  useEffect(() => {
    if (typeof window !== 'undefined' && isRestoredRef.current) {
      localStorage.setItem('pycode_unsaved_draft', code)
      if (activeFileName) {
        localStorage.setItem('pycode_active_file_draft', activeFileName)
        localStorage.setItem('pycode_last_saved_code_draft', lastSavedCode)
      } else {
        localStorage.removeItem('pycode_active_file_draft')
        localStorage.removeItem('pycode_last_saved_code_draft')
      }
    }
  }, [code, activeFileName, lastSavedCode])



  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const isSaveDisabled = isSaving || pyodideState !== 'ready' || (activeFileName ? code === lastSavedCode : code === '# Write your code here\n')

  // Resizing output terminal panel
  const [terminalHeight, setTerminalHeight] = useState(240)
  const isDraggingRef = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.classList.add('is-resizing')
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return
    const newHeight = window.innerHeight - e.clientY
    const clampedHeight = Math.max(40, Math.min(newHeight, window.innerHeight * 0.85))
    setTerminalHeight(clampedHeight)
    if (editorRef.current) {
      editorRef.current.layout()
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    document.body.classList.remove('is-resizing')
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

  // Lock parent layout scrolling to prevent nested h-screen overflow displacement
  useEffect(() => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.style.overflowY = 'hidden'
    }
    return () => {
      if (mainEl) {
        mainEl.style.overflowY = ''
      }
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
  const selectedFileRef = useRef<keyof typeof DATASETS | null>(null)
  useEffect(() => {
    selectedFileRef.current = selectedFile
  }, [selectedFile])
  
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
  const initWorker = async () => {
    setPyodideState('loading')
    setProgressMsg('Loading WebAssembly core inside background thread...')

    let customDbs: any[] = []
    try {
      customDbs = await getDatasets()
      setImportedDatasets(customDbs)
    } catch (err) {
      console.warn('Failed to load custom datasets from IndexedDB:', err)
    }

    const worker = new Worker('/pyodide-worker.js?v=' + Date.now())
    workerRef.current = worker

    worker.onmessage = (e) => {
      const data = e.data
      if (data.type === 'INIT_READY') {
        setPyodideState('ready')
        setProgressMsg('Environment ready!')
        // If a dataset was selected while loading, fetch its content now!
        const activeFile = selectedFileRef.current
        if (activeFile && workerRef.current) {
          const custom = importedDatasetsRef.current.find(d => d.name === activeFile)
          if (custom && custom.type === 'xlsx') {
            workerRef.current.postMessage({ type: 'GET_EXCEL_PREVIEW', filename: activeFile })
          } else {
            workerRef.current.postMessage({ type: 'GET_FILE', filename: activeFile })
          }
        }
      } else if (data.type === 'INIT_ERROR') {
        setPyodideState('error')
        setProgressMsg(data.message || 'Failed to initialize worker.')
      } else if (data.type === 'STDOUT' || data.type === 'STDERR') {
        setConsoleOutput(prev => prev + data.text)
      } else if (data.type === 'NEED_INPUT') {
        setActivePrompt(data.prompt)
        setPromptValue('')
        setIsWaitingForInput(false)
      } else if (data.type === 'EXCEL_PREVIEW_READY') {
        setPreviewRows(data.rows)
      } else if (data.type === 'FILE_CONTENT') {
        const content = data.content
        const lines = content.trim().split('\n')
        setPreviewRows(lines.map((line: string) => {
          return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
        }))
      } else if (data.type === 'RUN_SUCCESS') {
        setIsRunning(false)
        setIsWaitingForInput(false)
        setActivePrompt(null)
        if (data.plotData && typeof data.plotData === 'string' && data.plotData.length > 100) {
          setPlotUrl(`data:image/png;base64,${data.plotData}`)
          setShowPlotModal(true)
        }

        if (data.updatedFiles) {
          // Scan for modified custom files to save back to IndexedDB
          Object.entries(data.updatedFiles).forEach(async ([filename, content]) => {
            const isCustom = importedDatasetsRef.current.find(d => d.name === filename)
            if (isCustom) {
              try {
                const updatedDataset = {
                  ...isCustom,
                  currentContent: content as string | ArrayBuffer
                }
                await saveDataset(updatedDataset)
                setImportedDatasets(prev => prev.map(d => d.name === filename ? updatedDataset : d))
              } catch (e) {
                console.error(`Failed to save modified dataset ${filename}:`, e)
              }
            }
          })

          const stored = localStorage.getItem('pycode_dataset_contents')
          let currentStored: Record<string, string> = {}
          if (stored) {
            try {
              currentStored = JSON.parse(stored)
            } catch (e) {
              console.error(e)
            }
          }
          let hasChanges = false
          Object.entries(data.updatedFiles).forEach(([filename, content]) => {
            if (currentStored[filename] !== content) {
              currentStored[filename] = content as string
              hasChanges = true
            }
          })
          if (hasChanges) {
            localStorage.setItem('pycode_dataset_contents', JSON.stringify(currentStored))
            const activeFile = selectedFileRef.current
            if (activeFile && data.updatedFiles[activeFile]) {
              const content = data.updatedFiles[activeFile]
              const lines = content.trim().split('\n')
              setPreviewRows(lines.map((line: string) => {
                return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
              }))
            }
          }
        }
      } else if (data.type === 'RUN_ERROR') {
        setIsRunning(false)
        setIsWaitingForInput(false)
        setActivePrompt(null)
        let errMsg = data.message || 'Error occurred.'
        const lines = errMsg.split('\n')
        const cleanLines = lines.filter((line: string) => {
          return !line.includes('/_pyodide/') && 
                 !line.includes('/pyodide/') && 
                 !line.includes('eval_code_async') && 
                 !line.includes('run_async')
        })
        setConsoleOutput(prev => prev + '\n' + cleanLines.join('\n'))

        if (data.updatedFiles) {
          // Scan for modified custom files to save back to IndexedDB
          Object.entries(data.updatedFiles).forEach(async ([filename, content]) => {
            const isCustom = importedDatasetsRef.current.find(d => d.name === filename)
            if (isCustom) {
              try {
                const updatedDataset = {
                  ...isCustom,
                  currentContent: content as string | ArrayBuffer
                }
                await saveDataset(updatedDataset)
                setImportedDatasets(prev => prev.map(d => d.name === filename ? updatedDataset : d))
              } catch (e) {
                console.error(`Failed to save modified dataset ${filename}:`, e)
              }
            }
          })

          const stored = localStorage.getItem('pycode_dataset_contents')
          let currentStored: Record<string, string> = {}
          if (stored) {
            try {
              currentStored = JSON.parse(stored)
            } catch (e) {
              console.error(e)
            }
          }
          let hasChanges = false
          Object.entries(data.updatedFiles).forEach(([filename, content]) => {
            if (currentStored[filename] !== content) {
              currentStored[filename] = content as string
              hasChanges = true
            }
          })
          if (hasChanges) {
            localStorage.setItem('pycode_dataset_contents', JSON.stringify(currentStored))
            const activeFile = selectedFileRef.current
            if (activeFile && data.updatedFiles[activeFile]) {
              const content = data.updatedFiles[activeFile]
              const lines = content.trim().split('\n')
              setPreviewRows(lines.map((line: string) => {
                return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
              }))
            }
          }
        }
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      setConsoleOutput(prev => prev + '\n[Worker System Error]: ' + err.message)
      setIsRunning(false)
    }

    // Load persisted dataset CSVs from localStorage if they exist
    const stored = typeof window !== 'undefined' ? localStorage.getItem('pycode_dataset_contents') : null
    let datasetsToSend = { ...DATASETS }
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        datasetsToSend = Object.keys(DATASETS).reduce((acc, key) => {
          const k = key as keyof typeof DATASETS
          acc[k] = {
            ...DATASETS[k],
            csv: parsed[k] !== undefined ? parsed[k] : DATASETS[k].csv
          }
          return acc
        }, {} as typeof DATASETS)
      } catch (e) {
        console.error(e)
      }
    }

    worker.postMessage({ type: 'INIT', datasets: datasetsToSend, customDatasets: customDbs })
  }

  // Load saved files
  const loadSavedFiles = async (keepActive?: string) => {
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
          // Only restore a specific file if explicitly requested (e.g. after saving)
          // On initial load (no keepActive) — stay on blank default workspace
          if (keepActive) {
            const target = formatted.find((f: any) => f.name === keepActive)
            if (target) {
              setCode(target.code)
              setLastSavedCode(target.code)
              setActiveFileName(target.name)
              if (editorRef.current) editorRef.current.setValue(target.code)
            }
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
          if (keepActive) {
            const target = files.find((f: any) => f.name === keepActive)
            if (target) {
              setCode(target.code)
              setLastSavedCode(target.code)
              setActiveFileName(target.name)
              if (editorRef.current) editorRef.current.setValue(target.code)
            }
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

    setIsSaving(true)
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
          await loadSavedFiles(name)
          setLastSavedCode(code)
          setActiveFileName(name)
          setShowSaveModal(false)
          setSaveFileName('')
          setIsSaving(false)
          triggerToast("File saved successfully.", "success")
          return
        } else {
          console.error("Supabase save error:", error)
          triggerToast("Failed to save file.", "error")
        }
      }
    } catch (err) {
      console.warn("Supabase save failed, falling back to localStorage:", err)
    }

    // Optimistic local save
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
    setLastSavedCode(code)
    setActiveFileName(name)
    setShowSaveModal(false)
    setSaveFileName('')
    setIsSaving(false)
    triggerToast("File saved successfully.", "success")
  }

  const handleSaveFileDirectly = async (fileName: string) => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .upsert({
            user_id: user.id,
            name: fileName,
            code,
            last_modified: new Date().toISOString()
          }, { onConflict: 'user_id, name' })

        if (!error) {
          await loadSavedFiles(fileName)
          setLastSavedCode(code)
          setIsSaving(false)
          triggerToast("File saved successfully.", "success")
          return
        } else {
          console.error("Supabase direct save error:", error)
          triggerToast("Failed to save file.", "error")
        }
      }
    } catch (err) {
      console.warn("Supabase direct save failed, falling back to localStorage:", err)
    }

    // Local storage fallback
    const newFile = {
      name: fileName,
      code,
      lastModified: new Date().toLocaleString()
    }
    const updatedFiles = [...savedFiles]
    const existingIndex = updatedFiles.findIndex(f => f.name.toLowerCase() === fileName.toLowerCase())
    if (existingIndex > -1) {
      updatedFiles[existingIndex] = newFile
    } else {
      updatedFiles.push(newFile)
    }
    setSavedFiles(updatedFiles)
    localStorage.setItem('pycode_saved_files', JSON.stringify(updatedFiles))
    setLastSavedCode(code)
    setIsSaving(false)
    triggerToast("File saved successfully.", "success")
  }

  const handleRenameFile = async () => {
    let newName = newFileName.trim()
    if (!newName || !renameFileName) return
    if (!newName.endsWith('.py')) {
      newName += '.py'
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .update({
            name: newName,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('name', renameFileName)

        if (!error) {
          if (activeFileName === renameFileName) {
            setActiveFileName(newName)
          }
          await loadSavedFiles()
          setRenameFileName(null)
          setNewFileName('')
          setIsSaving(false)
          triggerToast("File renamed successfully.", "success")
          return
        } else {
          console.error("Supabase rename error:", error)
          triggerToast("Failed to rename file.", "error")
        }
      }
    } catch (err) {
      console.warn("Supabase rename failed, falling back to localStorage:", err)
    }

    // Local storage fallback
    const filesStr = localStorage.getItem('pycode_saved_files')
    if (filesStr) {
      const files = JSON.parse(filesStr)
      const updated = files.map((f: any) => {
        if (f.name === renameFileName) {
          return { ...f, name: newName }
        }
        return f
      })
      localStorage.setItem('pycode_saved_files', JSON.stringify(updated))
      if (activeFileName === renameFileName) {
        setActiveFileName(newName)
      }
      await loadSavedFiles()
    }
    setRenameFileName(null)
    setNewFileName('')
    setIsSaving(false)
    triggerToast("File renamed successfully.", "success")
  }

  const handleLoadFile = (file: { name: string; code: string }) => {
    setCode(file.code)
    setLastSavedCode(file.code)
    setActiveFileName(file.name)
    if (editorRef.current) {
      editorRef.current.setValue(file.code)
    }
  }

  const handleDeleteFile = async (name: string) => {
    // Optimistic update — remove from UI immediately so sidebar feels instant
    if (activeFileName === name) {
      setActiveFileName(null)
      const blank = '# Write your code here\n'
      setCode(blank)
      setLastSavedCode(blank)
      if (editorRef.current) editorRef.current.setValue(blank)
    }
    setSavedFiles(prev => prev.filter(f => f.name !== name))
    setActiveDropdownFile(null)
    setDeletingFileName(name)
    triggerToast("File deleted successfully.", "success")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await (supabase.from('saved_scripts') as any)
          .delete()
          .eq('user_id', user.id)
          .eq('name', name)
      } else {
        const filesStr = localStorage.getItem('pycode_saved_files')
        if (filesStr) {
          const files = JSON.parse(filesStr).filter((f: any) => f.name !== name)
          localStorage.setItem('pycode_saved_files', JSON.stringify(files))
        }
      }
    } catch (err) {
      console.warn("Delete sync failed:", err)
    } finally {
      setDeletingFileName(null)
    }
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
  const loadFilePreview = (filename: string) => {
    setSelectedFile(filename)
    setPreviewRows([])

    // Check if custom dataset
    const custom = importedDatasetsRef.current.find(d => d.name === filename)
    if (custom) {
      if (custom.type === 'xlsx') {
        if (workerRef.current && pyodideState === 'ready') {
          workerRef.current.postMessage({ type: 'GET_EXCEL_PREVIEW', filename })
        } else {
          setPreviewRows([["Loading Python Preview Engine...", "Please wait until Sandbox is Online"]])
        }
      } else {
        const content = custom.currentContent as string
        const lines = content.trim().split('\n').slice(0, 1000) // Preview first 1000 rows
        setPreviewRows(lines.map((line: string) => {
          return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
        }))
      }
      return
    }

    if (workerRef.current && pyodideState === 'ready') {
      workerRef.current.postMessage({ type: 'GET_FILE', filename })
    } else if (!workerRef.current) {
      const defaultFilename = filename as keyof typeof DATASETS
      const lines = DATASETS[defaultFilename].csv.trim().split('\n')
      setPreviewRows(lines.map(line => line.split(',')))
    }
  }

  const handleImportDataset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      triggerToast('File is too large! Maximum limit is 15MB.', 'error')
      return
    }

    const filename = file.name
    if (importedDatasets.some(d => d.name.toLowerCase() === filename.toLowerCase()) || 
        DATASETS[filename as keyof typeof DATASETS] !== undefined) {
      triggerToast('A dataset with this name already exists.', 'error')
      return
    }

    setIsUploading(true)
    const isXlsx = filename.endsWith('.xlsx')
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const content = reader.result
        if (!content) throw new Error('Empty file content')

        const newDataset: CustomDataset = {
          name: filename,
          originalContent: content,
          currentContent: content,
          type: isXlsx ? 'xlsx' : 'csv'
        }

        await saveDataset(newDataset)
        setImportedDatasets(prev => [...prev, newDataset])

        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'IMPORT_FILE',
            filename,
            content,
            fileType: isXlsx ? 'xlsx' : 'csv'
          })
        }

        triggerToast(`Dataset "${filename}" uploaded successfully.`, 'success')
      } catch (err: any) {
        console.error(err)
        triggerToast('Failed to import dataset: ' + err.message, 'error')
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    reader.onerror = () => {
      triggerToast('Failed to read local file.', 'error')
      setIsUploading(false)
    }

    if (isXlsx) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  const handleResetImportedDataset = async (name: string) => {
    const target = importedDatasets.find(d => d.name === name)
    if (!target) return

    try {
      const resetDataset = {
        ...target,
        currentContent: target.originalContent
      }
      await saveDataset(resetDataset)
      setImportedDatasets(prev => prev.map(d => d.name === name ? resetDataset : d))

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'IMPORT_FILE',
          filename: name,
          content: target.originalContent,
          fileType: target.type
        })
      }

      if (selectedFile === name) {
        if (target.type === 'xlsx') {
          workerRef.current?.postMessage({ type: 'GET_EXCEL_PREVIEW', filename: name })
        } else {
          const lines = (target.originalContent as string).trim().split('\n')
          setPreviewRows(lines.map((line: string) => {
            return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''))
          }))
        }
      }

      triggerToast(`Dataset "${name}" reset to original content.`, 'success')
    } catch (err: any) {
      triggerToast('Failed to reset dataset: ' + err.message, 'error')
    }
  }

  const handleDeleteImportedDataset = async (name: string) => {
    try {
      await deleteDataset(name)
      setImportedDatasets(prev => prev.filter(d => d.name !== name))

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'DELETE_FILE', filename: name })
      }

      if (selectedFile === name) {
        setSelectedFile(null)
        setPreviewRows([])
      }

      triggerToast(`Dataset "${name}" deleted successfully.`, 'success')
    } catch (err: any) {
      triggerToast('Failed to delete dataset: ' + err.message, 'error')
    }
  }

  // Reset a specific CSV file in Pyodide
  const handleResetFile = (filename: keyof typeof DATASETS) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET_FILE', filename, csv: DATASETS[filename].csv })
      
      const stored = localStorage.getItem('pycode_dataset_contents')
      if (stored) {
        try {
          const currentStored = JSON.parse(stored)
          delete currentStored[filename]
          localStorage.setItem('pycode_dataset_contents', JSON.stringify(currentStored))
        } catch (e) {
          console.error(e)
        }
      }

      setConsoleOutput(prev => prev + `\n[System Message]: Dataset "${filename}" has been reset to default values.\n`)
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
      execId,
      customDatasets: importedDatasetsRef.current.map(d => ({ name: d.name, type: d.type }))
    })
  }

  const handleTerminateCode = () => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setActivePrompt(null)
    setPromptValue('')
    setIsWaitingForInput(false)
    setIsRunning(false)
    setConsoleOutput(prev => prev + '\n[Program Terminated by User]')
    
    // Respawn worker to restore VM state
    initWorker()
  }

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = promptValue
    setIsWaitingForInput(true)
    
    // Submit values to Next.js long-poll endpoint
    try {
      await fetch(`/api/editor/input?execId=${execIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val })
      })
    } catch (err) {
      console.error(err)
      setIsWaitingForInput(false)
    }
  }

  const handlePromptCancel = async () => {
    setPromptValue('')
    setActivePrompt(null)
    setIsWaitingForInput(false)
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
        {!leftSidebarCollapsed && (
          <section className="w-72 shrink-0 border-r border-hairline flex flex-col bg-canvas p-4 space-y-4">
            {/* Tab Selector Buttons */}
            <div className="flex border-b border-hairline shrink-0 items-center justify-between">
              <div className="flex-1 flex">
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
              <button
                onClick={() => {
                  setLeftSidebarCollapsed(true)
                  setTimeout(() => {
                    if (editorRef.current) editorRef.current.layout()
                  }, 100)
                }}
                title="Minimize Explorer"
                className="pb-2 pl-3 text-gray-500 hover:text-ink cursor-pointer transition-colors flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
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

                {/* Search bar */}
                {savedFiles.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      placeholder="Search files..."
                      className="w-full pl-7 pr-3 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    {fileSearch && (
                      <button
                        onClick={() => setFileSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0 relative pr-0.5">
                  {savedFiles.length === 0 ? (
                    <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 font-semibold">No saved files yet.</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-light mt-1">Click &quot;Save&quot; in toolbar to store progress!</p>
                    </div>
                  ) : (() => {
                    const filtered = savedFiles.filter(f =>
                      f.name.toLowerCase().includes(fileSearch.toLowerCase())
                    )
                    return filtered.length === 0 ? (
                      <div className="text-center py-6 px-2">
                        <p className="text-[11px] text-gray-500 font-mono">No files match &quot;{fileSearch}&quot;</p>
                      </div>
                    ) : filtered.map((file) => {
                      const isActive = activeFileName === file.name
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

                          {/* Three-dot trigger — dropdown rendered fixed outside scroll container */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isDropdownOpen) {
                                  setActiveDropdownFile(null)
                                  setDropdownPos(null)
                                } else {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                  setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                  setActiveDropdownFile(file.name)
                                }
                              }}
                              className="p-1 rounded-full text-gray-400 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="shrink-0 space-y-1">
                  <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary" />
                    Available Datasets
                  </h3>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                    CSV &amp; Excel datasets loaded in sandbox namespace.
                  </p>
                </div>

                {/* Import actions & search bar */}
                <div className="space-y-2 shrink-0">
                  {/* Upload Button */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-1 py-2.5 px-4 bg-primary hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isUploading ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 rotate-180" />
                          Upload Local Dataset
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportDataset}
                      accept=".csv, .xlsx"
                      className="hidden"
                    />
                  </div>

                  {/* Dataset Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={datasetSearch}
                      onChange={e => setDatasetSearch(e.target.value)}
                      placeholder="Search datasets..."
                      className="w-full pl-7 pr-3 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    {datasetSearch && (
                      <button
                        onClick={() => setDatasetSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3.5 overflow-y-auto min-h-0 relative pr-0.5 animate-fade-in">
                  {(() => {
                    const filteredPreInstalled = Object.keys(DATASETS).filter(key =>
                      key.toLowerCase().includes(datasetSearch.toLowerCase())
                    )
                    const filteredImported = importedDatasets.filter(d =>
                      d.name.toLowerCase().includes(datasetSearch.toLowerCase())
                    )

                    return (
                      <>
                        {/* Pre-installed section */}
                        {filteredPreInstalled.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold text-gray-400 font-mono">Pre-installed Datasets</span>
                            {filteredPreInstalled.map((key) => {
                              const filename = key as keyof typeof DATASETS
                              const isSelected = selectedFile === filename
                              const isDropdownOpen = activeDropdownDataset === filename
                              return (
                                <div key={filename} className="relative group">
                                  <button
                                    onClick={() => loadFilePreview(filename)}
                                    className={`w-full p-2.5 pr-10 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${
                                      isSelected
                                        ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                                        : 'bg-canvas border-hairline text-gray-700 dark:text-gray-400 hover:text-ink hover:border-gray-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden w-full">
                                      <FileCode className="w-3.5 h-3.5 shrink-0 text-primary" />
                                      <span className="text-[11px] font-bold font-mono truncate">{filename}</span>
                                    </div>
                                  </button>

                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (isDropdownOpen) {
                                          setActiveDropdownDataset(null)
                                          setDatasetDropdownPos(null)
                                        } else {
                                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                          setDatasetDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                          setActiveDropdownDataset(filename)
                                        }
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Custom user imported section */}
                        {filteredImported.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold text-gray-400 font-mono">User Imported</span>
                            {filteredImported.map((dataset) => {
                              const isSelected = selectedFile === dataset.name
                              const isDropdownOpen = activeDropdownDataset === dataset.name
                              return (
                                <div key={dataset.name} className="relative group">
                                  <button
                                    onClick={() => loadFilePreview(dataset.name)}
                                    className={`w-full p-2.5 pr-10 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${
                                      isSelected
                                        ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                                        : 'bg-canvas border-hairline text-gray-700 dark:text-gray-400 hover:text-ink hover:border-gray-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden w-full">
                                      <FileCode className="w-3.5 h-3.5 shrink-0 text-primary animate-pulse" />
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="text-[11px] font-bold font-mono truncate">{dataset.name}</span>
                                        <span className="text-[9px] text-gray-500 font-mono uppercase shrink-0">{dataset.type}</span>
                                      </div>
                                    </div>
                                  </button>

                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (isDropdownOpen) {
                                          setActiveDropdownDataset(null)
                                          setDatasetDropdownPos(null)
                                        } else {
                                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                          setDatasetDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                          setActiveDropdownDataset(dataset.name)
                                        }
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {filteredPreInstalled.length === 0 && filteredImported.length === 0 && (
                          <div className="text-center py-8 px-2">
                            <p className="text-[11px] text-gray-500 font-mono">No datasets found.</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Right Coding Sandbox Section */}
        <section className="flex-1 min-w-0 flex flex-col bg-canvas border-l border-hairline">
          
          {/* Monaco Editor Header Bar */}
          <div className="h-11 border-b border-hairline bg-surface-soft px-4 flex items-center justify-between animate-fade-in overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              {leftSidebarCollapsed && (
                <button
                  onClick={() => {
                    setLeftSidebarCollapsed(false)
                    setTimeout(() => {
                      if (editorRef.current) editorRef.current.layout()
                    }, 100)
                  }}
                  title="Expand Explorer"
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

            <div className="flex items-center gap-2 shrink-0">
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

              {/* Active file indicator badge */}
              {activeFileName && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-surface-soft text-[10px] text-gray-755 font-mono select-none font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Editing: {activeFileName}</span>
                </div>
              )}

              {/* Exit File — only shown when editing a saved file, takes user back to free scratch */}
              {activeFileName && (
                <button
                  onClick={() => {
                    setActiveFileName(null)
                    const blank = '# Write your code here\n'
                    setCode(blank)
                    setLastSavedCode(blank)
                    if (editorRef.current) editorRef.current.setValue(blank)
                  }}
                  title="Exit file — go to free scratch"
                  className="px-3 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-500 text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Exit File
                </button>
              )}

              {/* Save File button — always visible */}
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) {
                    setShowGuestSaveModal(true)
                  } else {
                    if (activeFileName) {
                      handleSaveFileDirectly(activeFileName)
                    } else {
                      setShowSaveModal(true)
                    }
                  }
                }}
                disabled={isSaveDisabled}
                className="px-4 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-canvas disabled:border-hairline/60"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-primary" />
                    <span>Save</span>
                  </>
                )}
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
                    className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] text-white text-[11px] font-extrabold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" stroke="none" />
                    Stop
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRunCode}
                  disabled={pyodideState !== 'ready'}
                  className="px-5 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] text-[11px] font-extrabold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run Code
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor Canvas */}
          <div className="flex-1 relative bg-[#1e1e1e] select-text">
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
            className="h-2 bg-hairline hover:bg-primary/50 cursor-ns-resize transition-colors duration-200 select-none z-30 relative group" 
          >
            {/* Thicker invisible hover area to make resizing extremely easy and prevent overlap issues */}
            <div className="absolute inset-x-0 -top-1.5 -bottom-1.5 cursor-ns-resize z-40" />
          </div>

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
          <div className="w-[80%] md:w-[70%] lg:w-[60%] xl:w-[50%] h-full bg-canvas border-l border-hairline flex flex-col shadow-2xl p-6 space-y-6 animate-slide-up">
            
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-base font-extrabold text-ink font-mono">{selectedFile}</h2>
                  <p className="text-xs text-gray-500 font-light leading-relaxed mt-0.5">
                    {DATASETS[selectedFile as keyof typeof DATASETS]?.description || "User-imported dataset file stored in IndexedDB persistent local cache."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!selectedFile) return
                    const isCustom = importedDatasets.some(d => d.name === selectedFile)
                    if (isCustom) {
                      handleResetImportedDataset(selectedFile)
                    } else {
                      handleResetFile(selectedFile as keyof typeof DATASETS)
                    }
                  }}
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
            <div className="flex-1 border border-hairline rounded-2xl overflow-auto bg-canvas relative flex flex-col min-h-0 select-text">
              {previewRows.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-gray-500 font-light">Initializing dataset preview...</p>
                </div>
              ) : (
                <table className="min-w-full text-left border-collapse text-xs table-auto select-text">
                  <thead>
                    <tr className="bg-surface-soft border-b border-hairline text-gray-500 font-mono font-semibold uppercase">
                      {previewRows[0]?.map((col, idx) => (
                        <th key={idx} className="px-4 py-3 whitespace-nowrap sticky top-0 z-10 bg-surface-soft border-b border-hairline max-w-[200px] truncate" title={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-body font-mono">
                    {previewRows.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-surface-soft transition-colors">
                        {row.map((val, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap max-w-[200px] truncate" title={val}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matplotlib Visualization Overlay Modal */}
      {showPlotModal && plotUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-hairline p-6 rounded-3xl max-w-4xl w-full flex flex-col items-center justify-center relative shadow-2xl animate-scale-in">
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
              <div className="border border-hairline rounded-2xl overflow-hidden bg-white p-2">
                <img src={plotUrl} alt="Matplotlib Plot Output" className="w-full max-h-[520px] object-contain rounded-lg mx-auto" />
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
              <Terminal className="w-4 h-4 animate-pulse" />
              Python Input Required
            </h3>
            <p className="text-sm font-medium text-ink">
              {activePrompt || "Enter value:"}
            </p>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  disabled={isWaitingForInput}
                  className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-all disabled:opacity-50"
                  placeholder={isWaitingForInput ? "Waiting for program..." : "Type value here..."}
                  autoFocus
                  ref={(input) => { if (input && !isWaitingForInput) input.focus(); }}
                />
                {isWaitingForInput && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  </div>
                )}
              </div>
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
                    disabled={isWaitingForInput}
                    className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isWaitingForInput}
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 text-xs font-bold cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
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
                  disabled={!saveFileName.trim() || isSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-2 min-w-[70px] justify-center"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : 'Save'}
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

      {/* Fixed-position Dropdown Menu for Saved Files (prevents scroll boundary clipping) */}
      {activeDropdownFile && dropdownPos && (
        <>
          {/* Transparent full-screen backdrop to close menu when clicking outside */}
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={() => {
              setActiveDropdownFile(null)
              setDropdownPos(null)
            }}
          />
          <div
            className="fixed w-28 bg-canvas border border-hairline rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl animate-scale-in z-50 space-y-0.5"
            style={{
              top: `${dropdownPos.top}px`,
              right: `${dropdownPos.right}px`,
            }}
          >
            {(() => {
              const file = savedFiles.find((f) => f.name === activeDropdownFile)
              if (!file) return null
              return (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownloadFile(file)
                      setActiveDropdownFile(null)
                      setDropdownPos(null)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-surface-soft hover:text-ink rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenameFileName(file.name)
                      setNewFileName(file.name)
                      setActiveDropdownFile(null)
                      setDropdownPos(null)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-surface-soft hover:text-ink rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Edit2 className="w-3 h-3 text-primary" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFileToDelete(file.name)
                      setActiveDropdownFile(null)
                      setDropdownPos(null)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-accent-magenta hover:bg-accent-magenta/10 rounded-xl transition-colors cursor-pointer text-left disabled:opacity-50"
                    disabled={deletingFileName === file.name}
                  >
                    {deletingFileName === file.name ? (
                      <span className="w-3 h-3 border-2 border-accent-magenta border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    {deletingFileName === file.name ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Fixed-position Dropdown Menu for Datasets */}
      {activeDropdownDataset && datasetDropdownPos && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={() => {
              setActiveDropdownDataset(null)
              setDatasetDropdownPos(null)
            }}
          />
          <div
            className="fixed w-36 bg-canvas border border-hairline rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl animate-scale-in z-50 space-y-0.5"
            style={{
              top: `${datasetDropdownPos.top}px`,
              right: `${datasetDropdownPos.right}px`,
            }}
          >
            <button
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  await navigator.clipboard.writeText(activeDropdownDataset)
                  triggerToast("Filename copied to clipboard.", "success")
                } catch (err) {
                  triggerToast("Failed to copy filename.", "error")
                }
                setActiveDropdownDataset(null)
                setDatasetDropdownPos(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-surface-soft hover:text-ink rounded-xl transition-colors cursor-pointer text-left"
            >
              <Save className="w-3 h-3 text-primary" />
              Copy Filename
            </button>

            {(() => {
              const isCustom = importedDatasets.some(d => d.name === activeDropdownDataset)
              if (isCustom) {
                return (
                  <>
                    <div className="h-[1px] bg-hairline my-1"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResetImportedDataset(activeDropdownDataset)
                        setActiveDropdownDataset(null)
                        setDatasetDropdownPos(null)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-surface-soft hover:text-ink rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <RotateCcw className="w-3 h-3 text-primary" />
                      Reset Content
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteImportedDataset(activeDropdownDataset)
                        setActiveDropdownDataset(null)
                        setDatasetDropdownPos(null)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Dataset
                    </button>
                  </>
                )
              }
              return null
            })()}
          </div>
        </>
      )}

      {/* Rename Confirmation Modal Dialog */}
      {renameFileName && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-xs uppercase font-mono font-extrabold text-primary flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Rename Code Script
            </h3>
            <p className="text-sm font-medium text-ink">
              Enter a new name for <span className="font-mono text-primary font-bold">{renameFileName}</span>:
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                placeholder="e.g. solution_v2.py"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRenameFileName(null)
                    setNewFileName('')
                  }}
                  className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameFile}
                  disabled={!newFileName.trim() || newFileName.trim() === renameFileName || isSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-2 min-w-[70px] justify-center"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Renaming...
                    </>
                  ) : 'Rename'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-canvas border border-hairline rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-ink">Delete Script?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Are you sure you want to delete <span className="font-mono text-primary font-bold">{fileToDelete}</span>? This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="flex-1 py-2 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-soft text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteFile(fileToDelete)
                  setFileToDelete(null)
                }}
                className="flex-1 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-scale-in pointer-events-none">
          <div className="px-5 py-3 rounded-2xl border border-hairline bg-surface-card/90 backdrop-blur-md shadow-xl flex items-center gap-2.5 text-xs font-semibold text-ink">
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-primary shrink-0 animate-bounce" />
            ) : (
              <X className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  )
}

