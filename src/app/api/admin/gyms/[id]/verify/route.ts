import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { action } = await req.json()
    await connectDB()

    const gym = await Gym.findByIdAndUpdate(id,
      { verificationStatus: action === 'verify' ? 'verified' : 'rejected' },
      { new: true }
    )
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })

    return NextResponse.json({ message: `Gym ${action === 'verify' ? 'verified' : 'rejected'}`, gym })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
