import { NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'
import mongoose from 'mongoose'
import { sanitizeHttpUrl, sanitizePlainText } from '@/lib/sanitize'

/** Reject objects / arrays that look like Mongo operators (NoSQL injection). */
export function assertNoMongoOperators(value: unknown, path = 'body'): string | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = assertNoMongoOperators(value[i], `${path}[${i}]`)
      if (err) return err
    }
    return null
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.')) {
        return `Invalid field "${key}" in ${path}`
      }
      const err = assertNoMongoOperators(child, `${path}.${key}`)
      if (err) return err
    }
  }
  return null
}

export function objectIdSchema(label = 'id') {
  return z
    .string()
    .min(1)
    .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: `Invalid ${label}` })
}

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((v) => v.toLowerCase())

export const passwordSchema = z.string().min(8).max(128)

export const plainTextSchema = (maxLen: number, minLen = 1) =>
  z
    .string()
    .min(minLen)
    .max(maxLen + 200) // allow raw slightly longer before sanitize trim
    .transform((v) => sanitizePlainText(v, maxLen))
    .refine((v) => v.length >= minLen, { message: 'Text is required' })

export const optionalPlainTextSchema = (maxLen: number) =>
  z
    .string()
    .max(maxLen + 200)
    .optional()
    .transform((v) => (v === undefined ? undefined : sanitizePlainText(v, maxLen)))

export const httpUrlSchema = (requireHttps = false) =>
  z.string().max(2048).transform((v, ctx) => {
    const safe = sanitizeHttpUrl(v, { requireHttps })
    if (!safe) {
      ctx.addIssue({ code: 'custom', message: 'Invalid URL (http/https only)' })
      return z.NEVER
    }
    return safe
  })

export function validationError(message: string, status = 400) {
  return NextResponse.json({ message }, { status })
}

export function zodErrorMessage(error: z.ZodError): string {
  const first = error.issues[0]
  return first?.message || 'Invalid request'
}

/**
 * Parse JSON body, reject Mongo operators, validate with Zod.
 * Does not coerce unknown operator shapes into queries.
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { error: validationError('Invalid JSON body') }
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: validationError('Request body must be a JSON object') }
  }

  const opErr = assertNoMongoOperators(raw)
  if (opErr) return { error: validationError(opErr) }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { error: validationError(zodErrorMessage(parsed.error)) }
  }

  return { data: parsed.data }
}

export function parseObjectIdParam(
  id: string | undefined | null,
  label = 'id',
): { id: string } | { error: NextResponse } {
  if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return { error: validationError(`Invalid ${label}`) }
  }
  return { id }
}

export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: ZodType<T>,
): { data: T } | { error: NextResponse } {
  const obj: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    obj[key] = value
  })
  const opErr = assertNoMongoOperators(obj, 'query')
  if (opErr) return { error: validationError(opErr) }

  const parsed = schema.safeParse(obj)
  if (!parsed.success) {
    return { error: validationError(zodErrorMessage(parsed.error)) }
  }
  return { data: parsed.data }
}

/** Common auth schemas */
export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export const registerBodySchema = z.object({
  fullName: plainTextSchema(100, 2),
  email: emailSchema,
  password: passwordSchema,
  country: z
    .string()
    .max(280)
    .optional()
    .transform((v) => sanitizePlainText(v || 'Pakistan', 80)),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
})

export const profileUpdateSchema = z.object({
  fullName: plainTextSchema(100, 2),
  country: optionalPlainTextSchema(80),
  profileImage: z
    .string()
    .max(2048)
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === '') return undefined
      const safe = sanitizeHttpUrl(v, { requireHttps: false })
      if (!safe) {
        ctx.addIssue({ code: 'custom', message: 'profileImage must be a valid http(s) URL' })
        return z.NEVER
      }
      return safe
    }),
  bio: optionalPlainTextSchema(2000),
  currentWeight: z.number().min(0).max(500).optional(),
  targetWeight: z.number().min(0).max(500).optional(),
  fitnessGoal: optionalPlainTextSchema(100),
  activityLevel: optionalPlainTextSchema(50),
})

export const communityPostSchema = z.object({
  content: plainTextSchema(2000, 1),
  category: z
    .enum(['Motivation', 'Question', 'Achievement', 'Workout'])
    .optional()
    .default('Motivation'),
})

