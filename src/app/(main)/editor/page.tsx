'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Monaco, useMonaco } from '@monaco-editor/react'
import { ArrowLeft, Play, RefreshCw, Database, Terminal, CheckCircle, X, Sun, Moon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, FileCode, RotateCcw, Square, Save, MoreVertical, Download, Trash2, LogIn, UserPlus, LogOut, Edit2, Plus, Maximize2, Folder, Check, FolderPlus, Info, Bold, Italic, Heading, Code, List, BookOpen, Columns, Rows, Minimize2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { DEFAULT_DATASETS as DATASETS } from '@/lib/datasetGenerator'
import { initDB, getDatasets, saveDataset, deleteDataset, CustomDataset } from '@/lib/indexedDb'
import JSZip from 'jszip'

// Custom file type icon components — inline SVGs for guaranteed rendering
const PythonIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M13.0164 2C10.8193 2 9.03825 3.72453 9.03825 5.85185V8.51852H15.9235V9.25926H5.97814C3.78107 9.25926 2 10.9838 2 13.1111L2 18.8889C2 21.0162 3.78107 22.7407 5.97814 22.7407H8.27322V19.4815C8.27322 17.3542 10.0543 15.6296 12.2514 15.6296H19.5956C21.4547 15.6296 22.9617 14.1704 22.9617 12.3704V5.85185C22.9617 3.72453 21.1807 2 18.9836 2H13.0164ZM12.0984 6.74074C12.8589 6.74074 13.4754 6.14378 13.4754 5.40741C13.4754 4.67103 12.8589 4.07407 12.0984 4.07407C11.3378 4.07407 10.7213 4.67103 10.7213 5.40741C10.7213 6.14378 11.3378 6.74074 12.0984 6.74074Z" fill="url(#py_grad0)"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M18.9834 30C21.1805 30 22.9616 28.2755 22.9616 26.1482V23.4815L16.0763 23.4815L16.0763 22.7408L26.0217 22.7408C28.2188 22.7408 29.9998 21.0162 29.9998 18.8889V13.1111C29.9998 10.9838 28.2188 9.25928 26.0217 9.25928L23.7266 9.25928V12.5185C23.7266 14.6459 21.9455 16.3704 19.7485 16.3704L12.4042 16.3704C10.5451 16.3704 9.03809 17.8296 9.03809 19.6296L9.03809 26.1482C9.03809 28.2755 10.8192 30 13.0162 30H18.9834ZM19.9015 25.2593C19.1409 25.2593 18.5244 25.8562 18.5244 26.5926C18.5244 27.329 19.1409 27.9259 19.9015 27.9259C20.662 27.9259 21.2785 27.329 21.2785 26.5926C21.2785 25.8562 20.662 25.2593 19.9015 25.2593Z" fill="url(#py_grad1)"/>
    <defs>
      <linearGradient id="py_grad0" x1="12.4809" y1="2" x2="12.4809" y2="22.7407" gradientUnits="userSpaceOnUse">
        <stop stopColor="#327EBD"/><stop offset="1" stopColor="#1565A7"/>
      </linearGradient>
      <linearGradient id="py_grad1" x1="19.519" y1="9.25928" x2="19.519" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFDA4B"/><stop offset="1" stopColor="#F9C600"/>
      </linearGradient>
    </defs>
  </svg>
)
const JupyterIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className}>
    <path d="M109.766 7.281a7.691 7.691 0 01-1.09 4.282 7.583 7.583 0 01-3.262 2.949 7.49 7.49 0 01-4.34.62 7.525 7.525 0 01-3.953-1.913A7.642 7.642 0 0195.137 5a7.606 7.606 0 012.629-3.531 7.509 7.509 0 014.136-1.461 7.51 7.51 0 015.422 1.996 7.627 7.627 0 012.438 5.273zm0 0" fill="#767677"/>
    <path d="M65.758 96.79c-20.098 0-37.649-7.364-46.766-18.267a49.95 49.95 0 0018.102 24.254 49.251 49.251 0 0028.676 9.215 49.279 49.279 0 0028.675-9.215 49.917 49.917 0 0018.094-24.254C103.406 89.426 85.855 96.79 65.758 96.79zm0 0M65.75 25.883c20.098 0 37.652 7.367 46.766 18.265a49.95 49.95 0 00-18.102-24.253 49.27 49.27 0 00-28.672-9.22 49.27 49.27 0 00-28.672 9.22A49.909 49.909 0 0018.97 44.148C28.102 33.27 45.652 25.883 65.75 25.883zm0 0" fill="#f37726"/>
    <path d="M38.164 117.984a9.671 9.671 0 01-1.371 5.399 9.5 9.5 0 01-9.59 4.504 9.405 9.405 0 01-4.98-2.418 9.671 9.671 0 01-2.809-4.797 9.73 9.73 0 01.313-5.567 9.624 9.624 0 013.328-4.453 9.466 9.466 0 0112.043.688 9.63 9.63 0 013.066 6.648zm0 0" fill="#989798"/>
    <path d="M21.285 23.418a5.53 5.53 0 01-3.14-.816 5.627 5.627 0 01-2.618-5.672 5.612 5.612 0 011.407-2.95 5.593 5.593 0 012.789-1.664 5.46 5.46 0 013.238.184 5.539 5.539 0 012.586 1.969 5.66 5.66 0 01-.399 7.129 5.557 5.557 0 01-3.867 1.82zm0 0" fill="#6f7070"/>
  </svg>
)

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
  type?: 'code' | 'markdown';
}

interface Tab {
  name: string;
  code: string;
  cells: CellType[];
  format: 'terminal' | 'cell';
  isDirty: boolean;
  isNew?: boolean;
}

const notebookToCells = (notebook: any): CellType[] => {
  if (!notebook || !Array.isArray(notebook.cells)) {
    return [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }];
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
      hasRun: outputText !== '' || errorText !== '' || plotImg !== '',
      type: c.cell_type === 'markdown' ? 'markdown' : 'code'
    };
  });
};

const cellsToNotebook = (cellsList: CellType[]) => {
  return {
    cells: cellsList.map(c => {
      const outputs: any[] = [];
      if (c.type !== 'markdown') {
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
      }
      const cleanCode = c.code.replace(/^\n+|\n+$/g, '');
      return {
        cell_type: c.type || 'code',
        execution_count: null,
        metadata: {},
        outputs: c.type === 'markdown' ? [] : outputs,
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
  { id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, type: 'code' }
];
let globalDraftFormat: 'terminal' | 'cell' = 'terminal';
let globalActiveFileName: string | null = null;
let globalLastSavedCode: string = '# Write your code here\n';
const applyInlineFormatting = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-surface-soft px-1 rounded text-xs font-mono">$1</code>')
}

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  const htmlElements = lines.map((line, idx) => {
    if (line.startsWith('# ')) {
      return <h1 key={idx} className="font-bold text-ink mt-3 mb-2" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(2)) }} />;
    }
    if (line.startsWith('## ')) {
      return <h2 key={idx} className="font-bold text-ink mt-2.5 mb-1.5" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(3)) }} />;
    }
    if (line.startsWith('### ')) {
      return <h3 key={idx} className="font-bold text-ink mt-2 mb-1" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(4)) }} />;
    }
    if (line.startsWith('#### ')) {
      return <h4 key={idx} className="font-bold text-ink mt-2 mb-1" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(5)) }} />;
    }
    if (line.startsWith('##### ')) {
      return <h5 key={idx} className="font-bold text-ink mt-1.5 mb-1" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(6)) }} />;
    }
    if (line.startsWith('###### ')) {
      return <h6 key={idx} className="font-bold text-muted mt-1 mb-1" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(7)) }} />;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={idx} className="ml-4 list-disc text-sm text-body leading-relaxed" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(2)) }} />;
    }
    if (/^\d+\.\s/.test(line)) {
      const dotIdx = line.indexOf(' ');
      return <li key={idx} className="ml-4 list-decimal text-sm text-body leading-relaxed" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(dotIdx + 1)) }} />;
    }
    if (line.startsWith('> ')) {
      return <blockquote key={idx} className="border-l-4 border-primary/40 pl-3 py-1 my-2 text-sm text-gray-500 bg-surface-soft rounded-r-md" dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line.substring(2)) }} />;
    }
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }
    
    return (
      <p 
        key={idx} 
        className="text-sm text-body leading-relaxed min-h-[1.25rem]"
        dangerouslySetInnerHTML={{ __html: applyInlineFormatting(line) }}
      />
    );
  });
  return <div className="space-y-1 font-sans cell-markdown-container select-text">{htmlElements}</div>;
};

const htmlToMarkdown = (html: string): string => {
  if (!html) return ''
  let markdown = html
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
  return markdown.replace(/\n{3,}/g, '\n\n').trim()
}

const markdownToHtml = (markdown: string): string => {
  if (!markdown) return ''
  let html = markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^###### (.*?)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
  
  return html.split('\n').map(line => {
    if (line.startsWith('<h') || line.startsWith('<li') || line.startsWith('<ul')) return line
    if (!line.trim()) return '<br/>'
    return `<p>${line}</p>`
  }).join('')
}

const MarkdownCellEditor = ({ 
  code, 
  cellId, 
  onSave, 
  onSelect,
  onCheckStyles
}: { 
  code: string; 
  cellId: string; 
  onSave: (md: string, run?: boolean) => void; 
  onSelect: (top: number, left: number, visible: boolean) => void;
  onCheckStyles: () => void;
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  
  // Set initial HTML once per cell load
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(code)
      editorRef.current.focus()
      onCheckStyles()
    }
  }, [cellId])

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="w-full min-h-[80px] px-4 py-3 text-ink leading-relaxed text-sm outline-none focus:ring-0 cell-contenteditable-editor select-text"
      style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
      onBlur={() => {
        if (editorRef.current) {
          onSave(htmlToMarkdown(editorRef.current.innerHTML))
        }
      }}
      onFocus={onCheckStyles}
      onKeyUp={onCheckStyles}
      onKeyDown={(e) => {
        onCheckStyles()
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault()
          if (editorRef.current) {
            onSave(htmlToMarkdown(editorRef.current.innerHTML), true)
          }
        }
      }}
      onMouseUp={onCheckStyles}
    />
  )
}

