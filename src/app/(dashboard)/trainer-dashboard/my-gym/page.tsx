'use client'

import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Star, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActivityRefresh } from '@/hooks/useActivityRefresh'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate } from '@/components/shared/AccessGate'
import { PagePhoto } from '@/components/shared/PagePhoto'
import type { PublicGym } from '@/lib/gyms'
import { GymReviews } from '@/components/gyms/GymReviews'

interface MyGymData {
  gym: PublicGym | null
  connection: { gymName: string; gymApproval: string; adminApproval: string; fullyVerified: boolean }
}

function Approval({ label, status }: { label: string; status: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={'mt-2 text-sm font-bold capitalize ' + (status === 'approved' || status === 'verified' ? 'text-primary' : status === 'rejected' ? 'text-destructive' : 'text-foreground')}>{status}</p></div>
}

export default function TrainerGymPage() {
  const queryClient = useQueryClient()
  const { user, isLoading } = useAuth()
  const enabled = !isLoading && user?.role === 'trainer'
  const query = useQuery<MyGymData>({
    queryKey: ['trainer', 'my-gym', user?.id], enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/trainers/my-gym', { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]), cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load your gym')
      return data
    },
  })
  useActivityRefresh(() => query.refetch(), enabled, 15000)
  if (isLoading) return <PageLoader label="Loading your gym connection" />
  if (!enabled) return <AccessGate icon={Building2} title="Trainer access only" description="Sign in as a trainer to view your gym affiliation." />
  const gym = query.data?.gym
  const connection = query.data?.connection

  return <div className="dashboard-fab-reserve min-h-screen px-4 py-6 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="page-hero fitness-photo-hero px-6 py-8 sm:px-8"><PagePhoto kind="gym" /><p className="eyebrow">Your training base</p><h1 className="mt-3 text-3xl font-black text-foreground">My Gym</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Your gym affiliation, approval status, and facility details in one place.</p></div>
    {query.isPending ? <PageLoader label="Loading gym details" /> : query.isError ? <div role="alert" className="elite-panel p-6"><p>{query.error.message}</p><button type="button" onClick={() => void query.refetch()} className="btn-outline mt-4"><RefreshCw size={16} />Retry</button></div> : <>
      {connection && <div className="grid gap-3 sm:grid-cols-3"><Approval label="Gym approval" status={connection.gymApproval} /><Approval label="Admin approval" status={connection.adminApproval} /><Approval label="Profile verification" status={connection.fullyVerified ? 'verified' : 'pending'} /></div>}
      {!gym ? <section className="elite-panel p-8 text-center"><Building2 className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-xl font-bold">No gym connection is available</h2><p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{connection?.gymName ? `Your requested gym is ${connection.gymName}. Contact the gym owner to confirm your affiliation.` : 'Your trainer profile does not have a linked gym yet. Contact your gym owner to complete the affiliation.'}</p><Link href="/gyms" className="btn-outline mt-5">Browse gyms</Link></section> : <>
        {connection?.gymApproval !== 'approved' && <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm">{connection?.gymApproval === 'rejected' ? 'Your gym application was rejected. Contact the gym to discuss your affiliation.' : 'Your gym application is awaiting approval. The details below belong to your requested gym.'}</p>}
        <section className="elite-panel p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{connection?.gymApproval === 'approved' ? 'Connected gym' : 'Requested gym'}</p><h2 className="mt-2 text-2xl font-extrabold">{gym.name}</h2><p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={17} className="shrink-0 text-primary" />{gym.address}{gym.city && !gym.address.includes(gym.city) ? ', ' + gym.city : ''}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold capitalize"><ShieldCheck size={15} className="text-primary" />{gym.verificationStatus}</span></div><p className="mt-5 text-sm leading-relaxed text-muted-foreground">{gym.description}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><Users size={19} className="text-primary" /><p className="mt-2 text-lg font-bold">{gym.trainersCount}</p><p className="text-xs text-muted-foreground">Listed trainers</p></div><div className="rounded-xl border border-border p-4"><Star size={19} className="text-primary" /><p className="mt-2 text-lg font-bold">{gym.reviewsCount ? gym.rating.toFixed(1) + ' / 5' : 'No reviews yet'}</p><p className="text-xs text-muted-foreground">{gym.reviewsCount} gym reviews</p></div></div>
          {gym.facilities.length > 0 && <div className="mt-6"><h3 className="text-sm font-bold">Facilities</h3><div className="mt-3 flex flex-wrap gap-2">{gym.facilities.map(facility => <span key={facility} className="rounded-lg border border-border bg-muted px-3 py-2 text-xs">{facility}</span>)}</div></div>}
          <div className="mt-6 flex flex-wrap gap-3">{gym.phone && <a href={'tel:' + gym.phone.replace(/[^+\d]/g, '')} className="btn-outline text-sm"><Phone size={16} />{gym.phone}</a>}{gym.email && <a href={'mailto:' + gym.email} className="btn-outline text-sm"><Mail size={16} />Email gym</a>}<a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(gym.name + ' ' + gym.address)} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm"><MapPin size={16} />View on Google Maps</a>{gym.verificationStatus === 'verified' && <Link href={'/gyms/' + gym.slug} className="btn-accent text-sm">View gym profile</Link>}</div>
        </section>
        {gym.verificationStatus === 'verified' && connection?.gymApproval === 'approved' && <GymReviews slug={gym.slug} onRatingChange={(rating, reviewsCount) => queryClient.setQueryData<MyGymData>(['trainer', 'my-gym', user?.id], current => current?.gym ? { ...current, gym: { ...current.gym, rating, reviewsCount } } : current)} />}
      </>}
    </>}
  </div></div>
}
