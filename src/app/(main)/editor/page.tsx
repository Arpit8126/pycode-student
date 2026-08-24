'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Monaco, useMonaco } from '@monaco-editor/react'
import { ArrowLeft, Play, RefreshCw, Database, Terminal, CheckCircle, X, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, FileCode, RotateCcw, Square, Save, MoreVertical, Download, Trash2, LogIn, UserPlus, LogOut, Edit2, Plus, Maximize2, Folder, Check, FolderPlus, Info } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { DEFAULT_DATASETS as DATASETS } from '@/lib/datasetGenerator'
import { initDB, getDatasets, saveDataset, deleteDataset, CustomDataset } from '@/lib/indexedDb'
import JSZip from 'jszip'

// Import Monaco Editor dynamically to prevent SSR conflicts
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface CellType {
  id: string;
  code: string;
  output: string;
  plot: string;
  error: string;
  isRunning?: boolean;
  hasRun?: boolean;
}

const notebookToCells = (notebook: any): CellType[] => {
  if (!notebook || !Array.isArray(notebook.cells)) {
    return [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false }];
  }
  return notebook.cells.map((c: any, index: number) => {
    const source = Array.isArray(c.source) ? c.source.join('') : (c.source || '');
    const cleanedSource = source.replace(/^\n+|\n+$/g, '');
    let outputText = '';
    let plotImg = '';
    let errorText = '';
    
    if (Array.isArray(c.outputs)) {
      c.outputs.forEach((out: any) => {
        if (out.output_type === 'stream') {
          outputText += Array.isArray(out.text) ? out.text.join('') : (out.text || '');
        } else if (out.output_type === 'display_data' || out.output_type === 'execute_result') {
          const data = out.data || {};
          if (data['image/png']) {
            plotImg = `data:image/png;base64,${data['image/png']}`;
          } else if (data['text/plain']) {
            outputText += Array.isArray(data['text/plain']) ? data['text/plain'].join('') : (data['text/plain'] || '');
          }
        } else if (out.output_type === 'error') {
          errorText += Array.isArray(out.traceback) ? out.traceback.join('\n') : (out.ename + ': ' + out.evalue);
        }
      });
    }
    return {
      id: `cell_${index}_${Math.random().toString(36).substring(5)}`,
      code: cleanedSource,
      output: outputText,
      plot: plotImg,
      error: errorText,
      isRunning: false,
      hasRun: outputText !== '' || errorText !== '' || plotImg !== ''
    };
  });
};

const cellsToNotebook = (cellsList: CellType[]) => {
  return {
    cells: cellsList.map(c => {
      const outputs: any[] = [];
      if (c.output) {
        outputs.push({
          output_type: 'stream',
          name: 'stdout',
          text: c.output.split('\n').map((line, idx, arr) => line + (idx < arr.length - 1 ? '\n' : ''))
        });
      }
      if (c.plot) {
        const base64Data = c.plot.replace(/^data:image\/png;base64,/, '');
        outputs.push({
          output_type: 'display_data',
          data: {
            'image/png': base64Data,
            'text/plain': ['<Figure size matplotlib>']
          },
          metadata: {}
        });
      }
      if (c.error) {
        outputs.push({
          output_type: 'error',
          ename: 'Error',
          evalue: c.error,
          traceback: [c.error]
        });
      }
      const cleanCode = c.code.replace(/^\n+|\n+$/g, '');
      return {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: outputs,
        source: cleanCode.split('\n').map((line, idx, arr) => line + (idx < arr.length - 1 ? '\n' : ''))
      };
    }),
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3"
      }
    },
    nbformat: 4,
    nbformat_minor: 2
  };
};

declare global {
  interface Window {
    loadPyodide?: any
  }
}

let globalDraftCode = '# Write your code here\n';
let globalDraftCells: CellType[] = [
  { id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false }
];
let globalDraftFormat: 'terminal' | 'cell' = 'terminal';
let globalActiveFileName: string | null = null;
let globalLastSavedCode: string = '# Write your code here\n';

