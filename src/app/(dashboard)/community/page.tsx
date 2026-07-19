'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Heart, MessageCircle, Send, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessCommunityForUser } from '@/lib/access'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { BackButton } from '@/components/shared/BackButton'
import { FadeIn } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeaderboardEntry } from '@/types/gamification'

interface CommunityPostItem {
  _id: string
  authorId: string
  authorName: string
  content: string
  likeCount: number
  likedByMe: boolean
  commentCount: number
  createdAt: string
}

interface CommunityCommentItem {
  _id: string
  authorName: string
  content: string
  createdAt: string
}

export default function CommunityPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [posts, setPosts] = useState<CommunityPostItem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [compose, setCompose] = useState('')
  const [posting, setPosting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, CommunityCommentItem[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/community/posts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load feed')
      setPosts(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load community')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true)
    try {
      const res = await fetch('/api/gamification/me?leaderboard=true')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load leaderboard')
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : [])
    } catch {
      setLeaderboard([])
    } finally {
      setLoadingLeaderboard(false)
    }
  }, [])

  useEffect(() => {
    if (user && canAccessCommunityForUser(user)) {
      loadPosts()
      loadLeaderboard()
    }
  }, [user, loadPosts, loadLeaderboard])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compose.trim()) return toast.error('Write something first')
    setPosting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: compose.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to post')
      setCompose('')
      toast.success('Posted to community')
      await loadPosts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Post failed')
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Like failed')
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, likedByMe: data.likedByMe, likeCount: data.likeCount }
            : p,
        ),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Like failed')
    }
  }

  const toggleComments = async (postId: string) => {
    if (expanded === postId) {
      setExpanded(null)
      return
    }
    setExpanded(postId)
    if (comments[postId]) return

    setLoadingComments(postId)
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load comments')
      setComments((prev) => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Comments failed')
    } finally {
      setLoadingComments(null)
    }
  }

  const submitComment = async (postId: string) => {
    const content = (commentDrafts[postId] || '').trim()
    if (!content) return toast.error('Comment cannot be empty')
    setSubmittingComment(postId)
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to comment')
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data],
      }))
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p,
        ),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Comment failed')
    } finally {
      setSubmittingComment(null)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to join community" />

  if (!canAccessCommunityForUser(user)) {
    return (
      <AccessGate
        icon={Users}
        title="Subscription required"
        description="Community feed is available on Basic and higher plans with an active subscription."
      />
    )
  }

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <BackButton />
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-8 sm:px-8 gym-floor">
            <p className="eyebrow mb-2">Member Circle</p>
            <h1 className="display-title text-3xl md:text-4xl">Community Feed</h1>
            <p className="mt-2 text-muted-foreground">
              Share wins, ask questions, and cheer on other members.
            </p>
          </div>
        </FadeIn>

        <Card className="elite-panel mb-6 border-white/[.08]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-primary" />
              XP Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLeaderboard ? (
              <div className="space-y-2">
                <Skeleton className="h-12 bg-muted" />
                <Skeleton className="h-12 bg-muted" />
                <Skeleton className="h-12 bg-muted" />
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No rankings yet — complete workouts and log meals to climb the board.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      entry.isCurrentUser
                        ? 'border-emerald-500/40 bg-emerald-500/15'
                        : 'border-white/[.06] bg-black/20'
                    }`}
                  >
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                      {entry.rank}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
                      {entry.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {entry.fullName}
                        {entry.isCurrentUser ? ' (you)' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{entry.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="elite-panel mb-6 border-white/[.08]">
          <CardHeader>
            <CardTitle className="text-base">Compose</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePost} className="space-y-3">
              <textarea
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="What's on your mind — PR, tip, or check-in?"
                className="w-full rounded-xl border border-white/[.09] bg-black/20 px-3.5 py-2 text-sm text-foreground outline-none focus-visible:border-primary/45 focus-visible:ring-3 focus-visible:ring-ring/15"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{compose.length}/2000</span>
                <Button type="submit" disabled={posting} size="sm">
                  <Send className="size-3.5" />
                  {posting ? 'Posting…' : 'Post'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Skeleton className="h-32 bg-muted" />
          ) : posts.length === 0 ? (
            <Card className="elite-panel border-white/[.08]">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No posts yet — start the conversation.
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post._id} className="elite-panel border-white/[.08]">
                <CardContent className="pt-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{post.authorName}</p>
                    <time className="text-[11px] text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#c8d0cb]">
                    {post.content}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleLike(post._id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        post.likedByMe
                          ? 'bg-primary/15 text-primary'
                          : 'bg-white/[.04] text-muted-foreground hover:text-white'
                      }`}
                    >
                      <Heart className={`size-3.5 ${post.likedByMe ? 'fill-primary' : ''}`} />
                      {post.likeCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post._id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/[.04] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-white"
                    >
                      <MessageCircle className="size-3.5" />
                      {post.commentCount}
                    </button>
                  </div>

                  {expanded === post._id && (
                    <div className="mt-4 space-y-3 border-t border-white/[.06] pt-4">
                      {loadingComments === post._id ? (
                        <Skeleton className="h-12 bg-muted" />
                      ) : (comments[post._id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No comments yet.</p>
                      ) : (
                        (comments[post._id] || []).map((c) => (
                          <div key={c._id} className="rounded-lg bg-black/20 px-3 py-2">
                            <p className="text-xs font-semibold text-primary">{c.authorName}</p>
                            <p className="mt-0.5 text-sm text-[#c8d0cb]">{c.content}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2">
                        <input
                          value={commentDrafts[post._id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))
                          }
                          placeholder="Add a comment…"
                          className="h-10 flex-1 rounded-xl border border-white/[.09] bg-black/20 px-3 text-sm outline-none focus-visible:border-primary/45"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={submittingComment === post._id}
                          onClick={() => submitComment(post._id)}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
