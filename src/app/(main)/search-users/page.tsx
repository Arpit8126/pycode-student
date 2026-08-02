'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, User, Award, Calendar, CheckCircle2, ChevronRight, X } from 'lucide-react'

export default function SearchUsersPage() {
  const supabase = createClient() as any
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Selected profile details modal
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userSubmissions, setUserSubmissions] = useState<any[]>([])
  const [userHeatmap, setUserHeatmap] = useState<Record<string, number>>({})
  const [modalLoading, setModalLoading] = useState(false)

  // Trigger search on typing
  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([])
      return
    }

    const performSearch = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, is_teacher, sethji')
          .ilike('username', `%${search.trim()}%`)
          .limit(20)

        if (!error && data) {
          setResults(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(performSearch, 300)
    return () => clearTimeout(timer)
  }, [search, supabase])

  // Open profile modal
  const handleOpenProfile = async (user: any) => {
    setSelectedUser(user)
    setModalLoading(true)
    setUserSubmissions([])
    setUserHeatmap({})

    try {
      // 1. Fetch public submissions of the user
      const { data: subs, error } = await supabase
        .from('coding_submissions')
        .select('*, coding_questions(title, points)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && subs) {
        setUserSubmissions(subs)

        // 2. Count dates for activity map
        const counts: Record<string, number> = {}
        subs.forEach((s: any) => {
          const dateStr = new Date(s.created_at).toISOString().split('T')[0]
          counts[dateStr] = (counts[dateStr] || 0) + 1
        })
        setUserHeatmap(counts)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setModalLoading(false)
    }
  }

  const renderModalHeatmap = () => {
    const cells = []
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 120) // show last 120 days for compact modal size

    for (let i = 0; i <= 120; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(currentDate.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      const count = userHeatmap[dateStr] || 0

      let color = 'bg-[#1c1e27] border-transparent'
      if (count === 1) color = 'bg-emerald-950 border-emerald-900/10'
      if (count === 2) color = 'bg-emerald-800 border-emerald-700/10'
      if (count >= 3) color = 'bg-emerald-500 border-emerald-400/10'

      cells.push(
        <div
          key={dateStr}
          className={`w-3 h-3 rounded-sm border ${color}`}
          title={`${dateStr}: ${count} submissions`}
        />
      )
    }

    return (
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto p-3 bg-[#0d0e12] border border-[#232630] rounded-xl scrollbar-none">
        {cells}
      </div>
    )
  }

  // Calculate scores
  const totalPoints = userSubmissions
    .filter(s => s.status === 'accepted')
    .reduce((acc, curr) => acc + (curr.coding_questions?.points || 0), 0)

  const solvedCount = new Set(userSubmissions.filter(s => s.status === 'accepted').map(s => s.question_id)).size

  return (
    <div className="min-h-screen p-8 text-white relative">
      {/* Profile Detail Overlay Modal */}
      {selectedUser && (
        <div className="absolute inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#15171e] border border-[#232630] rounded-3xl p-6 relative shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 text-gray-500 hover:text-white rounded-lg hover:bg-[#232630] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {modalLoading ? (
              <div className="space-y-6 animate-pulse w-full">
                <div className="flex items-center gap-5 border-b border-[#232630] pb-5">
                  <div className="w-14 h-14 rounded-full bg-[#232630]"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-32 bg-[#232630] rounded"></div>
                    <div className="h-3 w-24 bg-[#232630] rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#0d0e12] border border-[#232630] space-y-2">
                      <div className="h-2 w-20 bg-[#232630] rounded mx-auto"></div>
                      <div className="h-6 w-16 bg-[#232630] rounded mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* Header card info */}
                <div className="flex items-center gap-5 border-b border-[#232630] pb-5">
                  <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xl">
                    {selectedUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">@{selectedUser.username}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedUser.is_teacher ? 'Verified Instructor' : selectedUser.sethji ? 'Portal Administrator' : 'Student Learner'}
                    </p>
                  </div>
                </div>

                {/* Score analytics metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#0d0e12] border border-[#232630] text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Accumulated Score</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{totalPoints} pts</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0d0e12] border border-[#232630] text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Solved</p>
                    <p className="text-2xl font-bold text-white mt-1">{solvedCount} challenges</p>
                  </div>
                </div>

                {/* Compact Heatmap */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activity (Last 120 Days)</h3>
                  {renderModalHeatmap()}
                </div>

                {/* Recent Submissions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Submissions</h3>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {userSubmissions.length === 0 ? (
                      <p className="text-xs text-gray-600">No submissions recorded.</p>
                    ) : (
                      userSubmissions.slice(0, 10).map((sub, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-[#0d0e12] rounded-xl border border-[#232630] text-xs">
                          <span className="font-medium text-gray-300">{sub.coding_questions?.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            sub.status === 'accepted' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Search Panel */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Search Users
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-light">Lookup peer submissions, scores, and practice activity logs</p>
        </div>

        {/* Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-600 absolute left-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type at least 2 characters to search usernames..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#15171e] border border-[#232630] rounded-2xl placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition-all"
          />
        </div>

        {/* Results grid list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-5 rounded-2xl bg-[#15171e] border border-[#232630] flex justify-between items-center">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#232630] shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-[#232630] rounded-md"></div>
                    <div className="h-3 w-16 bg-[#1b1c24] rounded-md"></div>
                  </div>
                </div>
                <div className="w-5 h-5 bg-[#232630] rounded shrink-0"></div>
              </div>
            ))}
          </div>
        ) : search.trim().length >= 2 && results.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            <p className="text-sm">No profiles found matching &quot;{search}&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((user) => (
              <div
                key={user.id}
                onClick={() => handleOpenProfile(user)}
                className="p-5 rounded-2xl bg-[#15171e] border border-[#232630] hover:border-blue-900/30 transition-all duration-200 cursor-pointer flex justify-between items-center group shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-950 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-sm">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200 group-hover:text-blue-400 transition-colors">@{user.username}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mt-0.5">
                      {user.is_teacher ? 'Instructor' : user.sethji ? 'Admin' : 'Student'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
