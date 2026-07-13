import { put } from '@vercel/blob'

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function uploadChatImage(file: File): Promise<{ url: string }> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 4MB or smaller')
  }
  if (!isBlobConfigured()) {
    throw new Error('Blob storage is not configured (BLOB_READ_WRITE_TOKEN)')
  }

  const ext = EXT_BY_MIME[file.type] || 'jpg'
  const filename = `chat/${crypto.randomUUID()}.${ext}`
  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  })

  return { url: blob.url }
}
