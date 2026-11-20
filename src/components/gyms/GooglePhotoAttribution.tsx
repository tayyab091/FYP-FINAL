import type { PublicGym } from '@/lib/gyms'
import Image from 'next/image'

export function GoogleBrand() {
  return <Image src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" width={120} height={14} unoptimized />
}

export function GooglePhotoAttribution({ photo, mapsUri }: { photo?: PublicGym['googlePhoto']; mapsUri?: string }) {
  if (!photo) return null
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground" aria-label="Google Maps photo attribution">
    <GoogleBrand />
    {photo.authors.map((author, index) => author.uri ? <a key={index} href={author.uri} target="_blank" rel="noreferrer" className="underline">Photo: {author.name}</a> : <span key={index}>Photo: {author.name}</span>)}
    {(photo.mapsUri || mapsUri) && <a href={photo.mapsUri || mapsUri} target="_blank" rel="noreferrer" className="underline">Photo on Google Maps</a>}
  </div>
}
