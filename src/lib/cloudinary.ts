import { v2 as cloudinary } from 'cloudinary'

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const FORMAT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function parseCloudinaryUrl(url: string) {
  const match = url.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
  if (!match) return null
  return {
    apiKey: match[1],
    apiSecret: match[2],
    cloudName: match[3],
  }
}

function getCloudinaryConfig() {
  const urlConfig = process.env.CLOUDINARY_URL?.trim()
  if (urlConfig) {
    const parsed = parseCloudinaryUrl(urlConfig)
    if (parsed) return parsed
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  return { cloudName, apiKey, apiSecret }
}

export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  return Boolean(cloudName && apiKey && apiSecret)
}

function getUploadFolder(): string {
  return process.env.CLOUDINARY_UPLOAD_FOLDER?.trim().replace(/^\/+|\/+$/g, '') || 'chat'
}

function configureCloudinary() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export async function uploadChatImage(file: File): Promise<{ url: string; publicId: string }> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 4MB or smaller')
  }
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary storage is not configured (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
    )
  }

  configureCloudinary()

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const format = FORMAT_BY_MIME[file.type]
  const folder = getUploadFolder()

  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format,
        public_id: crypto.randomUUID(),
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error)
          return
        }
        if (!uploadResult?.secure_url || !uploadResult.public_id) {
          reject(new Error('Cloudinary did not return an upload URL'))
          return
        }
        resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id })
      },
    )

    stream.end(buffer)
  })

  return { url: result.secure_url, publicId: result.public_id }
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function uploadAvatarImage(
  file: File,
  userId: string,
): Promise<{ url: string; publicId: string }> {
  if (!AVATAR_MIME.has(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Image must be 5MB or smaller')
  }
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary storage is not configured (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
    )
  }

  configureCloudinary()

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const format = FORMAT_BY_MIME[file.type]
  const folder = `avatars/${userId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format,
        public_id: crypto.randomUUID(),
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error)
          return
        }
        if (!uploadResult?.secure_url || !uploadResult.public_id) {
          reject(new Error('Cloudinary did not return an upload URL'))
          return
        }
        resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id })
      },
    )

    stream.end(buffer)
  })

  return { url: result.secure_url, publicId: result.public_id }
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  if (!publicId || !isCloudinaryConfigured()) return
  configureCloudinary()
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
}
