'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Camera, ZoomIn, Move, RotateCcw, ExternalLink, Maximize2, RefreshCw, X } from 'lucide-react'

interface PlotlyChartProps {
  dataJson: string
  height?: number | string
  className?: string
  isDark?: boolean
  hideHeader?: boolean
  title?: string
  onClose?: () => void
  onExpandFullscreen?: () => void
}

declare global {
  interface Window {
    Plotly?: any
    require?: any
    define?: any
  }
}

let plotlyLoadPromise: Promise<any> | null = null

export function loadPlotlyLibrary(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'))
  const win = window as any
  if (win.Plotly && typeof win.Plotly.newPlot === 'function') {
    return Promise.resolve(win.Plotly)
  }

  if (!plotlyLoadPromise) {
    plotlyLoadPromise = (async () => {
      if (win.Plotly && typeof win.Plotly.newPlot === 'function') {
        return win.Plotly
      }

      // 1. Check if Monaco's AMD loader already registered Plotly
      if (typeof win.require === 'function' && typeof win.define === 'function') {
        try {
          const amdMod = await new Promise<any>((res) => {
            try {
              win.require(['Plotly'], (p: any) => res(p), () => res(null))
            } catch {
              res(null)
            }
          })
          const resolved = amdMod?.newPlot ? amdMod : amdMod?.default
          if (resolved && typeof resolved.newPlot === 'function') {
            win.Plotly = resolved
            return win.Plotly
          }
        } catch (e) {}
      }

      // 2. Fetch CDN script and evaluate with shadowed define
      // This guarantees Monaco's global `define` cannot intercept Plotly's UMD wrapper
      try {
        const res = await fetch('https://cdn.plot.ly/plotly-2.35.2.min.js')
        if (res.ok) {
          const code = await res.text()
          const runner = new Function('define', code)
          runner.call(win, undefined)

          if (win.Plotly && typeof win.Plotly.newPlot === 'function') {
            return win.Plotly
          }
        }
      } catch (fetchErr) {
        console.warn('[PlotlyChart] Fetch evaluation fallback:', fetchErr)
      }

      // 3. Fallback: DOM script element with temporary window.define override
      return new Promise<any>((resolve, reject) => {
        if (win.Plotly && typeof win.Plotly.newPlot === 'function') {
          return resolve(win.Plotly)
        }

        const savedDefine = win.define
        try {
          win.define = undefined
        } catch (e) {}

        const script = document.createElement('script')
        script.id = 'plotly-cdn-script'
        script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js'
        script.async = true

        const cleanup = () => {
          if (savedDefine && !win.define) {
            try {
              win.define = savedDefine
            } catch (e) {}
          }
        }

        script.onload = () => {
          cleanup()
          if (win.Plotly && typeof win.Plotly.newPlot === 'function') {
            resolve(win.Plotly)
          } else {
            reject(new Error('Plotly script loaded but window.Plotly is not accessible'))
          }
        }

        script.onerror = (err) => {
          cleanup()
          reject(err)
        }

        document.head.appendChild(script)
      })
    })().catch((err) => {
      plotlyLoadPromise = null // allow retry on error
      throw err
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
      background: #181715;
      color: #faf9f5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #plot-header {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-bottom: 1px solid #2d2b28;
      background: #1f1e1b;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 13px;
      color: #faf9f5;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #cc785c;
    }
    .tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      background: #252320;
      border: 1px solid #2d2b28;
      color: #a09d96;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .btn:hover {
      background: #2d2b28;
      color: #faf9f5;
    }
    .btn.primary {
      background: rgba(204, 120, 92, 0.15);
      border-color: rgba(204, 120, 92, 0.35);
      color: #cc785c;
    }
    .btn.primary:hover {
      background: rgba(204, 120, 92, 0.25);
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
      <span class="dot"></span>
      <span>PyCode Visualization Canvas</span>
    </div>
    <div class="tools">
      <button class="btn" onclick="Plotly.relayout('plot-container', { dragmode: 'zoom' })">Box Zoom</button>
      <button class="btn" onclick="Plotly.relayout('plot-container', { dragmode: 'pan' })">Pan</button>
      <button class="btn" onclick="Plotly.relayout('plot-container', { 'xaxis.autorange': true, 'yaxis.autorange': true })">Reset View</button>
      <button class="btn primary" onclick="Plotly.downloadImage('plot-container', { format: 'png', filename: 'plot', width: 1200, height: 750 })">Download PNG</button>
    </div>
  </div>
  <div id="plot-container"></div>
  <script>
    const parsedData = ${JSON.stringify(parsed.data || [])};
    const userLayout = ${JSON.stringify(parsed.layout || {})};
    const hasLegend = parsedData.some(d => d.showlegend !== false && (d.name || userLayout.showlegend));
    const layout = {
      ...userLayout,
      autosize: true,
      paper_bgcolor: '#181715',
      plot_bgcolor: '#1f1e1b',
      font: { color: '#faf9f5', family: 'Inter, system-ui, sans-serif', size: 11 },
      margin: {
        l: userLayout.margin?.l ?? 60,
        r: userLayout.margin?.r ?? (hasLegend ? 180 : 50),
        t: userLayout.margin?.t ?? 50,
        b: userLayout.margin?.b ?? 50,
        pad: 4
      },
      xaxis: {
        ...userLayout.xaxis,
        gridcolor: '#2d2b28',
        zerolinecolor: '#3d3a36',
        tickfont: { color: '#8e8b82' }
      },
      yaxis: {
        ...userLayout.yaxis,
        gridcolor: '#2d2b28',
        zerolinecolor: '#3d3a36',
        tickfont: { color: '#8e8b82' }
      },
      legend: {
        ...userLayout.legend,
        x: 1.02,
        xanchor: 'left',
        y: 0.98,
        yanchor: 'top',
        bgcolor: 'rgba(31, 30, 27, 0.85)',
        bordercolor: '#2d2b28',
        borderwidth: 1,
        font: { size: 11, color: '#a09d96' }
      }
    };
    const config = {
      responsive: true,
      displayModeBar: false,
      displaylogo: false
    };
    Plotly.newPlot('plot-container', parsedData, layout, config);
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
  height = 440,
  className = '',
  isDark = true,
  hideHeader = false,
  title = 'Interactive Visualization',
  onClose,
  onExpandFullscreen
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<'zoom' | 'pan'>('zoom')

  const handleDownloadPNG = () => {
    if (containerRef.current && window.Plotly?.downloadImage) {
      window.Plotly.downloadImage(containerRef.current, {
        format: 'png',
        filename: 'pycode_visualization',
        height: 800,
        width: 1200
      })
    }
  }

  const handleResetAxes = () => {
    if (containerRef.current && window.Plotly?.relayout) {
      window.Plotly.relayout(containerRef.current, {
        'xaxis.autorange': true,
        'yaxis.autorange': true,
        'scene.camera': null
      })
    }
  }

  const handleSetDragMode = (mode: 'zoom' | 'pan') => {
    setDragMode(mode)
    if (containerRef.current && window.Plotly?.relayout) {
      window.Plotly.relayout(containerRef.current, { dragmode: mode })
    }
  }

  useEffect(() => {
    let cancelled = false

    async function renderChart() {
      try {
        setLoading(true)
        setError(null)
        const Plotly = await loadPlotlyLibrary()
        if (cancelled || !containerRef.current) return

        if (!Plotly || typeof Plotly.newPlot !== 'function') {
          throw new Error('Plotly graphics engine could not be initialized.')
        }

        const parsed = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson
        const userLayout = parsed.layout || {}
        const userMargin = userLayout.margin || {}

        // Check if there are legend items to display
        const hasLegend = parsed.data && Array.isArray(parsed.data)
          ? parsed.data.some((d: any) => d.showlegend !== false && (d.name || userLayout.showlegend))
          : true

        const layoutTheme = {
          ...userLayout,
          autosize: true,
          paper_bgcolor: 'transparent',
          plot_bgcolor: isDark ? '#1f1e1b' : '#f5f0e8',
          font: {
            color: isDark ? '#faf9f5' : '#141413',
            family: 'Inter, system-ui, -apple-system, sans-serif',
            size: 11
          },
          // Spacing: generous right margin so legend never collides with chart points
          margin: {
            l: userMargin.l ?? 60,
            r: userMargin.r ?? (hasLegend ? 180 : 45),
            t: userMargin.t ?? 50,
            b: userMargin.b ?? 50,
            pad: 4
          },
          xaxis: {
            ...userLayout.xaxis,
            gridcolor: isDark ? '#2d2b28' : '#e6dfd8',
            zerolinecolor: isDark ? '#3d3a36' : '#d4cdc5',
            tickfont: { color: isDark ? '#8e8b82' : '#6c6a64' }
          },
          yaxis: {
            ...userLayout.yaxis,
            gridcolor: isDark ? '#2d2b28' : '#e6dfd8',
            zerolinecolor: isDark ? '#3d3a36' : '#d4cdc5',
            tickfont: { color: isDark ? '#8e8b82' : '#6c6a64' }
          },
          legend: {
            ...userLayout.legend,
            x: 1.02,
            xanchor: 'left',
            y: 0.98,
            yanchor: 'top',
            bgcolor: isDark ? 'rgba(31, 30, 27, 0.85)' : 'rgba(245, 240, 232, 0.85)',
            bordercolor: isDark ? '#2d2b28' : '#e6dfd8',
            borderwidth: 1,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 11,
              color: isDark ? '#a09d96' : '#6c6a64'
            }
          }
        }

        const config = {
          responsive: true,
          displayModeBar: false, // COMPLETELY REMOVES FLOATING BLACK MODEBAR!
          displaylogo: false
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
      if (containerRef.current && window.Plotly && typeof window.Plotly.Plots?.resize === 'function') {
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
      if (containerRef.current && window.Plotly && typeof window.Plotly.purge === 'function') {
        try {
          window.Plotly.purge(containerRef.current)
        } catch (e) {}
      }
    }
  }, [dataJson, isDark])

  const rootClass = hideHeader
    ? `relative w-full h-full flex flex-col ${className}`
    : `relative flex flex-col w-full h-full rounded-2xl overflow-hidden border border-hairline dark:border-[#2d2b28] bg-canvas dark:bg-[#181715] shadow-xl ${className}`

  return (
    <div className={rootClass}>
      {/* Unified Header Action Bar */}
      {!hideHeader && (
        <div className="h-12 px-4 border-b border-hairline dark:border-[#2d2b28] bg-surface-card dark:bg-[#1f1e1b] flex items-center justify-between shrink-0 select-none">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-ink dark:text-[#faf9f5] font-mono tracking-tight">
              {title}
            </span>
          </div>

          {/* Right Toolbar Controls (All options beside Fullscreen & New Tab) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Box Zoom Button */}
            <button
              onClick={() => handleSetDragMode('zoom')}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                dragMode === 'zoom'
                  ? 'bg-primary/15 border-primary/30 text-primary font-semibold'
                  : 'border-hairline dark:border-[#2d2b28] text-muted hover:text-ink hover:bg-surface-soft dark:hover:bg-[#252320]'
              }`}
              title="Box Zoom (drag rectangle on chart to zoom in)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Pan Button */}
            <button
              onClick={() => handleSetDragMode('pan')}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                dragMode === 'pan'
                  ? 'bg-primary/15 border-primary/30 text-primary font-semibold'
                  : 'border-hairline dark:border-[#2d2b28] text-muted hover:text-ink hover:bg-surface-soft dark:hover:bg-[#252320]'
              }`}
              title="Pan Tool (drag to slide axes)"
            >
              <Move className="w-3.5 h-3.5" />
            </button>

            {/* Reset Axes Button */}
            <button
              onClick={handleResetAxes}
              className="p-1.5 rounded-lg border border-hairline dark:border-[#2d2b28] text-muted hover:text-ink hover:bg-surface-soft dark:hover:bg-[#252320] text-xs transition-colors cursor-pointer"
              title="Reset View / Auto-fit Axes"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPNG}
              className="p-1.5 rounded-lg border border-hairline dark:border-[#2d2b28] text-muted hover:text-ink hover:bg-surface-soft dark:hover:bg-[#252320] text-xs transition-colors cursor-pointer"
              title="Download Plot as High-Res PNG"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Vertical Divider */}
            <div className="w-[1px] h-4 bg-hairline dark:bg-[#2d2b28] mx-0.5" />

            {/* New Tab Button */}
            <button
              onClick={() => openPlotlyInNewTab(dataJson)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Interactive Plot in Standalone New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            {/* Fullscreen Button */}
            {onExpandFullscreen && (
              <button
                onClick={onExpandFullscreen}
                className="p-1.5 rounded-lg border border-hairline dark:border-[#2d2b28] text-muted hover:text-ink hover:bg-surface-soft dark:hover:bg-[#252320] text-xs transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close Button (if inside modal) */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-hairline dark:border-[#2d2b28] text-muted hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 text-xs transition-colors cursor-pointer ml-1"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plot Container */}
      <div className="relative w-full h-full flex-1 bg-canvas dark:bg-[#181715] p-2" style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/60 dark:bg-[#181715]/60 backdrop-blur-xs z-10">
            <div className="flex items-center gap-2 font-mono text-xs text-muted">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span>Rendering chart...</span>
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
