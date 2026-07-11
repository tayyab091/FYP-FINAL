import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }
    await connectDB()
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).limit(100).lean()
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
