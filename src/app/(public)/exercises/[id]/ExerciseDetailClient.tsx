'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Dumbbell, Wrench, ArrowLeft } from 'lucide-react'
import { PageLoader } from '@/components/shared/PageLoader'
import { CatalogImageFrame } from '@/components/shared/CatalogImageFrame'
import { FadeIn } from '@/components/motion'
import { FitnessBadge } from '@/components/motion/FitnessBadge'

interface ExerciseDetail {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  gifUrl: string
  instructions: string
  sets: number | string
  reps: string
  bodyParts?: string[]
  targetMuscles?: string[]
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ExerciseDetailClient() {
  const { id } = useParams<{ id: string }>()
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/exercises?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setExercise(data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageLoader />

  if (!exercise) {
    return (
      <div className="min-h-screen pt-8 pb-24 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">Exercise not found</h1>
          <Link href="/exercises" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back to exercises
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/exercises" className="text-muted-foreground text-sm hover:text-primary mb-6 inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> All exercises
        </Link>

        <FadeIn>
          <div className="elite-panel rounded-2xl overflow-hidden">
            <CatalogImageFrame
              src={exercise.gifUrl}
              alt={`${exercise.name} — ${exercise.muscle} exercise demonstration`}
              variant="detail"
              fit="contain"
              priority
              hasError={imgError}
              onError={() => setImgError(true)}
              fallback={
                <div className="flex flex-col items-center text-muted-foreground">
                  <Dumbbell className="size-12 mb-2 text-primary/60" />
                  <p className="text-sm">Demo unavailable</p>
                </div>
              }
              badge={
                <span className={`absolute top-4 right-4 text-xs px-2.5 py-1 rounded-full border font-medium ${DIFFICULTY_COLORS[exercise.difficulty] || ''}`}>
                  {exercise.difficulty}
                </span>
              }
            />

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h1 className="display-title text-3xl md:text-4xl text-foreground">{exercise.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
                    {exercise.muscle}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="size-3.5" /> {exercise.equipment}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <FitnessBadge variant="sets">{exercise.sets} sets</FitnessBadge>
                <FitnessBadge variant="reps">{exercise.reps}</FitnessBadge>
              </div>

              {exercise.bodyParts && exercise.bodyParts.length > 0 && (
                <div>
                  <h2 className="workout-label text-muted-foreground mb-2">Body parts</h2>
                  <div className="flex flex-wrap gap-2">
                    {exercise.bodyParts.map((part) => (
                      <span key={part} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        {titleCase(part)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                <div>
                  <h2 className="workout-label text-muted-foreground mb-2">Target muscles</h2>
                  <div className="flex flex-wrap gap-2">
                    {exercise.targetMuscles.map((muscle) => (
                      <span key={muscle} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                        {titleCase(muscle)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="font-bold text-foreground mb-3">Instructions</h2>
                <p className="text-muted-foreground leading-relaxed">{exercise.instructions}</p>
              </div>

              <Link
                href="/exercise-check"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
              >
                Check your form with AI →
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
