'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Radio, Video, VideoOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate, AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'

interface LiveSessionDetail {
  _id: string
  title: string
  roomId: string
  status: string
  trainerId: string
  participantIds: string[]
  trainer?: { fullName: string } | null
}

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  fromUserId: string
  roomId: string
  targetUserId?: string
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

function isElite(user: { role?: string; subscription?: { plan?: string } } | null) {
  if (!user) return false
  if (user.role === 'trainer' || user.role === 'admin' || user.role === 'super_admin') return true
  return user.subscription?.plan === 'elite'
}

export default function LiveSessionRoomPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [session, setSession] = useState<LiveSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [connected, setConnected] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const makingOfferRef = useRef(false)
  const userIdRef = useRef('')

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    socketRef.current?.disconnect()
    socketRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  useEffect(() => {
    if (!user || !id) return
    userIdRef.current = user.id || user._id || ''

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const joinRes = await fetch(`/api/live-sessions/${id}/join`, { method: 'POST' })
        const joinData = await joinRes.json()
        if (!joinRes.ok) {
          if (joinRes.status === 403) {
            setSession(null)
            setJoined(false)
          } else {
            toast.error(joinData.message || 'Could not join')
          }
          const getRes = await fetch(`/api/live-sessions/${id}`)
          if (getRes.ok) {
            const getData = await getRes.json()
            if (!cancelled) setSession(getData.session)
          }
          return
        }
        if (cancelled) return
        setJoined(true)

        const getRes = await fetch(`/api/live-sessions/${id}`)
        if (getRes.ok) {
          const getData = await getRes.json()
          if (!cancelled) setSession(getData.session)
        } else if (!cancelled) {
          setSession(joinData.session)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, id])

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!)
    })

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream
      }
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current || !session?.roomId) return
      socketRef.current.emit('webrtc_signal', {
        roomId: session.roomId,
        type: 'ice',
        candidate: event.candidate.toJSON(),
      })
    }

    return pc
  }, [session?.roomId])

  const createAndSendOffer = useCallback(async () => {
    const socket = socketRef.current
    const roomId = session?.roomId
    if (!socket || !roomId) return
    const pc = ensurePeerConnection()
    try {
      makingOfferRef.current = true
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('webrtc_signal', {
        roomId,
        type: 'offer',
        sdp: pc.localDescription,
      })
    } catch (err) {
      console.error('Offer error:', err)
    } finally {
      makingOfferRef.current = false
    }
  }, [ensurePeerConnection, session?.roomId])

  useEffect(() => {
    if (!joined || !session?.roomId || !user) return

    let cancelled = false

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch {
        setMediaError('Camera/microphone access denied or unavailable.')
        return
      }

      const socket = io({
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'],
      })
      socketRef.current = socket

      socket.on('connect', () => {
        setConnected(true)
        socket.emit('join_live_room', { roomId: session.roomId }, (res: { ok?: boolean }) => {
          if (!res?.ok) toast.error('Failed to join signaling room')
        })
      })

      socket.on('disconnect', () => setConnected(false))

      socket.on('peer_joined', async (payload: { userId: string }) => {
        if (payload.userId === userIdRef.current) return
        await createAndSendOffer()
      })

      socket.on('webrtc_signal', async (payload: SignalPayload) => {
        if (payload.fromUserId === userIdRef.current) return
        if (payload.targetUserId && payload.targetUserId !== userIdRef.current) return

        const pc = ensurePeerConnection()
        try {
          if (payload.type === 'offer' && payload.sdp) {
            await pc.setRemoteDescription(payload.sdp)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            socket.emit('webrtc_signal', {
              roomId: session.roomId,
              type: 'answer',
              sdp: pc.localDescription,
              targetUserId: payload.fromUserId,
            })
          } else if (payload.type === 'answer' && payload.sdp) {
            await pc.setRemoteDescription(payload.sdp)
          } else if (payload.type === 'ice' && payload.candidate) {
            try {
              await pc.addIceCandidate(payload.candidate)
            } catch {
              // ignore late candidates
            }
          }
        } catch (err) {
          console.error('Signal handling error:', err)
        }
      })
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [joined, session?.roomId, user, createAndSendOffer, ensurePeerConnection, cleanup])

  if (authLoading || loading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to join the session" />

  if (!joined && !isElite(user)) {
    return (
      <AccessGate
        icon={Radio}
        title="Elite membership required"
        description="Live training rooms are reserved for Elite members and the hosting trainer."
        action={
          <Link href="/subscription" className="btn-accent px-8 py-3 text-sm">
            Upgrade to Elite
          </Link>
        }
      />
    )
  }

  if (!session) {
    return (
      <AccessGate
        icon={VideoOff}
        title="Session unavailable"
        description="This live session could not be loaded or you are not allowed to join."
        action={
          <Link href="/live-sessions" className="btn-accent px-8 py-3 text-sm">
            Back to sessions
          </Link>
        }
      />
    )
  }

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Live room</p>
            <h1 className="display-title text-2xl md:text-3xl">{session.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.trainer?.fullName || 'Trainer'} ·{' '}
              {connected ? 'Connected' : 'Connecting…'}
            </p>
          </div>
          <Link
            href="/live-sessions"
            className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[.025] px-3 text-xs font-bold text-foreground hover:border-primary/30 hover:bg-primary/[.06] hover:text-primary"
          >
            Leave
          </Link>
        </div>

        {mediaError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {mediaError}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="elite-panel overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2 text-xs text-muted-foreground">
              <Video className="size-3.5 text-primary" />
              You
            </div>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full bg-black object-cover"
            />
          </div>
          <div className="elite-panel overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2 text-xs text-muted-foreground">
              <Radio className="size-3.5 text-primary" />
              Remote
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="aspect-video w-full bg-black object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
