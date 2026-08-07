'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function AIGeneratorTab() {
  const [form, setForm] = useState({
    goal: 'muscle_gain',
    daysPerWeek: '4',
    equipment: 'Dumbbells, Barbell, Pull-up Bar',
    fitnessLevel: 'intermediate',
    targetMuscles: '',
  })
  const [loading, setLoading] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<{
    title: string
    goal: string
    durationWeeks: number
    difficulty: string
    weeklySchedule: Array<{
      day: string
      isRestDay: boolean
      exercises: Array<{ name: string; sets: number; reps: string; notes?: string }>
    }>
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const generate = async () => {
    setLoading(true)
    setGeneratedPlan(null)
    try {
      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setGeneratedPlan(data.plan)
        if (data.generated) toast.success('AI generated your personalized plan! 🤖')
        else toast.success('Plan ready! (Using template — add Gemini key for AI generation)')
      } else {
        toast.error(data.message || 'Failed to generate plan')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const savePlan = async () => {
    if (!generatedPlan) return
    setSaving(true)
    try {
      const res = await fetch('/api/tracking/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...generatedPlan, activateNow: true }),
      })
      if (res.ok) {
        toast.success('Plan saved and activated!')
        setGeneratedPlan(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || 'Failed to save plan')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary transition-colors'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="section-eyebrow">Powered by Gemini AI</p>
        <h2 className="text-2xl font-black text-foreground">Generate My Workout Plan</h2>
        <p className="text-muted-foreground text-sm mt-1">Answer a few questions and AI builds your personalized plan</p>
      </div>

      <div className="tile space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 font-medium">What is your primary goal?</label>
          <select
            value={form.goal}
            onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
            className={inputClass}
          >
            <option value="weight_loss">Weight Loss — Burn Fat</option>
            <option value="muscle_gain">Muscle Gain — Build Size</option>
            <option value="endurance">Endurance — Improve Stamina</option>
            <option value="general_fitness">General Fitness — Stay Healthy</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 font-medium">How many days per week can you train?</label>
          <div className="flex gap-3">
            {['3', '4', '5', '6'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, daysPerWeek: d }))}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                  form.daysPerWeek === d
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/25'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 font-medium">What equipment do you have access to?</label>
          <div className="flex flex-wrap gap-2">
            {['Bodyweight Only', 'Dumbbells', 'Barbell', 'Pull-up Bar', 'Resistance Bands', 'Full Gym'].map((eq) => {
              const selected = form.equipment.includes(eq)
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      equipment: selected
                        ? f.equipment
                            .replace(eq, '')
                            .replace(', ,', ',')
                            .trim()
                            .replace(/^,|,$/g, '')
                        : f.equipment
                          ? `${f.equipment}, ${eq}`
                          : eq,
                    }))
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'border-border text-muted-foreground hover:border-primary/25'
                  }`}
                >
                  {eq}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Your fitness level</label>
          <div className="flex gap-3 flex-wrap">
            {[
              { v: 'beginner', l: 'Beginner', desc: 'Less than 6 months' },
              { v: 'intermediate', l: 'Intermediate', desc: '6mo - 2 years' },
              { v: 'advanced', l: 'Advanced', desc: '2+ years' },
            ].map((level) => (
              <button
                key={level.v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, fitnessLevel: level.v }))}
                className={`flex-1 min-w-[7rem] py-3 px-2 rounded-xl text-sm font-bold border transition-all text-center ${
                  form.fitnessLevel === level.v
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/25'
                }`}
              >
                <div>{level.l}</div>
                <div className="text-[10px] font-normal opacity-70">{level.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-primary-foreground text-base transition-all disabled:opacity-50"
          style={{ background: loading ? '#555' : 'linear-gradient(135deg, #00ff87, #00d4ff)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              AI is generating your plan...
            </span>
          ) : (
            '🤖 Generate My Plan with AI'
          )}
        </button>
      </div>

      {generatedPlan && (
        <div className="tile space-y-4 border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-primary text-xs font-semibold uppercase tracking-wider">AI Generated</p>
              <h3 className="text-xl font-black text-foreground">{generatedPlan.title}</h3>
              <p className="text-muted-foreground text-sm">
                {generatedPlan.durationWeeks} weeks · {generatedPlan.difficulty} · {form.daysPerWeek} days/week
              </p>
            </div>
            <button
              type="button"
              onClick={savePlan}
              disabled={saving}
              className="btn-accent px-6 py-3 text-sm font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : '✓ Activate This Plan'}
            </button>
          </div>

          <div className="space-y-3">
            {generatedPlan.weeklySchedule?.map((day) => (
              <div
                key={day.day}
                className={`rounded-xl border p-4 ${day.isRestDay ? 'border-border bg-white/[0.02]' : 'border-border bg-white/[0.03]'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-foreground text-sm">{day.day}</p>
                  {day.isRestDay ? (
                    <span className="badge-accent text-xs bg-blue-500/20 text-blue-400">Rest Day 😴</span>
                  ) : (
                    <span className="badge-accent text-xs">{day.exercises?.length} exercises</span>
                  )}
                </div>
                {!day.isRestDay && day.exercises?.length > 0 && (
                  <div className="space-y-1.5">
                    {day.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 font-bold">
                          {i + 1}
                        </span>
                        <span className="text-foreground font-medium">{ex.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {ex.sets} × {ex.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
