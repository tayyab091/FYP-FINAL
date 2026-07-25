import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ProgressRecord from '@/models/ProgressRecord'
import { getUser } from '@/lib/auth'
import { parseJsonBody, progressBodySchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }
    await connectDB()
    const records = await ProgressRecord.find({ userId: tokenUser.userId })
      .sort({ date: 1 }).lean()
    return NextResponse.json(records)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, progressBodySchema)
    if ('error' in parsed) return parsed.error

    await connectDB()
    const { weight, bodyFat, chest, waist, hips, notes, date: dateRaw } = parsed.data
    const date = dateRaw ? new Date(dateRaw) : new Date()
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ message: 'Invalid date' }, { status: 400 })
    }

    const record = await ProgressRecord.create({
      userId: tokenUser.userId,
      weight,
      bodyFat,
      chest,
      waist,
      hips,
      notes: notes || '',
      date,
    })
    return NextResponse.json(record, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