export const communityCommentSchema = z.object({
  content: plainTextSchema(1000, 1),
})

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'workout_plan', 'image']).optional().default('text'),
  attachedPlanId: objectIdSchema('attachedPlanId').optional(),
})

export const aiChatSchema = z.object({
  message: plainTextSchema(1000, 1),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'model']).optional(),
        content: z.string().max(1000),
      }),
    )
    .max(6)
    .optional()
    .default([]),
})

export const trainerProfileSchema = z.object({
  specialty: z.array(plainTextSchema(80, 1)).max(20).optional(),
  bio: optionalPlainTextSchema(2000),
  certifications: z.array(plainTextSchema(120, 1)).max(20).optional(),
  hourlyRate: z.number().min(0).max(1_000_000).optional(),
  experience: optionalPlainTextSchema(500),
})

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: plainTextSchema(1000, 20),
})

export const registerTrainerSchema = z.object({
  fullName: plainTextSchema(100, 2),
  email: emailSchema,
  password: passwordSchema,
  country: z
    .string()
    .max(280)
    .optional()
    .transform((v) => sanitizePlainText(v || 'Pakistan', 80)),
  specialty: z
    .union([z.array(z.string().max(80)), z.string().max(80)])
    .optional()
    .transform((v) => {
      if (v === undefined) return [] as string[]
      const arr = Array.isArray(v) ? v : [v]
      return arr.map((s) => sanitizePlainText(s, 80)).filter(Boolean).slice(0, 20)
    }),
  bio: optionalPlainTextSchema(2000),
  experience: optionalPlainTextSchema(500),
})

export const registerGymOwnerSchema = z.object({
  fullName: plainTextSchema(100, 2),
  email: emailSchema,
  password: passwordSchema,
  country: z
    .string()
    .max(280)
    .optional()
    .transform((v) => sanitizePlainText(v || 'Pakistan', 80)),
  gymName: plainTextSchema(120, 2),
  gymAddress: optionalPlainTextSchema(300),
  gymDescription: optionalPlainTextSchema(2000),
})

export const createAdminSchema = z.object({
  fullName: plainTextSchema(100, 2),
  email: emailSchema,
  password: z.string().min(12).max(128),
  setupKey: z.string().min(1).max(200),
})

export const setupKeySchema = z.object({
  setupKey: z.string().min(1).max(200),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(200),
})

export const adminActionSchema = z.object({
  action: z.enum(['verify', 'reject']),
})

export const suspendSchema = z.object({
  suspend: z.boolean(),
})

export const progressBodySchema = z.object({
  weight: z.number().min(0).max(500).optional(),
  bodyFat: z.number().min(0).max(100).optional(),
  chest: z.number().min(0).max(500).optional(),
  waist: z.number().min(0).max(500).optional(),
  hips: z.number().min(0).max(500).optional(),
  notes: optionalPlainTextSchema(1000),
  date: z.string().min(1).max(64).optional(),
})

export const gymOwnerTrainerActionSchema = z.object({
  trainerId: objectIdSchema('trainerId'),
  action: z.enum(['approve', 'remove']),
})

export const formCheckSchema = z.object({
  exercise: plainTextSchema(80, 1),
  reps: z.number().int().min(1).max(500),
})

export const mealLogSchema = z.object({
  mealType: z.string().min(1).max(40).transform((v) => sanitizePlainText(v, 40)),
  foods: z
    .array(
      z.object({
        name: plainTextSchema(120, 1),
        calories: z.number().min(0).max(10000).optional().default(0),
        protein: z.number().min(0).max(1000).optional().default(0),
        carbs: z.number().min(0).max(1000).optional().default(0),
        fat: z.number().min(0).max(1000).optional().default(0),
        quantity: z.number().min(0).max(100).optional(),
        unit: optionalPlainTextSchema(40),
      }),
    )
    .min(1)
    .max(50),
})

export const typingSchema = z.object({
  isTyping: z.boolean().optional(),
})

export const nutritionQuerySchema = z.object({
  query: z
    .string()
    .min(1)
    .max(120)
    .transform((v) => sanitizePlainText(v.toLowerCase(), 120)),
})

export const gymOwnerLinkSchema = z.object({
  trainerEmail: emailSchema,
})

