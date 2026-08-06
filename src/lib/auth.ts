import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return secret
}

export interface TokenPayload {
  userId: string
  role: string
  email: string
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload
  } catch {
    return null
  }
}

async function validateTokenUser(payload: TokenPayload | null): Promise<TokenPayload | null> {
  if (!payload) return null
  await connectDB()
  const user = await User.findById(payload.userId)
    .select('email role isActive isSuspended')
    .lean()
  if (!user || user.isSuspended || user.isActive === false) return null
  return {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  }
}

export function extractTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim()
    if (bearer) return bearer
  }
  return req.cookies.get('token')?.value ?? null
}

export async function getUser(req: NextRequest): Promise<TokenPayload | null> {
  const token = extractTokenFromRequest(req)
  if (!token) return null
  return validateTokenUser(verifyToken(token))
}

export async function getUserFromCookies(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  return validateTokenUser(verifyToken(token))
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  }
}
