'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import Pusher from 'pusher-js'
import { Activity, Filter, Heart, MessageCircle, Search, Send, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessCommunityForUser } from '@/lib/access'
import { COMMUNITY_POST_CATEGORIES } from '@/lib/community'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { BackButton } from '@/components/shared/BackButton'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Avatar } from '@/components/shared/Avatar'
import { FadeIn } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormSelect } from '@/components/ui/form-select'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeaderboardEntry } from '@/types/gamification'

const CATEGORIES = COMMUNITY_POST_CATEGORIES
type PostCategory = (typeof CATEGORIES)[number]

type FeedSort = 'newest' | 'liked' | 'commented'
type FeedScope = 'all' | 'mine' | 'liked'

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'liked', label: 'Most Liked' },
  { value: 'commented', label: 'Most Discussed' },
]

const SCOPE_OPTIONS: { value: FeedScope; label: string }[] = [
  { value: 'all', label: 'All Posts' },
  { value: 'mine', label: 'My Posts' },
  { value: 'liked', label: 'Liked by Me' },
]

function filterPillClass(active: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
    active
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border text-muted-foreground hover:border-primary/25'
  }`
}

function postMatchesFilters(
  post: CommunityPostItem,
  filters: {
    category: PostCategory | 'all'
    sort: FeedSort
    scope: FeedScope
    search: string
    userId?: string
  },
) {
  if (filters.category !== 'all' && post.category !== filters.category) return false
  if (filters.scope === 'mine' && post.authorId !== filters.userId) return false
  if (filters.scope === 'liked' && !post.likedByMe) return false
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const haystack = `${post.content} ${post.authorName}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

interface CommunityPostItem {
  _id: string
  authorId: string
  authorName: string
  authorImage?: string
  authorRole?: string
  content: string
  category?: PostCategory | string
  likeCount: number
  likedByMe: boolean
  commentCount: number
  createdAt: string
}

interface CommunityCommentItem {
  _id: string
  authorName: string
  authorImage?: string
  content: string
  createdAt: string
}

interface CommunityStats {
  totalPosts: number
  totalMembers: number
  mostActiveToday: string
  mostActiveTodayPosts: number
}

function roleLabel(role?: string) {
  if (role === 'trainer') return 'Trainer'
  if (role === 'gym_owner') return 'Gym Owner'
  if (role === 'admin' || role === 'super_admin') return 'Admin'
  return 'User'
}

function isPusherClientConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  )
}

