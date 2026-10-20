import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { isBlobConfigured, uploadProfileImage } from '@/lib/blob'
import { rateLimitUpload } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const limited = rateLimitUpload(req)
  if (limited) return limited

  const tokenUser = await getUser(req)
  if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { message: 'Profile uploads require BLOB_READ_WRITE_TOKEN (Vercel Blob).' },
      { status: 503 },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('image')
    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Choose an image to upload.' }, { status: 400 })
    }
    const uploaded = await uploadProfileImage(file)
    return NextResponse.json(uploaded)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    const status = message.includes('4MB') || message.includes('Only JPEG') ? 400 : 500
    return NextResponse.json({ message }, { status })
  }
}
