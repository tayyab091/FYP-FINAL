import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

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
    const body = await req.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token : null
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

export async function GET(req: NextRequest) {
  try {
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
