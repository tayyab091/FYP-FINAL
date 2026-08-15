import { apaBullets, apaNumbered, apaParagraph, apaReply } from '@/lib/chat-apa-format'

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
        conflictMessage: apaReply([
          'Weight Entry Clarification Needed',
          apaParagraph(
            `You entered ${kgRaw} kg and ${lbsRaw} lbs, which do not match (approximately ${fromLbsKg} kg from pounds).`,
            'Please send one body-weight value only.',
          ),
          apaParagraph('Example: "75 kg, 178 cm, 25, male."'),
        ], { disclaimer: false }),
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

  const targets = CALORIE_TARGETS.map(target => {
    const cals = Math.round(tdee + target.offset)
    return `${target.label}: ${cals} kcal per day`
  })

  return apaReply([
    'Personalized Calorie Plan',
    apaParagraph(
      `Body weight: ${weight} kg. Height: ${height} cm. Age: ${age} years. Sex: ${gender}.`,
      `Basal metabolic rate (BMR): ${Math.round(bmr)} kcal per day.`,
      `Total daily energy expenditure (TDEE; moderate activity): ${tdee} kcal per day.`,
      `Body mass index (BMI): ${bmi.toFixed(1)} (${bmiCategory(bmi)}).`,
      `Protein target: ${protein} g per day (2 g per kg body weight).`,
    ),
    apaNumbered('Recommended Daily Calorie Targets', targets),
    'Recommendation',
    apaParagraph(
      'Start with a fat-loss target (−500 kcal) if you are unsure. Track protein daily and reassess calories every 2 weeks based on progress.',
    ),
  ])
}

function formatBMI(weight: number, height: number): string {
  const bmi = calcBMI(weight, height)
  const heightM = height / 100
  const idealLow = Math.round(18.5 * heightM * heightM)
  const idealHigh = Math.round(24.9 * heightM * heightM)

  return apaReply([
    'Body Mass Index (BMI) Estimate',
    apaParagraph(
      `For ${weight} kg at ${height} cm, BMI is ${bmi.toFixed(1)} (${bmiCategory(bmi)}).`,
      `Healthy weight range for this height: ${idealLow}–${idealHigh} kg.`,
    ),
  ])
}

function formatWater(weight: number): string {
  const liters = (weight * 0.033).toFixed(1)
  return apaReply([
    'Daily Hydration Recommendation',
    apaParagraph(`For ${weight} kg body weight, aim for ${liters} liters of water per day.`),
    apaBullets('Hydration Strategies', [
      'Drink a glass of water upon waking.',
      'Sip water throughout workouts.',
      'Use pale-yellow urine as a simple hydration check.',
    ]),
  ])
}

function formatIdealWeight(height: number): string {
  const heightM = height / 100
  const low = Math.round(18.5 * heightM * heightM)
  const high = Math.round(24.9 * heightM * heightM)
  return apaReply([
    'Healthy Weight Range',
    apaParagraph(
      `For ${height} cm, a healthy BMI range (18.5–24.9) corresponds to ${low}–${high} kg.`,
      'Muscle mass, bone density, and activity level also influence an appropriate target weight.',
    ),
  ])
}

function formatMacros(goal: string): string {
  if (/fat|loss|cut|lose/.test(goal)) {
    return apaReply([
      'Macronutrient Targets for Fat Loss',
      apaBullets('Recommended Split', [
        'Protein: 35% — preserve lean mass during a calorie deficit.',
        'Carbohydrates: 35% — support training and manage hunger.',
        'Fat: 30% — support hormones and satiety.',
      ]),
      apaParagraph('Include protein at each meal and reduce carbohydrates on rest days.'),
    ])
  }
  if (/muscle|gain|bulk|build/.test(goal)) {
    return apaReply([
      'Macronutrient Targets for Muscle Gain',
      apaBullets('Recommended Split', [
        'Protein: 30% — support muscle repair and growth.',
        'Carbohydrates: 45% — fuel intense training sessions.',
        'Fat: 25% — support recovery and hormonal health.',
      ]),
      apaParagraph('Maintain a 250–500 kcal surplus with progressive overload training.'),
    ])
  }
  return apaReply([
    'Macronutrient Targets for Weight Maintenance',
    apaBullets('Recommended Split', [
      'Protein: 30% — maintain muscle mass.',
      'Carbohydrates: 40% — provide daily energy.',
      'Fat: 30% — support overall health.',
    ]),
    apaParagraph('Adjust portions if body weight drifts more than 1 kg over 2 weeks.'),
  ])
}

const PAKISTANI_FOODS = apaReply([
  'Pakistani Food Calorie Guide',
  apaParagraph('Approximate calories per typical serving:'),
  apaBullets('Common Dishes', [
    'Chicken biryani: 450–550 kcal',
    'Daal (1 cup): ~180 kcal; high in protein',
    'Roti (1 piece): 70–90 kcal',
    'Paratha: 250–300 kcal',
    'Chicken karahi: 350–450 kcal',
    'Nihari: 400–500 kcal',
    'Haleem: 300–400 kcal',
    'Chai with milk: 80–120 kcal',
    'Lassi: 150–200 kcal',
  ]),
  apaParagraph('Pair roti with daal for a balanced meal. Limit paratha to 1–2 times per week during fat loss.'),
])

