import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { cookieOptions, getUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Current and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'New password must be at least 8 characters' }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(tokenUser.userId)
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 })

    user.password = await bcrypt.hash(newPassword, 12)
    await user.save()

    const response = NextResponse.json({
      message: 'Password changed successfully. Please sign in again.',
    })
    response.cookies.set('token', '', { ...cookieOptions(), maxAge: 0 })
    return response
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
