import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { uploadChatImage, isBlobConfigured } from '@/lib/blob'

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    if (!isBlobConfigured()) {
      return NextResponse.json(
        { message: 'Image uploads require BLOB_READ_WRITE_TOKEN (Vercel Blob)' },
        { status: 503 },
      )
    }

    const formData = await req.formData()
    const file = formData.get('image')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'image file is required' }, { status: 400 })
    }

    try {
      const { url } = await uploadChatImage(file)
      return NextResponse.json({ url })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      const status = message.includes('4MB') || message.includes('Only JPEG') ? 400 : 500
      return NextResponse.json({ message }, { status })
    }
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
