import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import Gym from '@/models/Gym'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'gym_owner') {
      return NextResponse.json({ message: 'Gym owner access required' }, { status: 403 })
    }

    await connectDB()
    const gym = await Gym.findOne({ ownerId: tokenUser.userId }).lean()
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    return NextResponse.json(gym)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'gym_owner') {
      return NextResponse.json({ message: 'Gym owner access required' }, { status: 403 })
    }

    const body = await req.json()
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ message: 'Gym name is required' }, { status: 400 })
    }
    if (typeof body.address !== 'string' || !body.address.trim()) {
      return NextResponse.json({ message: 'Gym address is required' }, { status: 400 })
    }

    await connectDB()
    const gym = await Gym.findOneAndUpdate(
      { ownerId: tokenUser.userId },
      {
        name: body.name.trim(),
        address: body.address.trim(),
        country: typeof body.country === 'string' ? body.country.trim() : 'Pakistan',
        description: typeof body.description === 'string' ? body.description.trim() : '',
        phone: typeof body.phone === 'string' ? body.phone.trim() : '',
        email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
        logo: typeof body.logo === 'string' ? body.logo.trim() : '',
      },
      { new: true, runValidators: true },
    )
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    return NextResponse.json({ message: 'Gym updated', gym })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
