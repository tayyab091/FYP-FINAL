'use client'

import Link from 'next/link'
import { Activity, ArrowRight, Dumbbell, Target, Wrench } from 'lucide-react'
import { parseInstructionSteps } from '@/lib/parse-instruction-steps'

export interface ExerciseMoreInfoData {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
  bodyParts?: string[]
  targetMuscles?: string[]
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'border-green-600/30 bg-green-500/10 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-400',
  Intermediate: 'border-yellow-600/30 bg-yellow-500/10 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/15 dark:text-yellow-400',
  Advanced: 'border-red-600/30 bg-red-500/10 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400',
}

const MUSCLE_COLORS: Record<string, string> = {
  Chest: 'border-blue-600/30 bg-blue-500/10 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400',
  Back: 'border-purple-600/30 bg-purple-500/10 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-400',
  Legs: 'border-orange-600/30 bg-orange-500/10 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-400',
  Shoulders: 'border-cyan-600/30 bg-cyan-500/10 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-400',
  Arms: 'border-pink-600/30 bg-pink-500/10 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/15 dark:text-pink-400',
  Core: 'border-primary/30 bg-primary/10 text-primary',
  Cardio: 'border-red-600/30 bg-red-500/10 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400',
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

interface ExerciseMoreInfoPanelProps {
  exercise: ExerciseMoreInfoData
}

export function ExerciseMoreInfoPanel({ exercise }: ExerciseMoreInfoPanelProps) {
  const steps = parseInstructionSteps(exercise.instructions, 4)
  const targets = exercise.targetMuscles?.slice(0, 4) ?? []
  const bodyPart = exercise.bodyParts?.[0]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <span
          className={`workout-badge rounded-full border px-1.5 py-px ${MUSCLE_COLORS[exercise.muscle] || 'border-border bg-muted/60 text-muted-foreground'}`}
        >
          {exercise.muscle}
        </span>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 px-1.5 py-px text-[9px] text-muted-foreground">
          <Wrench className="size-2.5 text-emerald-600/80 dark:text-emerald-400/80" />
          {exercise.equipment}
        </span>
        <span
          className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${DIFFICULTY_COLORS[exercise.difficulty] || 'border-border text-muted-foreground'}`}
        >
          {exercise.difficulty}
        </span>
      </div>

      {targets.length > 0 && (
        <div>
          <p className="workout-label mb-1 flex items-center gap-1 text-emerald-700/80 dark:text-emerald-400/70">
            <Target className="size-2.5" />
            Target muscles
          </p>
          <div className="flex flex-wrap gap-1">
            {targets.map((muscle) => (
              <span
                key={muscle}
                className="rounded-full border border-emerald-600/25 bg-emerald-500/10 px-1.5 py-px text-[9px] font-medium text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
              >
                {titleCase(muscle)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-[9px]">
        {bodyPart && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
            <Activity className="size-2.5 text-emerald-600/70 dark:text-emerald-400/70" />
            {titleCase(bodyPart)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-600/15 bg-emerald-500/[.06] px-1.5 py-0.5 text-emerald-800/90 dark:border-emerald-400/15 dark:bg-emerald-400/[.06] dark:text-emerald-300/90">
          <Dumbbell className="size-2.5" />
          Form cues below
        </span>
      </div>

      <div>
        <p className="workout-label mb-1.5 text-muted-foreground">Instructions</p>
        {steps.length > 1 ? (
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-1.5 text-[9px] leading-snug text-muted-foreground">
                <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[8px] font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400">
                  {i + 1}
                </span>
                <span className="line-clamp-2">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[9px] leading-relaxed text-muted-foreground line-clamp-4">
            {exercise.instructions}
          </p>
        )}
      </div>

      <Link
        href={`/exercises/${exercise.id}`}
        className="group inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-500/20 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
      >
        View full exercise
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
