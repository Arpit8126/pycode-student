'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Award, Calendar, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Code2, Play, Camera, Settings } from 'lucide-react'
import { LOCAL_QUESTIONS } from '@/lib/localQuestions'

// Helper to generate rule-based explanations for common Python/Pandas functions
function generateExplanation(code: string): string[] {
  const lines = code.split('\n')
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    const lineNum = idx + 1

    if (trimmed.startsWith('import ')) {
      return `Line ${lineNum}: Imports a standard library/module to extend capabilities.`
    }
    if (trimmed.startsWith('def ')) {
      const match = trimmed.match(/def\s+(\w+)\(([^)]*)\):/)
      const name = match ? match[1] : 'function'
      const args = match ? match[2] : ''
      return `Line ${lineNum}: Defines function '${name}' taking parameters (${args}).`
    }
    if (trimmed.startsWith('return ')) {
      return `Line ${lineNum}: Completes function execution and returns calculated outputs.`
    }
    if (trimmed.includes('pd.read_csv')) {
      return `Line ${lineNum}: Loads structured CSV data into a Pandas DataFrame object.`
    }
    if (trimmed.includes('np.arange')) {
      return `Line ${lineNum}: Creates an evenly spaced NumPy numeric array range.`
    }
    if (trimmed.includes('.groupby')) {
      return `Line ${lineNum}: Groups the DataFrame rows by specific column categories for aggregation.`
    }
    if (trimmed.includes('plt.plot') || trimmed.includes('plt.hist') || trimmed.includes('plt.scatter')) {
      return `Line ${lineNum}: Renders geometric visual elements onto the Matplotlib plotting canvas.`
    }
    if (trimmed.includes('plt.title') || trimmed.includes('plt.xlabel') || trimmed.includes('plt.ylabel')) {
      return `Line ${lineNum}: Annotates the figure canvas with headers or labels.`
    }
    if (trimmed.includes('.isna().sum()')) {
      return `Line ${lineNum}: Finds and sums missing null values inside column cells.`
    }
    if (trimmed.includes('for ') && trimmed.endsWith(':')) {
      return `Line ${lineNum}: Loops and iterates over elements sequentially.`
    }
    if (trimmed.includes('if ') && trimmed.endsWith(':')) {
      return `Line ${lineNum}: Evaluates a conditional branch expression.`
    }
    if (trimmed.includes(' = ')) {
      const parts = trimmed.split('=')
      return `Line ${lineNum}: Assigns calculated value to target variable '${parts[0].trim()}'.`
    }
    return `Line ${lineNum}: Executes statement '${trimmed.substring(0, 30)}${trimmed.length > 30 ? '...' : ''}'.`
  })
}

