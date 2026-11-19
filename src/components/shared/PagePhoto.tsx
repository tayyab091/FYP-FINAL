import Image from 'next/image'

export type PagePhotoKind = 'training' | 'nutrition' | 'gym' | 'coaching' | 'progress'
const photos: Record<PagePhotoKind, { file: string; label: string }> = {
  training: { file: 'male-training.jpg', label: 'MOVE WITH INTENTION' },
  nutrition: { file: 'nutrition.jpg', label: 'FUEL YOUR PROGRESS' },
  gym: { file: 'gym-floor.jpg', label: 'FIND YOUR SPACE' },
  coaching: { file: 'male-strength.jpg', label: 'STRONGER WITH SUPPORT' },
  progress: { file: 'strength-training.jpg', label: 'EVERY REP COUNTS' },
}

/** Decorative artwork; existing headings, controls, and workflows remain the page content. */
export function PagePhoto({ kind }: { kind: PagePhotoKind }) {
  const photo = photos[kind]
  return <div className="page-photo" aria-hidden><Image src={'/images/home/' + photo.file} alt="" fill unoptimized loading="eager" sizes="(min-width: 900px) 24vw, 100vw" /><div className="page-photo__caption"><span>T.E.S.T. / {kind.toUpperCase()}</span><strong>{photo.label}</strong></div><span className="page-photo__cross">+</span></div>
}
