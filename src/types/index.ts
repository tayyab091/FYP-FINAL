export interface User {
  _id: string
  fullName: string
  email: string
  role: 'user' | 'trainer' | 'gym_owner' | 'admin' | 'super_admin'
  country?: string
  profileImage?: string
  subscription: {
    plan: 'basic' | 'pro' | 'elite'
    status: 'active' | 'inactive'
  }
  createdAt: string
}

export interface Trainer {
  _id: string
  userId: string
  name: string
  email: string
  specialty: string[]
  country: string
  rating: number
  bio: string
  profileImage?: string
  gymName?: string
  isFullyVerified: boolean
  isActive: boolean
  isFeatured: boolean
  isFallback?: boolean
  totalClients?: number
}

export interface WorkoutPlan {
  _id: string
  title: string
  goal: string
  durationWeeks: number
  difficulty: string
  status: 'draft' | 'active' | 'completed'
  weeklySchedule: WeekDay[]
  startDate?: string
  userId: string
  trainerId: string
}

export interface WeekDay {
  day: string
  exercises: Exercise[]
  isRestDay: boolean
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
}

export interface Message {
  _id: string
  conversationId: string
  senderId: string
  senderName: string
  content: string
  type: 'text' | 'workout_plan' | 'image'
  attachedPlan?: WorkoutPlan
  attachedPlanId?: string
  createdAt: string
}

export interface Conversation {
  _id: string
  participants: string[]
  otherUser: {
    _id: string
    fullName: string
    profileImage?: string
    role: string
  }
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

export interface MealLog {
  _id: string
  userId: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foods: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  date: string
}

export interface FoodItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  quantity: number
  unit: string
}

export interface ProgressRecord {
  _id: string
  userId: string
  date: string
  weight?: number
  bodyFat?: number
  chest?: number
  waist?: number
  hips?: number
  notes?: string
}

export interface Relationship {
  _id: string
  userId: string
  trainerId: string
  status: 'pending' | 'active' | 'ended'
  conversationId?: string
  canChat: boolean
  canViewProgress: boolean
  canEditSchedule: boolean
  createdAt: string
}

export interface AppNotification {
  _id: string
  userId: string
  title: string
  message: string
  type: 'chat' | 'workout' | 'system' | 'trainer' | 'payment' | 'community'
  isRead: boolean
  link?: string
  createdAt: string
  updatedAt: string
}
