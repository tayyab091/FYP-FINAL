import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { parseJsonBody, resetPasswordSchema } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    const parsed = await parseJsonBody(req, resetPasswordSchema)
    if ('error' in parsed) return parsed.error

    const { token, password } = parsed.data

    await connectDB()
    const user = await User.findOne({
      resetPasswordToken: token.trim(),
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 },
      )
    }

    user.password = await bcrypt.hash(password, 12)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    return NextResponse.json({ message: 'Password has been reset. You can sign in now.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
