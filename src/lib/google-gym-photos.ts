import jwt from 'jsonwebtoken'

export interface GooglePhoto {
  name?: string
  googleMapsUri?: string
  authorAttributions?: { displayName?: string; uri?: string }[]
}
export function photoMetadata(photo?: GooglePhoto) {
  if (!photo?.name || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(photo.name) || !process.env.JWT_SECRET) return undefined
  const token = jwt.sign({ photoName: photo.name, purpose: 'gym-photo' }, process.env.JWT_SECRET, { expiresIn: '30m', algorithm: 'HS256' })
  return {
    url: '/api/gyms/photo?token=' + encodeURIComponent(token),
    mapsUri: photo.googleMapsUri?.startsWith('https://') ? photo.googleMapsUri : undefined,
    authors: (photo.authorAttributions || []).map(author => ({ name: author.displayName || 'Google Maps contributor', uri: author.uri?.startsWith('https://') ? author.uri : undefined })),
  }
}
export function readPhotoToken(token: string) {
  try {
    if (!process.env.JWT_SECRET) return null
    const data = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    return typeof data !== 'string' && data.purpose === 'gym-photo' && typeof data.photoName === 'string' && /^places\/[\w-]+\/photos\/[\w-]+$/.test(data.photoName) ? data.photoName : null
  } catch { return null }
}
