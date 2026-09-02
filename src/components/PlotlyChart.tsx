'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Camera, ExternalLink, Maximize2, RefreshCw, X } from 'lucide-react'

interface PlotlyChartProps {
  dataJson: string
  height?: number | string
  className?: string
  isDark?: boolean
  hideHeader?: boolean
  title?: string
  downloadFileName?: string
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

export function openPlotlyInNewTab(jsonStr: string, downloadFileName?: string, isDark: boolean = true) {
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    const saveName = downloadFileName ? downloadFileName.replace(/\.[^/.]+$/, '') : 'plot'

    const bgCanvas = isDark ? '#181715' : '#faf9f5'
    const bgHeader = isDark ? '#1f1e1b' : '#f5f0e8'
    const borderCol = isDark ? '#2d2b28' : '#e6dfd8'
    const textInk = isDark ? '#faf9f5' : '#141413'
    const textMuted = isDark ? '#a09d96' : '#6c6a64'
    const plotBg = isDark ? '#1f1e1b' : '#f5f0e8'
    const gridCol = isDark ? '#2d2b28' : '#e6dfd8'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${saveName} — PyCode Visualization</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${bgCanvas};
      color: ${textInk};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #plot-header {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-bottom: 1px solid ${borderCol};
      background: ${bgHeader};
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 13px;
      color: ${textInk};
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
      background: ${isDark ? '#252320' : '#efe9de'};
      border: 1px solid ${borderCol};
      color: ${textMuted};
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn:hover {
      background: ${isDark ? '#2d2b28' : '#e6dfd8'};
      color: ${textInk};
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
      <span>${saveName} — Visualization Canvas</span>
    </div>
    <div class="tools">
      <button class="btn primary" onclick="Plotly.downloadImage('plot-container', { format: 'png', filename: '${saveName}', width: 1200, height: 750 })">
        📷 Download Plot (${saveName}.png)
      </button>
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
      paper_bgcolor: '${bgCanvas}',
      plot_bgcolor: '${plotBg}',
      font: { color: '${textInk}', family: 'Inter, system-ui, sans-serif', size: 11 },
      margin: {
        l: userLayout.margin?.l ?? 60,
        r: userLayout.margin?.r ?? (hasLegend ? 180 : 50),
        t: userLayout.margin?.t ?? 50,
        b: Math.max(userLayout.margin?.b ?? 0, 75),
        pad: 4
      },
      xaxis: {
        ...userLayout.xaxis,
        gridcolor: '${gridCol}',
        zerolinecolor: '${isDark ? '#3d3a36' : '#d4cdc5'}',
        tickfont: { color: '${textMuted}' }
      },
      yaxis: {
        ...userLayout.yaxis,
        gridcolor: '${gridCol}',
        zerolinecolor: '${isDark ? '#3d3a36' : '#d4cdc5'}',
        tickfont: { color: '${textMuted}' }
      },
      legend: {
        ...userLayout.legend,
        x: 1.02,
        xanchor: 'left',
        y: 0.98,
        yanchor: 'top',
        bgcolor: '${isDark ? 'rgba(31, 30, 27, 0.85)' : 'rgba(245, 240, 232, 0.85)'}',
        bordercolor: '${borderCol}',
        borderwidth: 1,
        font: { size: 11, color: '${textMuted}' }
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
  downloadFileName,
  onClose,
  onExpandFullscreen
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resolvedFileName = downloadFileName
    ? downloadFileName.replace(/\.[^/.]+$/, '')
    : 'plot'

  const handleDownloadPNG = () => {
    if (containerRef.current && window.Plotly?.downloadImage) {
      window.Plotly.downloadImage(containerRef.current, {
        format: 'png',
        filename: resolvedFileName,
        height: 800,
        width: 1200
      })
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
            b: Math.max(userMargin.b ?? 0, 75),
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
            bgcolor: isDark ? 'rgba(31, 30, 27, 0.9)' : 'rgba(245, 240, 232, 0.9)',
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
    : `relative flex flex-col w-full h-full rounded-2xl overflow-hidden border border-hairline bg-canvas shadow-xl ${className}`

  return (
    <div className={rootClass}>
      {/* Unified Header Action Bar */}
      {!hideHeader && (
        <div className="h-12 px-4 border-b border-hairline bg-surface-card flex items-center justify-between shrink-0 select-none">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-ink font-mono tracking-tight">
              {title}
            </span>
          </div>

          {/* Right Toolbar Controls: Just Download Plot, New Tab, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Download Plot Button */}
            <button
              onClick={handleDownloadPNG}
              className="px-2.5 py-1.5 rounded-lg border border-hairline bg-canvas hover:bg-surface-soft text-muted hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              title={`Download Plot (${resolvedFileName}.png)`}
            >
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Vertical Divider */}
            <div className="w-[1px] h-4 bg-hairline mx-0.5" />

            {/* New Tab Button */}
            <button
              onClick={() => openPlotlyInNewTab(dataJson, resolvedFileName, isDark)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open in Standalone New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            {/* Fullscreen Button */}
            {onExpandFullscreen && (
              <button
                onClick={onExpandFullscreen}
                className="p-1.5 rounded-lg border border-hairline bg-canvas hover:bg-surface-soft text-muted hover:text-ink transition-colors cursor-pointer"
                title="Fullscreen View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close Button (if inside modal) */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-hairline bg-canvas hover:bg-red-500/15 hover:border-red-500/30 text-muted hover:text-red-500 transition-colors cursor-pointer ml-1"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plot Container */}
      <div
        className="relative w-full flex-1 min-h-0 bg-canvas p-1 sm:p-2 overflow-hidden"
        style={typeof height === 'number' ? { height: `${height}px`, minHeight: `${height}px` } : undefined}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/60 backdrop-blur-xs z-10">
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
