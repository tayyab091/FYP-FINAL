import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import Gym from '@/models/Gym'
import { normalizeGym } from '@/lib/gyms'

export async function GET(req: NextRequest) {
  try {
    const member = await getUser(req)
    if (!member) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (member.role !== 'trainer') return NextResponse.json({ message: 'Trainer access required' }, { status: 403 })
    await connectDB()
    const trainer = await Trainer.findOne({ userId: member.userId }).select('gymId gymName gymVerificationStatus adminVerificationStatus isFullyVerified').lean()
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })
    const gym = trainer.gymId ? await Gym.findById(trainer.gymId).select('name slug address city country description phone email logo coverImage images facilities trainers rating reviewsCount verificationStatus location').lean() : null
    return NextResponse.json({
      gym: gym ? normalizeGym(gym as unknown as Record<string, unknown>) : null,
      connection: { gymName: trainer.gymName || '', gymApproval: trainer.gymVerificationStatus || 'pending', adminApproval: trainer.adminVerificationStatus || 'pending', fullyVerified: Boolean(trainer.isFullyVerified) },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ message: 'Unable to load your gym connection' }, { status: 500 })
  }
}