export default function CommunityPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [posts, setPosts] = useState<CommunityPostItem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [compose, setCompose] = useState('')
  const [category, setCategory] = useState<PostCategory>('Motivation')
  const [posting, setPosting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, CommunityCommentItem[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState<PostCategory | 'all'>('all')
  const [sortFilter, setSortFilter] = useState<FeedSort>('newest')
  const [scopeFilter, setScopeFilter] = useState<FeedScope>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    sortFilter !== 'newest' ||
    scopeFilter !== 'all' ||
    searchQuery.length > 0

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchInput])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (sortFilter !== 'newest') params.set('sort', sortFilter)
      if (scopeFilter === 'mine') params.set('mine', 'true')
      if (scopeFilter === 'liked') params.set('liked', 'true')
      if (searchQuery) params.set('search', searchQuery)

      const qs = params.toString()
      const res = await fetch(`/api/community/posts${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load feed')
      setPosts(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load community')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, sortFilter, scopeFilter, searchQuery])

  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true)
    try {
      const res = await fetch('/api/gamification/me?leaderboard=true', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load leaderboard')
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : [])
    } catch {
      setLeaderboard([])
    } finally {
      setLoadingLeaderboard(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/community/stats', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load stats')
      setStats({
        totalPosts: data.totalPosts ?? 0,
        totalMembers: data.totalMembers ?? 0,
        mostActiveToday: data.mostActiveToday || '—',
        mostActiveTodayPosts: data.mostActiveTodayPosts ?? 0,
      })
    } catch {
      setStats(null)
    } finally {
      setLoadingStats(false)
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

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/community/stats')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load stats')
      setStats({
        totalPosts: data.totalPosts ?? 0,
        totalMembers: data.totalMembers ?? 0,
        mostActiveToday: data.mostActiveToday || '—',
        mostActiveTodayPosts: data.mostActiveTodayPosts ?? 0,
      })
    } catch {
      setStats(null)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    if (user && canAccessCommunityForUser(user)) {
      loadPosts()
      loadLeaderboard()
      loadStats()
    }
  }, [user, loadPosts, loadLeaderboard, loadStats])

  useEffect(() => {
    if (!user || !canAccessCommunityForUser(user) || !isPusherClientConfigured()) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe('community')

    channel.bind('new-post', (data: { post?: CommunityPostItem }) => {
      const post = data?.post
      if (!post?._id) return
      const matches = postMatchesFilters(post, {
        category: categoryFilter,
        sort: sortFilter,
        scope: scopeFilter,
        search: searchQuery,
        userId: user?.id,
      })
      if (!matches) return
      let didAdd = false
      setPosts((prev) => {
        if (prev.some((p) => p._id === post._id)) return prev
        didAdd = true
        const next = [post, ...prev]
        if (sortFilter === 'liked') {
          next.sort((a, b) => b.likeCount - a.likeCount || +new Date(b.createdAt) - +new Date(a.createdAt))
        } else if (sortFilter === 'commented') {
          next.sort(
            (a, b) =>
              b.commentCount - a.commentCount || +new Date(b.createdAt) - +new Date(a.createdAt),
          )
        }
        return next
      })
      if (didAdd) {
        setStats((s) => (s ? { ...s, totalPosts: s.totalPosts + 1 } : s))
      }
    })

    channel.bind(
      'post-liked',
      (data: { postId?: string; likeCount?: number }) => {
        if (!data?.postId || typeof data.likeCount !== 'number') return
        setPosts((prev) =>
          prev.map((p) =>
            p._id === data.postId ? { ...p, likeCount: data.likeCount! } : p,
          ),
        )
      },
    )

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('community')
      pusher.disconnect()
    }
  }, [user, categoryFilter, sortFilter, scopeFilter, searchQuery])

  const clearFilters = () => {
    setCategoryFilter('all')
    setSortFilter('newest')
    setScopeFilter('all')
    setSearchInput('')
    setSearchQuery('')
  }

  const emptyFeedMessage = useMemo(() => {
    if (hasActiveFilters) {
      return 'No posts match your filters. Try adjusting category, sort, or search.'
    }
    return '🏃 Be the first to post in the community!'
  }, [hasActiveFilters])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compose.trim()) return toast.error('Write something first')
    setPosting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: compose.trim(), category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to post')
      setCompose('')
      setCategory('Motivation')
      const newPost = data as CommunityPostItem
      const visible =
        postMatchesFilters(newPost, {
          category: categoryFilter,
          sort: sortFilter,
          scope: scopeFilter,
          search: searchQuery,
          userId: user?.id,
        }) || newPost.authorId === user?.id

      setPosts((prev) => {
        if (prev.some((p) => p._id === newPost._id)) return prev
        if (!visible) return prev
        return [newPost, ...prev]
      })
      setStats((prev) =>
        prev ? { ...prev, totalPosts: prev.totalPosts + 1 } : prev,
      )
      toast.success('Post shared!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Post failed')
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (postId: string) => {
    if (likingIds.has(postId)) return

    const snapshot = posts.find((p) => p._id === postId)
    if (!snapshot) return

    const nextLiked = !snapshot.likedByMe
    const nextCount = Math.max(0, snapshot.likeCount + (nextLiked ? 1 : -1))

    setLikingIds((prev) => new Set(prev).add(postId))
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, likedByMe: nextLiked, likeCount: nextCount } : p,
      ),
    )

    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, { method: 'POST', credentials: 'include' })
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
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, likedByMe: snapshot.likedByMe, likeCount: snapshot.likeCount }
            : p,
        ),
      )
      toast.error(error instanceof Error ? error.message : 'Like failed')
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
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
      const res = await fetch(`/api/community/posts/${postId}/comments`, { credentials: 'include' })
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
        credentials: 'include',
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
      toast.success('Comment added')
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
      <div className="mx-auto max-w-6xl">
        <BackButton />
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-8 sm:px-8 gym-floor">
            <p className="eyebrow mb-2">Member Circle</p>
            <h1 className="display-title text-3xl md:text-4xl">Community Feed</h1>
            <p className="mt-2 text-muted-foreground">
              Share wins, ask questions, and cheer on other members.{' '}
              <Link href="/leaderboard" className="text-primary font-semibold hover:underline">
                View leaderboard →
              </Link>
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left — feed */}
          <div className="min-w-0 space-y-4">
            <Card className="elite-panel border-border">
              <CardContent className="space-y-4 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Filter className="size-4 text-primary" />
                    Filter feed
                  </div>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search posts or authors…"
                    aria-label="Search community posts"
                    className="h-10 w-full rounded-xl border border-border bg-muted/60 pl-10 pr-3 text-sm text-foreground outline-none focus-visible:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/15"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className={filterPillClass(categoryFilter === 'all')}
                    >
                      All
                    </button>
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoryFilter(c)}
                        className={filterPillClass(categoryFilter === c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sort by
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortFilter(option.value)}
                        className={filterPillClass(sortFilter === option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Show
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SCOPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setScopeFilter(option.value)}
                        className={filterPillClass(scopeFilter === option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <>
                <Skeleton className="h-36 rounded-xl bg-muted" />
                <Skeleton className="h-36 rounded-xl bg-muted" />
                <Skeleton className="h-36 rounded-xl bg-muted" />
              </>
            ) : posts.length === 0 ? (
              <Card className="elite-panel border-border">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {emptyFeedMessage}
                  {hasActiveFilters ? (
                    <div className="mt-3">
                      <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post._id} className="elite-panel border-border">
                  <CardContent className="pt-5">
                    <div className="mb-3 flex items-start gap-3">
                      <UserAvatar
                        name={post.authorName}
                        image={post.authorImage || undefined}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{post.authorName}</p>
                          <Badge
                            variant="outline"
                            className="h-5 border-primary/25 bg-primary/10 px-2 text-[10px] text-primary"
                          >
                            {roleLabel(post.authorRole)}
                          </Badge>
                          {post.category ? (
                            <Badge
                              variant="secondary"
                              className="h-5 px-2 text-[10px] text-muted-foreground"
                            >
                              {post.category}
                            </Badge>
                          ) : null}
                        </div>
                        <time className="text-[11px] text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString()}
                        </time>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {post.content}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleLike(post._id)}
                        disabled={likingIds.has(post._id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          post.likedByMe
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Heart className={`size-3.5 ${post.likedByMe ? 'fill-primary' : ''}`} />
                        {post.likeCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleComments(post._id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <MessageCircle className="size-3.5" />
                        {post.commentCount}
                        <span className="ml-0.5 hidden sm:inline">Comments</span>
                      </button>
                    </div>

                    {expanded === post._id && (
                      <div className="mt-4 space-y-3 border-t border-border pt-4">
                        {loadingComments === post._id ? (
                          <Skeleton className="h-12 bg-muted" />
                        ) : (comments[post._id] || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No comments yet.</p>
                        ) : (
                          (comments[post._id] || []).map((c) => (
                            <div key={c._id} className="flex gap-2 rounded-lg bg-muted/50 px-3 py-2">
                              <UserAvatar
                                name={c.authorName}
                                image={c.authorImage}
                                size={32}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-primary">{c.authorName}</p>
                                  <time className="text-[10px] text-muted-foreground">
                                    {new Date(c.createdAt).toLocaleString()}
                                  </time>
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">{c.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                        <div className="flex gap-2">
                          <input
                            value={commentDrafts[post._id] || ''}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [post._id]: e.target.value,
                              }))
                            }
                            placeholder="Add a comment…"
                            className="h-10 flex-1 rounded-xl border border-border bg-muted/50 px-3 text-sm outline-none focus-visible:border-primary/45"
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

          {/* Right — create + stats + leaderboard */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="elite-panel border-border">
              <CardHeader>
                <CardTitle className="text-base">Share with the community</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePost} className="space-y-3">
                  <textarea
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Share a workout win, ask for advice, or motivate others..."
                    className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-foreground outline-none focus-visible:border-primary/45 focus-visible:ring-3 focus-visible:ring-ring/15"
                  />
                  <FormSelect
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PostCategory)}
                    aria-label="Post category"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </FormSelect>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{compose.length}/2000</span>
                    <Button type="submit" disabled={posting} size="sm">
                      <Send className="size-3.5" />
                      {posting ? 'Posting…' : 'Post'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="elite-panel border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-primary" />
                  Community Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 bg-muted" />
                    <Skeleton className="h-10 bg-muted" />
                    <Skeleton className="h-10 bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">Total Posts</span>
                      <span className="text-sm font-bold text-foreground">
                        {stats?.totalPosts ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">Total Members</span>
                      <span className="text-sm font-bold text-foreground">
                        {stats?.totalMembers ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">Most Active Today</span>
                      <span className="max-w-[50%] truncate text-right text-sm font-bold text-primary">
                        {stats?.mostActiveToday || '—'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="elite-panel border-border">
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
                  <p className="py-4 text-center text-sm text-muted-foreground">
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
                            : 'border-border bg-muted/50'
                        }`}
                      >
                        <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                          {entry.rank}
                        </span>
                        <Avatar
                          name={entry.fullName}
                          avatarUrl={entry.avatarUrl || entry.profileImage}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
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
          </aside>
        </div>
      </div>
    </div>
  )
}
