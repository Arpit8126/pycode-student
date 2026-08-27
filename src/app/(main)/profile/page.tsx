'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Award, Calendar, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Code2, Play, Camera, Settings, Search } from 'lucide-react'
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

function cleanQuestionTitle(title: string) {
  if (!title) return ''
  let clean = title.trim()
  
  const descTriggers = ['Problem Statement', 'Given ', 'Write a ', 'Implement ', 'Create a ']
  for (const trigger of descTriggers) {
    const idx = clean.indexOf(trigger)
    if (idx !== -1) {
      clean = clean.substring(0, idx).trim()
    }
  }
  
  if (clean.length > 70) {
    clean = clean.substring(0, 67) + '...'
  }
  return clean
}

export default function ProfilePage() {
  const supabase = createClient() as any
  
  const [profile, setProfile] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Avatar preview/crop states
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
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
  const [heatmapTooltip, setHeatmapTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  // Search & viewing other user profiles states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const latestSearchQuery = useRef('')
  const [viewedProfile, setViewedProfile] = useState<any>(null)
  const [viewedSubmissions, setViewedSubmissions] = useState<any[]>([])
  const [viewedHeatmapData, setViewedHeatmapData] = useState<Record<string, number>>({})
  const [viewedRank, setViewedRank] = useState<number>(1)
  const [viewedPercentile, setViewedPercentile] = useState<number>(100)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    latestSearchQuery.current = query
    
    if (query.trim().length < 1) {
      setSearchResults([])
      return
    }
    
    const { data, error } = await (supabase.from('profiles') as any)
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(5)
    
    // Only update search results if the query is still the latest one typed by the user
    if (!error && data && latestSearchQuery.current === query) {
      setSearchResults(data)
    }
  }

  const handleSelectSearchedUser = async (targetUserId: string) => {
    setSearchQuery('')
    setSearchResults([])
    setLoading(true)
    try {
      // 1. Fetch target profile
      const { data: prof } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle()
      
      if (prof) {
        setViewedProfile(prof)
        
        // 2. Fetch target user's submissions
        const { data: subs } = await (supabase.from('coding_submissions') as any)
          .select('*, coding_questions(title, points, difficulty)')
          .eq('user_id', targetUserId)
          .is('quiz_attempt_id', null)
          .order('created_at', { ascending: false })
        
        if (subs) {
          setViewedSubmissions(subs)
          // Populate heatmap
          const counts: Record<string, number> = {}
          subs.forEach((s: any) => {
            const dateStr = new Date(s.created_at).toISOString().split('T')[0]
            counts[dateStr] = (counts[dateStr] || 0) + 1
          })
          setViewedHeatmapData(counts)
        }

        // 3. Compute dynamic rank for this target user (Practice sandbox only)
        const { data: allSubs } = await (supabase.from('coding_submissions') as any)
          .select('user_id, question_id, coding_questions(points)')
          .eq('status', 'accepted')
          .is('quiz_attempt_id', null)

        const { count: profilesCount } = await (supabase.from('profiles') as any)
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

          const targetScore = userScores[targetUserId] ?? 0
          const usersAbove = Object.values(userScores).filter((s) => s > targetScore).length
          const finalRank = usersAbove + 1
          const totalUsers = Math.max(profilesCount || 1, Object.keys(userScores).length, 1)
          const topPercent = Math.min(100, Math.max(1, Math.round((finalRank / totalUsers) * 100)))

          setViewedRank(finalRank)
          setViewedPercentile(targetScore === 0 ? 100 : topPercent)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseViewedProfile = () => {
    setViewedProfile(null)
    setViewedSubmissions([])
    setViewedHeatmapData({})
  }

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

        // 2. Fetch all submissions to calculate global leaderboard statistics (Practice sandbox only)
        const { data: allSubs } = await supabase
          .from('coding_submissions')
          .select('user_id, question_id, coding_questions(points)')
          .eq('status', 'accepted')
          .is('quiz_attempt_id', null)

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

          // Count how many users scored strictly higher → gives accurate rank even with ties
          const myScore = userScores[user.id] ?? 0
          const usersAbove = Object.values(userScores).filter((s) => s > myScore).length
          const finalRank = usersAbove + 1
          const totalUsers = Math.max(profilesCount || 1, Object.keys(userScores).length, 1)

          // Calculate percentile — no artificial floor so 0-score users aren't falsely shown as Top 1%
          const topPercent = Math.min(100, Math.max(1, Math.round((finalRank / totalUsers) * 100)))

          setGlobalRank(finalRank)
          setGlobalPercentile(myScore === 0 ? 100 : topPercent)
        }

        // 3. Fetch Submissions
        const { data: subs } = await supabase
          .from('coding_submissions')
          .select('*, coding_questions(title, points, difficulty)')
          .eq('user_id', user.id)
          .is('quiz_attempt_id', null)
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
        // Use 600×600 so the stored image is crisp when displayed at any size
        const SIZE = 600
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Circular clip
        ctx.beginPath()
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.clip()

        // Scale drag/offset from the 192px preview to 600px canvas
        const ratio = SIZE / 192
        const dx = SIZE / 2 + (dragOffset.x * ratio) - (SIZE / 2 * scale)
        const dy = SIZE / 2 + (dragOffset.y * ratio) - (SIZE / 2 * scale)
        const dw = SIZE * scale
        const dh = SIZE * scale

        ctx.drawImage(img, dx, dy, dw, dh)

        // Convert canvas → Blob (JPEG @ 92% quality — sharp, ~50–80 KB)
        canvas.toBlob(async (blob) => {
          if (!blob) { setUploading(false); return }

          const formData = new FormData()
          formData.append('avatar', blob, 'avatar.jpg')

          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session?.access_token}` },
            body: formData   // multipart — no Content-Type header needed
          })

          const result = await res.json()
          if (result.success) {
            // Use the CDN URL returned by the API (cache-busted)
            const newUrl = result.avatar_url
            setProfile((prev: any) => ({ ...prev, avatar_url: newUrl }))
            setShowAvatarModal(false)
          } else {
            alert(`Failed to save avatar: ${result.error}`)
          }
          setUploading(false)
        }, 'image/jpeg', 0.92)
      }
      img.src = tempAvatarSrc
    } catch (err: any) {
      console.error(err)
      alert('Error saving cropped avatar.')
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
      <div className="min-h-screen p-8 bg-canvas text-ink">
        <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-7 w-48 bg-zinc-300 dark:bg-zinc-400 rounded-lg" />
            <div className="h-4 w-72 bg-zinc-200 dark:bg-zinc-300 rounded-md" />
          </div>

          {/* Two Card Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Solved Problems Skeleton */}
            <div className="p-6 rounded-3xl bg-white/75 dark:bg-zinc-900/35 border border-hairline backdrop-blur-md shadow-sm min-h-[200px] space-y-4 flex flex-col justify-between">
              <div className="h-4 w-28 bg-zinc-300 dark:bg-zinc-400 rounded-md" />
              <div className="flex items-center gap-8 py-2">
                <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-300 shrink-0" />
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 bg-zinc-300 dark:bg-zinc-400 rounded" />
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-300 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 bg-zinc-300 dark:bg-zinc-400 rounded" />
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-300 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Profile Card Skeleton */}
            <div className="p-6 rounded-3xl bg-white/75 dark:bg-zinc-900/35 border border-hairline backdrop-blur-md shadow-sm min-h-[200px] flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-zinc-300 dark:bg-zinc-400 rounded-md" />
                <div className="h-4 w-16 bg-zinc-300 dark:bg-zinc-400 rounded-full" />
              </div>
              <div className="flex items-center gap-5 my-4">
                <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-300 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-400 rounded" />
                  <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-300 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-8 pt-2">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-zinc-300 dark:bg-zinc-400 rounded" />
                  <div className="h-5 w-12 bg-zinc-300 dark:bg-zinc-400 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-zinc-300 dark:bg-zinc-400 rounded" />
                  <div className="h-5 w-12 bg-zinc-300 dark:bg-zinc-400 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap Skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-40 bg-zinc-300 dark:bg-zinc-400 rounded-md" />
            <div className="p-5 rounded-3xl bg-white/75 dark:bg-zinc-900/35 border border-hairline backdrop-blur-md shadow-sm min-h-[140px] flex items-center justify-center">
              <div className="w-full h-24 bg-zinc-200 dark:bg-zinc-300 rounded-2xl" />
            </div>
          </div>

          {/* Bottom Split Column Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-5 w-48 bg-zinc-300 dark:bg-zinc-400 rounded-md" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border border-hairline rounded-2xl bg-white/75 dark:bg-zinc-900/35 backdrop-blur-md shadow-sm h-16 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3.5 w-36 bg-zinc-300 dark:bg-zinc-400 rounded" />
                      <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-300 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-zinc-350 dark:bg-zinc-450 dark:bg-zinc-400 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-5 w-48 bg-zinc-300 dark:bg-zinc-400 rounded-md" />
              <div className="h-56 bg-white/75 dark:bg-zinc-900/35 border border-hairline backdrop-blur-md shadow-sm rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active variables (switch dynamically based on whether we are viewing another user's profile)
  const activeProfile = viewedProfile || profile
  const activeSubmissions = (viewedProfile ? viewedSubmissions : submissions).filter((s: any) => !s.quiz_attempt_id)
  const activeHeatmapData = viewedProfile ? viewedHeatmapData : heatmapData
  const activeRank = viewedProfile ? viewedRank : globalRank
  const activePercentile = viewedProfile ? viewedPercentile : globalPercentile

  // Calculate unique accepted submissions (latest per question) from active submissions
  const uniqueAcceptedSubs = Array.from(
    new Map(
      activeSubmissions
        .filter(s => s.status === 'accepted')
        .map(s => [s.question_id, s])
    ).values()
  )

  // Calculate points
  const totalPoints = uniqueAcceptedSubs.reduce((acc, curr: any) => acc + (curr.coding_questions?.points || 0), 0)

  const solvedCount = new Set(activeSubmissions.filter(s => s.status === 'accepted').map(s => s.question_id)).size

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
        const count = activeHeatmapData[dateStr] || 0

        let color = 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-hairline-soft hover:border-gray-400 dark:hover:border-hairline'
        if (count === 1) color = 'bg-emerald-200 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500'
        if (count === 2) color = 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600 hover:border-emerald-600 dark:hover:border-emerald-400'
        if (count >= 3) color = 'bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400 hover:border-emerald-700 dark:hover:border-emerald-300'

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
      <>
        {/* Fixed tooltip portal — above overflow-x-auto clipping */}
        {heatmapTooltip && (
          <div
            className="fixed z-[9999] pointer-events-none bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold font-sans px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 dark:border-zinc-200 whitespace-nowrap animate-fade-in"
            style={{ left: heatmapTooltip.x, top: heatmapTooltip.y }}
          >
            {heatmapTooltip.text}
          </div>
        )}
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
                      {week.map((day, dIdx) => (
                        day.type === 'empty' ? (
                          <div key={day.key} className="w-4 h-4 rounded-[3px] bg-transparent border border-transparent" />
                        ) : (
                          <div
                            key={day.key}
                            className={`w-4 h-4 rounded-[3px] border transition-all cursor-pointer ${day.color}`}
                            onMouseEnter={(e) => {
                              const rect = (e.target as HTMLElement).getBoundingClientRect()
                              setHeatmapTooltip({
                                text: day.title ?? '',
                                x: rect.left + rect.width / 2 - 60,
                                y: rect.top - 36
                              })
                            }}
                            onMouseLeave={() => setHeatmapTooltip(null)}
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
      </>
    )
  }

  // Count questions by difficulty from active user's submissions
  const totalEasy = LOCAL_QUESTIONS.filter(q => q.difficulty === 'easy').length
  const solvedEasy = new Set(activeSubmissions.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'easy').map(s => s.question_id)).size

  const totalMedium = LOCAL_QUESTIONS.filter(q => q.difficulty === 'medium').length
  const solvedMedium = new Set(activeSubmissions.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'medium').map(s => s.question_id)).size

  const totalHard = LOCAL_QUESTIONS.filter(q => q.difficulty === 'hard').length
  const solvedHard = new Set(activeSubmissions.filter(s => s.status === 'accepted' && s.coding_questions?.difficulty === 'hard').map(s => s.question_id)).size

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
        
        {/* Search & Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-hairline pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {viewedProfile ? `${viewedProfile.full_name || viewedProfile.username}'s Profile` : 'My Coding Profile'}
            </h1>
            <p className="text-gray-500 text-xs font-normal">
              {viewedProfile ? 'Viewing student performance analytics and submission logs' : 'Track your practice telemetry, solved problems, and submission heatmap'}
            </p>
          </div>

          {/* Search Input bar */}
          <div className="relative w-full md:w-80 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-surface-card border border-hairline rounded-2xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search student handle or name..."
                className="bg-transparent border-none outline-none text-xs text-ink placeholder-gray-400 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="text-gray-400 hover:text-ink text-[10px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Dropdown list */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-card border border-hairline rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {searchResults.map((userRes: any) => (
                  <button
                    key={userRes.id}
                    onClick={() => handleSelectSearchedUser(userRes.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-soft dark:hover:bg-canvas text-left transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full border border-hairline overflow-hidden bg-primary flex items-center justify-center font-bold text-on-primary text-xs shrink-0">
                      {userRes.avatar_url ? (
                        <img src={userRes.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        userRes.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{userRes.full_name || `@${userRes.username}`}</p>
                      {userRes.full_name && (
                        <p className="text-[10px] text-gray-500 font-mono truncate">@{userRes.username}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
          <div className="p-6 rounded-3xl bg-canvas border border-hairline flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[200px] relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">
                  {viewedProfile ? 'Student Profile' : 'My Profile'}
                </h3>
                {!viewedProfile && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    title="Edit Profile Details"
                    className="p-1 rounded-full hover:bg-white/40 dark:hover:bg-black/20 text-gray-500 hover:text-ink cursor-pointer transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              {/* Show Close (cross) button at top-right if viewing another user's profile */}
              {viewedProfile && (
                <button
                  onClick={handleCloseViewedProfile}
                  title="Back to My Profile"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-canvas/60 hover:bg-white dark:hover:bg-surface-card hover:text-primary hover:border-primary/30 border border-hairline text-gray-500 hover:text-ink text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  My Profile
                </button>
              )}
            </div>

            <div className="flex items-center gap-5 my-4">
              {/* Avatar + upload badge wrapper — badge sits OUTSIDE the overflow:hidden circle */}
              <div className="relative shrink-0 w-16 h-16">
                {/* Avatar circle — clicking opens lightbox */}
                <div
                  onClick={() => setShowLightbox(true)}
                  title="View full-size photo"
                  className="w-16 h-16 rounded-full border border-hairline overflow-hidden shadow-md group cursor-pointer transition-transform duration-300 hover:scale-[1.04]"
                >
                  {activeProfile?.avatar_url ? (
                    <img
                      src={activeProfile.avatar_url}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-2xl">
                      {activeProfile?.username ? activeProfile.username.substring(0, 2).toUpperCase() : 'PY'}
                    </div>
                  )}
                </div>

                {/* Permanent camera-badge — only on own profile */}
                {!viewedProfile && (
                  <label
                    title={uploading ? 'Uploading…' : 'Change profile picture'}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-primary border-2 border-canvas shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  >
                    {uploading ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <h1 className="text-lg font-extrabold tracking-tight text-ink truncate">
                    {activeProfile?.full_name || `@${activeProfile?.username || 'developer'}`}
                  </h1>
                  {activeProfile?.full_name && (
                    <span className="text-[10px] text-gray-500 font-mono truncate shrink-0">(@{activeProfile.username})</span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-xs font-medium italic line-clamp-1">
                  {activeProfile?.bio || (viewedProfile ? 'No bio written yet.' : 'No bio written yet. Click settings icon to write one.')}
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
                  <span className="text-2xl font-extrabold text-ink">#{activeRank}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    (Top {activePercentile}%)
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
              <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-hairline-soft" />
              <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
              <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
              <span>More</span>
            </div>
          </div>
        </div>        {/* Solving History list */}
        <div className="space-y-4 max-w-3xl">
          <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
            <Code2 className="w-5 h-5 text-gray-400" />
            Submission Log History
          </h2>
          
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {activeSubmissions.length === 0 ? (
              <div className="py-12 text-center text-gray-500 bg-canvas rounded-2xl border border-hairline">
                <p className="text-sm">No submissions recorded yet.</p>
              </div>
            ) : (
              activeSubmissions.map((sub) => {
                const dateStr = new Date(sub.created_at).toLocaleDateString()
                const isAccepted = sub.status === 'accepted'

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl bg-canvas border border-hairline flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-ink">{cleanQuestionTitle(sub.coding_questions?.title || `Question #${sub.question_id}`)}</h3>
                      <p className="text-[10px] text-gray-500 font-normal">Submitted {dateStr}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono border ${
                        isAccepted 
                          ? 'bg-block-mint text-emerald-800 border-emerald-200' 
                          : 'bg-block-pink text-red-800 border-red-200'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                )
              })
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

              <p className="text-[10px] text-gray-500 font-normal text-center">
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

        {/* Fullscreen Avatar Lightbox Modal */}
        {showLightbox && (
          <div 
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 bg-black/40 px-4 py-2 rounded-full transition-all text-xs font-extrabold uppercase tracking-wider cursor-pointer font-mono shadow-lg"
              title="Close image"
            >
              ✕ Close
            </button>

            {/* Centered Image Card */}
            <div 
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image wrapper itself
              className="relative max-w-md w-full aspect-square flex justify-center items-center p-2 cursor-default animate-scale-in"
            >
              <div className="relative w-72 h-72 md:w-[400px] md:h-[400px] rounded-full border-4 border-white/15 overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] select-none bg-zinc-900 transition-transform duration-300 hover:scale-[1.01]">
                {activeProfile?.avatar_url ? (
                  <img 
                    src={activeProfile.avatar_url} 
                    alt="Avatar Full View" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-on-primary text-8xl uppercase select-none font-mono">
                    {activeProfile?.username ? activeProfile.username.substring(0, 2).toUpperCase() : 'PY'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
