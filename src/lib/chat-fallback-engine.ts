type Gender = 'male' | 'female'

const LBS_TO_KG = 0.453592
const WEIGHT_CONFLICT_TOLERANCE = 0.05

export interface ParsedStats {
  weight?: number
  height?: number
  age?: number
  gender?: Gender
}

interface WeightResolution {
  weightKg?: number
  conflictMessage?: string
}

const CALORIE_TARGETS = [
  { label: 'Aggressive Fat Loss', offset: -750 },
  { label: 'Fat Loss', offset: -500 },
  { label: 'Lean Recomp', offset: -200 },
  { label: 'Maintain', offset: 0 },
  { label: 'Lean Muscle Gain', offset: 250 },
  { label: 'Bulk', offset: 500 },
] as const

function resolveWeightKg(text: string): WeightResolution {
  const lower = text.toLowerCase()
  const kgMatches = [...lower.matchAll(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?)/g)]
  const lbsMatches = [...lower.matchAll(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/g)]

  const kgRaw = kgMatches.length ? parseFloat(kgMatches[kgMatches.length - 1][1]) : undefined
  const lbsRaw = lbsMatches.length ? parseFloat(lbsMatches[lbsMatches.length - 1][1]) : undefined
  const fromLbsKg = lbsRaw != null ? Math.round(lbsRaw * LBS_TO_KG * 10) / 10 : undefined

  if (kgRaw != null && fromLbsKg != null) {
    const diffRatio = Math.abs(kgRaw - fromLbsKg) / Math.max(kgRaw, fromLbsKg)
    if (diffRatio > WEIGHT_CONFLICT_TOLERANCE) {
      return {
        conflictMessage:
          `You gave ${kgRaw}kg and ${lbsRaw}lbs — those don't match (~${fromLbsKg}kg). `
          + `Please send one weight only, e.g. "75kg, 178cm, 25, male".`,
      }
    }
    return { weightKg: kgRaw }
  }

  if (kgRaw != null) return { weightKg: kgRaw }
  if (fromLbsKg != null) return { weightKg: fromLbsKg }
  return {}
}

function parseStats(text: string): ParsedStats {
  const lower = text.toLowerCase()
  const stats: ParsedStats = {}

  const weight = resolveWeightKg(text)
  if (weight.weightKg != null) stats.weight = weight.weightKg

  const heightMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/)
  if (heightMatch) stats.height = parseFloat(heightMatch[1])

  const agePatterns = [
    /(?:i\s+am|age\s*(?:is|:)?)\s*(\d{1,3})/,
    /(\d{1,3})\s*(?:years?\s*old|yrs?|yo)/,
    /(?:^|\s)(\d{2})(?:\s*,|\s)/,
  ]
  for (const pattern of agePatterns) {
    const m = lower.match(pattern)
    if (m && parseInt(m[1], 10) >= 10 && parseInt(m[1], 10) <= 120) {
      stats.age = parseInt(m[1], 10)
      break
    }
  }

  if (/\bfemale\b|\bwoman\b|\bgirl\b/.test(lower)) stats.gender = 'female'
  else if (/\bmale\b|\bman\b|\bboy\b/.test(lower)) stats.gender = 'male'

  return stats
}

function hasAllStats(stats: ParsedStats): boolean {
  return stats.weight != null && stats.height != null && stats.age != null && stats.gender != null
}

