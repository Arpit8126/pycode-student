'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ExternalLink, Maximize2, RefreshCw } from 'lucide-react'

interface PlotlyChartProps {
  dataJson: string
  height?: number | string
  className?: string
  isDark?: boolean
  hideHeader?: boolean
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
    const parsedData = ${JSON.stringify(parsed.data || [])};
    const userLayout = ${JSON.stringify(parsed.layout || {})};
    const hasLegend = parsedData.some(d => d.showlegend !== false && (d.name || userLayout.showlegend));
    const layout = {
      ...userLayout,
      autosize: true,
      paper_bgcolor: '#0e1117',
      plot_bgcolor: '#0e1117',
      font: { color: '#e6edf3', family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', size: 12 },
      margin: {
        l: userLayout.margin?.l ?? 60,
        r: userLayout.margin?.r ?? (hasLegend ? 180 : 50),
        t: userLayout.margin?.t ?? 50,
        b: userLayout.margin?.b ?? 50,
        pad: 4
      },
      legend: {
        ...userLayout.legend,
        x: 1.02,
        xanchor: 'left',
        y: 1,
        yanchor: 'top',
        bgcolor: 'rgba(22, 27, 34, 0.75)',
        bordercolor: 'rgba(255, 255, 255, 0.1)',
        borderwidth: 1,
        font: { size: 11, color: '#94a3b8' }
      }
    };
    const config = {
      responsive: true,
      displayModeBar: 'hover',
      displaylogo: false,
      modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines']
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
  height = 420,
  className = '',
  isDark = true,
  hideHeader = false,
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
          plot_bgcolor: isDark ? '#0e1117' : '#ffffff',
          font: {
            color: isDark ? '#cbd5e1' : '#334155',
            family: 'Inter, system-ui, -apple-system, sans-serif',
            size: 11
          },
          // Spacing: give ample right margin so legend never collides with chart points or modebar
          margin: {
            l: userMargin.l ?? 60,
            r: userMargin.r ?? (hasLegend ? 180 : 40),
            t: userMargin.t ?? 50,
            b: userMargin.b ?? 50,
            pad: 4
          },
          legend: {
            ...userLayout.legend,
            x: 1.02,
            xanchor: 'left',
            y: 0.98,
            yanchor: 'top',
            bgcolor: isDark ? 'rgba(18, 20, 26, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            bordercolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            borderwidth: 1,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 11,
              color: isDark ? '#94a3b8' : '#64748b'
            }
          }
        }

        const config = {
          responsive: true,
          displayModeBar: 'hover', // Only show modebar on hover, eliminating permanent clutter
          displaylogo: false,
          modeBarButtonsToRemove: [
            'sendDataToCloud',
            'lasso2d',
            'select2d',
            'hoverClosestCartesian',
            'hoverCompareCartesian',
            'toggleSpikelines'
          ]
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
    ? `relative w-full h-full ${className}`
    : `relative flex flex-col w-full rounded-xl overflow-hidden border border-hairline/80 bg-surface-soft/30 dark:bg-[#121318] ${className}`

  return (
    <div className={rootClass}>
      {/* Top Action Bar (only shown when not embedded in a modal that has its own header) */}
      {!hideHeader && (
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
      )}

      {/* Plot Container */}
      <div className="relative w-full h-full flex-1" style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}>
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
