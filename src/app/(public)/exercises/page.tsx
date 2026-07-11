'use client'
import { useState, useEffect } from 'react'

interface Exercise {
  id: number
  name: string
  muscle: string
  equipment: string
  difficulty: string
  gifUrl: string
  instructions: string
  sets: number | string
  reps: string
}

const FALLBACK_EXERCISES: Exercise[] = [
  { id: 1, name: 'Push-Up', muscle: 'Chest', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Pushup_from_the_side.gif/320px-Pushup_from_the_side.gif', instructions: 'Start in high plank. Lower chest to floor keeping elbows at 45°. Push back up explosively. Keep core braced.', sets: 3, reps: '15' },
  { id: 2, name: 'Squat', muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Squat_animation.gif/240px-Squat_animation.gif', instructions: 'Feet shoulder-width. Push hips back and down until thighs parallel. Drive through heels to stand.', sets: 3, reps: '20' },
  { id: 3, name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://media1.tenor.com/m/TFUbZgW7RLEAAAAC/plank.gif', instructions: 'Forearms on ground elbows under shoulders. Body straight from head to heels. Breathe steadily.', sets: 3, reps: '45 sec' },
  { id: 4, name: 'Pull-Up', muscle: 'Back', equipment: 'Pull-up Bar', difficulty: 'Intermediate', gifUrl: 'https://media1.tenor.com/m/K3a7oN5jGW4AAAAd/pull-up.gif', instructions: 'Grip bar overhand shoulder-width. Pull chest to bar squeezing lats. Lower with full control.', sets: 3, reps: '8' },
  { id: 5, name: 'Deadlift', muscle: 'Back', equipment: 'Barbell', difficulty: 'Intermediate', gifUrl: 'https://media1.tenor.com/m/BIrFBxQxvAIAAAAC/deadlift.gif', instructions: 'Bar over mid-foot. Hinge at hips, grip just outside legs. Drive through floor keeping back straight.', sets: 4, reps: '8' },
  { id: 6, name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', difficulty: 'Intermediate', gifUrl: 'https://media1.tenor.com/m/kGGAQJBTZvQAAAAC/bench-press.gif', instructions: 'Lie on bench. Grip slightly wider than shoulders. Lower bar to lower chest. Press up to full extension.', sets: 4, reps: '10' },
  { id: 7, name: 'Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbells', difficulty: 'Intermediate', gifUrl: 'https://media1.tenor.com/m/eQqNmNmDXfQAAAAC/shoulder-press.gif', instructions: 'Sit upright. Start with dumbbells at shoulder height. Press overhead until arms fully extended.', sets: 3, reps: '12' },
  { id: 8, name: 'Bicep Curl', muscle: 'Arms', equipment: 'Dumbbells', difficulty: 'Beginner', gifUrl: 'https://media1.tenor.com/m/uiLJhRXJzMUAAAAC/bicep-curl-dumbbell.gif', instructions: 'Stand holding dumbbells. Keep elbows tucked. Curl to shoulder height. Squeeze at top.', sets: 3, reps: '12' },
  { id: 9, name: 'Lunge', muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://media1.tenor.com/m/xC4WJNO2CGIAAAAC/lunge-exercise.gif', instructions: 'Step forward into lunge. Lower back knee toward floor. Front knee stays over ankle.', sets: 3, reps: '12 each' },
  { id: 10, name: 'Mountain Climbers', muscle: 'Cardio', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://media1.tenor.com/m/7mphJSAGvvEAAAAC/mountain-climbers.gif', instructions: 'High plank position. Drive knees to chest alternately. Keep hips level. Move fast.', sets: 3, reps: '30 sec' },
  { id: 11, name: 'Burpee', muscle: 'Cardio', equipment: 'Bodyweight', difficulty: 'Intermediate', gifUrl: 'https://media1.tenor.com/m/KdYy62HHHbMAAAAC/burpees.gif', instructions: 'From standing: drop to squat, kick feet back to plank, do push-up, jump feet back, explode up.', sets: 3, reps: '10' },
  { id: 12, name: 'Russian Twist', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'Intermediate', gifUrl: 'https://media1.tenor.com/m/RPzSMZPIiLsAAAAC/russian-twist.gif', instructions: 'Sit at 45 degrees feet off floor. Rotate torso side to side. Keep core braced.', sets: 3, reps: '20 total' },
]

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio']
const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
}
const MUSCLE_COLORS: Record<string, string> = {
  Chest: 'bg-blue-500/20 text-blue-400',
  Back: 'bg-purple-500/20 text-purple-400',
  Legs: 'bg-orange-500/20 text-orange-400',
  Shoulders: 'bg-cyan-500/20 text-cyan-400',
  Arms: 'bg-pink-500/20 text-pink-400',
  Core: 'bg-[#00ff87]/20 text-[#00ff87]',
  Cardio: 'bg-red-500/20 text-red-400',
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <div className="glass rounded-2xl overflow-hidden hover:border-[#2a2a2a] transition-colors">
      <div className="relative h-48 bg-[#0d0d0d] flex items-center justify-center overflow-hidden">
        {!imgError ? (
          <img src={exercise.gifUrl} alt={exercise.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#555]">
            <div className="text-4xl mb-2">🏋️</div>
            <p className="text-xs">{exercise.name}</p>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[exercise.difficulty] || ''}`}>
            {exercise.difficulty}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-white">{exercise.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MUSCLE_COLORS[exercise.muscle] || 'bg-[#1a1a1a] text-[#a0a0a0]'}`}>
            {exercise.muscle}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-[#a0a0a0]">🔧 {exercise.equipment}</span>
          <span className="text-xs text-[#a0a0a0]">• {exercise.sets} sets × {exercise.reps}</span>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="w-full text-left text-xs text-[#00ff87] hover:text-[#00cc6a] transition-colors font-medium">
          {expanded ? '▲ Hide instructions' : '▼ View instructions'}
        </button>

        {expanded && (
          <p className="mt-2 text-xs text-[#a0a0a0] leading-relaxed border-t border-[#1a1a1a] pt-2">
            {exercise.instructions}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ExercisesPage() {
  const [muscle, setMuscle] = useState('All')
  const [search, setSearch] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>(FALLBACK_EXERCISES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    setLoading(true)

    fetch('/api/exercises', { signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setExercises(data)
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setLoading(false) })

    return () => { controller.abort(); clearTimeout(timeout) }
  }, [])

  const filtered = exercises.filter(e => {
    const matchesMuscle = muscle === 'All' || e.muscle === muscle
    const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchesMuscle && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <p className="text-[#00ff87] text-sm font-semibold uppercase tracking-widest mb-2">Exercise Library</p>
          <h1 className="text-4xl font-black text-white mb-2">Exercises</h1>
          <p className="text-[#a0a0a0]">Learn proper form for every movement with demonstration GIFs</p>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full glass rounded-2xl px-5 py-3.5 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors mb-6"
        />

        <div className="flex gap-2 flex-wrap mb-8">
          {MUSCLE_GROUPS.map(g => (
            <button key={g} onClick={() => setMuscle(g)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                muscle === g
                  ? 'bg-[#00ff87] text-black border-[#00ff87]'
                  : 'bg-transparent text-[#a0a0a0] border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}>
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="h-48 skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 skeleton w-3/4" />
                  <div className="h-3 skeleton w-1/2" />
                  <div className="h-8 skeleton rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(e => <ExerciseCard key={e.id} exercise={e} />)}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-bold text-white mb-2">No exercises found</h3>
            <p className="text-[#a0a0a0] text-sm">Try a different search or filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