function calcBMR(weight: number, height: number, age: number, gender: Gender): number {
  const base = 10 * weight + 6.25 * height - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

function calcBMI(weight: number, height: number): number {
  const heightM = height / 100
  return weight / (heightM * heightM)
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal weight'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

function formatCalorieTable(stats: ParsedStats): string {
  const { weight, height, age, gender } = stats as Required<ParsedStats>
  const bmr = calcBMR(weight, height, age, gender)
  const tdee = Math.round(bmr * 1.55)
  const protein = Math.round(weight * 2)
  const bmi = calcBMI(weight, height)

  let reply = `Here's your personalized calorie plan:\n\n`
  reply += `📊 Your Stats: ${weight}kg · ${height}cm · ${age} yrs · ${gender}\n`
  reply += `BMR: ${Math.round(bmr)} kcal · TDEE (moderate activity): ${tdee} kcal\n`
  reply += `BMI: ${bmi.toFixed(1)} (${bmiCategory(bmi)})\n`
  reply += `Protein target: ${protein}g/day (2g per kg)\n\n`
  reply += `🎯 Daily Calorie Targets:\n`

  for (const target of CALORIE_TARGETS) {
    const cals = Math.round(tdee + target.offset)
    reply += `• ${target.label}: ${cals} kcal/day\n`
  }

  reply += `\nTip: Start with Fat Loss (−500) if unsure. Track protein daily and adjust calories every 2 weeks based on progress.`
  return reply
}

function formatBMI(weight: number, height: number): string {
  const bmi = calcBMI(weight, height)
  const heightM = height / 100
  const idealLow = Math.round(18.5 * heightM * heightM)
  const idealHigh = Math.round(24.9 * heightM * heightM)

  return `BMI for ${weight}kg at ${height}cm:\n\n`
    + `BMI: ${bmi.toFixed(1)} — ${bmiCategory(bmi)}\n`
    + `Healthy weight range for your height: ${idealLow}–${idealHigh} kg`
}

function formatWater(weight: number): string {
  const liters = (weight * 0.033).toFixed(1)
  return `Water intake for ${weight}kg:\n\n`
    + `Recommended: ${liters} liters per day\n\n`
    + `Tips: Drink a glass on waking, sip throughout workouts, and check urine color (pale yellow = hydrated).`
}

function formatIdealWeight(height: number): string {
  const heightM = height / 100
  const low = Math.round(18.5 * heightM * heightM)
  const high = Math.round(24.9 * heightM * heightM)
  return `Ideal weight for ${height}cm:\n\n`
    + `Healthy BMI range (18.5–24.9): ${low}–${high} kg\n\n`
    + `This is a general guide. Muscle mass, bone density, and activity level also matter.`
}

function formatMacros(goal: string): string {
  const guides: Record<string, string> = {
    fat: 'Fat Loss Macros:\n• Protein: 35% — preserve muscle during deficit\n• Carbs: 35% — fuel workouts, manage hunger\n• Fat: 30% — hormones and satiety\n\nPrioritize protein at every meal. Reduce carbs on rest days.',
    muscle: 'Muscle Gain Macros:\n• Protein: 30% — build and repair muscle\n• Carbs: 45% — fuel intense training\n• Fat: 25% — recovery and hormones\n\nEat in a 250–500 kcal surplus with progressive overload training.',
    maintain: 'Maintenance Macros:\n• Protein: 30% — maintain muscle mass\n• Carbs: 40% — daily energy\n• Fat: 30% — overall health\n\nAdjust portions if weight drifts ±1kg over 2 weeks.',
  }

  if (/fat|loss|cut|lose/.test(goal)) return guides.fat
  if (/muscle|gain|bulk|build/.test(goal)) return guides.muscle
  return guides.maintain
}

const PAKISTANI_FOODS = `Pakistani Food Calorie Guide (per serving):\n\n`
  + `🍚 Chicken Biryani: ~450–550 kcal\n`
  + `🫘 Daal (1 cup): ~180 kcal · high protein\n`
  + `🫓 Roti (1 piece): ~70–90 kcal\n`
  + `🥞 Paratha: ~250–300 kcal\n`
  + `🍗 Chicken Karahi: ~350–450 kcal\n`
  + `🍲 Nihari: ~400–500 kcal\n`
  + `🥣 Haleem: ~300–400 kcal\n`
  + `☕ Chai (with milk): ~80–120 kcal\n`
  + `🥛 Lassi: ~150–200 kcal\n\n`
  + `Tip: Pair roti with daal for a balanced meal. Limit paratha to 1–2x per week for fat loss goals.`

const EXERCISE_TIPS: Record<string, string> = {
  squat: 'Squat Form & Programming:\n• Feet shoulder-width, toes slightly out\n• Brace core, push hips back and down\n• Thighs parallel to floor, drive through heels\n• Sets/Reps: 3×8–12 for strength, 4×15 for endurance\n• Warm up with bodyweight squats first',
  deadlift: 'Deadlift Form & Programming:\n• Feet hip-width, bar over mid-foot\n• Hinge at hips, flat back, chest up\n• Drive through floor, lock hips at top\n• Sets/Reps: 3×5–8 for strength\n• Start light — form beats weight every time',
  bench: 'Bench Press Form & Programming:\n• Grip slightly wider than shoulders\n• Feet flat, slight arch, retract shoulder blades\n• Lower bar to mid-chest, press up in arc\n• Sets/Reps: 3×8–12\n• Use a spotter or safety bars when pushing heavy',
  pushup: 'Push-Up Form & Programming:\n• Hands shoulder-width, body in straight line\n• Lower chest to floor, elbows 45°\n• Push through palms to full extension\n• Sets/Reps: 3×10–20 (or to failure)\n• Progress: incline → standard → decline → weighted',
  pullup: 'Pull-Up Form & Programming:\n• Hang with full extension, engage lats\n• Pull chin above bar, avoid swinging\n• Lower with control to full hang\n• Sets/Reps: 3×5–10 (use bands if needed)\n• Great for back width and grip strength',
  plank: 'Plank Form & Programming:\n• Forearms on floor, elbows under shoulders\n• Body straight from head to heels\n• Brace core, don\'t let hips sag or pike\n• Hold: 3×30–60 seconds\n• Progress to side planks and RKC planks',
}

function matchExercise(lower: string): string | null {
  const map: Record<string, string> = {
    squat: 'squat', deadlift: 'deadlift',
    bench: 'bench', 'bench press': 'bench',
    pushup: 'pushup', 'push-up': 'pushup', 'push up': 'pushup',
    pullup: 'pullup', 'pull-up': 'pullup', 'pull up': 'pullup',
    plank: 'plank',
  }
  for (const [key, tip] of Object.entries(map)) {
    if (lower.includes(key)) return EXERCISE_TIPS[tip]
  }
  return null
}

const GREETING = `Welcome to T.E.S.T. AI Coach! 🤖\n\n`
  + `I can help you with:\n`
  + `• Calorie & BMI calculators\n`
  + `• Pakistani food calorie guide\n`
  + `• Exercise form tips (squat, deadlift, bench, etc.)\n`
  + `• Fat loss, muscle gain, and nutrition advice\n`
  + `• Water intake and macro recommendations\n\n`
  + `Try: "I am 25, 75kg, 178cm, male" for a full calorie plan!`

const DEFAULT_REPLY = `I can help with:\n\n`
  + `📊 Calorie calculator — tell me weight, height, age & gender\n`
  + `📏 BMI calculator — e.g. "BMI for 75kg 178cm"\n`
  + `💧 Water intake — e.g. "water intake for 80kg"\n`
  + `🍽️ Pakistani food calories — biryani, daal, roti, karahi, etc.\n`
  + `🏋️ Exercise tips — squat, deadlift, bench press, push-ups\n`
  + `🔥 Fat loss & muscle gain strategies\n`
  + `🏃 Cardio, beginner guides, sleep & recovery\n\n`
  + `What would you like to know?`

const ASK_STATS = `I'd love to calculate your calories! Please share:\n\n`
  + `• Weight (kg or lbs — one value only)\n`
  + `• Height (cm)\n`
  + `• Age\n`
  + `• Gender (male/female)\n\n`
  + `Example: "I am 25, 75kg, 178cm, male"`

/** Weight unit conflict — must be shown before any calculator output. */
export function getWeightConflictMessage(message: string): string | null {
  return resolveWeightKg(message).conflictMessage ?? null
}

/**
 * Deterministic replies for calorie/BMI/water/etc.
 * Returns non-null when the fallback engine should answer instead of Gemini.
 */
export function getDeterministicCalculatorReply(message: string): string | null {
  const conflict = getWeightConflictMessage(message)
  if (conflict) return conflict

  const lower = message.toLowerCase().trim()
  const stats = parseStats(message)

  if (hasAllStats(stats)) return formatCalorieTable(stats)

  if (/bmi/.test(lower)) {
    if (stats.weight && stats.height) return formatBMI(stats.weight, stats.height)
    return 'For BMI calculation, tell me your weight and height.\nExample: "BMI for 75kg 178cm"'
  }

  if (/water|hydrat|drink/.test(lower)) {
    if (stats.weight) return formatWater(stats.weight)
    return 'Tell me your weight for a water intake recommendation.\nExample: "water intake for 80kg"'
  }

  if (/ideal\s*weight|healthy\s*weight/.test(lower)) {
    if (stats.height) return formatIdealWeight(stats.height)
    return 'Tell me your height for an ideal weight range.\nExample: "ideal weight for 178cm"'
  }

  if (/macro/.test(lower)) return formatMacros(lower)

  if (
    /calorie|calories|tdee|bmr|calculate/.test(lower) ||
    (stats.weight != null && /plan|target|how much should i eat/.test(lower))
  ) {
    return ASK_STATS
  }

  return null
}

export function generateChatFallback(message: string): string {
  const lower = message.toLowerCase().trim()

  const deterministic = getDeterministicCalculatorReply(message)
  if (deterministic) return deterministic

  if (/^(hi|hello|hey|salam|assalam|good\s*(morning|evening|afternoon)|howdy)\b/.test(lower)) {
    return GREETING
  }

  if (/pakistani|biryani|daal|roti|paratha|karahi|nihari|haleem|chai|lassi|desi|local food/.test(lower)) {
    return PAKISTANI_FOODS
  }

  const exerciseTip = matchExercise(lower)
  if (exerciseTip) return exerciseTip

  if (/fat\s*loss|lose\s*(fat|weight)|cutting|deficit/.test(lower)) {
    return 'Fat Loss Tips:\n'
      + '• Create a 300–500 kcal daily deficit\n'
      + '• Protein: 2g per kg bodyweight to preserve muscle\n'
      + '• Strength train 3–4x/week — don\'t just cardio\n'
      + '• Aim for 0.5–1kg loss per week (sustainable)\n'
      + '• Sleep 7–9 hours — poor sleep raises cortisol and hunger\n'
      + '• Pakistani tip: swap paratha for roti, add daal for protein'
  }

  if (/muscle\s*gain|bulk|build\s*muscle|hypertrophy/.test(lower)) {
    return 'Muscle Gain Tips:\n'
      + '• Eat 250–500 kcal above maintenance\n'
      + '• Protein: 2g per kg bodyweight daily\n'
      + '• Progressive overload — add weight or reps each week\n'
      + '• Focus on compound lifts: squat, deadlift, bench, rows\n'
      + '• Rest 48h between training same muscle group\n'
      + '• Pakistani sources: chicken, eggs, daal, paneer, Greek yogurt'
  }

  if (/cardio|running|stamina|endurance|hiit/.test(lower)) {
    return 'Cardio Guide:\n'
      + '• Start: 20–30 min moderate cardio 3x/week\n'
      + '• HIIT: 20s sprint + 40s rest × 8 rounds — great for fat loss\n'
      + '• Steady-state: 30–45 min jog/cycle — builds endurance\n'
      + '• Mix both for best results\n'
      + '• Don\'t skip strength training — cardio alone won\'t build muscle\n'
      + '• Post-workout: hydrate and eat protein within 1 hour'
  }

  if (/beginner|start|new\s*to\s*(gym|fitness|workout)|getting\s*started/.test(lower)) {
    return 'Beginner Guide:\n'
      + '• Start 3x/week: full body workouts\n'
      + '• Master form before adding weight\n'
      + '• Key moves: squat, push-up, row, plank, lunge\n'
      + '• Track workouts in My Fitness to build consistency\n'
      + '• Don\'t compare — focus on your own progress\n'
      + '• Rest days are training days for recovery'
  }

  if (/sleep|recover|rest\s*day|overtrain/.test(lower)) {
    return 'Sleep & Recovery:\n'
      + '• Aim for 7–9 hours of sleep nightly\n'
      + '• Muscles grow during rest, not during workouts\n'
      + '• Consistent sleep schedule (same bedtime)\n'
      + '• Dark, cool room; no screens 1 hour before bed\n'
      + '• Active recovery: light walk, stretching, foam rolling\n'
      + '• Signs of overtraining: persistent fatigue, poor performance, mood changes'
  }

  if (/protein|diet|eat|nutrition|meal/.test(lower)) {
    return 'Nutrition Basics:\n'
      + '• Protein: 1.6–2.2g per kg bodyweight daily\n'
      + '• Spread protein across 4–5 meals\n'
      + '• Pakistani sources: chicken, fish, eggs, daal, paneer\n'
      + '• Eat vegetables with every meal for micronutrients\n'
      + '• Stay hydrated — 0.033L per kg bodyweight\n'
      + '• Log meals in My Fitness to track your intake'
  }

  return DEFAULT_REPLY
}
