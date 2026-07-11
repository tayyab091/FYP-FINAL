import { NextResponse } from 'next/server'
import { cookieOptions } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' })
  response.cookies.set('token', '', { ...cookieOptions(), maxAge: 0 })
  return response
}
