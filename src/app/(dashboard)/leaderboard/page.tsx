'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [leaders, setLeaders] = useState<
    Array<{
      _id: string
      userId: string
      fullName: string
      profileImage?: string
      role?: string
      xp: number
      level: number
      streak?: number
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/gamification/leaderboard?period=${period}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLeaders(Array.isArray(data) ? data : data.leaders || []))
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [period])

  const RANK_STYLES = [
    'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    'from-gray-400/20 to-gray-500/10 border-gray-400/30',
    'from-orange-600/20 to-orange-700/10 border-orange-600/30',
  ]
  const RANK_EMOJIS = ['🥇', '🥈', '🥉']

  if (authLoading) return <PageLoader label="Loading leaderboard" />
  if (!user) return <SignInGate redirectLabel="Sign in to view the leaderboard" />

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="section-eyebrow">Community</p>
          <h1 className="text-3xl font-black text-white">Leaderboard 🏆</h1>
          <p className="text-[#a0a0a0] mt-1">Top performers ranked by XP earned</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all capitalize ${
                period === p
                  ? 'bg-[#00ff87] text-black border-[#00ff87]'
                  : 'border-white/10 text-[#a0a0a0] hover:border-white/20'
              }`}
            >
              {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="tile skeleton h-20 min-h-0" />
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="tile items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4 block">🏆</span>
            <p className="text-white font-bold text-lg">No rankings yet</p>
            <p className="text-[#a0a0a0] text-sm mt-1">
              Complete workouts and log meals to earn XP and appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((leader, index) => {
              const isCurrentUser =
                leader.userId === user?.id || leader.userId === (user as { _id?: string })?._id
              const rank = index + 1
              const initials = (leader.fullName || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)

              return (
                <div
                  key={leader._id || index}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    rank <= 3
                      ? `bg-gradient-to-r ${RANK_STYLES[rank - 1]}`
                      : isCurrentUser
                        ? 'border-[#00ff87]/30 bg-[#00ff87]/5'
                        : 'tile min-h-0'
                  }`}
                >
                  <div className="w-10 text-center flex-shrink-0">
                    {rank <= 3 ? (
                      <span className="text-2xl">{RANK_EMOJIS[rank - 1]}</span>
                    ) : (
                      <span className="text-lg font-black text-[#a0a0a0]">#{rank}</span>
                    )}
                  </div>

                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 overflow-hidden ${
                      isCurrentUser
                        ? 'bg-gradient-to-br from-[#00ff87] to-[#00d4ff] text-black'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {leader.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={leader.profileImage}
                        alt={leader.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-bold text-sm truncate ${isCurrentUser ? 'text-[#00ff87]' : 'text-white'}`}
                      >
                        {leader.fullName || 'Anonymous'}
                        {isCurrentUser && ' (You)'}
                      </p>
                      {leader.role && leader.role !== 'user' && (
                        <span className="badge-accent text-xs capitalize flex-shrink-0">{leader.role}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#a0a0a0]">Level {leader.level || 1}</span>
                      {(leader.streak || 0) > 0 && (
                        <span className="text-xs text-orange-400">🔥 {leader.streak} day streak</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className={`font-black text-lg ${
                        rank === 1
                          ? 'text-yellow-400'
                          : rank === 2
                            ? 'text-gray-300'
                            : rank === 3
                              ? 'text-orange-400'
                              : 'text-[#00ff87]'
                      }`}
                    >
                      {(leader.xp || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#a0a0a0]">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading &&
          leaders.length > 0 &&
          !leaders.some(
            (l) => l.userId === user?.id || l.userId === (user as { _id?: string })?._id,
          ) && (
            <div className="mt-6 p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
              <p className="text-[#a0a0a0] text-sm">You are not in the top 10 yet</p>
              <Link href="/my-fitness" className="badge-accent text-xs cursor-pointer hover:opacity-80">
                Earn XP →
              </Link>
            </div>
          )}
    </div>
  )
}