export default function CodeEditorPage() {
  const supabase = createClient()
  const [code, setCode] = useState(globalDraftCode)
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (typeof window !== 'undefined' && (window as any).isSwappingCells) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      const reason = event.reason
      if (!reason) return

      const reasonStr = typeof reason === 'string' 
        ? reason 
        : (reason.message || reason.msg || reason.type || reason.name || '')

      const isMonacoCancel = 
        reason === 'cancelation' ||
        reason.type === 'cancelation' ||
        (typeof reasonStr === 'string' && (
          reasonStr.includes('manually canceled') || 
          reasonStr.includes('manually cancelled') ||
          reasonStr.includes('cancelation') ||
          reasonStr.includes('canceled') ||
          reasonStr.includes('cancelled')
        ))

      if (isMonacoCancel) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    window.addEventListener('unhandledrejection', handleRejection, true)
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection, true)
    }
  }, [])

  const [cellHeights, setCellHeights] = useState<Record<string, number>>({})

  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    h1: false,
    h2: false,
    h3: false,
    h4: false,
    h5: false,
    h6: false,
    ul: false
  })

  const checkActiveStyles = () => {
    if (typeof window === 'undefined') return
    setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || !selection.anchorNode) {
        setActiveStyles({ bold: false, italic: false, h1: false, h2: false, h3: false, h4: false, h5: false, h6: false, ul: false })
        return
      }
      
      const bold = document.queryCommandState('bold')
      const italic = document.queryCommandState('italic')
      const ul = document.queryCommandState('insertUnorderedList')
      
      let h1 = false, h2 = false, h3 = false, h4 = false, h5 = false, h6 = false
      let node: Node | null = selection.anchorNode
      while (node && !((node as HTMLElement).classList && (node as HTMLElement).classList.contains('cell-contenteditable-editor'))) {
        const name = node.nodeName.toLowerCase()
        if (name === 'h1') h1 = true
        if (name === 'h2') h2 = true
        if (name === 'h3') h3 = true
        if (name === 'h4') h4 = true
        if (name === 'h5') h5 = true
        if (name === 'h6') h6 = true
        node = node.parentNode
      }
      
      setActiveStyles({ bold, italic, h1, h2, h3, h4, h5, h6, ul })
    }, 10)
  }

  // Pyodide Loading States
  const [pyodideState, setPyodideState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const pyodideRef = useRef<any>(null)
  const editorRef = useRef<any>(null)
  const ignoreChangeRef = useRef(false)
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
  const [tabs, setTabs] = useState<Tab[]>([])

  // Ref for active Monaco Editor instance (used for formatting Markdown)
  const activeEditorRef = useRef<any>(null)
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [isReordering, setIsReordering] = useState(false)

  const applyFormat = (formatType: 'bold' | 'italic' | 'code' | 'header' | 'list') => {
    const editor = activeEditorRef.current
    if (!editor) return
    
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (!selection || !model) return
    
    const selectedText = model.getValueInRange(selection)
    let replacement = ''
    
    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`
        break
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`
        break
      case 'code':
        replacement = `\`${selectedText || 'code'}\``
        break
      case 'header':
        replacement = `### ${selectedText || 'Heading'}`
        break
      case 'list':
        replacement = `\n- ${selectedText || 'List item'}`
        break
    }
    
    editor.executeEdits('format', [{
      range: selection,
      text: replacement,
      forceMoveMarkers: true
    }])
    
    editor.focus()
  }

  const [selectionBubble, setSelectionBubble] = useState<{ visible: boolean; top: number; left: number; cellId: string }>({ visible: false, top: 0, left: 0, cellId: '' })

  useEffect(() => {
    const handleSelectionChange = () => {
      // Proactively check active styles for toolbar
      checkActiveStyles()

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelectionBubble(prev => prev.visible ? { ...prev, visible: false } : prev)
        return
      }

      // Check if selection is inside the active contenteditable editor
      const activeEl = document.querySelector('.cell-contenteditable-editor:focus') as HTMLDivElement
      if (activeEl && activeEl.contains(selection.anchorNode)) {
        try {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            setSelectionBubble({
              visible: true,
              top: rect.top - 45, // Viewport-relative because bubble is fixed
              left: rect.left + rect.width / 2, // Viewport-relative
              cellId: activeCellId || ''
            })
          }
        } catch (err) {
          // ignore
        }
      } else {
        setSelectionBubble(prev => prev.visible ? { ...prev, visible: false } : prev)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    window.addEventListener('scroll', handleSelectionChange, true) // capture scrolls on containers too
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('scroll', handleSelectionChange, true)
    }
  }, [activeCellId])

  const applyFormatHeading = (level: number) => {
    const editor = activeEditorRef.current
    if (!editor) return
    
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (!selection || !model) return
    
    const selectedText = model.getValueInRange(selection)
    const hashes = '#'.repeat(level)
    const replacement = `\n${hashes} ${selectedText || `Heading ${level}`}\n`
    
    editor.executeEdits('format', [{
      range: selection,
      text: replacement,
      forceMoveMarkers: true
    }])
    
    editor.focus()
    setSelectionBubble(prev => ({ ...prev, visible: false }))
  }

  const applyContentEditableFormat = (formatType: 'bold' | 'italic' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul') => {
    // Find active contenteditable container
    let activeEl = document.querySelector('.cell-contenteditable-editor:focus') as HTMLDivElement
    if (!activeEl) {
      const currentActive = document.querySelector('[contenteditable="true"]') as HTMLDivElement
      if (currentActive) {
        currentActive.focus()
        activeEl = currentActive
      } else {
        return
      }
    }
    
    const selection = window.getSelection()
    if (!selection) return
    
    const isSelectionEmpty = selection.isCollapsed
    const hasText = activeEl.textContent && activeEl.textContent.trim().length > 0

    if (isSelectionEmpty && hasText) {
      // Programmatically select all content in that cell to format existing text
      const range = document.createRange()
      range.selectNodeContents(activeEl)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    
    switch (formatType) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        document.execCommand('formatBlock', false, `<${formatType}>`)
        break
      case 'ul':
        document.execCommand('insertUnorderedList', false)
        break
    }
    
    // If we programmatically selected all text, collapse cursor inside the style tag at the end
    if (isSelectionEmpty && hasText) {
      const range = document.createRange()
      if (activeEl.lastChild) {
        range.selectNodeContents(activeEl.lastChild)
      } else {
        range.selectNodeContents(activeEl)
      }
      range.collapse(false) // collapse to end (inside style block)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    
    // Clear selection bubble
    setSelectionBubble(prev => ({ ...prev, visible: false }))
    // Update active styles
    checkActiveStyles()
  }

  const [leftSidebarTab, setLeftSidebarTab] = useState<'savedFiles' | 'datasets'>('savedFiles')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showGuestSaveModal, setShowGuestSaveModal] = useState(false)
  const [tabConfirmClose, setTabConfirmClose] = useState<string | null>(null)
  const [saveFileName, setSaveFileName] = useState('')
  const [activeDropdownFile, setActiveDropdownFile] = useState<string | null>(null)
  const [activeFileName, setActiveFileName] = useState<string | null>(globalActiveFileName)
  const [folderSearch, setFolderSearch] = useState('')
  const [rootFileSearch, setRootFileSearch] = useState('')
  const [innerFileSearch, setInnerFileSearch] = useState('')
  const [innerFolderSearch, setInnerFolderSearch] = useState('')
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

  const getAllFolders = () => {
    const folders = new Set<string>()
    customFolders.forEach(f => {
      if (f) folders.add(f)
    })
    savedFiles.forEach(file => {
      if (file.name.includes('/')) {
        const folderPath = file.name.substring(0, file.name.lastIndexOf('/'))
        const parts = folderPath.split('/')
        let current = ''
        parts.forEach((part) => {
          current = current ? `${current}/${part}` : part
          folders.add(current)
        })
      }
    })
    return Array.from(folders).sort()
  }
  const [currentExplorerFolder, setCurrentExplorerFolder] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [folderInputName, setFolderInputName] = useState('')
  const [showNewFileInput, setShowNewFileInput] = useState(false)
  const [fileInputName, setFileInputName] = useState('')
  const [newFileType, setNewFileType] = useState<'py' | 'ipynb' | null>(null)
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

  // Load open tabs and restore active file state on mount
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

      const storedTabs = localStorage.getItem('pycode_open_tabs')
      const storedActiveTab = localStorage.getItem('pycode_active_tab')
      
      let parsedTabs: Tab[] = []
      if (storedTabs) {
        try {
          parsedTabs = JSON.parse(storedTabs)
        } catch (e) {
          console.error("Failed to parse stored tabs:", e)
        }
      }
      
      if (parsedTabs.length > 0) {
        // Enforce format alignment based on file extension
        const alignedTabs = parsedTabs.map(t => ({
          ...t,
          format: t.name.endsWith('.ipynb') ? 'cell' : 'terminal' as 'cell' | 'terminal'
        }))
        setTabs(alignedTabs)
        const activeName = storedActiveTab && alignedTabs.some(t => t.name === storedActiveTab)
          ? storedActiveTab
          : alignedTabs[0].name
          
        setActiveFileName(activeName)
        const activeTab = alignedTabs.find(t => t.name === activeName)!
        setEditorFormat(activeTab.format)
        
        // Restore BOTH cells and code to preserve formats context!
        // Reset isRunning on restore — cells can never be mid-run after a page refresh.
        setCells((activeTab.cells || []).map((c: CellType) => ({ ...c, isRunning: false })))
        setCode(activeTab.code)
        if (activeTab.format === 'terminal' && editorRef.current) {
          editorRef.current.setValue(activeTab.code)
        }
      } else {
        // Fallback to reload from SPA globals or standard default scratch tab
        if (globalActiveFileName !== null || globalDraftCode !== '# Write your code here\n' || globalDraftFormat === 'cell') {
          const initialTab: Tab = {
            name: globalActiveFileName || 'Untitled-1.py',
            code: globalDraftCode,
            cells: globalDraftCells,
            format: globalActiveFileName?.endsWith('.ipynb') ? 'cell' : 'terminal',
            isDirty: false
          }
          setTabs([initialTab])
          setActiveFileName(initialTab.name)
          setCode(globalDraftCode)
          setCells(globalDraftCells)
          setEditorFormat(initialTab.format)
        } else {
          const defaultTab: Tab = {
            name: 'Untitled-1.py',
            code: '# Write your code here\n',
            cells: [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }],
            format: savedFormat || 'terminal',
            isDirty: false,
            isNew: true
          }
          setTabs([defaultTab])
          setActiveFileName(defaultTab.name)
          setCode(defaultTab.code)
          setCells(defaultTab.cells)
          setEditorFormat(defaultTab.format)
        }
      }
      setIsRestored(true)
    }
  }, [])

  // Synchronize state with localStorage and SPA module-level globals
  useEffect(() => {
    if (typeof window !== 'undefined' && isRestored) {
      globalDraftCode = code
      globalDraftCells = cells
      globalDraftFormat = editorFormat
      globalActiveFileName = activeFileName
      globalLastSavedCode = lastSavedCode

      localStorage.setItem('pycode_editor_format', editorFormat)
      localStorage.setItem('pycode_open_tabs', JSON.stringify(tabs))
      if (activeFileName) {
        localStorage.setItem('pycode_active_file', activeFileName)
        localStorage.setItem('pycode_active_tab', activeFileName)
      } else {
        localStorage.removeItem('pycode_active_file')
        localStorage.removeItem('pycode_active_tab')
      }
    }
  }, [code, cells, editorFormat, activeFileName, lastSavedCode, tabs, isRestored])



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
  const [consoleLayout, setConsoleLayout] = useState<'horizontal' | 'vertical'>('horizontal')
  const [terminalHeight, setTerminalHeight] = useState(240)
  const [terminalWidth, setTerminalWidth] = useState(480)
  const isDraggingRef = useRef(false)

  const minimizeTerminal = () => {
    if (consoleLayout === 'vertical') {
      setTerminalWidth(480)
    } else {
      setTerminalHeight(40)
    }
    setTimeout(() => {
      if (editorRef.current) editorRef.current.layout()
    }, 50)
  }

  const maximizeTerminal = () => {
    if (consoleLayout === 'vertical') {
      setTerminalWidth(Math.round(window.innerWidth * 0.7))
    } else {
      const maxVal = Math.max(200, window.innerHeight - 300)
      setTerminalHeight(maxVal)
    }
    setTimeout(() => {
      if (editorRef.current) editorRef.current.layout()
    }, 50)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.classList.add('is-resizing')
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return
    if (consoleLayout === 'vertical') {
      const newWidth = window.innerWidth - e.clientX
      // Minimum width is 480px (default), maximum is 70% of innerWidth
      const clampedWidth = Math.max(480, Math.min(newWidth, window.innerWidth * 0.7))
      setTerminalWidth(clampedWidth)
    } else {
      const newHeight = window.innerHeight - e.clientY
      // Maximum height leaves at least 300px space for editor code area
      const maxVal = Math.max(200, window.innerHeight - 300)
      const clampedHeight = Math.max(40, Math.min(newHeight, maxVal))
      setTerminalHeight(clampedHeight)
    }
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleConsoleLayoutEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ layout: 'horizontal' | 'vertical' }>
      if (customEvent.detail && customEvent.detail.layout) {
        setConsoleLayout(customEvent.detail.layout)
        setTerminalHeight(240)
        setTerminalWidth(480)
        setTimeout(() => {
          if (editorRef.current) editorRef.current.layout()
        }, 100)
      }
    }
    window.addEventListener('pycode-console-layout', handleConsoleLayoutEvent)
    return () => {
      window.removeEventListener('pycode-console-layout', handleConsoleLayoutEvent)
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
          updateCells(prev => prev.map(c => c.id === data.cellId ? { ...c, output: c.output + data.text } : c), false)
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
          updateCells(prev => prev.map(c => c.id === data.cellId ? {
            ...c,
            plot: (data.plotData && typeof data.plotData === 'string' && data.plotData.length > 100)
              ? `data:image/png;base64,${data.plotData}`
              : c.plot,
            isRunning: false,
            hasRun: true
          } : c), false)
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
          updateCells(prev => prev.map(c => c.id === data.cellId ? {
            ...c,
            error: cleanMsg,
            isRunning: false,
            hasRun: true
          } : c), false)
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
    loadSavedFiles()
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const updateCells = (newCells: CellType[] | ((prev: CellType[]) => CellType[]), markDirty = true) => {
    setCells(prev => {
      const updated = typeof newCells === 'function' ? newCells(prev) : newCells
      if (activeFileName) {
        setTabs(tabsPrev => tabsPrev.map(t => t.name === activeFileName ? { 
          ...t, 
          cells: updated, 
          isDirty: markDirty ? true : t.isDirty 
        } : t))
      }
      return updated
    })
  }

  const switchTab = (tabName: string) => {
    const target = tabs.find(t => t.name === tabName)
    if (!target) return
    
    ignoreChangeRef.current = true
    setActiveFileName(tabName)
    setEditorFormat(target.format)
    
    // Restore BOTH cells and code to preserve formats context!
    setCells(target.cells)
    setCode(target.code)
    if (target.format === 'terminal' && editorRef.current) {
      editorRef.current.setValue(target.code)
    }
    setTimeout(() => {
      ignoreChangeRef.current = false
    }, 50)
  }

  const closeTab = (tabName: string, force = false) => {
    const tab = tabs.find(t => t.name === tabName)
    if (!tab) return
    
    if (!force && tab.isDirty) {
      setTabConfirmClose(tabName)
      return
    }
    
    setTabs(prev => {
      const filtered = prev.filter(t => t.name !== tabName)
      let finalTabs = filtered
      
      if (finalTabs.length === 0) {
        const savedFormat = typeof window !== 'undefined' ? localStorage.getItem('pycode_editor_format') as 'terminal' | 'cell' | null : 'terminal'
        finalTabs = [{
          name: 'Untitled-1.py',
          code: '# Write your code here\n',
          cells: [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }],
          format: savedFormat || 'terminal',
          isDirty: false,
          isNew: true
        }]
      }
      
      // If we closed the active tab, select another one
      if (activeFileName === tabName) {
        const nextActive = finalTabs[0]
        ignoreChangeRef.current = true
        setTimeout(() => {
          setActiveFileName(nextActive.name)
          setEditorFormat(nextActive.format)
          if (nextActive.format === 'cell') {
            setCells(nextActive.cells)
          } else {
            setCode(nextActive.code)
            if (editorRef.current) {
              editorRef.current.setValue(nextActive.code)
            }
          }
          setTimeout(() => {
            ignoreChangeRef.current = false
          }, 50)
        }, 10)
      }
      
      return finalTabs
    })
  }

  const addNewTab = () => {
    let index = 1
    const ext = editorFormat === 'cell' ? '.ipynb' : '.py'
    while (tabs.some(t => t.name === `Untitled-${index}${ext}`)) {
      index++
    }
    
    const newName = `Untitled-${index}${ext}`
    const newTab: Tab = {
      name: newName,
      code: '# Write your code here\n',
      cells: [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }],
      format: editorFormat,
      isDirty: false,
      isNew: true
    }
    
    ignoreChangeRef.current = true
    setTabs(prev => [...prev, newTab])
    setActiveFileName(newName)
    setCells(newTab.cells)
    setCode(newTab.code)
    if (editorFormat === 'terminal') {
      if (editorRef.current) {
        editorRef.current.setValue(newTab.code)
      }
    }
    // Scroll tab bar to end so the new tab is visible
    setTimeout(() => {
      if (tabBarRef.current) {
        tabBarRef.current.scrollLeft = tabBarRef.current.scrollWidth
      }
      ignoreChangeRef.current = false
    }, 50)
  }

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
        
        if (cell.type === 'markdown') {
          updateCells(prev => prev.map(c => c.id === activeCellId ? { ...c, isRunning: false, hasRun: true } : c), false)
          setRunningCellQueue(prev => prev.slice(1))
          return
        }
        
        setIsRunning(true)
        updateCells(prev => prev.map(c => c.id === activeCellId ? { ...c, isRunning: true, output: '', error: '', plot: '' } : c), false)
        
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
    const cell = cells.find(c => c.id === cellId)
    if (cell?.type === 'markdown') {
      updateCells(prev => prev.map(c => c.id === cellId ? { ...c, isRunning: false, hasRun: true } : c), false)
      return
    }
    updateCells(prev => prev.map(c => c.id === cellId ? { ...c, output: '', error: '', plot: '', isRunning: true, hasRun: false } : c), false)
    setRunningCellQueue(prev => {
      if (prev.includes(cellId)) return prev
      return [...prev, cellId]
    })
  }

  const runAllCells = () => {
    updateCells(prev => prev.map(c => {
      if (c.type === 'markdown') {
        return { ...c, hasRun: true, isRunning: false }
      }
      return { ...c, output: '', error: '', plot: '', isRunning: true, hasRun: false }
    }))
    const codeCellIds = cells.filter(c => c.type !== 'markdown').map(c => c.id)
    setRunningCellQueue(codeCellIds)
  }

  const renameExtension = (name: string, toExt: '.py' | '.ipynb') => {
    const lastDot = name.lastIndexOf('.')
    const base = lastDot > -1 ? name.substring(0, lastDot) : name
    return base + toExt
  }

  const splitCodeToCells = (codeStr: string): CellType[] => {
    const lines = codeStr.split('\n');
    const parsedCells: CellType[] = [];
    let currentCell: { code: string[]; type: 'code' | 'markdown' } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matchMarkdown = line.match(/^#\s*%%\s*\[markdown\]/i);
      const matchCode = line.match(/^#\s*%%\s*(?!\[markdown\])/i) || (!currentCell && i === 0 && !line.startsWith('# %%'));
      
      if (matchMarkdown) {
        if (currentCell) {
          parsedCells.push({
            id: `cell_${parsedCells.length}_${Math.random().toString(36).substring(5)}`,
            code: currentCell.code.join('\n').replace(/^\n+|\n+$/g, ''),
            output: '', plot: '', error: '', isRunning: false, hasRun: false,
            type: currentCell.type
          });
        }
        currentCell = { code: [], type: 'markdown' };
      } else if (matchCode) {
        if (currentCell) {
          parsedCells.push({
            id: `cell_${parsedCells.length}_${Math.random().toString(36).substring(5)}`,
            code: currentCell.code.join('\n').replace(/^\n+|\n+$/g, ''),
            output: '', plot: '', error: '', isRunning: false, hasRun: false,
            type: currentCell.type
          });
        }
        currentCell = { 
          code: line.startsWith('# %%') ? [] : [line], 
          type: 'code' 
        };
      } else {
        if (!currentCell) {
          currentCell = { code: [], type: 'code' };
        }
        if (currentCell.type === 'markdown') {
          const strippedLine = line.startsWith('# ') ? line.substring(2) : (line.startsWith('#') ? line.substring(1) : line);
          currentCell.code.push(strippedLine);
        } else {
          currentCell.code.push(line);
        }
      }
    }
    
    if (currentCell) {
      parsedCells.push({
        id: `cell_${parsedCells.length}_${Math.random().toString(36).substring(5)}`,
        code: currentCell.code.join('\n').replace(/^\n+|\n+$/g, ''),
        output: '', plot: '', error: '', isRunning: false, hasRun: false,
        type: currentCell.type
      });
    }
    
    let finalCells = parsedCells;
    if (finalCells.length > 1 && finalCells[0].code.trim() === '' && finalCells[0].type === 'code') {
      finalCells.shift()
    }
    if (finalCells.length === 0) {
      finalCells = [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }]
    }
    return finalCells;
  }

  const mergeCellsToCode = (cellsList: CellType[]): string => {
    let mergedCode = ''
    if (cellsList.length === 1) {
      if (cellsList[0].type === 'markdown') {
        mergedCode = `# %% [markdown]\n${cellsList[0].code.split('\n').map(line => `# ${line}`).join('\n')}`
      } else {
        mergedCode = cellsList[0].code.replace(/^\n+|\n+$/g, '')
      }
    } else {
      mergedCode = cellsList.map(c => {
        if (c.type === 'markdown') {
          return `# %% [markdown]\n${c.code.split('\n').map(line => `# ${line}`).join('\n')}`
        }
        return `# %%\n${c.code.replace(/^\n+|\n+$/g, '')}`
      }).join('\n\n')
    }
    return mergedCode
  }

  const shiftToCellFormat = () => {
    ignoreChangeRef.current = true
    setEditorFormat('cell')
    
    // Find first notebook tab (.ipynb) or create one if none exists
    const notebookTab = tabs.find(t => t.name.endsWith('.ipynb'))
    if (notebookTab) {
      setActiveFileName(notebookTab.name)
      setCells(notebookTab.cells)
      setCode(notebookTab.code)
    } else {
      const newTabName = 'Untitled-1.ipynb'
      const newTab: Tab = {
        name: newTabName,
        code: '# Write your code here\n',
        cells: [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }],
        format: 'cell',
        isDirty: false,
        isNew: true
      }
      setTabs(prev => [...prev, newTab])
      setActiveFileName(newTabName)
      setCells(newTab.cells)
      setCode(newTab.code)
    }
    
    setTimeout(() => {
      ignoreChangeRef.current = false
    }, 50)
  }

  const shiftToTerminalFormat = () => {
    ignoreChangeRef.current = true
    setEditorFormat('terminal')
    
    // Find first terminal tab (not .ipynb) or create one if none exists
    const terminalTab = tabs.find(t => !t.name.endsWith('.ipynb'))
    if (terminalTab) {
      setActiveFileName(terminalTab.name)
      setCode(terminalTab.code)
      setCells(terminalTab.cells)
      if (editorRef.current) {
        editorRef.current.setValue(terminalTab.code)
      }
    } else {
      const newTabName = 'Untitled-1.py'
      const newTab: Tab = {
        name: newTabName,
        code: '# Write your code here\n',
        cells: [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }],
        format: 'terminal',
        isDirty: false,
        isNew: true
      }
      setTabs(prev => [...prev, newTab])
      setActiveFileName(newTabName)
      setCode(newTab.code)
      setCells(newTab.cells)
      if (editorRef.current) {
        editorRef.current.setValue(newTab.code)
      }
    }
    
    setTimeout(() => {
      ignoreChangeRef.current = false
    }, 50)
  }

  const moveCellUp = (index: number) => {
    if (index === 0) return
    // Set isReordering=true so Monaco editors unmount cleanly (no cancellation errors)
    setActiveCellId(null)
    setIsReordering(true)
    ;(window as any).isSwappingCells = true
    setTimeout(() => {
      updateCells(prev => {
        const next = [...prev]
        const temp = next[index]
        next[index] = next[index - 1]
        next[index - 1] = temp
        return next
      })
      // Restore Monaco editors after React finishes reordering
      setTimeout(() => {
        setIsReordering(false)
        ;(window as any).isSwappingCells = false
      }, 80)
    }, 30)
  }

  const moveCellDown = (index: number) => {
    // Set isReordering=true so Monaco editors unmount cleanly (no cancellation errors)
    setActiveCellId(null)
    setIsReordering(true)
    ;(window as any).isSwappingCells = true
    setTimeout(() => {
      updateCells(prev => {
        if (index === prev.length - 1) return prev
        const next = [...prev]
        const temp = next[index]
        next[index] = next[index + 1]
        next[index + 1] = temp
        return next
      })
      // Restore Monaco editors after React finishes reordering
      setTimeout(() => {
        setIsReordering(false)
        ;(window as any).isSwappingCells = false
      }, 80)
    }, 30)
  }

  const clearCellOutput = (cellId: string) => {
    updateCells(prev => prev.map(c => c.id === cellId ? { ...c, output: '', error: '', plot: '' } : c))
  }

  const toggleCellType = (cellId: string) => {
    updateCells(prev => prev.map(c => {
      if (c.id === cellId) {
        const newType = c.type === 'markdown' ? 'code' : 'markdown'
        return { ...c, type: newType, output: '', error: '', plot: '', hasRun: false }
      }
      return c
    }))
  }

  const focusCellTextarea = (cellId: string) => {
    setActiveCellId(cellId)
    setTimeout(() => {
      const cellEl = document.getElementById(`cell_container_${cellId}`)
      if (cellEl) {
        cellEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
          setTabs(prev => prev.map(t => t.name === activeFileName ? { ...t, name, isDirty: false, isNew: false } : t))
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
    setTabs(prev => prev.map(t => t.name === activeFileName ? { ...t, name, isDirty: false, isNew: false } : t))
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
          setTabs(prev => prev.map(t => t.name === fileName ? { ...t, isDirty: false } : t))
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
    setTabs(prev => prev.map(t => t.name === fileName ? { ...t, isDirty: false } : t))
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
          setTabs(prev => prev.map(t => t.name === renameFileName ? { ...t, name: newName } : t))
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
      setTabs(prev => prev.map(t => t.name === renameFileName ? { ...t, name: newName } : t))
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
    ignoreChangeRef.current = true
    setActiveFileName(file.name)
    setLastSavedCode(file.code)
    
    const isNotebook = file.name.endsWith('.ipynb')
    const format = isNotebook ? 'cell' : 'terminal'
    
    let parsedCells: CellType[] = []
    if (isNotebook) {
      try {
        parsedCells = notebookToCells(JSON.parse(file.code))
      } catch (err) {
        console.error("Failed to parse notebook JSON, loading as code:", err)
      }
    }
    
    setTabs(prev => {
      const exists = prev.find(t => t.name === file.name)
      if (exists) {
        return prev
      } else {
        return [...prev, {
          name: file.name,
          code: isNotebook ? '' : file.code,
          cells: parsedCells,
          format,
          isDirty: false
        }]
      }
    })
    
    if (isNotebook) {
      setCells(parsedCells)
      setEditorFormat('cell')
    } else {
      setCode(file.code)
      setEditorFormat('terminal')
      if (editorRef.current) {
        editorRef.current.setValue(file.code)
      }
    }
    setTimeout(() => {
      ignoreChangeRef.current = false
    }, 50)
  }

  const handleDeleteFile = async (name: string) => {
    closeTab(name, true)
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
      const updated = prev.filter(f => f !== folderName && !f.startsWith(folderName + '/'))
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

  const handleCreateFileExplorer = async (fileName: string) => {
    let name = fileName.trim()
    if (!name) return

    // Ensure extension matches formatting
    const isNotebook = name.endsWith('.ipynb')
    const isPy = name.endsWith('.py')

    if (!isNotebook && !isPy) {
      // Append default extension based on active format
      name += editorFormat === 'cell' ? '.ipynb' : '.py'
    }

    const fullPath = currentExplorerFolder ? `${currentExplorerFolder}/${name}` : name

    // Check if file already exists
    if (savedFiles.some(f => f.name.toLowerCase() === fullPath.toLowerCase())) {
      triggerToast("File already exists.", "error")
      return
    }

    const initialContent = name.endsWith('.ipynb')
      ? JSON.stringify(cellsToNotebook([{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }]), null, 2)
      : '# Write your code here\n'

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase.from('saved_scripts') as any)
          .insert({
            user_id: user.id,
            name: fullPath,
            code: initialContent,
            last_modified: new Date().toISOString()
          })
        
        if (!error) {
          await loadSavedFiles()
          // Open the new file in a tab
          const newTab: Tab = {
            name: fullPath,
            code: name.endsWith('.ipynb') ? '' : initialContent,
            cells: name.endsWith('.ipynb') ? [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }] : [],
            format: name.endsWith('.ipynb') ? 'cell' : 'terminal',
            isDirty: false
          }
          setTabs(prev => {
            if (prev.some(t => t.name === fullPath)) return prev
            return [...prev, newTab]
          })
          setActiveFileName(fullPath)
          setEditorFormat(newTab.format)
          setCells(newTab.cells)
          setCode(newTab.code)
          if (newTab.format === 'terminal' && editorRef.current) {
            editorRef.current.setValue(newTab.code)
          }
          setShowNewFileInput(false)
          setFileInputName('')
          setIsSaving(false)
          triggerToast("File created successfully.", "success")
          return
        }
      }
    } catch (e) {
      console.warn("Supabase file create failed, falling back to local:", e)
    }

    // LocalStorage fallback
    const newFile = {
      name: fullPath,
      code: initialContent,
      lastModified: new Date().toLocaleString()
    }
    const filesStr = localStorage.getItem('pycode_saved_files')
    let files = []
    if (filesStr) {
      files = JSON.parse(filesStr)
    }
    files.push(newFile)
    localStorage.setItem('pycode_saved_files', JSON.stringify(files))

    await loadSavedFiles()
    const newTab: Tab = {
      name: fullPath,
      code: name.endsWith('.ipynb') ? '' : initialContent,
      cells: name.endsWith('.ipynb') ? [{ id: 'cell_default', code: '', output: '', plot: '', error: '', isRunning: false, hasRun: false, type: 'code' }] : [],
      format: name.endsWith('.ipynb') ? 'cell' : 'terminal',
      isDirty: false
    }
    setTabs(prev => {
      if (prev.some(t => t.name === fullPath)) return prev
      return [...prev, newTab]
    })
    setActiveFileName(fullPath)
    setEditorFormat(newTab.format)
    setCells(newTab.cells)
    setCode(newTab.code)
    if (newTab.format === 'terminal' && editorRef.current) {
      editorRef.current.setValue(newTab.code)
    }
    setShowNewFileInput(false)
    setFileInputName('')
    setIsSaving(false)
    triggerToast("File created successfully.", "success")
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
      const updated = prev.map(f => {
        if (f === oldF) return newF
        if (f.startsWith(oldF + '/')) {
          return newF + f.substring(oldF.length)
        }
        return f
      })
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
    
    // Reset cell execution states for Jupyter cells
    setRunningCellQueue([])
    updateCells(prev => prev.map(c => c.isRunning ? { ...c, isRunning: false, error: 'Program Terminated by User', hasRun: true } : c), false)

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
                  <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-gray-555 dark:text-gray-400 font-mono flex items-center gap-1.5 truncate">
                    <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">Saved Scripts</span>
                  </h3>
                  {currentExplorerFolder === null && (
                    <div className="flex items-center gap-1 shrink-0 animate-fade-in">
                      <button
                        onClick={() => {
                          setShowNewFileInput(prev => !prev)
                          setShowNewFolderInput(false)
                        }}
                        className="p-1.5 rounded-xl border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-all bg-canvas flex items-center justify-center shrink-0"
                        title="Create New File"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => {
                          setShowNewFolderInput(prev => !prev)
                          setShowNewFileInput(false)
                        }}
                        className="p-1.5 rounded-xl border border-hairline hover:bg-surface-soft text-gray-500 hover:text-ink cursor-pointer transition-all bg-canvas flex items-center justify-center shrink-0"
                        title="Create New Folder"
                      >
                        <FolderPlus className="w-4 h-4 text-amber-500" />
                      </button>
                    </div>
                  )}
                </div>



                {showNewFolderInput && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = folderInputName.trim()
                      if (name) {
                        const fullFolderName = currentExplorerFolder ? `${currentExplorerFolder}/${name}` : name
                        addCustomFolder(fullFolderName)
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

                {showNewFileInput && (
                  <div className="p-3.5 border border-hairline rounded-2xl bg-surface-soft space-y-3 animate-fade-in font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider font-mono">Create New File</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowNewFileInput(false)
                          setNewFileType(null)
                          setFileInputName('')
                        }}
                        className="text-gray-400 hover:text-ink cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {newFileType === null ? (
                      <div className="grid grid-cols-2 gap-2 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => setNewFileType('py')}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-hairline bg-canvas hover:border-primary hover:bg-primary/[0.03] transition-all cursor-pointer group"
                        >
                          <PythonIcon className="w-6 h-6 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-[10px] font-bold text-ink text-center">Python Script</span>
                          <span className="text-[8px] text-gray-500 font-mono">.py</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewFileType('ipynb')}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-hairline bg-canvas hover:border-amber-500 hover:bg-amber-500/[0.03] transition-all cursor-pointer group"
                        >
                          <JupyterIcon className="w-6 h-6 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-[10px] font-bold text-ink text-center">Notebook</span>
                          <span className="text-[8px] text-gray-500 font-mono">.ipynb</span>
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const name = fileInputName.trim()
                          if (name) {
                            let cleanName = name.replace(/\.(py|ipynb)$/i, '')
                            handleCreateFileExplorer(`${cleanName}.${newFileType}`)
                            setNewFileType(null)
                          }
                        }}
                        className="space-y-3 animate-fade-in"
                      >
                        <div className="relative">
                          <input
                            type="text"
                            value={fileInputName}
                            onChange={e => setFileInputName(e.target.value)}
                            placeholder="Enter name..."
                            className="w-full pr-14 px-3 py-1.5 text-xs font-mono rounded-xl border border-hairline bg-canvas text-ink outline-none focus:border-primary/50 transition-colors"
                            autoFocus
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 font-mono">
                            .{newFileType}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewFileType(null)
                              setFileInputName('')
                            }}
                            className="flex-1 py-1.5 rounded-xl border border-hairline bg-canvas hover:bg-surface-card text-[10px] font-bold text-gray-500 hover:text-ink transition-colors cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={!fileInputName.trim()}
                            className="flex-1 py-1.5 rounded-xl bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                          >
                            Create
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
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
                    <div className="space-y-2 mb-1">
                      {/* Search Subfolders inside folder */}
                      <div className="relative">
                        <input
                          type="text"
                          value={innerFolderSearch}
                          onChange={e => setInnerFolderSearch(e.target.value)}
                          placeholder="Search subfolders..."
                          className="w-full pl-7 pr-7 py-1.5 text-[11px] font-mono rounded-xl border border-hairline bg-surface-soft text-ink placeholder-gray-400 focus:outline-none focus:border-amber-400/50 transition-colors font-light"
                        />
                        <Folder className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400 pointer-events-none" />
                        {innerFolderSearch && (
                          <button
                            onClick={() => setInnerFolderSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Search Files inside folder */}
                      <div className="relative">
                        <input
                          type="text"
                          value={innerFileSearch}
                          onChange={e => setInnerFileSearch(e.target.value)}
                          placeholder={`Search files in ${currentExplorerFolder?.split('/').pop()}...`}
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
                    </div>
                  )
                )}

                <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0 relative pr-0.5">
                  {savedFiles.length === 0 ? (
                    <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 font-semibold">No saved files yet.</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-normal mt-1">Click &quot;Save&quot; in toolbar to store progress!</p>
                    </div>
                  ) : (() => {
                    const allFolders = getAllFolders()
                    const rootFiles = savedFiles.filter(f => !f.name.includes('/'))

                    if (currentExplorerFolder !== null) {
                      const prefix = `${currentExplorerFolder}/`
                      
                      // Immediate subfolders
                      const immediateSubfolders = Array.from(new Set(
                        allFolders
                          .filter(f => f.startsWith(prefix) && f !== currentExplorerFolder)
                          .map(f => {
                            const rel = f.substring(prefix.length)
                            const firstSeg = rel.split('/')[0]
                            return `${currentExplorerFolder}/${firstSeg}`
                          })
                      )).sort()

                      // Immediate subfolders — filtered by innerFolderSearch
                      const filteredImmediateSubfolders = immediateSubfolders.filter(f =>
                        f.split('/').pop()!.toLowerCase().includes(innerFolderSearch.toLowerCase())
                      )

                      // Immediate files in this folder
                      const folderFiles = savedFiles.filter(f => 
                        f.name.startsWith(prefix) && !f.name.substring(prefix.length).includes('/')
                      )
                      const filteredFolderFiles = folderFiles.filter(f => {
                        const displayName = f.name.substring(prefix.length)
                        return displayName.toLowerCase().includes(innerFileSearch.toLowerCase())
                      })

                      return (
                        <div className="space-y-3 font-sans">
                          <div className="flex items-center gap-2 mb-3 shrink-0">
                            <button
                              onClick={() => {
                                if (currentExplorerFolder.includes('/')) {
                                  setCurrentExplorerFolder(currentExplorerFolder.substring(0, currentExplorerFolder.lastIndexOf('/')))
                                } else {
                                  setCurrentExplorerFolder(null)
                                }
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={() => {
                                const parent = currentExplorerFolder.includes('/') 
                                  ? currentExplorerFolder.substring(0, currentExplorerFolder.lastIndexOf('/')) 
                                  : '__root__'
                                setActiveDragFolder(parent)
                              }}
                              onDragLeave={() => setActiveDragFolder(null)}
                              onDrop={(e) => {
                                e.preventDefault()
                                setActiveDragFolder(null)
                                const filename = e.dataTransfer.getData('text/plain')
                                const parent = currentExplorerFolder.includes('/') 
                                  ? currentExplorerFolder.substring(0, currentExplorerFolder.lastIndexOf('/')) 
                                  : null
                                handleMoveFile(filename, parent)
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                activeDragFolder === (currentExplorerFolder.includes('/') ? currentExplorerFolder.substring(0, currentExplorerFolder.lastIndexOf('/')) : '__root__')
                                  ? 'border-dashed border-primary bg-primary/5 text-primary scale-[0.98]'
                                  : 'border-hairline bg-surface-soft text-gray-600 hover:text-ink hover:bg-surface-card'
                              }`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <span className="text-xs font-extrabold text-ink font-mono truncate bg-primary/10 text-primary px-2.5 py-1 rounded-lg max-w-[120px]" title={currentExplorerFolder}>
                              {currentExplorerFolder.split('/').pop()}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              <button
                                onClick={() => {
                                  setShowNewFileInput(prev => !prev)
                                  setShowNewFolderInput(false)
                                }}
                                className="p-1.5 rounded-lg border border-hairline bg-surface-soft text-gray-500 hover:text-primary hover:bg-surface-card cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                title="Create File inside this Folder"
                              >
                                <Plus className="w-3.5 h-3.5 text-primary" />
                              </button>
                              <button
                                onClick={() => {
                                  setShowNewFolderInput(prev => !prev)
                                  setShowNewFileInput(false)
                                }}
                                className="p-1.5 rounded-lg border border-hairline bg-surface-soft text-gray-500 hover:text-amber-600 hover:bg-surface-card cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                title="Create Subfolder inside this Folder"
                              >
                                <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                              </button>
                              <button
                                onClick={() => handleDownloadFolder(currentExplorerFolder)}
                                className="p-1.5 rounded-lg border border-hairline bg-surface-soft text-gray-500 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                title="Download entire folder as ZIP"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Subfolders inside this folder */}
                          {(immediateSubfolders.length > 0) && (
                            <div className="space-y-1.5">
                              <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-mono">
                                Folders {innerFolderSearch && filteredImmediateSubfolders.length !== immediateSubfolders.length && `(${filteredImmediateSubfolders.length}/${immediateSubfolders.length})`}
                              </div>
                              {filteredImmediateSubfolders.length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic px-1 py-1">
                                  No subfolders match &ldquo;{innerFolderSearch}&rdquo;
                                </p>
                              ) : (
                                filteredImmediateSubfolders.map(folderName => (
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
                                        title={folderName}
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
                                        <span className="text-xs font-bold text-ink truncate">{folderName.split('/').pop()}</span>
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
                                ))
                              )}
                            </div>
                          )}

                          {/* Files list inside this folder */}
                          <div className="space-y-1.5">
                            {filteredFolderFiles.length === 0 && immediateSubfolders.length === 0 ? (
                              <div className="text-center py-8 px-2 border border-dashed border-hairline rounded-2xl bg-surface-soft">
                                <p className="text-[11px] text-gray-500 font-mono">
                                  {innerFileSearch ? `No files match "${innerFileSearch}"` : 'No files in this folder.'}
                                </p>
                              </div>
                            ) : (
                              <>
                                {filteredFolderFiles.length > 0 && (
                                  <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider font-mono mt-2">Files</div>
                                )}
                                {filteredFolderFiles.map((file) => {
                                  const isActive = activeFileName === file.name
                                  const isDropdownOpen = activeDropdownFile === file.name
                                  const displayName = file.name.substring(prefix.length)
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
                                        title={file.name}
                                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 pr-10 ${
                                          isActive
                                            ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                                            : 'bg-canvas border-hairline hover:border-gray-400'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 overflow-hidden w-full">
                                          {file.name.endsWith('.ipynb') ? <JupyterIcon className="w-4 h-4 shrink-0" /> : <PythonIcon className="w-4 h-4 shrink-0" />}
                                          <div className="flex flex-col overflow-hidden">
                                            <span className={`text-xs font-extrabold font-mono truncate ${isActive ? 'text-ink' : 'text-gray-800 dark:text-gray-200'}`}>{displayName}</span>
                                            <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate font-mono">{file.lastModified}</span>
                                          </div>
                                        </div>
                                      </button>

                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                                        <button
                                          title="File options"
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
                                          className="p-1 rounded-full text-gray-500 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // Main explorer view (folders & root files)
                    const filteredFolders = Array.from(new Set(
                      allFolders.map(path => path.split('/')[0])
                    )).sort().filter(folder =>
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
                                      title={folderName}
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
                                    title={file.name}
                                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-150 pr-10 ${
                                      isActive
                                        ? 'bg-surface-card border-primary text-ink shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                                        : 'bg-canvas border-hairline hover:border-gray-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 overflow-hidden w-full">
                                      {file.name.endsWith('.ipynb') ? <JupyterIcon className="w-4 h-4 shrink-0" /> : <PythonIcon className="w-4 h-4 shrink-0" />}
                                      <div className="flex flex-col overflow-hidden">
                                        <span className={`text-xs font-extrabold font-mono truncate ${isActive ? 'text-ink' : 'text-gray-800 dark:text-gray-200'}`}>{file.name}</span>
                                        <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate font-mono">{file.lastModified}</span>
                                      </div>
                                    </div>
                                  </button>

                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                                    <button
                                      title="File options"
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
                                      className="p-1 rounded-full text-gray-500 hover:text-ink hover:bg-surface-soft cursor-pointer transition-colors"
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

              {/* Save File button — always visible */}
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) {
                    setShowGuestSaveModal(true)
                  } else {
                    const activeTab = tabs.find(t => t.name === activeFileName)
                    if (activeFileName && (!activeTab || !activeTab.isNew)) {
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
                  <span>Terminal</span>
                </button>
              ) : (
                <button
                  onClick={shiftToCellFormat}
                  className="px-3.5 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                  title="Shift to Jupyter Notebook format"
                >
                  <JupyterIcon className="w-3.5 h-3.5" />
                  <span>Notebook</span>
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

          {/* Tabs Bar */}
          <div className="flex items-center justify-between border-b border-hairline bg-canvas dark:bg-[#181715] select-none shrink-0 h-10 overflow-hidden">
            <div ref={tabBarRef} className="flex items-center overflow-x-auto h-full scrollbar-none flex-1">
              {tabs
                .filter((tab) => {
                  if (editorFormat === 'cell') {
                    return tab.name.endsWith('.ipynb')
                  } else {
                    return !tab.name.endsWith('.ipynb')
                  }
                })
                .map((tab) => {
                  const isActive = tab.name === activeFileName
                  const isPy = tab.name.endsWith('.py')
                  const isIpynb = tab.name.endsWith('.ipynb')
                
                return (
                  <div
                    key={tab.name}
                    onClick={() => switchTab(tab.name)}
                    className={`group relative flex items-center gap-2 px-4 h-full border-r border-hairline/50 cursor-pointer transition-all duration-150 ${
                      isActive 
                        ? 'bg-surface-soft text-ink font-bold border-b border-b-primary' 
                        : 'text-gray-700 dark:text-gray-200 hover:text-ink hover:bg-surface-soft/40 font-medium'
                    }`}
                  >
                    {/* File Type Icon */}
                    <span className="flex items-center shrink-0">
                      {isIpynb ? (
                        <JupyterIcon className="w-4 h-4" />
                      ) : isPy ? (
                        <PythonIcon className="w-4 h-4" />
                      ) : (
                        <FileCode className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </span>
                    
                    {/* Filename */}
                    <span className="text-[11px] font-mono truncate max-w-[120px]">
                      {tab.name.split('/').pop()}
                    </span>

                    {/* Unsaved Changes Dot */}
                    {tab.isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                    )}

                    {/* Close Tab Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.name)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-hairline/65 text-gray-400 hover:text-red-500 hover:scale-125 cursor-pointer transition-all flex items-center justify-center shrink-0"
                    >
                      <X className="w-3.5 h-3.5 transition-transform" />
                    </button>
                  </div>
                )
              })}

              {/* Plus Button to Add Tab */}
              <button
                onClick={addNewTab}
                title="New file tab"
                className="px-3 h-full flex items-center justify-center text-gray-400 hover:text-ink hover:bg-surface-soft/60 cursor-pointer border-r border-hairline/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Breadcrumbs Bar */}
          {activeFileName && (
            <div className="px-4 py-2 border-b border-hairline/40 bg-surface-soft/40 text-[11px] font-mono flex items-center gap-1.5 select-none shrink-0 tracking-wider">
              <span className="uppercase font-bold text-gray-500 dark:text-gray-400">WORKSPACE</span>
              <span className="text-gray-400 dark:text-gray-650 font-bold">&gt;</span>
              {activeFileName.split('/').map((part, index, arr) => {
                const isLast = index === arr.length - 1
                return (
                  <React.Fragment key={index}>
                    <span className={isLast ? 'font-extrabold text-primary' : 'font-semibold text-gray-700 dark:text-gray-250'}>
                      {part}
                    </span>
                    {!isLast && <span className="text-gray-400 dark:text-gray-655 font-bold">&gt;</span>}
                  </React.Fragment>
                )
              })}
            </div>
          )}

          {/* Main workspace editor & console area */}
          <div className={`flex-1 min-h-0 flex ${consoleLayout === 'vertical' ? 'flex-row' : 'flex-col'}`}>
            {/* Monaco Editor / Cell Canvas */}
            <div className={`flex-1 min-h-0 min-w-0 relative select-text flex flex-col ${editorFormat === 'cell' ? 'bg-canvas overflow-y-auto' : 'bg-[#1e1e1e]'}`}>
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
                        updateCells(prev => [...prev, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false, type: 'code' }])
                        focusCellTextarea(newId)
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-card text-ink text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Code Cell
                    </button>
                    <button
                      onClick={() => {
                        const newId = `cell_${Date.now()}_${Math.random().toString(36).substring(5)}`
                        updateCells(prev => [...prev, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false, type: 'markdown' }])
                        focusCellTextarea(newId)
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-hairline bg-surface-soft hover:bg-surface-card text-ink text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Markdown Cell
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono font-bold">
                    {cells.length} Cell{cells.length > 1 ? 's' : ''}
                  </span>
                </div>
                {/* Cells */}
                <div className="space-y-4 select-text animate-fade-in">
                  <style>{`
                    [contenteditable="true"] h1 { font-size: 2.25em !important; font-weight: 800 !important; margin-top: 0.6em !important; margin-bottom: 0.35em !important; color: var(--ink) !important; line-height: 1.35 !important; }
                    .cell-markdown-container h1 { font-size: 1.5em !important; font-weight: 800 !important; margin-top: 0.5em !important; margin-bottom: 0.3em !important; color: var(--ink) !important; line-height: 1.35 !important; }
                    .cell-markdown-container h2, [contenteditable="true"] h2 { font-size: 1.75em !important; font-weight: 700 !important; margin-top: 0.5em !important; margin-bottom: 0.3em !important; color: var(--ink) !important; line-height: 1.35 !important; }
                    .cell-markdown-container h3, [contenteditable="true"] h3 { font-size: 1.4em !important; font-weight: 700 !important; margin-top: 0.4em !important; margin-bottom: 0.25em !important; color: var(--ink) !important; line-height: 1.35 !important; }
                    .cell-markdown-container h4, [contenteditable="true"] h4 { font-size: 1.2em !important; font-weight: 700 !important; margin-top: 0.35em !important; margin-bottom: 0.2em !important; color: var(--ink) !important; line-height: 1.35 !important; }
                    .cell-markdown-container h5, [contenteditable="true"] h5 { font-size: 0.95em !important; font-weight: 700 !important; margin-top: 0.3em !important; margin-bottom: 0.15em !important; color: var(--ink) !important; }
                    .cell-markdown-container h6, [contenteditable="true"] h6 { font-size: 0.85em !important; font-weight: 700 !important; margin-top: 0.25em !important; margin-bottom: 0.1em !important; color: var(--muted) !important; }
                    .cell-markdown-container p, [contenteditable="true"] p { margin-bottom: 0.5em !important; line-height: 1.6 !important; }
                    .cell-markdown-container ul, [contenteditable="true"] ul { list-style-type: disc !important; padding-left: 1.25em !important; margin-bottom: 0.5em !important; }
                    .cell-markdown-container li, [contenteditable="true"] li { margin-bottom: 0.2em !important; }
                    .cell-markdown-container strong, [contenteditable="true"] strong { font-weight: 700 !important; }
                    .cell-markdown-container em, [contenteditable="true"] em { font-style: italic !important; }
                    .monaco-hover, .monaco-editor-hover { pointer-events: none !important; }
                  `}</style>
                {cells.map((cell, index) => {
                  const isCellRunning = cell.isRunning || runningCellQueue.includes(cell.id)
                  const isActive = activeCellId === cell.id
                  return (
                    <div
                      key={cell.id}
                      id={`cell_container_${cell.id}`}
                      onClick={() => setActiveCellId(cell.id)}
                      className="group relative flex items-start gap-4 py-2"
                    >
                      {/* Left Gutter: Play Button / Spinner / Status (Tick/Cross) */}
                      <div className="w-8 shrink-0 flex flex-col items-center justify-start pt-2 select-none">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          {cell.type !== 'markdown' ? (
                            isCellRunning ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleTerminateCode() }}
                                className="relative w-8 h-8 flex items-center justify-center cursor-pointer group/stop"
                                title="Stop Execution"
                              >
                                {/* Outer rotating circle loader */}
                                <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                                {/* Inner stop square */}
                                <Square className="w-2.5 h-2.5 fill-primary text-primary transition-transform group-hover/stop:scale-110" />
                              </button>
                            ) : (
                              <>
                                {/* Play button shown on hover (no background circle, no brown fill, simple white/dark triangle) */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); runCell(cell.id) }}
                                  disabled={pyodideState !== 'ready'}
                                  className="absolute inset-0 hidden group-hover:flex items-center justify-center text-gray-500 hover:text-[#cc785c] dark:hover:text-[#cc785c] hover:scale-110 transition-all z-10 cursor-pointer disabled:opacity-30"
                                  title="Run Cell (Shift+Enter)"
                                >
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </button>
                                
                                {/* Status Indicator (Check / X / brackets) when not hovered */}
                                <div className="flex items-center justify-center group-hover:hidden transition-all duration-150">
                                  {cell.hasRun ? (
                                    cell.error ? (
                                      <span className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 font-bold text-xs" title="Execution Error">✕</span>
                                    ) : (
                                      <span className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center text-green-500 font-bold text-xs" title="Ran Successfully">✓</span>
                                    )
                                  ) : (
                                    <span className="text-[10px] font-mono text-muted/40 font-bold">[ ]</span>
                                  )}
                                </div>
                              </>
                            )
                          ) : (
                            !cell.code.trim() ? (
                              <span className="text-[9px] font-sans font-bold text-muted/30 pt-0.5">TEXT</span>
                            ) : null
                          )}
                        </div>
                      </div>

                      {/* Right side wrapper: Code editor/output/pills */}
                      <div className="flex-1 min-w-0 flex flex-col relative">
                        {/* Floating Toolbar above the cell (overlapping top border) */}
                        <div className={`absolute -top-3.5 right-4 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-100' : ''} transition-all duration-200`}>
                          <div className={`flex items-center rounded-lg border shadow-md px-1.5 py-1 gap-1.5 overflow-hidden ${
                            theme === 'dark'
                              ? 'border-[#3a3835] bg-[#2d3039] text-white'
                              : 'border-hairline bg-white text-slate-700'
                          }`}>
                            {/* Move up */}
                            <button
                              onClick={(e) => { e.stopPropagation(); moveCellUp(index) }}
                              disabled={index === 0}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-white/10 text-white disabled:opacity-20'
                                  : 'hover:bg-slate-100 text-slate-900 disabled:opacity-20'
                              }`}
                              title="Move cell up"
                            >
                              <ChevronUp className="w-4.5 h-4.5" />
                            </button>
                            {/* Move down */}
                            <button
                              onClick={(e) => { e.stopPropagation(); moveCellDown(index) }}
                              disabled={index === cells.length - 1}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-white/10 text-white disabled:opacity-20'
                                  : 'hover:bg-slate-100 text-slate-900 disabled:opacity-20'
                              }`}
                              title="Move cell down"
                            >
                              <ChevronDown className="w-4.5 h-4.5" />
                            </button>
                            <div className={`w-[1px] h-3.5 mx-0.5 ${
                              theme === 'dark' ? 'bg-white/20' : 'bg-slate-200'
                            }`}></div>
                            {/* Delete */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (cells.length === 1) {
                                  updateCells([{ id: 'cell_default', code: '', output: '', plot: '', error: '', type: 'code' }])
                                } else {
                                  updateCells(prev => prev.filter(c => c.id !== cell.id))
                                }
                              }}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-white/10 text-white'
                                  : 'hover:bg-slate-100 text-slate-900'
                              }`}
                              title="Delete cell"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Cell Card Box - transparent and borderless for inactive markdown cells to display as page body text */}
                        <div
                          className={`relative w-full rounded-lg transition-all duration-200 overflow-visible ${
                            cell.type === 'markdown' && !isActive
                              ? 'border-none bg-transparent shadow-none'
                              : theme === 'dark' 
                                ? `bg-[#1e1e1e] border ${isActive ? 'border-[#cc785c] shadow-[0_2px_10px_rgba(204,120,92,0.1)]' : 'border-[#2d2a26]'}`
                                : `bg-white border ${isActive ? 'border-[#cc785c] shadow-[0_2px_10px_rgba(204,120,92,0.1)]' : 'border-hairline'}`
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Rich Text Formatting Toolbar for active Markdown Cells */}
                          {cell.type === 'markdown' && isActive && (
                            <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-hairline dark:border-[#2d2a26] bg-[#f9f8f6] dark:bg-[#1a1917] select-none rounded-t-lg">
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('bold'); checkActiveStyles() }}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  activeStyles.bold
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light font-bold'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="Bold"
                              >
                                <Bold className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('italic'); checkActiveStyles() }}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  activeStyles.italic
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light font-bold'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="Italic"
                              >
                                <Italic className="w-4 h-4" />
                              </button>
                              <div className="w-[1px] h-3.5 bg-hairline dark:bg-[#2d2a26] mx-1"></div>
                              
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h1'); checkActiveStyles() }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors font-extrabold text-[10px] tracking-tight ${
                                  activeStyles.h1
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="H1 heading"
                              >
                                H1
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h2'); checkActiveStyles() }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold text-[10px] tracking-tight ${
                                  activeStyles.h2
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="H2 heading"
                              >
                                H2
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h3'); checkActiveStyles() }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold text-[10px] tracking-tight ${
                                  activeStyles.h3
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="H3 heading"
                              >
                                H3
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h4'); checkActiveStyles() }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold text-[10px] tracking-tight ${
                                  activeStyles.h4
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="H4 heading"
                              >
                                H4
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h5'); checkActiveStyles() }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold text-[10px] tracking-tight ${
                                  activeStyles.h5
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="H5 heading"
                              >
                                H5
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h6'); checkActiveStyles() }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold text-[10px] tracking-tight ${
                                  activeStyles.h6
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="H6 heading"
                              >
                                H6
                              </button>
                              <div className="w-[1px] h-3.5 bg-hairline dark:bg-[#2d2a26] mx-1"></div>
                              
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('ul'); checkActiveStyles() }}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  activeStyles.ul
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light font-bold'
                                    : 'hover:bg-surface-soft dark:hover:bg-white/5 text-muted hover:text-ink'
                                }`}
                                title="Bulleted List"
                              >
                                <List className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Clip wrapper inside card */}
                          <div className="w-full overflow-hidden rounded-lg">
                            {cell.type === 'markdown' ? (
                              !isActive ? (
                                <div
                                  className={`w-full min-h-[48px] text-sm select-text cursor-text ${
                                    !cell.code.trim() 
                                      ? 'text-muted/50 italic border border-dashed border-hairline/60 rounded-lg bg-surface-soft/10 px-4 py-3' 
                                      : 'text-ink px-4 py-2'
                                  }`}
                                  onClick={() => setActiveCellId(cell.id)}
                                >
                                  {cell.code.trim() ? renderMarkdown(cell.code) : "Click to write text..."}
                                </div>
                              ) : (
                                <MarkdownCellEditor
                                  code={cell.code}
                                  cellId={cell.id}
                                  onSave={(md, run) => {
                                    updateCells(prev => prev.map(c => c.id === cell.id ? { ...c, code: md, ...(run ? { hasRun: true } : {}) } : c), false)
                                    if (run) {
                                      setActiveCellId(null)
                                    }
                                  }}
                                  onSelect={(top, left, visible) => {
                                    setSelectionBubble({
                                      visible,
                                      top,
                                      left,
                                      cellId: cell.id
                                    })
                                  }}
                                  onCheckStyles={checkActiveStyles}
                                />
                              )
                            ) : (
                              isClient && !isReordering ? (
                                <Editor
                                  height={`${cellHeights[cell.id] || Math.max(52, (cell.code || '').split('\n').length * 22 + 24)}px`}
                                  language="python"
                                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                  value={cell.code}
                                  onChange={(val) => {
                                    if (ignoreChangeRef.current) return
                                    updateCells(prev => prev.map(c => c.id === cell.id ? { ...c, code: val || '' } : c))
                                  }}
                                  onMount={(editor, monacoInstance) => {
                                    activeEditorRef.current = editor
                                    editor.onDidFocusEditorText(() => setActiveCellId(cell.id))
                                    
                                    const updateHeight = () => {
                                      const h = Math.max(52, editor.getContentHeight())
                                      setCellHeights(prev => {
                                        if (prev[cell.id] === h) return prev
                                        return { ...prev, [cell.id]: h }
                                      })
                                    }
                                    editor.onDidContentSizeChange(updateHeight)
                                    updateHeight()

                                    editor.addCommand(monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter, () => {
                                      runCell(cell.id)
                                    })
                                    // Disable Monaco's default Find (Ctrl+F) and Replace (Ctrl+H) in notebook cells
                                    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyF, () => {
                                      // Do nothing
                                    })
                                    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyH, () => {
                                      // Do nothing
                                    })
                                  }}
                                  options={{
                                    fontSize: 13.5,
                                    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                                    lineHeight: 22,
                                    minimap: { enabled: false },
                                    lineNumbers: 'off',
                                    folding: false,
                                    lineDecorationsWidth: 16,
                                    lineNumbersMinChars: 0,
                                    scrollBeyondLastLine: false,
                                    wordWrap: 'on',
                                    automaticLayout: true,
                                    padding: { top: 12, bottom: 12 },
                                    find: { seedSearchStringFromSelection: 'never', autoFindInSelection: 'never' },
                                    scrollbar: { vertical: 'hidden', horizontal: 'hidden', handleMouseWheel: false },
                                    overviewRulerBorder: false,
                                    overviewRulerLanes: 0,
                                    hideCursorInOverviewRuler: true,
                                    contextmenu: false,
                                    readOnly: isCellRunning,
                                    renderLineHighlight: 'none',
                                    fixedOverflowWidgets: true,
                                  }}
                                />
                              ) : (
                                <div
                                  className="bg-slate-50 dark:bg-zinc-900 rounded-lg"
                                  style={{ height: `${cellHeights[cell.id] || Math.max(52, (cell.code || '').split('\n').length * 22 + 24)}px` }}
                                />
                              )
                            )}
                          </div>
                        </div>

                        {/* Cell Outputs - Rendered flat on the canvas background directly below cell box */}
                        {cell.type !== 'markdown' && (cell.output || cell.error || cell.plot) && (
                          <div
                            id={`cell_output_${cell.id}`}
                            className="relative py-2 mt-1 select-text group/output"
                          >
                            {/* Clear output button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); clearCellOutput(cell.id) }}
                              className="absolute top-1 right-2 z-10 p-1 rounded-md text-muted/40 hover:text-muted hover:bg-surface-soft dark:hover:bg-white/5 opacity-0 group-hover/output:opacity-100 transition-all cursor-pointer"
                              title="Clear output"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            
                            {/* Monospace output text block */}
                            <div className="font-mono text-xs space-y-2 pl-1 pr-6">
                              {cell.output && (
                                <pre className="whitespace-pre-wrap text-ink dark:text-gray-200 leading-relaxed font-mono">{cell.output}</pre>
                              )}
                              {cell.error && (
                                <pre className="whitespace-pre-wrap text-red-500 dark:text-red-400 bg-red-500/5 dark:bg-red-500/5 p-2 rounded-lg leading-relaxed font-mono">{cell.error}</pre>
                              )}
                              {cell.plot && (
                                <div className="relative inline-block group/plot mt-1">
                                  <img
                                    src={cell.plot}
                                    alt="Plot"
                                    onClick={() => setFullscreenPlotUrl(cell.plot)}
                                    className="max-h-[360px] object-contain rounded-lg border border-hairline/80 dark:border-[#2a2927] cursor-zoom-in bg-white p-2 hover:opacity-98 shadow-sm transition-all"
                                  />
                                  <button
                                    onClick={() => setFullscreenPlotUrl(cell.plot)}
                                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white opacity-0 group-hover/plot:opacity-100 transition-opacity cursor-pointer shadow-md"
                                    title="Fullscreen View"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Buttons below the cell (and below outputs) - visible on hover or active */}
                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pl-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const newId = `cell_${Date.now()}_${Math.random().toString(36).substring(5)}`
                              updateCells(prev => {
                                const next = [...prev]
                                next.splice(index + 1, 0, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false, type: 'code' })
                                return next
                              })
                              focusCellTextarea(newId)
                            }}
                            className="px-3.5 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 bg-transparent hover:bg-surface-soft dark:hover:bg-white/5 border border-hairline dark:border-[#3a3835] rounded-full shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            Code
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const newId = `cell_${Date.now()}_${Math.random().toString(36).substring(5)}`
                              updateCells(prev => {
                                const next = [...prev]
                                next.splice(index + 1, 0, { id: newId, code: '', output: '', plot: '', error: '', isRunning: false, type: 'markdown' })
                                return next
                              })
                              focusCellTextarea(newId)
                            }}
                            className="px-3.5 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 bg-transparent hover:bg-surface-soft dark:hover:bg-white/5 border border-hairline dark:border-[#3a3835] rounded-full shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            Markdown
                          </button>
                        </div>

                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            ) : (
              isClient ? (
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={code}
                  onChange={(val) => {
                    if (ignoreChangeRef.current) return
                    setCode(val || '')
                    setTabs(prev => prev.map(t => t.name === activeFileName ? { ...t, code: val || '', isDirty: true } : t))
                  }}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    readOnly: isRunning,
                    fixedOverflowWidgets: true,
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
              ) : (
                <div className="w-full h-full bg-slate-50 dark:bg-zinc-900 rounded-lg animate-pulse" />
              )
            )}
          </div>

          {/* Resizer Handle Bar */}
          {editorFormat !== 'cell' && (
            <div 
              onMouseDown={handleMouseDown}
              className={`bg-hairline hover:bg-primary/50 transition-colors duration-200 select-none z-30 relative group ${
                consoleLayout === 'vertical' 
                  ? 'w-2 h-full cursor-ew-resize shrink-0' 
                  : 'h-2 w-full cursor-ns-resize shrink-0'
              }`} 
            >
              {/* Thicker invisible hover area to make resizing extremely easy and prevent overlap issues */}
              <div className={`absolute z-40 ${
                consoleLayout === 'vertical'
                  ? 'inset-y-0 -left-1.5 -right-1.5 cursor-ew-resize'
                  : 'inset-x-0 -top-1.5 -bottom-1.5 cursor-ns-resize'
              }`} />
            </div>
          )}

          {/* Console Output Panel */}
          {editorFormat !== 'cell' && (
            <div 
              style={
                consoleLayout === 'vertical'
                  ? { width: `${terminalWidth}px` }
                  : { height: `${terminalHeight}px` }
              } 
              className={`flex flex-col bg-canvas shrink-0 overflow-hidden ${
                consoleLayout === 'vertical'
                  ? 'border-l border-t-0 border-hairline h-full'
                  : 'border-t border-hairline w-full'
              }`}
            >
              <div className="flex border-b border-hairline bg-surface-soft px-4 py-2 justify-between items-center select-none w-full">
                <span className="text-[10px] uppercase font-mono font-extrabold text-gray-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  Console Terminal
                </span>
                
                {/* Control buttons */}
                <div className="flex items-center gap-2">
                  {/* Minimize button */}
                  <button
                    onClick={minimizeTerminal}
                    className="px-2.5 py-1 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Minimize2 className="w-3 h-3 text-primary" />
                    <span>Minimize</span>
                  </button>
                  
                  {/* Maximize button */}
                  <button
                    onClick={maximizeTerminal}
                    className="px-2.5 py-1 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Maximize2 className="w-3 h-3 text-primary" />
                    <span>Maximize</span>
                  </button>
                  
                  <div className="w-[1px] h-3 bg-hairline mx-1" />
                  
                  {/* Format Layout Toggle Button */}
                  <button
                    onClick={() => {
                      setTerminalHeight(240)
                      setTerminalWidth(480)
                      if (consoleLayout === 'horizontal') {
                        setConsoleLayout('vertical')
                        window.dispatchEvent(new CustomEvent('pycode-sidebar-collapse', { detail: { collapsed: true } }))
                      } else {
                        setConsoleLayout('horizontal')
                        window.dispatchEvent(new CustomEvent('pycode-sidebar-collapse', { detail: { collapsed: false } }))
                      }
                      setTimeout(() => {
                        if (editorRef.current) editorRef.current.layout()
                      }, 100)
                    }}
                    className="px-2.5 py-1 rounded-full border border-hairline bg-canvas hover:bg-surface-soft text-ink text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  >
                    {consoleLayout === 'horizontal' ? (
                      <>
                        <Columns className="w-3 h-3 text-primary" />
                        <span>Vertical</span>
                      </>
                    ) : (
                      <>
                        <Rows className="w-3 h-3 text-primary" />
                        <span>Horizontal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-body leading-relaxed bg-canvas select-text">
                {consoleOutput ? (
                  <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
                ) : (
                  <p className="text-gray-400 font-normal italic">Write Python code and click Run Code to execute and print outputs here...</p>
                )}
              </div>
            </div>
          )}
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
                  <p className="text-xs text-gray-500 font-normal leading-relaxed mt-0.5">
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
                  <p className="text-xs text-gray-500 font-normal">Initializing dataset preview...</p>
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
        const allFolders = getAllFolders()
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-canvas border border-hairline rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
              <h3 className="text-xs uppercase font-mono font-extrabold text-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editorFormat === 'cell' ? 'Save Notebook' : 'Save Code Script'}
              </h3>
              <p className="text-sm font-medium text-ink">
                Configure path and filename to save this {editorFormat === 'cell' ? 'notebook' : 'script'} in your browser workspace:
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-mono">File Name</label>
                  <input
                    type="text"
                    value={saveFileName}
                    onChange={(e) => setSaveFileName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-mono text-ink outline-none focus:border-primary transition-colors"
                    placeholder={editorFormat === 'cell' ? "e.g. solution.ipynb" : "e.g. solution.py"}
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
                        
                        {allFolders.map(folder => {
                          const depth = folder.split('/').length - 1
                          const displayName = folder.split('/').pop()
                          return (
                            <button
                              key={folder}
                              type="button"
                              onClick={() => {
                                setSaveToFolder(folder)
                                setShowNewFolderSaveInput(false)
                                setNewSaveFolderName('')
                                setShowSaveDropdownPanel(false)
                              }}
                              style={{ paddingLeft: `${14 + depth * 12}px` }}
                              className={`w-full flex items-center gap-2.5 py-2 px-3.5 text-xs font-medium text-left hover:bg-surface-soft ${saveToFolder === folder ? 'text-primary bg-primary/5' : 'text-ink'} transition-colors cursor-pointer`}
                            >
                              <Folder className={`w-3.5 h-3.5 shrink-0 ${depth > 0 ? 'text-amber-400' : 'text-amber-500'}`} />
                              <span className="truncate">{displayName}</span>
                            </button>
                          )
                        })}

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
        const allFolders = getAllFolders()
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
                        
                        {allFolders.map(folder => {
                          const depth = folder.split('/').length - 1
                          const displayName = folder.split('/').pop()
                          return (
                            <button
                              key={folder}
                              type="button"
                              onClick={() => {
                                setMoveToFolder(folder)
                                setShowNewFolderMoveInput(false)
                                setNewMoveFolderName('')
                                setShowMoveDropdownPanel(false)
                              }}
                              style={{ paddingLeft: `${14 + depth * 12}px` }}
                              className={`w-full flex items-center gap-2.5 py-2 px-3.5 text-xs font-medium text-left hover:bg-surface-soft ${moveToFolder === folder ? 'text-primary bg-primary/5' : 'text-ink'} transition-colors cursor-pointer`}
                            >
                              <Folder className={`w-3.5 h-3.5 shrink-0 ${depth > 0 ? 'text-amber-400' : 'text-amber-500'}`} />
                              <span className="truncate">{displayName}</span>
                            </button>
                          )
                        })}

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
              <p className="text-xs text-gray-600 dark:text-gray-400 font-normal leading-relaxed">
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
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-ink hover:bg-surface-soft rounded-xl transition-colors cursor-pointer text-left"
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
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-ink hover:bg-surface-soft rounded-xl transition-colors cursor-pointer text-left"
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
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-ink hover:bg-surface-soft rounded-xl transition-colors cursor-pointer text-left"
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

      {/* Unsaved Changes Close Tab Confirmation Modal Dialog */}
      {tabConfirmClose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-canvas border border-hairline rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
              <Info className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-ink">Unsaved Changes</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                You have unsaved changes in <span className="font-mono text-primary font-bold">{tabConfirmClose}</span>. Are you sure you want to close it?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTabConfirmClose(null)}
                className="flex-1 py-2 rounded-full border border-hairline bg-canvas text-gray-500 hover:text-ink hover:bg-surface-soft text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetName = tabConfirmClose
                  setTabConfirmClose(null)
                  closeTab(targetName, true)
                }}
                className="flex-1 py-2 rounded-full bg-amber-550 hover:bg-amber-650 text-white text-xs font-extrabold cursor-pointer transition-all shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
              >
                Close Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Plot Zoom Modal Overlay */}
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

      {/* Selection Floating Formatting Bubble Toolbar (MS Word Style selection popup) */}
      {selectionBubble.visible && (
        <div
          className={`fixed z-50 flex items-center gap-1.5 rounded-lg border shadow-xl px-2 py-1 text-xs select-none animate-scale-in ${
            theme === 'dark'
              ? 'border-[#3a3835] bg-[#2d3039] text-white'
              : 'border-hairline bg-white text-slate-700'
          }`}
          style={{
            top: `${selectionBubble.top}px`,
            left: `${selectionBubble.left}px`,
            transform: 'translateX(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('bold'); checkActiveStyles() }}
            className={`p-1 rounded cursor-pointer transition-colors ${
              activeStyles.bold
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light font-bold'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('italic'); checkActiveStyles() }}
            className={`p-1 rounded cursor-pointer transition-colors ${
              activeStyles.italic
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light font-bold'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className={`w-[1px] h-3.5 mx-0.5 ${theme === 'dark' ? 'bg-white/20' : 'bg-slate-200'}`}></div>
          
          {/* Heading size tags (H1-H6 headings changing font sizes in Markdown) */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h1'); checkActiveStyles() }}
            className={`px-1 py-0.5 rounded cursor-pointer font-bold text-[10px] tracking-tighter ${
              activeStyles.h1
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="H1 heading"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h2'); checkActiveStyles() }}
            className={`px-1 py-0.5 rounded cursor-pointer font-bold text-[10px] tracking-tighter ${
              activeStyles.h2
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="H2 heading"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h3'); checkActiveStyles() }}
            className={`px-1 py-0.5 rounded cursor-pointer font-bold text-[10px] tracking-tighter ${
              activeStyles.h3
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="H3 heading"
          >
            H3
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h4'); checkActiveStyles() }}
            className={`px-1 py-0.5 rounded cursor-pointer font-bold text-[10px] tracking-tighter ${
              activeStyles.h4
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="H4 heading"
          >
            H4
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h5'); checkActiveStyles() }}
            className={`px-1 py-0.5 rounded cursor-pointer font-bold text-[10px] tracking-tighter ${
              activeStyles.h5
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="H5 heading"
          >
            H5
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyContentEditableFormat('h6'); checkActiveStyles() }}
            className={`px-1 py-0.5 rounded cursor-pointer font-bold text-[10px] tracking-tighter ${
              activeStyles.h6
                ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light'
                : theme === 'dark' ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="H6 heading"
          >
            H6
          </button>
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

