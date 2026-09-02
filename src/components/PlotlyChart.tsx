'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ExternalLink, Maximize2, RefreshCw, Download } from 'lucide-react'

interface PlotlyChartProps {
  dataJson: string
  height?: number | string
  className?: string
  isDark?: boolean
  onExpandFullscreen?: () => void
}

declare global {
  interface Window {
    Plotly?: any
  }
}

let plotlyLoadPromise: Promise<any> | null = null

export function loadPlotlyLibrary(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject()
  if (window.Plotly) return Promise.resolve(window.Plotly)

  if (!plotlyLoadPromise) {
    plotlyLoadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('plotly-cdn-script')
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Plotly))
        return
      }
      const script = document.createElement('script')
      script.id = 'plotly-cdn-script'
      script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js'
      script.async = true
      script.onload = () => resolve(window.Plotly)
      script.onerror = (e) => reject(e)
      document.head.appendChild(script)
    })
  }

  return plotlyLoadPromise
}

export function openPlotlyInNewTab(jsonStr: string) {
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PyCode — Interactive Visualization</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0e1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #plot-header {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: #161b22;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: -0.01em;
    }
    .badge {
      font-size: 11px;
      padding: 2px 10px;
      background: rgba(14, 165, 233, 0.2);
      color: #38bdf8;
      border-radius: 999px;
      font-weight: 600;
      font-family: monospace;
    }
    #plot-container {
      width: 100vw;
      height: calc(100vh - 48px);
    }
  </style>
</head>
<body>
  <div id="plot-header">
    <div class="brand">
      <span>PyCode Plotly Canvas</span>
      <span class="badge">Interactive</span>
    </div>
    <div style="font-size: 12px; color: #8b949e;">
      Zoom & Pan (drag / scroll) • Hover for data tooltips • Click legend items to toggle traces
    </div>
  </div>
  <div id="plot-container"></div>
  <script>
    const data = ${JSON.stringify(parsed.data || [])};
    const layout = ${JSON.stringify({
      ...parsed.layout,
      autosize: true,
      paper_bgcolor: '#0e1117',
      plot_bgcolor: '#0e1117',
      font: { color: '#e6edf3', family: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }
    })};
    const config = { responsive: true, displayModeBar: true, displaylogo: false };
    Plotly.newPlot('plot-container', data, layout, config);
    window.addEventListener('resize', () => Plotly.Plots.resize('plot-container'));
  </script>
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch (err) {
    console.error('Failed to open plot in new tab:', err)
  }
}

export default function PlotlyChart({
  dataJson,
  height = 420,
  className = '',
  isDark = true,
  onExpandFullscreen
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function renderChart() {
      try {
        setLoading(true)
        setError(null)
        const Plotly = await loadPlotlyLibrary()
        if (cancelled || !containerRef.current) return

        const parsed = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson

        const layoutTheme = {
          ...parsed.layout,
          autosize: true,
          paper_bgcolor: isDark ? 'rgba(0,0,0,0)' : '#ffffff',
          plot_bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          font: {
            color: isDark ? '#e6edf3' : '#1e293b',
            family: 'Inter, system-ui, sans-serif',
            size: 11
          }
        }

        const config = {
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['sendDataToCloud']
        }

        await Plotly.newPlot(containerRef.current, parsed.data || [], layoutTheme, config)
        setLoading(false)
      } catch (err: any) {
        console.error('[PlotlyChart] Render error:', err)
        if (!cancelled) {
          setError(err.message || 'Failed to render Plotly chart')
          setLoading(false)
        }
      }
    }

    renderChart()

    // Handle container resize
    const observer = new ResizeObserver(() => {
      if (containerRef.current && window.Plotly) {
        try {
          window.Plotly.Plots.resize(containerRef.current)
        } catch (e) {}
      }
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      cancelled = true
      observer.disconnect()
      if (containerRef.current && window.Plotly) {
        try {
          window.Plotly.purge(containerRef.current)
        } catch (e) {}
      }
    }
  }, [dataJson, isDark])

  return (
    <div className={`relative flex flex-col w-full rounded-xl overflow-hidden border border-hairline/80 bg-surface-soft/30 dark:bg-[#121318] ${className}`}>
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-hairline/60 bg-surface-soft/60 dark:bg-[#16181f] text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Plotly Interactive Chart</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openPlotlyInNewTab(dataJson)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono text-gray-500 hover:text-ink hover:bg-surface-soft dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Open Interactive Plot in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Tab</span>
          </button>
          {onExpandFullscreen && (
            <button
              onClick={onExpandFullscreen}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono text-gray-500 hover:text-ink hover:bg-surface-soft dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Expand Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Plot Container */}
      <div className="relative w-full" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/40 backdrop-blur-xs z-10">
            <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span>Rendering interactive chart...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-red-400 font-mono">
            {error}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
