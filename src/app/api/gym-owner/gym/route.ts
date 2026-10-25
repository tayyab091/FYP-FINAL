import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import Gym from '@/models/Gym'
import { gymUpdateSchema, parseJsonBody } from '@/lib/validation'
import { createPublicSlug } from '@/lib/slug'
import { isCloudinaryConfigured, uploadGymImage } from '@/lib/cloudinary'

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

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'gym_owner') return NextResponse.json({ message: 'Gym owner access required' }, { status: 403 })
    if (!isCloudinaryConfigured()) return NextResponse.json({ message: 'Cloudinary image storage is not configured' }, { status: 503 })

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ message: 'Choose an image file' }, { status: 400 })
    const uploaded = await uploadGymImage(file, tokenUser.userId)
    return NextResponse.json(uploaded, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload image'
    return NextResponse.json({ message }, { status: message.includes('Cloudinary') ? 503 : 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'gym_owner') {
      return NextResponse.json({ message: 'Gym owner access required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, gymUpdateSchema)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    await connectDB()
    const gym = await Gym.findOneAndUpdate(
      { ownerId: tokenUser.userId },
      {
        name: body.name,
        slug: createPublicSlug(body.name, tokenUser.userId),
        address: body.address,
        city: body.city || '',
        country: body.country || 'Pakistan',
        description: body.description || '',
        phone: body.phone || '',
        email: body.email || '',
        logo: body.logo || '',
        facilities: body.facilities || [],
        images: body.images || [],
        ...(body.latitude !== undefined && body.longitude !== undefined
          ? { location: { type: 'Point', coordinates: [body.longitude, body.latitude] } }
          : {}),
      },
      { new: true, runValidators: true },
    )
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    return NextResponse.json({ message: 'Gym updated', gym })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
