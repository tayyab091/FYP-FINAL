import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { cookieOptions, getUser } from '@/lib/auth'
import { changePasswordSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const parsed = await parseJsonBody(req, changePasswordSchema)
    if ('error' in parsed) return parsed.error

    const { currentPassword, newPassword } = parsed.data

    await connectDB()
    const user = await User.findById(tokenUser.userId)
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    if (!user.password) {
      return NextResponse.json(
        { message: 'Password login is not available for this account' },
        { status: 400 },
      )
    }

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
