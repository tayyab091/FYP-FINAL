import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { aiPlanRequestSchema, generatedWorkoutPlanSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAi } from '@/lib/rate-limit'

const GOALS_MAP: Record<
  string,
  {
    title: string
    weeklySchedule: Array<{
      day: string
      isRestDay: boolean
      exercises: Array<{
        name: string
        sets: number
        reps: string
        restSeconds: number
        notes: string
      }>
    }>
  }
> = {
  weight_loss: {
    title: 'Fat Burning Circuit Program',
    weeklySchedule: [
      {
        day: 'Monday',
        isRestDay: false,
        exercises: [
          { name: 'Burpees', sets: 3, reps: '15', restSeconds: 45, notes: 'Full explosive movement' },
          { name: 'Mountain Climbers', sets: 3, reps: '30 sec', restSeconds: 30, notes: 'Keep hips level' },
          { name: 'Jump Squats', sets: 3, reps: '20', restSeconds: 45, notes: 'Land softly' },
          { name: 'Push-Ups', sets: 3, reps: '15', restSeconds: 45, notes: 'Full range' },
          { name: 'High Knees', sets: 3, reps: '30 sec', restSeconds: 30, notes: 'Pump arms' },
        ],
      },
      { day: 'Tuesday', isRestDay: true, exercises: [] },
      {
        day: 'Wednesday',
        isRestDay: false,
        exercises: [
          { name: 'Squat to Press', sets: 3, reps: '12', restSeconds: 60, notes: 'Compound movement' },
          { name: 'Reverse Lunges', sets: 3, reps: '12 each', restSeconds: 45, notes: 'Keep front knee over ankle' },
          { name: 'Plank', sets: 3, reps: '45 sec', restSeconds: 30, notes: 'Keep body straight' },
          { name: 'Tricep Dips', sets: 3, reps: '15', restSeconds: 45, notes: 'Use chair' },
          { name: 'Bicycle Crunches', sets: 3, reps: '20 total', restSeconds: 30, notes: 'Slow and controlled' },
        ],
      },
      { day: 'Thursday', isRestDay: true, exercises: [] },
      {
        day: 'Friday',
        isRestDay: false,
        exercises: [
          { name: 'Box Jumps', sets: 4, reps: '10', restSeconds: 60, notes: 'Land with soft knees' },
          { name: 'Push-Up to Row', sets: 3, reps: '10', restSeconds: 60, notes: 'Need dumbbells' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', restSeconds: 60, notes: 'Rear foot elevated' },
          { name: 'Russian Twists', sets: 3, reps: '20 total', restSeconds: 30, notes: 'Feet off ground' },
          { name: 'Jumping Jacks', sets: 3, reps: '45 sec', restSeconds: 30, notes: 'Cooldown cardio' },
        ],
      },
      { day: 'Saturday', isRestDay: true, exercises: [] },
      { day: 'Sunday', isRestDay: true, exercises: [] },
    ],
  },
  muscle_gain: {
    title: 'Hypertrophy Mass Builder',
    weeklySchedule: [
      {
        day: 'Monday',
        isRestDay: false,
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '8-10', restSeconds: 90, notes: 'Control the descent' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 75, notes: 'Upper chest focus' },
          { name: 'Cable Flyes', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Squeeze at peak' },
          { name: 'Shoulder Press', sets: 4, reps: '8-10', restSeconds: 90, notes: 'Full ROM' },
          { name: 'Lateral Raises', sets: 3, reps: '15', restSeconds: 45, notes: 'Control eccentric' },
        ],
      },
      {
        day: 'Tuesday',
        isRestDay: false,
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '5-6', restSeconds: 120, notes: 'Keep bar close to body' },
          { name: 'Barbell Row', sets: 4, reps: '8-10', restSeconds: 90, notes: 'Squeeze shoulder blades' },
          { name: 'Pull-Ups', sets: 3, reps: '8-10', restSeconds: 90, notes: 'Full dead hang' },
          { name: 'Face Pulls', sets: 3, reps: '15', restSeconds: 45, notes: 'Rear delt focus' },
          { name: 'Bicep Curls', sets: 3, reps: '12', restSeconds: 60, notes: 'Supinate at top' },
        ],
      },
      { day: 'Wednesday', isRestDay: true, exercises: [] },
      {
        day: 'Thursday',
        isRestDay: false,
        exercises: [
          { name: 'Squat', sets: 4, reps: '8-10', restSeconds: 120, notes: 'Depth below parallel' },
          { name: 'Leg Press', sets: 3, reps: '12', restSeconds: 90, notes: 'Full range' },
          { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 75, notes: 'Hamstring stretch' },
          { name: 'Leg Curls', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Isolate hamstrings' },
          { name: 'Calf Raises', sets: 4, reps: '20', restSeconds: 45, notes: 'Pause at top' },
        ],
      },
      {
        day: 'Friday',
        isRestDay: false,
        exercises: [
          { name: 'Overhead Press', sets: 4, reps: '6-8', restSeconds: 90, notes: 'Brace core' },
          { name: 'Arnold Press', sets: 3, reps: '10', restSeconds: 75, notes: 'Rotate through movement' },
          { name: 'Tricep Pushdown', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Elbows pinned' },
          { name: 'Skull Crushers', sets: 3, reps: '10-12', restSeconds: 75, notes: 'Bar to forehead' },
          { name: 'Hammer Curls', sets: 3, reps: '12', restSeconds: 60, notes: 'Brachialis focus' },
        ],
      },
      { day: 'Saturday', isRestDay: true, exercises: [] },
      { day: 'Sunday', isRestDay: true, exercises: [] },
    ],
  },
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAi(req)
    if (limited) return limited
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const parsed = await parseJsonBody(req, aiPlanRequestSchema)
    if ('error' in parsed) return parsed.error
    const { goal, daysPerWeek: days, equipment, fitnessLevel, targetMuscles } = parsed.data
    const GEMINI_KEY = process.env.GEMINI_API_KEY

    const prompt = `You are an expert personal trainer. Generate a complete ${days}-day per week workout plan.

User details:
- Goal: ${goal}
- Fitness level: ${fitnessLevel}
- Available equipment: ${equipment}
- Target muscles/focus: ${targetMuscles || 'Full body'}

Generate a complete weekly workout plan. Return ONLY valid JSON in this exact format:
{
  "title": "Plan title based on goal",
  "goal": "${goal}",
  "durationWeeks": 8,
  "difficulty": "${fitnessLevel}",
  "weeklySchedule": [
    {
      "day": "Monday",
      "isRestDay": false,
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "10-12", "restSeconds": 60, "notes": "Form tip" }
      ]
    }
  ]
}

Rules:
- Include exactly ${days} workout days and ${7 - days} rest days
- Only include exercises possible with: ${equipment}
- Match difficulty to: ${fitnessLevel}
- Include 4-6 exercises per workout day
- Return ONLY the JSON object, no markdown, no explanation`

    if (GEMINI_KEY && GEMINI_KEY !== 'PASTE_GEMINI_KEY_HERE') {
      try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
          }),
        },
      )
      if (!res.ok) throw new Error('Plan provider unavailable')
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const validated = generatedWorkoutPlanSchema.safeParse(JSON.parse(clean))
        if (validated.success && validated.data.weeklySchedule.filter((day) => !day.isRestDay).length === days) {
          return NextResponse.json({ plan: validated.data, generated: true })
        }
      } catch {
        // fall through
      }
      } catch {
        // A provider outage must still allow the local plan generator to work.
      }
    }

    const template = GOALS_MAP[goal] || GOALS_MAP.muscle_gain
    const trainingDays = new Set(Array.from({ length: days }, (_, i) => Math.floor(i * 7 / days)))
    const workouts = template.weeklySchedule.filter((day) => !day.isRestDay)
    const bodyweight = ['Squat', 'Reverse Lunge', 'Push-up', 'Glute Bridge'].map((name) => ({ name, sets: fitnessLevel === 'beginner' ? 2 : 3, reps: '8-12', restSeconds: 60, notes: 'Use a comfortable range of motion' }))
    const plan = {
      ...template,
      goal: goal || 'muscle_gain',
      durationWeeks: 8,
      difficulty: fitnessLevel || 'intermediate',
      weeklySchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({
        day,
        isRestDay: !trainingDays.has(index),
        exercises: trainingDays.has(index) ? (equipment.toLowerCase().includes('full gym') ? workouts[index % workouts.length].exercises : bodyweight) : [],
      })),
    }
    return NextResponse.json({ plan, generated: false })
  } catch (error) {
    console.error('AI plan error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
