import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')

    const query: Record<string, unknown> = {}
    if (tokenUser.role === 'trainer') {
      const Trainer = (await import('@/models/Trainer')).default
      const trainer = await Trainer.findOne({ userId: tokenUser.userId })
      if (!trainer) return NextResponse.json([])
      query.trainerId = trainer._id
    } else if (tokenUser.role === 'user') {
      query.userId = tokenUser.userId
    } else {
      return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    }
    if (status) query.status = status

    const relationships = await Relationship.find(query)
      .populate('userId', 'fullName email profileImage country')
      .populate('trainerId', 'name email profileImage specialty country rating')
      .lean()

    return NextResponse.json(relationships)
  } catch (error) {
    console.error('Relationships error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