const EXERCISE_TIPS: Record<string, string> = {
  squat: apaReply([
    'Squat Technique and Programming',
    apaBullets('Form Cues', [
      'Feet shoulder-width apart; toes slightly turned out.',
      'Brace the core; sit hips back and down.',
      'Thighs parallel to the floor; drive through the heels.',
    ]),
    apaNumbered('Programming', [
      '3 sets of 8–12 reps for strength.',
      '4 sets of 15 reps for muscular endurance.',
      'Warm up with bodyweight squats before loading.',
    ]),
  ]),
  deadlift: apaReply([
    'Deadlift Technique and Programming',
    apaBullets('Form Cues', [
      'Feet hip-width; bar over mid-foot.',
      'Hinge at the hips; maintain a flat back and lifted chest.',
      'Drive through the floor; lock hips at the top.',
    ]),
    apaNumbered('Programming', ['3 sets of 5–8 reps for strength.', 'Prioritize form over load when learning the lift.']),
  ]),
  bench: apaReply([
    'Bench Press Technique and Programming',
    apaBullets('Form Cues', [
      'Grip slightly wider than shoulder width.',
      'Feet flat; slight arch; retract shoulder blades.',
      'Lower the bar to mid-chest; press upward in a slight arc.',
    ]),
    apaNumbered('Programming', ['3 sets of 8–12 reps.', 'Use a spotter or safety bars for heavy sets.']),
  ]),
  pushup: apaReply([
    'Push-Up Technique and Programming',
    apaBullets('Form Cues', [
      'Hands shoulder-width apart; body in a straight line.',
      'Lower the chest toward the floor; elbows at roughly 45°.',
      'Press through the palms to full extension.',
    ]),
    apaNumbered('Programming', [
      '3 sets of 10–20 reps, or to technical failure.',
      'Progress from incline to standard, decline, and weighted variations.',
    ]),
  ]),
  pullup: apaReply([
    'Pull-Up Technique and Programming',
    apaBullets('Form Cues', [
      'Start from a full hang with active lats.',
      'Pull until the chin clears the bar without swinging.',
      'Lower under control to a full hang.',
    ]),
    apaNumbered('Programming', [
      '3 sets of 5–10 reps; use bands for assistance if needed.',
      'Effective for back width and grip strength.',
    ]),
  ]),
  plank: apaReply([
    'Plank Technique and Programming',
    apaBullets('Form Cues', [
      'Forearms on the floor; elbows under shoulders.',
      'Maintain a straight line from head to heels.',
      'Brace the core; avoid sagging hips or piking.',
    ]),
    apaNumbered('Programming', [
      'Hold for 30–60 seconds across 3 sets.',
      'Progress to side planks and RKC planks.',
    ]),
  ]),
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

const GREETING = apaReply([
  'Welcome to the T.E.S.T. AI Fitness Coach',
  apaBullets('I Can Help With', [
    'Calorie and BMI estimates',
    'Pakistani food calorie guide',
    'Exercise technique (squat, deadlift, bench press, and more)',
    'Fat loss, muscle gain, and nutrition guidance',
    'Hydration and macronutrient recommendations',
  ]),
  apaParagraph('Example prompt: "I am 25, 75 kg, 178 cm, male."'),
], { disclaimer: false })

const DEFAULT_REPLY = apaReply([
  'How I Can Help',
  apaBullets('Popular Topics', [
    'Calorie calculator — share weight, height, age, and sex',
    'BMI calculator — e.g., "BMI for 75 kg and 178 cm"',
    'Water intake — e.g., "water intake for 80 kg"',
    'Pakistani food calories — biryani, daal, roti, karahi, and more',
    'Exercise technique — squat, deadlift, bench press, push-ups',
    'Fat loss, muscle gain, cardio, sleep, and recovery',
  ]),
  apaParagraph('What would you like to explore?'),
], { disclaimer: false })

const ASK_STATS = apaReply([
  'Calorie Estimate — Information Needed',
  apaBullets('Please Provide', [
    'Body weight (kg or lbs; one value only)',
    'Height (cm)',
    'Age (years)',
    'Sex (male or female)',
  ]),
  apaParagraph('Example: "I am 25, 75 kg, 178 cm, male."'),
], { disclaimer: false })

/** Weight unit conflict — must be shown before any calculator output. */
export function getWeightConflictMessage(message: string): string | null {
  return resolveWeightKg(message).conflictMessage ?? null
}

/**
 * Deterministic replies for calorie/BMI/water/etc.
 * Used only as a fallback when Gemini is unavailable — never to override Gemini.
 */
export function getDeterministicCalculatorReply(message: string): string | null {
  const conflict = getWeightConflictMessage(message)
  if (conflict) return conflict

  const lower = message.toLowerCase().trim()
  const stats = parseStats(message)

  if (hasAllStats(stats)) return formatCalorieTable(stats)

  if (/pakistani|biryani|daal|roti|paratha|karahi|nihari|haleem|chai|lassi|desi|local food/.test(lower)) {
    return null
  }

  if (/bmi/.test(lower)) {
    if (stats.weight && stats.height) return formatBMI(stats.weight, stats.height)
    return apaReply([
      'BMI Calculator',
      apaParagraph('Share your weight and height to calculate BMI.'),
      apaParagraph('Example: "BMI for 75 kg and 178 cm."'),
    ], { disclaimer: false })
  }

  if (/water|hydrat|drink/.test(lower)) {
    if (stats.weight) return formatWater(stats.weight)
    return apaReply([
      'Hydration Estimate',
      apaParagraph('Share your body weight for a daily water intake recommendation.'),
      apaParagraph('Example: "water intake for 80 kg."'),
    ], { disclaimer: false })
  }

  if (/ideal\s*weight|healthy\s*weight/.test(lower)) {
    if (stats.height) return formatIdealWeight(stats.height)
    return apaReply([
      'Healthy Weight Range',
      apaParagraph('Share your height to estimate a healthy weight range.'),
      apaParagraph('Example: "ideal weight for 178 cm."'),
    ], { disclaimer: false })
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
    return apaReply([
      'Fat Loss Strategies',
      apaNumbered('Evidence-Based Recommendations', [
        'Create a daily calorie deficit of 300–500 kcal.',
        'Consume about 2 g of protein per kg body weight to preserve lean mass.',
        'Strength train 3–4 times per week; do not rely on cardio alone.',
        'Aim for 0.5–1 kg of weight loss per week for sustainability.',
        'Sleep 7–9 hours per night; poor sleep increases hunger and cortisol.',
      ]),
      apaParagraph('Pakistani tip: choose roti over paratha and add daal for protein.'),
    ])
  }

  if (/muscle\s*gain|bulk|build\s*muscle|hypertrophy/.test(lower)) {
    return apaReply([
      'Muscle Gain Strategies',
      apaNumbered('Evidence-Based Recommendations', [
        'Eat 250–500 kcal above maintenance daily.',
        'Consume about 2 g of protein per kg body weight.',
        'Apply progressive overload by adding weight or reps each week.',
        'Prioritize compound lifts: squat, deadlift, bench press, and rows.',
        'Allow 48 hours of recovery before training the same muscle group again.',
      ]),
      apaParagraph('Pakistani protein sources include chicken, eggs, daal, paneer, and Greek yogurt.'),
    ])
  }

  if (/cardio|running|stamina|endurance|hiit/.test(lower)) {
    return apaReply([
      'Cardiovascular Training Guide',
      apaNumbered('Programming Options', [
        'Begin with 20–30 minutes of moderate cardio 3 times per week.',
        'HIIT: 20 s sprint + 40 s rest for 8 rounds to support fat loss.',
        'Steady-state cardio: 30–45 minutes of jogging or cycling for endurance.',
        'Combine both modalities for balanced conditioning.',
        'Continue resistance training; cardio alone does not build muscle.',
      ]),
      apaParagraph('Rehydrate and consume protein within 1 hour after training.'),
    ])
  }

  if (/beginner|start|new\s*to\s*(gym|fitness|workout)|getting\s*started/.test(lower)) {
    return apaReply([
      'Beginner Training Guide',
      apaNumbered('Getting Started', [
        'Train 3 times per week with full-body sessions.',
        'Master technique before increasing load.',
        'Learn squat, push-up, row, plank, and lunge patterns.',
        'Log workouts in My Fitness to build consistency.',
        'Schedule rest days for recovery and adaptation.',
      ]),
    ])
  }

  if (/sleep|recover|rest\s*day|overtrain/.test(lower)) {
    return apaReply([
      'Sleep and Recovery',
      apaNumbered('Recovery Principles', [
        'Aim for 7–9 hours of sleep each night.',
        'Muscle repair occurs during rest, not during the workout itself.',
        'Keep a consistent sleep schedule.',
        'Use a dark, cool room and limit screens 1 hour before bed.',
        'Use active recovery: walking, stretching, or foam rolling.',
      ]),
      apaParagraph('Signs of overtraining include persistent fatigue, poor performance, and mood changes.'),
    ])
  }

  if (/protein|diet|eat|nutrition|meal/.test(lower)) {
    return apaReply([
      'Nutrition Fundamentals',
      apaNumbered('Daily Habits', [
        'Consume 1.6–2.2 g of protein per kg body weight.',
        'Distribute protein across 4–5 meals.',
        'Include chicken, fish, eggs, daal, and paneer when possible.',
        'Add vegetables to each meal for micronutrients.',
        'Drink about 0.033 L of water per kg body weight.',
      ]),
      apaParagraph('Track meals in My Fitness to monitor intake.'),
    ])
  }

  return DEFAULT_REPLY
}