export default function CodeEditorPage() {
  const supabase = createClient()
  const [code, setCode] = useState(globalDraftCode)

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
  
  // Jupyter Notebook cell states
  const [editorFormat, setEditorFormat] = useState<'terminal' | 'cell'>(globalDraftFormat)
  const [cells, setCells] = useState<CellType[]>(globalDraftCells)
  const [runningCellQueue, setRunningCellQueue] = useState<string[]>([])
  const [fullscreenPlotUrl, setFullscreenPlotUrl] = useState<string | null>(null)
  const [activeCellId, setActiveCellId] = useState<string | null>(null)

  const [leftSidebarTab, setLeftSidebarTab] = useState<'savedFiles' | 'datasets'>('savedFiles')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showGuestSaveModal, setShowGuestSaveModal] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')
  const [activeDropdownFile, setActiveDropdownFile] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string | null>(globalActiveFileName)
  const [folderSearch, setFolderSearch] = useState('')
  const [rootFileSearch, setRootFileSearch] = useState('')
  const [innerFileSearch, setInnerFileSearch] = useState('')
  const [showAllPreInstalled, setShowAllPreInstalled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [renameFileName, setRenameFileName] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [lastSavedCode, setLastSavedCode] = useState<string>(globalLastSavedCode)
  const [datasetSearch, setDatasetSearch] = useState('')
  const [importedDatasets, setImportedDatasets] = useState<CustomDataset[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importedDatasetsRef = useRef<CustomDataset[]>([])
  const [activeDropdownDataset, setActiveDropdownDataset] = useState<string | null>(null)
  const [datasetDropdownPos, setDatasetDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const [isWaitingForInput, setIsWaitingForInput] = useState(false)
  const [isRestored, setIsRestored] = useState(false)

  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [currentExplorerFolder, setCurrentExplorerFolder] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [folderInputName, setFolderInputName] = useState('')
  const [saveToFolder, setSaveToFolder] = useState<string>('')
  const [newSaveFolderName, setNewSaveFolderName] = useState<string>('')
  const [showNewFolderSaveInput, setShowNewFolderSaveInput] = useState<boolean>(false)

  const [fileToMove, setFileToMove] = useState<string | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveToFolder, setMoveToFolder] = useState('')
  const [newMoveFolderName, setNewMoveFolderName] = useState('')
  const [showNewFolderMoveInput, setShowNewFolderMoveInput] = useState(false)
  const [showSaveDropdownPanel, setShowSaveDropdownPanel] = useState(false)
  const [showMoveDropdownPanel, setShowMoveDropdownPanel] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameFolderInput, setRenameFolderInput] = useState('')
  const [activeDragFolder, setActiveDragFolder] = useState<string | null>(null)

  const addCustomFolder = (folderName: string) => {
    const trimmed = folderName.trim()
    if (!trimmed) return
    setCustomFolders(prev => {
      if (prev.includes(trimmed)) return prev
      const updated = [...prev, trimmed]
      localStorage.setItem('pycode_custom_folders', JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    importedDatasetsRef.current = importedDatasets
  }, [importedDatasets])

  useEffect(() => {
    setFolderSearch('')
    setRootFileSearch('')
    setInnerFileSearch('')
  }, [currentExplorerFolder, leftSidebarTab])

  // Load draft code from SPA module variables or active saved file on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFormat = localStorage.getItem('pycode_editor_format') as 'terminal' | 'cell' | null

      const storedFolders = localStorage.getItem('pycode_custom_folders')
      if (storedFolders) {
        try {
          setCustomFolders(JSON.parse(storedFolders))
        } catch (e) {
          console.error(e)
        }
      }

      if (globalActiveFileName !== null || globalDraftCode !== '# Write your code here\n' || globalDraftFormat === 'cell') {
        // Just reload from SPA global variables (user navigated within site)
        setCode(globalDraftCode)
        setCells(globalDraftCells)
        setEditorFormat(globalDraftFormat)
        setActiveFileName(globalActiveFileName)
        setLastSavedCode(globalLastSavedCode)
      } else {
        // Hard refresh occurred! Load active saved file if one was specifically open
        const savedActiveFile = localStorage.getItem('pycode_active_file')
        if (savedActiveFile) {
          // Handled via loadSavedFiles(savedActiveFile) inside mounting useEffect below!
        } else {
          // No active file, start fresh but preserve format preference
          setCode('# Write your code here\n')
          setCells([{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false }])
          setEditorFormat(savedFormat || 'terminal')
          setActiveFileName(null)
          setLastSavedCode('# Write your code here\n')
        }
      }
      setIsRestored(true)
    }
  }, [])

  // Synchronize state with module-level global variables for SPA routing draft preservation
  useEffect(() => {
    if (typeof window !== 'undefined' && isRestored) {
      globalDraftCode = code
      globalDraftCells = cells
      globalDraftFormat = editorFormat
      globalActiveFileName = activeFileName
      globalLastSavedCode = lastSavedCode

      localStorage.setItem('pycode_editor_format', editorFormat)

      if (activeFileName) {
        localStorage.setItem('pycode_active_file', activeFileName)
      } else {
        localStorage.removeItem('pycode_active_file')
      }
    }
  }, [code, cells, editorFormat, activeFileName, lastSavedCode, isRestored])



  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const currentContent = editorFormat === 'cell' 
    ? JSON.stringify(cellsToNotebook(cells), null, 2) 
    : code
  const isSaveDisabled = isSaving || pyodideState !== 'ready' || (
    activeFileName 
      ? currentContent === lastSavedCode 
      : (editorFormat === 'cell' ? cells.length === 1 && cells[0].code === '' : code === '# Write your code here\n')
  )

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
          // Use GET_EXCEL_PREVIEW for any .xlsx file (custom or default built-in)
          if (activeFile.endsWith('.xlsx')) {
            workerRef.current.postMessage({ type: 'GET_EXCEL_PREVIEW', filename: activeFile })
          } else if (custom) {
            workerRef.current.postMessage({ type: 'GET_FILE', filename: activeFile })
          } else {
            workerRef.current.postMessage({ type: 'GET_FILE', filename: activeFile })
          }
        }
      } else if (data.type === 'INIT_ERROR') {
        setPyodideState('error')
        setProgressMsg(data.message || 'Failed to initialize worker.')
      } else if (data.type === 'STDOUT' || data.type === 'STDERR') {
        if (data.cellId) {
          setCells(prev => prev.map(c => c.id === data.cellId ? { ...c, output: c.output + data.text } : c))
        } else {
          setConsoleOutput(prev => prev + data.text)
        }
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
        if (data.cellId) {
          setCells(prev => prev.map(c => c.id === data.cellId ? {
            ...c,
            plot: (data.plotData && typeof data.plotData === 'string' && data.plotData.length > 100)
              ? `data:image/png;base64,${data.plotData}`
              : c.plot,
            isRunning: false,
            hasRun: true
          } : c))
          setRunningCellQueue(prev => prev.slice(1))
          setTimeout(() => {
            const outputEl = document.getElementById(`cell_output_${data.cellId}`)
            if (outputEl) {
              outputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 80)
        } else {
          if (data.plotData && typeof data.plotData === 'string' && data.plotData.length > 100) {
            setPlotUrl(`data:image/png;base64,${data.plotData}`)
            setShowPlotModal(true)
          }
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
            // Skip binary Excel files — can't store ArrayBuffer in JSON localStorage
            if (filename.endsWith('.xlsx')) return
            if (currentStored[filename] !== content) {
              currentStored[filename] = content as string
              hasChanges = true
            }
          })
          if (hasChanges) {
            localStorage.setItem('pycode_dataset_contents', JSON.stringify(currentStored))
            const activeFile = selectedFileRef.current
            if (activeFile && !activeFile.endsWith('.xlsx') && data.updatedFiles[activeFile]) {
              const content = data.updatedFiles[activeFile]
              const lines = (content as string).trim().split('\n')
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
        const cleanMsg = cleanLines.join('\n')
        if (data.cellId) {
          setCells(prev => prev.map(c => c.id === data.cellId ? {
            ...c,
            error: cleanMsg,
            isRunning: false,
            hasRun: true
          } : c))
          setRunningCellQueue(prev => prev.slice(1))
          setTimeout(() => {
            const outputEl = document.getElementById(`cell_output_${data.cellId}`)
            if (outputEl) {
              outputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 80)
        } else {
          setConsoleOutput(prev => prev + '\n' + cleanMsg)
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
            // Skip binary Excel files — can't store ArrayBuffer in JSON localStorage
            if (filename.endsWith('.xlsx')) return
            if (currentStored[filename] !== content) {
              currentStored[filename] = content as string
              hasChanges = true
            }
          })
          if (hasChanges) {
            localStorage.setItem('pycode_dataset_contents', JSON.stringify(currentStored))
            const activeFile = selectedFileRef.current
            if (activeFile && !activeFile.endsWith('.xlsx') && data.updatedFiles[activeFile]) {
              const content = data.updatedFiles[activeFile]
              const lines = (content as string).trim().split('\n')
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
              handleLoadFile(target)
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
              handleLoadFile(target)
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
    const activeFileOnRefresh = typeof window !== 'undefined' ? localStorage.getItem('pycode_active_file') : null
    loadSavedFiles(activeFileOnRefresh || undefined)
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  // Sequential execution queue processor for Jupyter Cells
  useEffect(() => {
    const processQueue = async () => {
      if (runningCellQueue.length > 0 && !isRunning && workerRef.current && pyodideState === 'ready') {
        const activeCellId = runningCellQueue[0]
        const cell = cells.find(c => c.id === activeCellId)
        if (!cell) {
          setRunningCellQueue(prev => prev.slice(1))
          return
        }
        
        setIsRunning(true)
        setCells(prev => prev.map(c => c.id === activeCellId ? { ...c, isRunning: true, output: '', error: '', plot: '' } : c))
        
        const execId = Math.random().toString(36).substring(7)
        execIdRef.current = execId
        
        workerRef.current.postMessage({
          type: 'RUN_CODE',
          code: cell.code,
          execId,
          cellId: activeCellId,
          customDatasets: importedDatasetsRef.current.map(d => ({ name: d.name, type: d.type }))
        })
      }
    }
    processQueue()
  }, [runningCellQueue, isRunning, pyodideState, cells])

  const runCell = (cellId: string) => {
    setCells(prev => prev.map(c => c.id === cellId ? { ...c, output: '', error: '', plot: '', isRunning: true, hasRun: false } : c))
    setRunningCellQueue(prev => {
      if (prev.includes(cellId)) return prev
      return [...prev, cellId]
    })
  }

  const runAllCells = () => {
    setCells(prev => prev.map(c => ({ ...c, output: '', error: '', plot: '', isRunning: true, hasRun: false })))
    setRunningCellQueue(cells.map(c => c.id))
  }

  const shiftToCellFormat = () => {
    const parts = code.split(/#\s*%%\s*(?:\n|$)/)
    let parsedCells = parts.map((part, index) => ({
      id: `cell_${index}_${Math.random().toString(36).substring(5)}`,
      code: part.replace(/^\n+|\n+$/g, ''),
      output: '',
      plot: '',
      error: '',
      isRunning: false,
      hasRun: false
    }))
    if (parsedCells.length > 1 && parsedCells[0].code.trim() === '') {
      parsedCells.shift()
    }
    if (parsedCells.length === 0) {
      parsedCells = [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false }]
    }
    setCells(parsedCells)
    setEditorFormat('cell')
  }

  const shiftToTerminalFormat = () => {
    let mergedCode = ''
    if (cells.length === 1) {
      mergedCode = cells[0].code.replace(/^\n+|\n+$/g, '')
    } else {
      mergedCode = cells.map(c => `# %%\n${c.code.replace(/^\n+|\n+$/g, '')}`).join('\n\n')
    }
    setCode(mergedCode)
    if (editorRef.current) {
      editorRef.current.setValue(mergedCode)
    }
    setEditorFormat('terminal')
  }

  const moveCellUp = (index: number) => {
    if (index === 0) return
    setCells(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index - 1]
      next[index - 1] = temp
      return next
    })
  }

  const moveCellDown = (index: number) => {
    setCells(prev => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index + 1]
      next[index + 1] = temp
      return next
    })
  }

  const clearCellOutput = (cellId: string) => {
    setCells(prev => prev.map(c => c.id === cellId ? { ...c, output: '', error: '', plot: '' } : c))
  }

  const focusCellTextarea = (cellId: string) => {
    setTimeout(() => {
      const textarea = document.getElementById(`textarea_${cellId}`) as HTMLTextAreaElement | null
      if (textarea) {
        textarea.focus()
        textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
  }

  const handleSaveFile = async () => {
    let baseName = saveFileName.trim()
    if (!baseName) return
    
    if (editorFormat === 'cell') {
      if (!baseName.endsWith('.ipynb')) baseName += '.ipynb'
    } else {
      if (!baseName.endsWith('.py')) baseName += '.py'
    }

    let targetFolder = ''
    if (saveToFolder === '__new__') {
      const folderName = newSaveFolderName.trim()
      if (folderName) {
        addCustomFolder(folderName)
        targetFolder = folderName
      }
    } else if (saveToFolder) {
      targetFolder = saveToFolder
    }

    const name = targetFolder ? `${targetFolder}/${baseName}` : baseName

    const contentToSave = editorFormat === 'cell'
      ? JSON.stringify(cellsToNotebook(cells), null, 2)
      : code

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .upsert({
            user_id: user.id,
            name,
            code: contentToSave,
            last_modified: new Date().toISOString()
          }, { onConflict: 'user_id, name' })
        
        if (!error) {
          await loadSavedFiles(name)
          setLastSavedCode(contentToSave)
          setActiveFileName(name)
          if (targetFolder) {
            setCurrentExplorerFolder(targetFolder)
          } else {
            setCurrentExplorerFolder(null)
          }
          setShowSaveModal(false)
          setSaveFileName('')
          setSaveToFolder('')
          setNewSaveFolderName('')
          setShowNewFolderSaveInput(false)
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
      code: contentToSave,
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
    setLastSavedCode(contentToSave)
    setActiveFileName(name)
    if (targetFolder) {
      setCurrentExplorerFolder(targetFolder)
    } else {
      setCurrentExplorerFolder(null)
    }
    setShowSaveModal(false)
    setSaveFileName('')
    setSaveToFolder('')
    setNewSaveFolderName('')
    setShowNewFolderSaveInput(false)
    setIsSaving(false)
    triggerToast("File saved successfully.", "success")
  }

  const handleSaveFileDirectly = async (fileName: string) => {
    const contentToSave = editorFormat === 'cell'
      ? JSON.stringify(cellsToNotebook(cells), null, 2)
      : code

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .upsert({
            user_id: user.id,
            name: fileName,
            code: contentToSave,
            last_modified: new Date().toISOString()
          }, { onConflict: 'user_id, name' })

        if (!error) {
          await loadSavedFiles(fileName)
          setLastSavedCode(contentToSave)
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
      code: contentToSave,
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
    setLastSavedCode(contentToSave)
    setIsSaving(false)
    triggerToast("File saved successfully.", "success")
  }

  const handleRenameFile = async () => {
    let newName = newFileName.trim()
    if (!newName || !renameFileName) return
    
    const isNotebook = renameFileName.endsWith('.ipynb')
    if (isNotebook) {
      if (!newName.endsWith('.ipynb')) newName += '.ipynb'
    } else {
      if (!newName.endsWith('.py')) newName += '.py'
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .update({
            name: newName,
            last_modified: new Date().toISOString()
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
    setActiveFileName(file.name)
    setLastSavedCode(file.code)
    
    if (file.name.endsWith('.ipynb')) {
      try {
        const parsed = JSON.parse(file.code)
        setCells(notebookToCells(parsed))
        setEditorFormat('cell')
      } catch (err) {
        console.error("Failed to parse notebook JSON, loading as code:", err)
        setCode(file.code)
        setEditorFormat('terminal')
        if (editorRef.current) {
          editorRef.current.setValue(file.code)
        }
      }
    } else {
      setCode(file.code)
      setEditorFormat('terminal')
      if (editorRef.current) {
        editorRef.current.setValue(file.code)
      }
    }
  }

  const handleDeleteFile = async (name: string) => {
    // Optimistic update — remove from UI immediately so sidebar feels instant
    if (activeFileName === name) {
      setActiveFileName(null)
      const blank = '# Write your code here\n'
      setCode(blank)
      setLastSavedCode(blank)
      setEditorFormat('terminal')
      setCells([{ id: 'cell_default', code: '', output: '', plot: '', error: '' }])
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

  const handleDeleteFolder = async (folderName: string) => {
    if (!window.confirm(`Are you sure you want to delete folder "${folderName}" and all scripts inside it?`)) return

    // Remove folder from custom folders list
    setCustomFolders(prev => {
      const updated = prev.filter(f => f !== folderName)
      localStorage.setItem('pycode_custom_folders', JSON.stringify(updated))
      return updated
    })

    // Find and delete all files in this folder
    const filesToDelete = savedFiles.filter(f => f.name.startsWith(`${folderName}/`))
    for (const f of filesToDelete) {
      await handleDeleteFile(f.name)
    }

    if (currentExplorerFolder === folderName) {
      setCurrentExplorerFolder(null)
    }
    triggerToast(`Folder "${folderName}" and its files deleted.`, "success")
  }

  const handleMoveFile = async (oldName: string, targetFolder: string | null) => {
    const parts = oldName.split('/')
    const baseName = parts[parts.length - 1]
    const newName = targetFolder ? `${targetFolder}/${baseName}` : baseName
    if (newName === oldName) return

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .update({
            name: newName,
            last_modified: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('name', oldName)

        if (!error) {
          if (activeFileName === oldName) {
            setActiveFileName(newName)
          }
          await loadSavedFiles()
          setIsSaving(false)
          triggerToast("File moved successfully.", "success")
          return
        } else {
          console.error("Supabase move error:", error)
          triggerToast("Failed to move file.", "error")
        }
      }
    } catch (err) {
      console.warn("Supabase move failed, falling back to localStorage:", err)
    }

    const filesStr = localStorage.getItem('pycode_saved_files')
    if (filesStr) {
      const files = JSON.parse(filesStr)
      const updated = files.map((f: any) => {
        if (f.name === oldName) {
          return { ...f, name: newName }
        }
        return f
      })
      localStorage.setItem('pycode_saved_files', JSON.stringify(updated))
      if (activeFileName === oldName) {
        setActiveFileName(newName)
      }
      await loadSavedFiles()
    }
    setIsSaving(false)
    triggerToast("File moved successfully.", "success")
  }

  const handleRenameFolder = async (oldFolder: string, newFolder: string) => {
    const oldF = oldFolder.trim()
    const newF = newFolder.trim()
    if (!oldF || !newF || oldF === newF) return

    setIsSaving(true)

    setCustomFolders(prev => {
      const updated = prev.map(f => f === oldF ? newF : f)
      localStorage.setItem('pycode_custom_folders', JSON.stringify(updated))
      return updated
    })

    const filesToMove = savedFiles.filter(f => f.name.startsWith(`${oldF}/`))
    for (const f of filesToMove) {
      const baseName = f.name.substring(oldF.length + 1)
      const newName = `${newF}/${baseName}`
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await (supabase.from('saved_scripts') as any)
            .update({
              name: newName,
              last_modified: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('name', f.name)
        }
      } catch (err) {
        console.warn("Folder file sync rename failed:", err)
      }
    }

    const filesStr = localStorage.getItem('pycode_saved_files')
    if (filesStr) {
      const files = JSON.parse(filesStr)
      const updated = files.map((f: any) => {
        if (f.name.startsWith(`${oldF}/`)) {
          const baseName = f.name.substring(oldF.length + 1)
          return { ...f, name: `${newF}/${baseName}` }
        }
        return f
      })
      localStorage.setItem('pycode_saved_files', JSON.stringify(updated))
    }

    if (currentExplorerFolder === oldF) {
      setCurrentExplorerFolder(newF)
    }
    if (activeFileName && activeFileName.startsWith(`${oldF}/`)) {
      const baseName = activeFileName.substring(oldF.length + 1)
      setActiveFileName(`${newF}/${baseName}`)
    }

    await loadSavedFiles()
    setIsSaving(false)
    triggerToast("Folder renamed successfully.", "success")
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

  const handleDownloadFolder = async (folderName: string) => {
    const zip = new JSZip()
    const folderFiles = savedFiles.filter(f => f.name.startsWith(`${folderName}/`))
    
    if (folderFiles.length === 0) {
      triggerToast("Folder is empty!", "error")
      return
    }

    folderFiles.forEach(file => {
      zip.file(file.name, file.code)
    })

    try {
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${folderName}.zip`
      link.click()
      URL.revokeObjectURL(url)
      triggerToast("Folder downloaded as ZIP successfully.", "success")
    } catch (err) {
      console.error("Failed to download folder as ZIP:", err)
      triggerToast("Failed to download folder.", "error")
    }
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
      // Excel files must use GET_EXCEL_PREVIEW — reading as UTF-8 would fail
      if (filename.endsWith('.xlsx')) {
        workerRef.current.postMessage({ type: 'GET_EXCEL_PREVIEW', filename })
      } else {
        workerRef.current.postMessage({ type: 'GET_FILE', filename })
      }
    } else if (!workerRef.current) {
      const defaultFilename = filename as keyof typeof DATASETS
      if (!filename.endsWith('.xlsx') && DATASETS[defaultFilename]) {
        const lines = DATASETS[defaultFilename].csv.trim().split('\n')
        setPreviewRows(lines.map(line => line.split(',')))
      } else {
        setPreviewRows([['Excel preview requires Python environment to load. Please wait...']])
      }
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
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    Your Saved Scripts
                  </h3>
                  <button
                    onClick={() => setShowNewFolderInput(prev => !prev)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-all shrink-0 text-[10px] font-bold uppercase tracking-wider font-mono bg-canvas"
                    title="Create New Folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                    <span>Create Folder</span>
                  </button>
                </div>

                <div className="flex items-start gap-1.5 p-2 rounded-xl bg-primary/[0.04] dark:bg-primary/[0.07] border border-primary/10 w-full">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                    Resumable Python code files saved locally in browser.
                  </p>
                </div>

                {showNewFolderInput && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = folderInputName.trim()
                      if (name) {
                        addCustomFolder(name)
                        setFolderInputName('')
                        setShowNewFolderInput(false)
                        triggerToast("Folder created successfully.", "success")
                      }
                    }}
                    className="flex items-center gap-2 animate-fade-in"
                  >
                    <input
                      type="text"
                      value={folderInputName}
                      onChange={e => setFolderInputName(e.target.value)}
                      placeholder="New folder name..."
                      className="flex-1 px-3 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink outline-none focus:border-primary/50 transition-colors"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!folderInputName.trim()}
                      className="px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                    >
                      Create
                    </button>
                  </form>
                )}

                {/* Search bar section */}
                {savedFiles.length > 0 && (
                  currentExplorerFolder === null ? (
                    <div className="space-y-2">
                      {/* Search Folders */}
                      <div className="relative">
                        <input
                          type="text"
                          value={folderSearch}
                          onChange={e => setFolderSearch(e.target.value)}
                          placeholder="Search folders..."
                          className="w-full pl-7 pr-7 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors font-light"
                        />
                        <Folder className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-450 pointer-events-none" />
                        {folderSearch && (
                          <button
                            onClick={() => setFolderSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Search Root Files */}
                      <div className="relative">
                        <input
                          type="text"
                          value={rootFileSearch}
                          onChange={e => setRootFileSearch(e.target.value)}
                          placeholder="Search root files..."
                          className="w-full pl-7 pr-7 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors font-light"
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-450 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        {rootFileSearch && (
                          <button
                            onClick={() => setRootFileSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative mb-1">
                      <input
                        type="text"
                        value={innerFileSearch}
                        onChange={e => setInnerFileSearch(e.target.value)}
                        placeholder={`Search in ${currentExplorerFolder}...`}
                        className="w-full pl-7 pr-7 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors font-light"
                      />
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-450 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      {innerFileSearch && (
                        <button
                          onClick={() => setInnerFileSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                )}

                <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0 relative pr-0.5">
                  {savedFiles.length === 0 ? (
                    <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 font-semibold">No saved files yet.</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-light mt-1">Click &quot;Save&quot; in toolbar to store progress!</p>
                    </div>
                  ) : (() => {
                    const allFolders = Array.from(new Set([
                      ...customFolders,
                      ...savedFiles
                        .filter(f => f.name.includes('/'))
                        .map(f => f.name.split('/')[0])
                    ])).sort()
                    const rootFiles = savedFiles.filter(f => !f.name.includes('/'))

                    if (currentExplorerFolder !== null) {
                      const folderFiles = savedFiles.filter(f => f.name.startsWith(`${currentExplorerFolder}/`))
                      const filteredFolderFiles = folderFiles.filter(f => {
                        const displayName = f.name.substring(currentExplorerFolder.length + 1)
                        return displayName.toLowerCase().includes(innerFileSearch.toLowerCase())
                      })

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3 shrink-0">
                            <button
                              onClick={() => setCurrentExplorerFolder(null)}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={() => setActiveDragFolder('__root__')}
                              onDragLeave={() => setActiveDragFolder(null)}
                              onDrop={(e) => {
                                e.preventDefault()
                                setActiveDragFolder(null)
                                const filename = e.dataTransfer.getData('text/plain')
                                handleMoveFile(filename, null)
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                activeDragFolder === '__root__'
                                  ? 'border-dashed border-primary bg-primary/5 text-primary scale-[0.98]'
                                  : 'border-hairline bg-surface-soft text-gray-600 hover:text-ink hover:bg-surface-card'
                              }`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <span className="text-xs font-extrabold text-ink font-mono truncate bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                              {currentExplorerFolder}
                            </span>
                            <button
                              onClick={() => handleDownloadFolder(currentExplorerFolder)}
                              className="p-1.5 rounded-lg border border-hairline bg-surface-soft text-gray-500 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer transition-colors flex items-center justify-center shrink-0 ml-1"
                              title="Download entire folder as ZIP"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {filteredFolderFiles.length === 0 ? (
                              <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                                <p className="text-[11px] text-gray-500 font-mono">
                                  {innerFileSearch ? `No files match "${innerFileSearch}"` : 'No files in this folder.'}
                                </p>
                              </div>
                            ) : (
                              filteredFolderFiles.map((file) => {
                                const isActive = activeFileName === file.name
                                const isDropdownOpen = activeDropdownFile === file.name
                                const displayName = file.name.substring(currentExplorerFolder.length + 1)
                                return (
                                  <div
                                    key={file.name}
                                    draggable={true}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', file.name)
                                    }}
                                    className="relative group animate-fade-in"
                                  >
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
                                          <span className="text-xs font-bold font-mono truncate">{displayName}</span>
                                          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate font-mono">{file.lastModified}</span>
                                        </div>
                                      </div>
                                    </button>

                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                            )}
                          </div>
                        </div>
                      )
                    }

                    // Main explorer view (folders & root files)
                    const filteredFolders = allFolders.filter(folder =>
                      folder.toLowerCase().includes(folderSearch.toLowerCase())
                    )
                    const filteredRootFiles = rootFiles.filter(file =>
                      file.name.toLowerCase().includes(rootFileSearch.toLowerCase())
                    )

                    const hasMatches = filteredFolders.length > 0 || filteredRootFiles.length > 0

                    if (!hasMatches) {
                      return (
                        <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                          <p className="text-[11px] text-gray-500 font-mono">No matching folders or root files found.</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4">
                        {/* Folders List */}
                        {filteredFolders.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-mono">Folders</div>
                            {filteredFolders.map(folderName => (
                              <div key={folderName} className="group/folder relative flex items-center gap-1.5">
                                {renamingFolder === folderName ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault()
                                      handleRenameFolder(folderName, renameFolderInput)
                                      setRenamingFolder(null)
                                      setRenameFolderInput('')
                                    }}
                                    className="flex-1 flex items-center gap-1.5 animate-fade-in"
                                  >
                                    <input
                                      type="text"
                                      value={renameFolderInput}
                                      onChange={e => setRenameFolderInput(e.target.value)}
                                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-hairline bg-surface-soft text-ink outline-none focus:border-primary/50 transition-colors"
                                      autoFocus
                                    />
                                    <button
                                      type="submit"
                                      disabled={!renameFolderInput.trim() || renameFolderInput.trim() === folderName}
                                      className="px-2.5 py-1.5 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRenamingFolder(null)}
                                      className="px-2.5 py-1.5 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                                    >
                                      Cancel
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setCurrentExplorerFolder(folderName)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDragEnter={() => setActiveDragFolder(folderName)}
                                      onDragLeave={() => setActiveDragFolder(null)}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        setActiveDragFolder(null)
                                        const filename = e.dataTransfer.getData('text/plain')
                                        handleMoveFile(filename, folderName)
                                      }}
                                      className={`flex-1 p-2.5 rounded-xl border text-left flex items-center gap-2 hover:border-primary/50 hover:bg-surface-soft cursor-pointer transition-all duration-150 animate-fade-in ${
                                        activeDragFolder === folderName
                                          ? 'border-dashed border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20 scale-[0.98]'
                                          : 'bg-canvas border-hairline'
                                      }`}
                                    >
                                      <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                                      <span className="text-xs font-bold text-ink truncate">{folderName}</span>
                                    </button>
                                    <div className="flex items-center gap-0.5 opacity-80 md:opacity-0 md:group-hover/folder:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setRenamingFolder(folderName)
                                          setRenameFolderInput(folderName)
                                        }}
                                        className="p-2 text-gray-400 hover:text-primary hover:bg-surface-soft rounded-xl cursor-pointer shrink-0"
                                        title="Rename folder"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadFolder(folderName)}
                                        className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl cursor-pointer shrink-0"
                                        title="Download folder as ZIP"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFolder(folderName)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer shrink-0"
                                        title="Delete folder"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Root Files List */}
                        {filteredRootFiles.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-mono mt-2">Files</div>
                            {filteredRootFiles.map((file) => {
                              const isActive = activeFileName === file.name
                              const isDropdownOpen = activeDropdownFile === file.name
                              return (
                                <div
                                  key={file.name}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', file.name)
                                  }}
                                  className="relative group animate-fade-in"
                                >
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

                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20 opacity-80 md:opacity-0 md:group-hover/folder:opacity-100 transition-opacity">
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
                            })}
                          </div>
                        )}
                      </div>
                    )
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
                    const visiblePreInstalled = showAllPreInstalled || datasetSearch
                      ? filteredPreInstalled
                      : filteredPreInstalled.slice(0, 3)

                    const filteredImported = importedDatasets.filter(d =>
                      d.name.toLowerCase().includes(datasetSearch.toLowerCase())
                    )

                    return (
                      <>
                        {/* Pre-installed section */}
                        {filteredPreInstalled.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold text-gray-400 font-mono">Pre-installed Datasets</span>
                            {visiblePreInstalled.map((key) => {
                              const filename = key as keyof typeof DATASETS
                              const isSelected = selectedFile === filename
                              const isDropdownOpen = activeDropdownDataset === filename
                              return (
                                <div key={filename} className="relative group animate-fade-in">
                                  <button
                                    onClick={() => loadFilePreview(filename)}
                                    title={DATASETS[filename]?.description || ""}
                                    className={`w-full p-2.5 pr-10 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 ${
                                      isSelected
                                        ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                                        : 'bg-canvas border-hairline text-gray-700 dark:text-gray-400 hover:text-ink hover:border-gray-400'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2 overflow-hidden w-full">
                                      <FileCode className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold font-mono truncate">{filename}</span>
                                        <span className="text-[9px] text-gray-500 font-medium font-sans whitespace-normal leading-relaxed mt-0.5">
                                          {getDatasetPurpose(filename)}
                                        </span>
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
                                          const showAbove = rect.bottom + 150 > window.innerHeight
                                          if (showAbove) {
                                            setDatasetDropdownPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right })
                                          } else {
                                            setDatasetDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                          }
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

                            {filteredPreInstalled.length > 3 && !datasetSearch && (
                              <button
                                type="button"
                                onClick={() => setShowAllPreInstalled(!showAllPreInstalled)}
                                className="w-full py-2.5 mt-2.5 rounded-xl border border-primary/20 dark:border-primary/30 bg-primary/[0.04] dark:bg-primary/[0.07] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] hover:border-primary/45 text-primary text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                {showAllPreInstalled ? (
                                  <>
                                    <span>Show Less</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>Show More ({filteredPreInstalled.length - 3} more)</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            )}
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
                                          const showAbove = rect.bottom + 150 > window.innerHeight
                                          if (showAbove) {
                                            setDatasetDropdownPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right })
                                          } else {
                                            setDatasetDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                          }
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
        <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-canvas border-l border-hairline overflow-hidden">
          
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-surface-soft text-[10px] text-gray-755 font-mono select-none font-bold max-w-[200px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate" title={`Editing: ${activeFileName}`}>
                    Editing: {activeFileName.length > 28 ? '...' + activeFileName.slice(-25) : activeFileName}
                  </span>
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
                    setCells([{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false }])
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

              {/* Format Toggle Button */}
              {editorFormat === 'cell' ? (
                <button
                  onClick={shiftToTerminalFormat}
                  className="px-3.5 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                  title="Shift to standard Python script editor and terminal"
                >
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span>Shift to Terminal Format</span>
                </button>
              ) : (
                <button
                  onClick={shiftToCellFormat}
                  className="px-3.5 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                  title="Shift to Jupyter cell editor format"
                >
                  <Database className="w-3.5 h-3.5 text-primary rotate-90" />
                  <span>Shift to Cell Format</span>
                </button>
              )}

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
                  onClick={editorFormat === 'cell' ? runAllCells : handleRunCode}
                  disabled={pyodideState !== 'ready'}
                  className="px-5 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] text-[11px] font-extrabold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                >
                  <Play className="w-3 h-3 fill-current" />
                  {editorFormat === 'cell' ? 'Run All' : 'Run Code'}
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor / Cell Canvas */}
          <div className={`flex-1 min-h-0 relative select-text flex flex-col ${editorFormat === 'cell' ? 'bg-canvas overflow-y-auto' : 'bg-[#1e1e1e]'}`}>
            {editorFormat === 'cell' ? (
              <div className="w-full px-6 md:px-8 py-6 space-y-6 pb-24">
                {/* Cell List Toolbar */}
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={runAllCells}
                      disabled={pyodideState !== 'ready' || isRunning}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run All
                    </button>
                    <button
                      onClick={() => {
                        const newId = `cell_${Date.now()}_${Math.random().toString(36).substring(5)}`
                        setCells(prev => [...prev, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false }])
                        focusCellTextarea(newId)
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-card text-ink text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Code Cell
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono font-bold">
                    {cells.length} Cell{cells.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Cells */}
                {cells.map((cell, index) => {
                  const isCellRunning = cell.isRunning || runningCellQueue.includes(cell.id)
                  const isActive = activeCellId === cell.id
                  return (
                    <div
                      key={cell.id}
                      onClick={() => setActiveCellId(cell.id)}
                      className={`group/cell relative flex flex-col border rounded-xl transition-all duration-200 pl-2 pr-4 py-3 bg-canvas dark:bg-canvas ${
                        isActive 
                          ? 'border-hairline shadow-md shadow-primary/5 ring-1 ring-primary/10' 
                          : 'border-transparent hover:border-hairline/60 hover:shadow-xs'
                      }`}
                    >
                      {/* Left vertical highlights bar for active cell */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary rounded-l-xl" />
                      )}

                      {/* Hover Actions Toolbar */}
                      <div className="absolute -top-3.5 right-4 flex items-center gap-1 bg-canvas dark:bg-surface-soft border border-hairline px-1.5 py-0.5 rounded-lg shadow-sm opacity-0 group-hover/cell:opacity-100 focus-within:opacity-100 transition-opacity duration-150 z-20">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveCellUp(index); }}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-ink hover:bg-surface-soft rounded disabled:opacity-30 cursor-pointer transition-colors"
                          title="Move cell up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveCellDown(index); }}
                          disabled={index === cells.length - 1}
                          className="p-1 text-gray-500 hover:text-ink hover:bg-surface-soft rounded disabled:opacity-30 cursor-pointer transition-colors"
                          title="Move cell down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearCellOutput(cell.id); }}
                          className="p-1 text-gray-500 hover:text-ink hover:bg-surface-soft rounded cursor-pointer transition-colors"
                          title="Clear cell outputs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-3.5 bg-hairline mx-0.5" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (cells.length === 1) {
                              setCells([{ id: 'cell_default', code: '', output: '', plot: '', error: '' }])
                            } else {
                              setCells(prev => prev.filter(c => c.id !== cell.id))
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer transition-colors"
                          title="Delete cell"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Main Cell Content Grid */}
                      <div className="flex items-start gap-3 w-full">
                        
                        {/* Play Indicator Margin */}
                        <div className="w-12 shrink-0 select-none flex flex-col items-center justify-start pt-1.5 relative">
                          <div className="relative w-12 h-6 flex items-center justify-center">
                            {/* Circular spinner when running */}
                            {isCellRunning ? (
                              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <>
                                {/* Play icon on hover / focus */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); runCell(cell.id); }}
                                  disabled={pyodideState !== 'ready' || isRunning}
                                  className="absolute inset-x-3 inset-y-0 z-10 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                </button>
                                {/* Default execution number index, hidden on hover */}
                                <div className="flex items-center gap-0.5 pointer-events-none group-hover/cell:opacity-0 group-focus-within/cell:opacity-0 transition-opacity">
                                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 font-bold">
                                    [{index + 1}]
                                  </span>
                                  {cell.hasRun && (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Code Editor Column */}
                        <div className="flex-1 min-w-0 bg-[#fafafa] dark:bg-[#151413] rounded-lg border border-gray-300 dark:border-[#403f3e] focus-within:border-primary/80 transition-colors p-2.5">
                          <textarea
                            id={`textarea_${cell.id}`}
                            value={cell.code}
                            onChange={(e) => {
                              const val = e.target.value
                              setCells(prev => prev.map(c => c.id === cell.id ? { ...c, code: val } : c))
                            }}
                            placeholder="# Write your Python code here..."
                            rows={Math.max(2, cell.code.split('\n').length)}
                            onFocus={() => setActiveCellId(cell.id)}
                            onPaste={(e) => {
                              const target = e.currentTarget;
                              setTimeout(() => {
                                target.scrollIntoView({ behavior: 'smooth', block: 'end' });
                              }, 80);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                e.preventDefault()
                                runCell(cell.id)
                              }
                              if (e.key === 'Enter' && e.altKey) {
                                e.preventDefault()
                                runCell(cell.id)
                                const newId = `cell_${Date.now()}`
                                setCells(prev => {
                                  const next = [...prev]
                                  next.splice(index + 1, 0, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false })
                                  return next
                                })
                                focusCellTextarea(newId)
                              }
                            }}
                            disabled={isRunning}
                            className="w-full bg-transparent text-ink font-mono text-sm focus:outline-none resize-none leading-relaxed p-1 border-0 select-text"
                            style={{ fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace' }}
                          />
                        </div>

                      </div>

                      {/* Cell Output Section */}
                      {(cell.output || cell.error || cell.plot) && (
                        <div 
                          id={`cell_output_${cell.id}`}
                          className="mt-3 border-t border-hairline/30 pt-3 pl-12 flex items-start gap-3 w-full relative group/output"
                        >
                          {/* Close / Clear output button on left hover */}
                          <div className="absolute left-3 top-3.5 opacity-0 group-hover/output:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); clearCellOutput(cell.id); }}
                              className="p-1 rounded-full text-gray-400 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                              title="Clear output"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0 space-y-4 font-mono text-xs select-text">
                            {cell.output && (
                              <div className="space-y-1">
                                <pre className="whitespace-pre-wrap text-body leading-relaxed font-mono">{cell.output}</pre>
                              </div>
                            )}

                            {cell.error && (
                              <div className="space-y-1">
                                <pre className="whitespace-pre-wrap text-red-650 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-3.5 rounded-xl border border-red-100/30 dark:border-red-950/20 leading-relaxed font-mono font-bold">{cell.error}</pre>
                              </div>
                            )}

                            {cell.plot && (
                              <div className="space-y-1">
                                <div className="relative inline-block group/plot">
                                  <img
                                    src={cell.plot}
                                    alt="Matplotlib visualization"
                                    onClick={() => setFullscreenPlotUrl(cell.plot)}
                                    className="max-h-[360px] object-contain rounded-xl border border-hairline cursor-zoom-in hover:opacity-95 transition-all shadow-sm"
                                  />
                                  <button
                                    onClick={() => setFullscreenPlotUrl(cell.plot)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/plot:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                                    title="View full screen"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hover Add Cell Below center pill */}
                      <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 opacity-0 group-hover/cell:opacity-100 focus-within:opacity-100 transition-opacity duration-150 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const newId = `cell_${Date.now()}_${Math.random().toString(36).substring(5)}`
                            setCells(prev => {
                              const next = [...prev]
                              next.splice(index + 1, 0, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false })
                              return next
                            })
                            focusCellTextarea(newId)
                          }}
                          className="px-3 py-1 rounded-full border border-gray-300 dark:border-[#403f3e] bg-canvas dark:bg-surface-soft hover:bg-surface-soft hover:text-primary dark:hover:bg-[#1a1a1a] text-ink text-[10px] font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                        >
                          <Plus className="w-3 h-3 text-primary" />
                          Code Cell
                        </button>
                      </div>

                    </div>
                  )
                })}
              </div>
            ) : (
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
            )}
          </div>

          {/* Resizer Handle Bar */}
          {editorFormat !== 'cell' && (
            <div 
              onMouseDown={handleMouseDown}
              className="h-2 bg-hairline hover:bg-primary/50 cursor-ns-resize transition-colors duration-200 select-none z-30 relative group" 
            >
              {/* Thicker invisible hover area to make resizing extremely easy and prevent overlap issues */}
              <div className="absolute inset-x-0 -top-1.5 -bottom-1.5 cursor-ns-resize z-40" />
            </div>
          )}

          {/* Console Output Panel */}
          {editorFormat !== 'cell' && (
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
          )}
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
      {showSaveModal && (() => {
        const allFolders = Array.from(new Set([
          ...customFolders,
          ...savedFiles
            .filter(f => f.name.includes('/'))
            .map(f => f.name.split('/')[0])
        ])).sort()
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
              <h3 className="text-xs uppercase font-mono font-extrabold text-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Code Script
              </h3>
              <p className="text-sm font-medium text-ink">
                Configure path and filename to save this script in your browser workspace:
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-mono">File Name</label>
                  <input
                    type="text"
                    value={saveFileName}
                    onChange={(e) => setSaveFileName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                    placeholder="e.g. solution.py"
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-mono">Select Folder</label>
                  
                  {/* Custom Dropdown Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowSaveDropdownPanel(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm text-ink outline-none hover:bg-surface-card hover:border-gray-400 transition-colors cursor-pointer text-left font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className={`w-4 h-4 ${saveToFolder ? 'text-amber-500' : 'text-gray-400'}`} />
                      <span>{saveToFolder === '__new__' ? '+ Create New Folder...' : (saveToFolder || 'Without Folder (Save in Root)')}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Custom Dropdown Panel */}
                  {showSaveDropdownPanel && (
                    <>
                      {/* Transparent page layer to close panel */}
                      <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setShowSaveDropdownPanel(false)} />
                      <div className="absolute left-0 right-0 mt-1.5 bg-canvas border border-hairline rounded-xl shadow-xl z-20 py-1 max-h-48 overflow-y-auto animate-scale-in">
                        <button
                          type="button"
                          onClick={() => {
                            setSaveToFolder('')
                            setShowNewFolderSaveInput(false)
                            setNewSaveFolderName('')
                            setShowSaveDropdownPanel(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-surface-soft ${!saveToFolder ? 'text-primary bg-primary/5' : 'text-ink'} transition-colors cursor-pointer`}
                        >
                          <Folder className="w-3.5 h-3.5 text-gray-400" />
                          <span>Without Folder (Save in Root)</span>
                        </button>
                        
                        {allFolders.map(folder => (
                          <button
                            key={folder}
                            type="button"
                            onClick={() => {
                              setSaveToFolder(folder)
                              setShowNewFolderSaveInput(false)
                              setNewSaveFolderName('')
                              setShowSaveDropdownPanel(false)
                            }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-left hover:bg-surface-soft ${saveToFolder === folder ? 'text-primary bg-primary/5' : 'text-ink'} transition-colors cursor-pointer`}
                          >
                            <Folder className="w-3.5 h-3.5 text-amber-500" />
                            <span className="truncate">{folder}</span>
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            setSaveToFolder('__new__')
                            setShowNewFolderSaveInput(true)
                            setShowSaveDropdownPanel(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-surface-soft ${saveToFolder === '__new__' ? 'text-primary bg-primary/5' : 'text-gray-500'} border-t border-hairline transition-colors cursor-pointer`}
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          <span>+ Create New Folder...</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {showNewFolderSaveInput && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-mono">New Folder Name</label>
                    <input
                      type="text"
                      value={newSaveFolderName}
                      onChange={(e) => setNewSaveFolderName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Analytics"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveModal(false)
                      setSaveFileName('')
                      setSaveToFolder('')
                      setNewSaveFolderName('')
                      setShowNewFolderSaveInput(false)
                    }}
                    className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFile}
                    disabled={!saveFileName.trim() || isSaving || (saveToFolder === '__new__' && !newSaveFolderName.trim())}
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
        )
      })()}

      {/* Move File Modal Dialog */}
      {showMoveModal && fileToMove && (() => {
        const allFolders = Array.from(new Set([
          ...customFolders,
          ...savedFiles
            .filter(f => f.name.includes('/'))
            .map(f => f.name.split('/')[0])
        ])).sort()
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
              <h3 className="text-xs uppercase font-mono font-extrabold text-primary flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500" />
                Move File
              </h3>
              <p className="text-sm font-medium text-ink">
                Select target folder for <span className="font-mono text-primary font-bold">{fileToMove.split('/').pop()}</span>:
              </p>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-mono">Target Folder</label>
                  
                  {/* Custom Trigger Dropdown for Move */}
                  <button
                    type="button"
                    onClick={() => setShowMoveDropdownPanel(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm text-ink outline-none hover:bg-surface-card hover:border-gray-400 transition-colors cursor-pointer text-left font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className={`w-4 h-4 ${moveToFolder ? 'text-amber-500' : 'text-gray-400'}`} />
                      <span>{moveToFolder === '__new__' ? '+ Create New Folder...' : (moveToFolder || 'Root Directory')}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Custom Move Dropdown Panel */}
                  {showMoveDropdownPanel && (
                    <>
                      {/* Transparent panel closer background */}
                      <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setShowMoveDropdownPanel(false)} />
                      <div className="absolute left-0 right-0 mt-1.5 bg-canvas border border-hairline rounded-xl shadow-xl z-20 py-1 max-h-48 overflow-y-auto animate-scale-in">
                        <button
                          type="button"
                          onClick={() => {
                            setMoveToFolder('')
                            setShowNewFolderMoveInput(false)
                            setNewMoveFolderName('')
                            setShowMoveDropdownPanel(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-surface-soft ${!moveToFolder ? 'text-primary bg-primary/5' : 'text-ink'} transition-colors cursor-pointer`}
                        >
                          <Folder className="w-3.5 h-3.5 text-gray-400" />
                          <span>Root Directory</span>
                        </button>
                        
                        {allFolders.map(folder => (
                          <button
                            key={folder}
                            type="button"
                            onClick={() => {
                              setMoveToFolder(folder)
                              setShowNewFolderMoveInput(false)
                              setNewMoveFolderName('')
                              setShowMoveDropdownPanel(false)
                            }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-left hover:bg-surface-soft ${moveToFolder === folder ? 'text-primary bg-primary/5' : 'text-ink'} transition-colors cursor-pointer`}
                          >
                            <Folder className="w-3.5 h-3.5 text-amber-500" />
                            <span className="truncate">{folder}</span>
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            setMoveToFolder('__new__')
                            setShowNewFolderMoveInput(true)
                            setShowMoveDropdownPanel(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left hover:bg-surface-soft ${moveToFolder === '__new__' ? 'text-primary bg-primary/5' : 'text-gray-500'} border-t border-hairline transition-colors cursor-pointer`}
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          <span>+ Create New Folder...</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {showNewFolderMoveInput && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-mono">New Folder Name</label>
                    <input
                      type="text"
                      value={newMoveFolderName}
                      onChange={(e) => setNewMoveFolderName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Analytics"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoveModal(false)
                      setFileToMove(null)
                      setMoveToFolder('')
                      setNewMoveFolderName('')
                      setShowNewFolderMoveInput(false)
                    }}
                    className="px-4 py-2 rounded-xl border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-card text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      let folder = moveToFolder
                      if (moveToFolder === '__new__') {
                        const newName = newMoveFolderName.trim()
                        if (newName) {
                          addCustomFolder(newName)
                          folder = newName
                        }
                      }
                      await handleMoveFile(fileToMove, folder || null)
                      setShowMoveModal(false)
                      setFileToMove(null)
                      setMoveToFolder('')
                      setNewMoveFolderName('')
                      setShowNewFolderMoveInput(false)
                    }}
                    disabled={isSaving || (moveToFolder === '__new__' && !newMoveFolderName.trim())}
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-2 min-w-[70px] justify-center"
                  >
                    {isSaving ? 'Moving...' : 'Move'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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
            className="fixed w-32 bg-canvas border border-hairline rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl animate-scale-in z-50 space-y-0.5"
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
                      setFileToMove(file.name)
                      setMoveToFolder(file.name.includes('/') ? file.name.split('/')[0] : '')
                      setShowMoveModal(true)
                      setActiveDropdownFile(null)
                      setDropdownPos(null)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-surface-soft hover:text-ink rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Folder className="w-3 h-3 text-amber-500" />
                    Move to...
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
              ...(datasetDropdownPos.top !== undefined ? { top: `${datasetDropdownPos.top}px` } : { bottom: `${datasetDropdownPos.bottom}px` }),
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

      {/* Fullscreen Plot Zoom Modal Overlay */}
      {fullscreenPlotUrl && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in cursor-zoom-out"
          onClick={() => setFullscreenPlotUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-canvas p-4 rounded-2xl border border-hairline shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setFullscreenPlotUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-surface-soft hover:bg-surface-card text-gray-500 hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={fullscreenPlotUrl}
              alt="Fullscreen matplotlib plot"
              className="max-w-full max-h-[80vh] object-contain rounded-xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
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

function getDatasetPurpose(filename: string): string {
  switch (filename) {
    case 'dirty_store_transactions.csv':
      return 'Retail transactions, sales cleaning & outliers'
    case 'student_performance_factors.csv':
      return 'Hours vs scores regression & correlation mapping'
    case 'sensor_readings_noisy.csv':
      return 'IoT cyclic temperature logs & rolling smoothing'
    case 'store_dim_customers.csv':
      return 'Customer VIP tiers relational join dimension table'
    case 'corporate_financials_wide.csv':
      return 'Wide quarter revenues reshaping (pd.melt)'
    case 'high_frequency_stock_ticks.csv':
      return 'Microsecond stock updates (resampling to OHLC)'
    case 'financial_transactions_part1.csv':
      return 'Ledger part 1 data chunk'
    case 'financial_transactions_part2.csv':
      return 'Ledger part 2 data chunk'
    default:
      return 'Reference database table'
  }
}

