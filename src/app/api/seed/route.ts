import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import Gym from '@/models/Gym'
import bcrypt from 'bcryptjs'
import { parseJsonBody, setupKeySchema } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DATABASE_SEEDING !== 'true') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const parsed = await parseJsonBody(req, setupKeySchema)
    if ('error' in parsed) return parsed.error
    if (parsed.data.setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ message: 'Invalid setup key' }, { status: 403 })
    }

    await connectDB()
    const hash = (p: string) => bcrypt.hashSync(p, 10)
    const results: string[] = []

    // Admin
    if (!await User.findOne({ email: 'admin@test.com' })) {
      await User.create({ fullName: 'Platform Admin', email: 'admin@test.com', password: hash('Admin@123'), role: 'admin' })
      results.push('✓ Admin created: admin@test.com / Admin@123')
    } else results.push('→ Admin already exists')

    // Gym Owner
    let gymOwnerUser = await User.findOne({ email: 'gymowner@test.com' })
    if (!gymOwnerUser) {
      gymOwnerUser = await User.create({ fullName: 'Ahmed Raza', email: 'gymowner@test.com', password: hash('GymOwner@123'), role: 'gym_owner', country: 'Pakistan' })
      results.push('✓ Gym owner: gymowner@test.com / GymOwner@123')
    } else results.push('→ Gym owner already exists')

    // Gym
    let gym = await Gym.findOne({ name: 'FitZone Lahore' })
    if (!gym) {
      gym = await Gym.create({ name: 'FitZone Lahore', address: 'Gulberg III, Lahore', country: 'Pakistan', ownerId: gymOwnerUser._id, verificationStatus: 'verified' })
      results.push('✓ Gym: FitZone Lahore')
    }

    // Trainers
    const trainersData = [
      { fullName: 'Ali Hassan', email: 'ali@test.com', specialty: ['Strength Training', 'HIIT'], country: 'Pakistan', bio: 'ACSM certified trainer with 5 years experience.', isFeatured: true, profileImage: 'https://randomuser.me/api/portraits/men/1.jpg', rating: 4.8 },
      { fullName: 'Sarah Khan', email: 'sarah@test.com', specialty: ['Yoga', 'Pilates'], country: 'Pakistan', bio: 'Yoga Alliance certified. Women\'s fitness specialist.', isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/2.jpg', rating: 4.9 },
      { fullName: 'Usman Malik', email: 'usman@test.com', specialty: ['Bodybuilding', 'Nutrition'], country: 'Pakistan', bio: 'Former national bodybuilding champion.', isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/men/3.jpg', rating: 4.7 },
      { fullName: 'Fatima Rizvi', email: 'fatima@test.com', specialty: ['HIIT', 'Cardio'], country: 'Pakistan', bio: 'Specializing in HIIT and postnatal fitness.', isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/4.jpg', rating: 4.9 },
      { fullName: 'Bilal Ahmed', email: 'bilal@test.com', specialty: ['CrossFit'], country: 'Pakistan', bio: 'CrossFit Level 2 certified trainer.', isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/men/5.jpg', rating: 4.6 },
    ]

    for (const t of trainersData) {
      let tUser = await User.findOne({ email: t.email })
      if (!tUser) {
        tUser = await User.create({ fullName: t.fullName, email: t.email, password: hash('Trainer@123'), role: 'trainer', country: t.country })
      }
      if (!await Trainer.findOne({ email: t.email })) {
        await Trainer.create({
          userId: tUser._id, name: t.fullName, email: t.email,
          specialty: t.specialty, country: t.country, bio: t.bio,
          isFeatured: t.isFeatured, isFullyVerified: true, isActive: true,
          gymVerificationStatus: 'approved', adminVerificationStatus: 'approved',
          profileImage: t.profileImage, rating: t.rating, gymId: gym._id, gymName: 'FitZone Lahore',
        })
        results.push(`✓ Trainer: ${t.email} / Trainer@123`)
      } else results.push(`→ Trainer ${t.email} already exists`)
    }

    // Users
    const usersData = [
      { fullName: 'Zara Ahmed', email: 'user1@test.com', plan: 'pro' },
      { fullName: 'Omar Siddiqui', email: 'user2@test.com', plan: 'basic' },
      { fullName: 'Hina Malik', email: 'user3@test.com', plan: 'elite' },
    ]

    for (const u of usersData) {
      if (!await User.findOne({ email: u.email })) {
        const endDate = u.plan !== 'basic' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined
        await User.create({
          fullName: u.fullName,
          email: u.email,
          password: hash('User@123'),
          role: 'user',
          country: 'Pakistan',
          currentWeight: 70,
          fitnessGoal: 'general_fitness',
          activityLevel: 'moderate',
          subscription: {
            plan: u.plan,
            status: 'active',
            startDate: new Date(),
            ...(endDate && { endDate }),
          },
        })
        results.push(`✓ User: ${u.email} / User@123 (${u.plan})`)
      } else results.push(`→ User ${u.email} already exists`)
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      results,
      credentials: {
        admin: 'admin@test.com / Admin@123',
        gymOwner: 'gymowner@test.com / GymOwner@123',
        trainer: 'ali@test.com / Trainer@123',
        user: 'user1@test.com / User@123',
      }
    })
  } catch (error: unknown) {
    console.error('Seed error:', error)
    return NextResponse.json({
      message: 'Seed failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
