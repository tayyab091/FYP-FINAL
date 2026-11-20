import Link from 'next/link'
import { Avatar } from '@/components/shared/Avatar'
import type { PublicGym } from '@/lib/gyms'

export function GymTrainers({ trainers, compact = false }: { trainers?: PublicGym['trainers']; compact?: boolean }) {
  if (!trainers?.length) return compact ? null : <p className="text-sm text-muted-foreground">No verified trainer profiles are currently listed for this gym.</p>
  return <div className={compact ? 'mt-3 flex flex-wrap gap-2' : 'grid gap-3 sm:grid-cols-2'} aria-label="Trainers registered with this gym">{trainers.map(trainer => <Link key={trainer.id} href={'/coaching/' + trainer.slug} className={'flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/50 ' + (compact ? 'px-2 py-1.5' : 'p-4')}>
    <Avatar name={trainer.name} avatarUrl={trainer.profileImage} size={compact ? 'xs' : 'md'} />
    <div className="min-w-0"><p className={'font-bold text-foreground ' + (compact ? 'text-xs' : 'text-sm')}>{trainer.name}</p>{!compact && <><p className="mt-1 text-xs text-muted-foreground">{trainer.specialty.join(' · ') || 'Fitness coaching'}</p><p className="mt-2 text-xs font-semibold text-primary">View trainer profile →</p></>}</div>
  </Link>)}</div>
}
