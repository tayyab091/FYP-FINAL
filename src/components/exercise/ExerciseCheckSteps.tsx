'use client'

import { Camera, Dumbbell, Bot } from 'lucide-react'
import { StaggerChildren } from '@/components/motion'

const STEPS = [
  { icon: Camera, title: 'Enable Camera', desc: 'Click Start Camera and allow access' },
  { icon: Dumbbell, title: 'Select Exercise', desc: 'Choose squat, push-up, lunge, or plank' },
  { icon: Bot, title: 'Get Feedback', desc: 'AI tracks your joints and counts reps in real time' },
]

export function ExerciseCheckSteps() {
  return (
    <StaggerChildren className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
      {STEPS.map(s => {
        const Icon = s.icon
        return (
          <div key={s.title} className="elite-panel interactive-lift card-athletic rounded-2xl p-6 text-center">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.08] text-primary">
              <Icon className="size-5" strokeWidth={2.2} />
            </div>
            <h3 className="mb-2 font-bold text-white">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </div>
        )
      })}
    </StaggerChildren>
  )
}
