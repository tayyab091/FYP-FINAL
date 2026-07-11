import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ProgressRecord from '@/models/ProgressRecord'
import { getUser } from '@/lib/auth'

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
    await connectDB()
    const { weight, bodyFat, chest, waist, hips, notes } = await req.json()
    const numericFields = { weight, bodyFat, chest, waist, hips }
    const invalidMetric = Object.values(numericFields).some(
      (value) => value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0),
    )
    if (invalidMetric || (notes !== undefined && typeof notes !== 'string')) {
      return NextResponse.json({ message: 'Invalid progress data' }, { status: 400 })
    }
    const record = await ProgressRecord.create({
      userId: tokenUser.userId,
      weight,
      bodyFat,
      chest,
      waist,
      hips,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 1000) : '',
    })
    return NextResponse.json(record, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
