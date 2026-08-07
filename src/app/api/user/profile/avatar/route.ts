import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'
import { uploadAvatarImage, deleteCloudinaryAsset, isCloudinaryConfigured } from '@/lib/cloudinary'
import { rateLimitUpload } from '@/lib/rate-limit'
import { resolveAvatarUrl } from '@/lib/avatar'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitUpload(req)
    if (limited) return limited

    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        {
          message:
            'Image uploads require CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
        },
        { status: 503 },
      )
    }

    const formData = await req.formData()
    const file = formData.get('avatar') ?? formData.get('image')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'avatar file is required' }, { status: 400 })
    }

    await connectDB()
    const existing = await User.findById(tokenUser.userId).select('avatarPublicId role').lean()
    if (!existing) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    try {
      const { url, publicId } = await uploadAvatarImage(file, tokenUser.userId)

      const user = await User.findByIdAndUpdate(
        tokenUser.userId,
        { avatarUrl: url, avatarPublicId: publicId, profileImage: url },
        { new: true, runValidators: true },
      )
        .select('-password')
        .lean()

      if (existing.role === 'trainer') {
        await Trainer.updateOne({ userId: tokenUser.userId }, { $set: { profileImage: url } })
      }

      if (existing.avatarPublicId && existing.avatarPublicId !== publicId) {
        await deleteCloudinaryAsset(existing.avatarPublicId).catch(() => {})
      }

      const avatarUrl = resolveAvatarUrl(user) || url

      return NextResponse.json({
        avatarUrl,
        avatarPublicId: publicId,
        profileImage: avatarUrl,
        user: user ? { ...user, avatarUrl, profileImage: avatarUrl } : null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      const status =
        message.includes('5MB') ||
        message.includes('Only JPEG') ||
        message.includes('Cloudinary storage is not configured')
          ? 400
          : 500
      return NextResponse.json({ message }, { status })
    }
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
