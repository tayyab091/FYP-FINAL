import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import User from '@/models/User'

/** Register or update Expo push token for the authenticated user (mobile). */
export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token || !token.startsWith('ExponentPushToken')) {
      return NextResponse.json({ message: 'Valid Expo push token required' }, { status: 400 })
    }

    await connectDB()
    await User.findByIdAndUpdate(tokenUser.userId, {
      $addToSet: { expoPushTokens: token },
    })

    return NextResponse.json({ message: 'Push token registered' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

/** Remove push token on logout (optional mobile call). */
export async function DELETE(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ message: 'Token required' }, { status: 400 })
    }

    await connectDB()
    await User.findByIdAndUpdate(tokenUser.userId, {
      $pull: { expoPushTokens: token },
    })

    return NextResponse.json({ message: 'Push token removed' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