export default function ProfilePage() {
  const supabase = createClient() as any
  
  const [profile, setProfile] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Avatar preview/crop states
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [tempAvatarSrc, setTempAvatarSrc] = useState<string>('')
  const [scale, setScale] = useState<number>(1.0)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Modal & profile edit states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)

  // Dynamic ranking stats
  const [globalRank, setGlobalRank] = useState<number>(1)
  const [globalPercentile, setGlobalPercentile] = useState<number>(100)

  // Explanation states
  const [activeSub, setActiveSub] = useState<any>(null)
  const [explanation, setExplanation] = useState<string[]>([])

  // Heatmap states (365 days counts)
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({})

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch Profile
        let { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        // Self-healing check: Sync chosen username from signup page if defaulted or empty
        try {
          const pendingUsername = localStorage.getItem('pycode_signup_username')
          if (pendingUsername && (!prof?.username || prof.username.startsWith('user_'))) {
            console.log("Profile self-healing: updating username with:", pendingUsername)
            const { error: updateErr } = await supabase
              .from('profiles')
              .update({ 
                username: pendingUsername.toLowerCase().trim(),
                is_onboarded: true
              })
              .eq('id', user.id)

            if (!updateErr) {
              localStorage.removeItem('pycode_signup_username')
              const { data: refreshed } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle()
              prof = refreshed
            }
          }
        } catch (e) {
          console.error("Profile self-healing username sync error:", e)
        }

        if (prof) {
          setProfile(prof)
          setEditFullName(prof.full_name || '')
          setEditBio(prof.bio || '')
        }

        // 2. Fetch all submissions to calculate global leaderboard statistics
        const { data: allSubs } = await supabase
          .from('coding_submissions')
          .select('user_id, question_id, coding_questions(points)')
          .eq('status', 'accepted')

        const { count: profilesCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        if (allSubs) {
          const userScores: Record<string, number> = {}
          const userUniqueSolved: Record<string, Set<number>> = {}

          allSubs.forEach((sub: any) => {
            const uid = sub.user_id
            const qid = sub.question_id
            const pts = sub.coding_questions?.points || 0

            if (!userUniqueSolved[uid]) {
              userUniqueSolved[uid] = new Set()
              userScores[uid] = 0
            }

            if (!userUniqueSolved[uid].has(qid)) {
              userUniqueSolved[uid].add(qid)
              userScores[uid] += pts
            }
          })

          // Sort unique score values in descending order
          const sortedScores = Object.values(userScores).sort((a, b) => b - a)
          // Find our unique score
          const myScore = userScores[user.id] || 0
          const rankIndex = sortedScores.indexOf(myScore)
          const finalRank = rankIndex !== -1 ? rankIndex + 1 : sortedScores.length + 1
          const totalUsers = Math.max(profilesCount || 1, Object.keys(userScores).length, 1)

          // Calculate percentile (rounded to nearest integer)
          const topPercent = Math.max(1, Math.min(100, Math.round((finalRank / totalUsers) * 100)))

          setGlobalRank(finalRank)
          setGlobalPercentile(topPercent)
        }

        // 3. Fetch Submissions
        const { data: subs } = await supabase
          .from('coding_submissions')
          .select('*, coding_questions(title, points, difficulty)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (subs) {
          setSubmissions(subs)

          // 4. Populate Heatmap Grid counts by date
          const counts: Record<string, number> = {}
          subs.forEach((s: any) => {
            const dateStr = new Date(s.created_at).toISOString().split('T')[0]
            counts[dateStr] = (counts[dateStr] || 0) + 1
          })
          setHeatmapData(counts)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
  }, [supabase])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempAvatarSrc(event.target.result as string)
          setScale(1.0)
          setDragOffset({ x: 0, y: 0 })
          setShowAvatarModal(true)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error(err)
      alert('Error loading profile picture preview.')
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setDragOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const saveCroppedAvatar = async () => {
    if (!tempAvatarSrc) return
    setUploading(true)
    try {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 150
        canvas.height = 150
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Fill background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 150, 150)

        // Make clipping path for circular crop
        ctx.beginPath()
        ctx.arc(75, 75, 75, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.clip()

        // Calculate drawing dimensions to capture zoomed/dragged preview portion
        const dx = 75 + (dragOffset.x * (150 / 192)) - (75 * scale)
        const dy = 75 + (dragOffset.y * (150 / 192)) - (75 * scale)
        const dw = 150 * scale
        const dh = 150 * scale

        ctx.drawImage(img, dx, dy, dw, dh)

        const base64Data = canvas.toDataURL('image/jpeg', 0.85)

        // Upload compressed cropped avatar
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ avatar_url: base64Data })
        })

        const result = await res.json()
        if (result.success) {
          setProfile((prev: any) => ({ ...prev, avatar_url: base64Data }))
          setShowAvatarModal(false)
        } else {
          alert(`Failed to save avatar: ${result.error}`)
        }
      }
      img.src = tempAvatarSrc
    } catch (err: any) {
      console.error(err)
      alert('Error saving cropped avatar.')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          bio: editBio.trim()
        })
        .eq('id', profile.id)

      if (!error) {
        setProfile((prev: any) => ({
          ...prev,
          full_name: editFullName.trim(),
          bio: editBio.trim()
        }))
        setShowEditModal(false)
      } else {
        alert(`Failed to save: ${error.message}`)
      }
    } catch (err: any) {
      console.error(err)
      alert('Error saving profile details.')
    } finally {
      setSaving(false)
    }
  }

  const handleExplain = (sub: any) => {
    setActiveSub(sub)
    setExplanation(generateExplanation(sub.submitted_code))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse p-4">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 dark:bg-surface-soft rounded-lg" />
          <div className="h-4 w-72 bg-gray-100 dark:bg-surface-card rounded-md" />
        </div>

        {/* Two Card Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Solved Problems Skeleton */}
          <div className="p-6 rounded-3xl bg-block-mint/20 border border-hairline min-h-[200px] space-y-4">
            <div className="h-4 w-28 bg-gray-200 dark:bg-surface-soft rounded-md" />
            <div className="flex items-center gap-8 py-2">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-surface-soft shrink-0" />
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-surface-soft rounded" />
                  <div className="h-2 bg-gray-200 dark:bg-surface-soft rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-surface-soft rounded" />
                  <div className="h-2 bg-gray-200 dark:bg-surface-soft rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Profile Card Skeleton */}
          <div className="p-6 rounded-3xl bg-block-lilac/20 border border-hairline min-h-[200px] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-gray-200 dark:bg-surface-soft rounded-md" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-surface-soft rounded-full" />
            </div>
            <div className="flex items-center gap-5 my-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-surface-soft shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-surface-soft rounded" />
                <div className="h-3 w-48 bg-gray-200 dark:bg-surface-soft rounded" />
              </div>
            </div>
            <div className="flex items-center gap-8 pt-2">
              <div className="space-y-1.5">
                <div className="h-2.5 w-16 bg-gray-200 dark:bg-surface-soft rounded" />
                <div className="h-5 w-12 bg-gray-200 dark:bg-surface-soft rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-16 bg-gray-200 dark:bg-surface-soft rounded" />
                <div className="h-5 w-12 bg-gray-200 dark:bg-surface-soft rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-40 bg-gray-200 dark:bg-surface-soft rounded-md" />
          <div className="h-32 w-full bg-gray-100 dark:bg-surface-card rounded-3xl" />
        </div>

        {/* Bottom Split Column Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-5 w-48 bg-gray-200 dark:bg-surface-soft rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border border-hairline rounded-2xl bg-white dark:bg-surface-card h-16 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3.5 w-36 bg-gray-200 dark:bg-surface-soft rounded" />
                    <div className="h-2 w-24 bg-gray-200 dark:bg-surface-soft rounded" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-surface-soft rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-5 w-48 bg-gray-200 dark:bg-surface-soft rounded-md" />
            <div className="h-56 bg-white dark:bg-surface-card border border-hairline rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // Calculate unique accepted submissions (latest per question)
  const uniqueAcceptedSubs = Array.from(
    new Map(
      submissions
        .filter(s => s.status === 'accepted')
        .map(s => [s.question_id, s])
    ).values()
  )

  // Calculate points
  const totalPoints = uniqueAcceptedSubs.reduce((acc, curr: any) => acc + (curr.coding_questions?.points || 0), 0)

  const solvedCount = new Set(submissions.filter(s => s.status === 'accepted').map(s => s.question_id)).size

  // Heatmap rendering grid constructor (LeetCode Standard 2026 Year-View Segmented by Month)
  const renderHeatmapGrid = () => {
    const daysInWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const monthsData = []

    for (let m = 0; m < 12; m++) {
      const startDate = new Date(2026, m, 1)
      const startOffset = startDate.getDay()
      const daysInMonth = new Date(2026, m + 1, 0).getDate()
      const monthDays = []

      // 1. Blanks at the beginning of the month
      for (let i = 0; i < startOffset; i++) {
        monthDays.push({
          type: 'empty',
          key: `empty-${m}-${i}`
        })
      }

      // 2. Active days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(2026, m, day)
        const yyyy = currentDate.getFullYear()
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0')
        const dd = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        const count = heatmapData[dateStr] || 0

        let color = 'bg-hairline-soft border-transparent hover:border-gray-400'
        if (count === 1) color = 'bg-block-mint border-emerald-100 hover:border-emerald-400'
        if (count === 2) color = 'bg-emerald-200 border-emerald-300 hover:border-emerald-500'
        if (count >= 3) color = 'bg-semantic-success border-emerald-500 hover:border-emerald-600'

        const weekdayName = daysInWeek[currentDate.getDay()]
        const monthName = fullMonthNames[m]

        monthDays.push({
          type: 'day',
          key: dateStr,
          date: currentDate,
          color,
          title: `${weekdayName}, ${monthName} ${day}, ${yyyy}: ${count} submission${count !== 1 ? 's' : ''}`
        })
      }

      // Chunk monthDays into weeks of size 7
      const monthWeeks = []
      for (let i = 0; i < monthDays.length; i += 7) {
        const week = monthDays.slice(i, i + 7)
        // Pad the last week of the month with empty cells so it has exactly 7 elements
        while (week.length < 7) {
          week.push({
            type: 'empty',
            key: `empty-pad-${m}-${week.length}`
          })
        }
        monthWeeks.push(week)
      }

      monthsData.push({
        monthIdx: m,
        name: monthNames[m],
        weeks: monthWeeks
      })
    }

    return (
      <div className="w-full overflow-x-auto p-4 bg-canvas border border-hairline rounded-2xl scrollbar-none shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        {/* Min width ensures horizontal scroll on overflow without scaling cells down */}
        <div className="min-w-[1100px] flex items-start gap-2">
            {/* Weekday indicators on left (Sun to Sat aligned with grid rows) */}
            <div className="flex flex-col gap-1 text-[8px] font-bold text-gray-400 font-mono pr-1.5 select-none pt-[20px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="h-4 flex items-center justify-end">{day}</div>
              ))}
            </div>

          {/* Month Blocks Container */}
          <div className="flex items-start gap-1">
            {monthsData.map((m, mIdx) => (
              <div
                key={m.monthIdx}
                className={`flex flex-col gap-1 ${
                  mIdx > 0 ? 'ml-3 pl-3 border-l border-dashed border-gray-200 dark:border-gray-700/60' : ''
                }`}
              >
                {/* Month Name aligned exactly above this month's columns */}
                <div className="text-[9px] font-bold text-gray-400 font-mono select-none h-4">
                  {m.name}
                </div>

                {/* Week Columns of this Month */}
                <div className="flex gap-1">
                  {m.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-rows-7 gap-1 flex-shrink-0">
                      {week.map((day) => (
                        day.type === 'empty' ? (
                          <div key={day.key} className="w-4 h-4 rounded-[3px] bg-transparent border border-transparent" />
                        ) : (
                          <div
                            key={day.key}
                            className={`w-4 h-4 rounded-[3px] border transition-all ${day.color}`}
                            title={day.title}
                          />
                        )
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    )
  }

  // Count questions by difficulty
  const totalEasy = LOCAL_QUESTIONS.filter(q => q.difficulty === 'easy').length
  const solvedEasy = new Set(submissions.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'easy').map(s => s.question_id)).size

  const totalMedium = LOCAL_QUESTIONS.filter(q => q.difficulty === 'medium').length
  const solvedMedium = new Set(submissions.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'medium').map(s => s.question_id)).size

  const totalHard = LOCAL_QUESTIONS.filter(q => q.difficulty === 'hard').length
  const solvedHard = new Set(submissions.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'hard').map(s => s.question_id)).size

  const totalSolvedCount = solvedEasy + solvedMedium + solvedHard
  const totalQuestionsCount = totalEasy + totalMedium + totalHard

  // SVG circular progress calculation
  const percentSolved = totalQuestionsCount > 0 ? (totalSolvedCount / totalQuestionsCount) * 100 : 0
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentSolved / 100) * circumference

  return (
    <div className="min-h-screen p-8 bg-canvas text-ink">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Top Section - Side-by-Side Cards (LeetCode Style Solved Problems + Profile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Solved Problems Card */}
          <div className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Solved Problems</h3>
            
            <div className="flex items-center gap-8 py-4">
              {/* Circular Gauge */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  {/* Track Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-hairline-soft fill-transparent"
                    strokeWidth="4.5"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-primary fill-transparent transition-all duration-500 ease-out"
                    strokeWidth="4.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <span className="text-2xl font-extrabold text-ink leading-none">{totalSolvedCount}</span>
                  <span className="text-[10px] text-gray-400 font-medium mt-1">Solved</span>
                </div>
              </div>

              {/* Progress Breakdown Bars */}
              <div className="flex-1 space-y-3.5">
                {/* Easy Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-500">Easy</span>
                    <span className="text-ink font-mono">{solvedEasy}<span className="text-gray-400 font-light">/{totalEasy}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalEasy > 0 ? (solvedEasy / totalEasy) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-500">Medium</span>
                    <span className="text-ink font-mono">{solvedMedium}<span className="text-gray-400 font-light">/{totalMedium}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalMedium > 0 ? (solvedMedium / totalMedium) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Hard Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-red-500">Hard</span>
                    <span className="text-ink font-mono">{solvedHard}<span className="text-gray-400 font-light">/{totalHard}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-hairline-soft overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalHard > 0 ? (solvedHard / totalHard) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: My Profile Card */}
          <div className="p-6 rounded-3xl bg-block-lilac border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">My Profile</h3>
                <button
                  onClick={() => setShowEditModal(true)}
                  title="Edit Profile Details"
                  className="p-1 rounded-full hover:bg-white/40 dark:hover:bg-black/20 text-gray-500 hover:text-ink cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-semantic-success font-mono font-bold uppercase tracking-wider bg-white/40 border border-emerald-500/10 px-2.5 py-0.5 rounded-full">
                <Award className="w-3.5 h-3.5" />
                Learner
              </div>
            </div>

            <div className="flex items-center gap-5 my-4">
              {/* Clickable / Hoverable Avatar Container */}
              <div className="relative w-16 h-16 rounded-full border border-hairline overflow-hidden shadow-md group shrink-0 transition-transform duration-300 hover:scale-[1.03]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-2xl">
                    {profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'PY'}
                  </div>
                )}
                {/* Overlay with Upload Input - Improved premium transition */}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer transition-opacity duration-300 backdrop-blur-md">
                  <Camera className="w-4 h-4 mb-1 text-white/90 animate-pulse" />
                  <span className="tracking-wider uppercase text-[8px]">{uploading ? 'Updating' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <h1 className="text-lg font-extrabold tracking-tight text-ink truncate">
                    {profile?.full_name || `@${profile?.username || 'developer'}`}
                  </h1>
                  {profile?.full_name && (
                    <span className="text-[10px] text-gray-500 font-mono truncate shrink-0">(@{profile.username})</span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-xs font-medium italic line-clamp-1">
                  {profile?.bio || 'No bio written yet. Click settings icon to write one.'}
                </p>
                <p className="text-gray-500 text-[10px] font-mono leading-none pt-0.5">PyCode Python Programmer</p>
              </div>
            </div>

            <div className="flex items-center gap-8 border-t border-black/5 pt-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-mono">Workspace Score</p>
                <p className="text-2xl font-extrabold text-primary mt-0.5">{totalPoints} pts</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold font-mono">Sandbox Rank</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-extrabold text-ink">#{globalRank}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    (Top {globalPercentile}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Heatmap */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Submission Heatmap
          </h2>
          
          {renderHeatmapGrid()}
          
          {/* Heatmap Legend */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-2 pt-1">
            <p>Submission history logs for the year 2026</p>
            <div className="flex items-center gap-1.5 font-semibold">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-hairline-soft" />
              <div className="w-3 h-3 rounded-sm bg-block-mint" />
              <div className="w-3 h-3 rounded-sm bg-emerald-200" />
              <div className="w-3 h-3 rounded-sm bg-semantic-success" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Split Section: History and Explanation drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Solving History list */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <Code2 className="w-5 h-5 text-gray-400" />
              Submission Log History
            </h2>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {submissions.length === 0 ? (
                <div className="py-12 text-center text-gray-500 bg-canvas rounded-2xl border border-hairline">
                  <p className="text-sm">No submissions recorded yet.</p>
                </div>
              ) : (
                submissions.map((sub) => {
                  const dateStr = new Date(sub.created_at).toLocaleDateString()
                  const isAccepted = sub.status === 'accepted'

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleExplain(sub)}
                      className={`p-4 rounded-xl bg-canvas border cursor-pointer hover:bg-surface-soft transition-all flex items-center justify-between ${
                        activeSub?.id === sub.id ? 'border-primary bg-surface-soft' : 'border-hairline'
                      }`}
                    >
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-ink">{sub.coding_questions?.title || `Question #${sub.question_id}`}</h3>
                        <p className="text-[10px] text-gray-500 font-light">Submitted {dateStr}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono border ${
                          isAccepted 
                            ? 'bg-block-mint text-emerald-800 border-emerald-200' 
                            : 'bg-block-pink text-red-800 border-red-200'
                        }`}>
                          {sub.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Explanation panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              Line-by-line Code Explanation
            </h2>

            {activeSub ? (
              <div className="p-6 rounded-2xl bg-canvas border border-hairline space-y-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-scale-in">
                <div>
                  <h3 className="text-sm font-bold text-ink mb-2">{activeSub.coding_questions?.title}</h3>
                  <div className="p-4 rounded-xl bg-block-navy border border-white/10 font-mono text-xs text-white max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                    {activeSub.submitted_code}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Line Review Analysis</h4>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                    {explanation.map((exp, i) => (
                      <p key={i} className="text-xs text-gray-600 font-light leading-relaxed">
                        {exp}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface-soft text-center text-gray-500 px-6">
                <div>
                  <Code2 className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs leading-relaxed max-w-xs font-light">
                    Select a submission from the history logs on the left to analyze and view line-by-line descriptions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full bg-canvas border border-hairline rounded-3xl p-6 space-y-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.3)] animate-scale-in">
              <div className="flex justify-between items-center border-b border-hairline pb-3">
                <h3 className="text-base font-extrabold tracking-tight text-ink">Edit Profile Details</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-ink cursor-pointer text-sm font-bold font-mono px-2 py-1 hover:bg-surface-soft rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Full Name</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">Short Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-ink placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm font-light resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-full border border-hairline text-gray-500 hover:text-ink hover:bg-surface-soft text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-5 py-2 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-xs font-extrabold transition-all cursor-pointer shadow-md"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Avatar Crop Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-sm w-full bg-canvas border border-hairline rounded-3xl p-6 space-y-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.3)] animate-scale-in flex flex-col items-center">
              <div className="w-full flex justify-between items-center border-b border-hairline pb-3">
                <h3 className="text-base font-extrabold tracking-tight text-ink">Preview & Position Photo</h3>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="text-gray-400 hover:text-ink cursor-pointer text-sm font-bold font-mono px-2 py-1 hover:bg-surface-soft rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Crop Container */}
              <div 
                className="relative w-48 h-48 rounded-full border-2 border-primary overflow-hidden cursor-move bg-surface-soft shadow-inner group transition-transform duration-300"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  src={tempAvatarSrc}
                  alt="Preview"
                  draggable={false}
                  style={{
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
                {/* Circular Helper Border */}
                <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
              </div>

              <p className="text-[10px] text-gray-500 font-light text-center">
                Drag the image inside the circle to reposition, or use the slider below to zoom.
              </p>

              {/* Zoom Control Slider */}
              <div className="w-full space-y-2">
                <div className="flex justify-between text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                  <span>Zoom Scale</span>
                  <span>{Math.round(scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-hairline-soft rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
              </div>

              <div className="w-full flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="px-4 py-2 rounded-full border border-hairline text-gray-500 hover:text-ink hover:bg-surface-soft text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCroppedAvatar}
                  disabled={uploading}
                  className="px-5 py-2 rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 text-xs font-extrabold transition-all cursor-pointer shadow-md"
                >
                  {uploading ? 'Uploading...' : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
