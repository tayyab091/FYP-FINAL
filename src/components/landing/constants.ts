import {
  Bot,
  Apple,
  BarChart3,
  MessageCircle,
  Building2,
  BadgeCheck,
  Dumbbell,
  UtensilsCrossed,
  Moon,
  TrendingUp,
  UserPlus,
  Target,
  Sparkles,
  Brain,
  Users,
  Clock,
  type LucideIcon,
} from 'lucide-react'

export const STATS = [
  { value: 1500, label: 'Exercise demos', suffix: '+', icon: Dumbbell },
  { value: 4, label: 'AI form modes', suffix: '', icon: Brain },
  { value: 500, label: 'Active members', suffix: '+', icon: Users },
  { value: 24, label: 'Coach access', suffix: '/7', icon: Clock },
] as const

export const MARQUEE_ITEMS = [
  'TRAIN',
  'EAT',
  'SLEEP',
  'THRIVE',
  'TRAIN',
  'EAT',
  'SLEEP',
  'THRIVE',
] as const

export const BENTO_FEATURES: {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  href: string
  metric: string
}[] = [
  {
    id: 'ai',
    title: 'AI Coaching',
    desc: 'Instant workout and nutrition guidance — available around the clock.',
    icon: Bot,
    href: '/exercises',
    metric: '4 modes',
  },
  {
    id: 'nutrition',
    title: 'Meal Tracking',
    desc: 'Log meals and hit macro targets effortlessly.',
    icon: Apple,
    href: '/nutrition',
    metric: 'Macros',
  },
  {
    id: 'analytics',
    title: 'Progress Analytics',
    desc: 'Weight, body fat, streaks — all in one view.',
    icon: BarChart3,
    href: '/signup',
    metric: 'Live',
  },
  {
    id: 'trainers',
    title: 'Verified Trainers',
    desc: 'Certified coaches across Pakistan.',
    icon: BadgeCheck,
    href: '/coaching',
    metric: 'Verified',
  },
  {
    id: 'chat',
    title: 'Direct Chat',
    desc: 'Real-time messaging with your coach.',
    icon: MessageCircle,
    href: '/coaching',
    metric: 'Instant',
  },
  {
    id: 'gyms',
    title: 'Gym Partners',
    desc: 'Find trainers at verified gyms nationwide.',
    icon: Building2,
    href: '/coaching',
    metric: 'Nationwide',
  },
]

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create your profile',
    desc: 'Set goals, preferences, and fitness level in minutes.',
    icon: UserPlus,
    href: '/signup',
  },
  {
    step: '02',
    title: 'Train & track',
    desc: 'Follow workouts, log meals, and get AI form feedback.',
    icon: Target,
    href: '/exercises',
  },
  {
    step: '03',
    title: 'Thrive with coaches',
    desc: 'Connect with verified trainers and watch progress compound.',
    icon: Sparkles,
    href: '/coaching',
  },
] as const

export const PILLARS = [
  {
    key: 'Train',
    icon: Dumbbell,
    title: 'Move with purpose',
    desc: '1,500+ exercise demos, AI-built programs, and real-time form checks.',
    href: '/exercises',
    cta: 'Browse exercises',
  },
  {
    key: 'Eat',
    icon: UtensilsCrossed,
    title: 'Fuel intelligently',
    desc: 'Macro-smart meal plans and logging — no spreadsheet required.',
    href: '/nutrition',
    cta: 'Explore nutrition',
  },
  {
    key: 'Sleep',
    icon: Moon,
    title: 'Recover deliberately',
    desc: 'Track rest, build habits, and let recovery drive your gains.',
    href: '/signup',
    cta: 'Start tracking',
  },
  {
    key: 'Thrive',
    icon: TrendingUp,
    title: 'Grow with community',
    desc: 'Coaches, live sessions, and analytics that keep you accountable.',
    href: '/coaching',
    cta: 'Find a coach',
  },
] as const