export const gymUpdateSchema = z.object({
  name: plainTextSchema(120, 2),
  address: plainTextSchema(300, 2),
  country: optionalPlainTextSchema(80),
  description: optionalPlainTextSchema(2000),
  phone: optionalPlainTextSchema(40),
  email: z
    .string()
    .max(254)
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined
      const parsed = emailSchema.safeParse(v)
      if (!parsed.success) {
        ctx.addIssue({ code: 'custom', message: 'Invalid email' })
        return z.NEVER
      }
      return parsed.data
    }),
  logo: z
    .string()
    .max(2048)
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined
      const safe = sanitizeHttpUrl(v)
      if (!safe) {
        ctx.addIssue({ code: 'custom', message: 'logo must be a valid http(s) URL' })
        return z.NEVER
      }
      return safe
    }),
})

export const liveSessionCreateSchema = z.object({
  title: plainTextSchema(120, 3),
  scheduledAt: z.string().min(1).max(64),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]).optional().default(60),
  maxParticipants: z.number().int().min(1).max(100).optional().default(20),
  clientId: objectIdSchema('clientId').optional(),
})

export const workoutPlanCreateSchema = z.object({
  userId: objectIdSchema('userId'),
  relationshipId: objectIdSchema('relationshipId'),
  title: plainTextSchema(120, 1),
  goal: optionalPlainTextSchema(200),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  difficulty: optionalPlainTextSchema(40),
  weeklySchedule: z.array(z.unknown()).max(14).optional().default([]),
})

export const workoutLogStartSchema = z.object({
  planId: objectIdSchema('planId'),
  date: z.string().min(1).max(64).optional(),
  exercises: z
    .array(
      z.object({
        name: plainTextSchema(120, 1),
        setsCompleted: z.number().int().min(0).max(100).optional(),
        repsCompleted: optionalPlainTextSchema(40),
        notes: optionalPlainTextSchema(500),
      }),
    )
    .max(100)
    .optional()
    .default([]),
})

/** Toggle a single exercise's checklist-completed flag on an in-progress log. */
export const workoutLogToggleSchema = z.object({
  exerciseIndex: z.number().int().min(0).max(99),
  completed: z.boolean(),
})

/** Abandon an in-progress workout log without completing it (XP is never awarded). */
export const workoutLogCancelSchema = z.object({
  status: z.literal('skipped'),
})

export const workoutCompleteSchema = z.object({
  exercises: z
    .array(
      z.object({
        name: plainTextSchema(120, 1),
        setsCompleted: z.number().int().min(0).max(100).optional(),
        repsCompleted: optionalPlainTextSchema(40),
        notes: optionalPlainTextSchema(500),
      }),
    )
    .max(100)
    .optional()
    .default([]),
  durationMinutes: z.number().min(0).max(600).optional().default(0),
  notes: optionalPlainTextSchema(1000),
})

export const mealPlanGenerateSchema = z.object({
  goal: optionalPlainTextSchema(100),
  preferenceNotes: optionalPlainTextSchema(1000),
  title: optionalPlainTextSchema(120),
  dailyCalories: z.number().int().min(800).max(6000).optional(),
})

const mealItemSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: plainTextSchema(120, 1),
  calories: z.number().min(0).max(5000).default(0),
  protein: z.number().min(0).max(500).default(0),
  carbs: z.number().min(0).max(500).default(0),
  fat: z.number().min(0).max(500).default(0),
  notes: optionalPlainTextSchema(500),
})

/** Trainer assigns a full meal plan to an active client. */
export const mealPlanAssignSchema = z.object({
  userId: objectIdSchema('userId'),
  relationshipId: objectIdSchema('relationshipId').optional(),
  title: plainTextSchema(120, 1),
  goal: z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance', 'flexibility', 'general_fitness']),
  durationDays: z.number().int().min(1).max(31).default(7),
  dailyCalories: z.number().int().min(800).max(6000).optional(),
  meals: z.array(mealItemSchema).min(1).max(8),
  preferenceNotes: optionalPlainTextSchema(1000),
})

export const mealPlanUpdateSchema = z.object({
  title: optionalPlainTextSchema(120),
  goal: optionalPlainTextSchema(100),
  dailyCalories: z.number().int().min(800).max(6000).optional(),
  days: z.array(z.unknown()).max(31).optional(),
  status: z.enum(['active', 'draft']).optional(),
  preferenceNotes: optionalPlainTextSchema(1000),
})

