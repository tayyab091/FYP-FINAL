import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { parseJsonBody, verifyEmailSchema } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

async function verifyEmailToken(token: string | null) {
  if (!token?.trim()) {
    return { ok: false as const, status: 400, message: 'Verification token is required' }
  }

  await connectDB()
  const user = await User.findOne({
    verifyEmailToken: token.trim(),
    verifyEmailExpires: { $gt: new Date() },
  })

  if (!user) {
    return { ok: false as const, status: 400, message: 'Invalid or expired verification token' }
  }

  user.emailVerified = true
  user.verifyEmailToken = undefined
  user.verifyEmailExpires = undefined
  await user.save()

  return { ok: true as const, message: 'Email verified successfully' }
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    const parsed = await parseJsonBody(req, verifyEmailSchema)
    if ('error' in parsed) return parsed.error

    const result = await verifyEmailToken(parsed.data.token)
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status })
    }
    return NextResponse.json({ message: result.message })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    const token = req.nextUrl.searchParams.get('token')
    const result = await verifyEmailToken(token)
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status })
    }
    return NextResponse.json({ message: result.message })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
