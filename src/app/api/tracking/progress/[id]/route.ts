import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ProgressRecord from '@/models/ProgressRecord'
import { getUser } from '@/lib/auth'
import { parseObjectIdParam } from '@/lib/validation'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'progress id')
    if ('error' in idResult) return idResult.error

    await connectDB()
    const deleted = await ProgressRecord.findOneAndDelete({
      _id: idResult.id,
      userId: tokenUser.userId,
    })
    if (!deleted) {
      return NextResponse.json({ message: 'Progress record not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Progress deleted' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
